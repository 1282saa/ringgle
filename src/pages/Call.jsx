import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, MicOff, Volume2, VolumeX, Captions, X } from 'lucide-react'
import { sendMessage, textToSpeech, playAudioBase64, speechToText, startSession, endSession, saveMessage, translateText } from '../utils/api'
import { getDeviceId } from '../utils/helpers'
import { haptic } from '../utils/capacitor'
import { TranscribeStreamingClient } from '../utils/transcribeStreaming'
import { useUserSettings } from '../context'

// 자막 설정 옵션
const SUBTITLE_OPTIONS = [
  { id: 'all', label: '모두 보기' },
  { id: 'english', label: '영어만 보기' },
  { id: 'translation', label: '번역만 보기' },
  { id: 'off', label: '자막 끄기' },
]

// 자막 모드별 버튼 레이블
const SUBTITLE_BUTTON_LABELS = {
  all: '모두 보기',
  english: '영어만',
  translation: '번역만',
  off: '자막 끄기'
}

// AI 응답에서 톤 지시어 제거 (예: *in a friendly tone*)
const cleanSubtitleText = (text) => {
  if (!text) return ''
  return text
    .replace(/\*[^*]+\*\s*/g, '')
    .replace(/^\s+/, '')
    .trim()
}

function Call() {
  const navigate = useNavigate()
  const [callTime, setCallTime] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingSTT, setIsProcessingSTT] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [subtitleMode, setSubtitleMode] = useState('all')
  const [showSubtitleModal, setShowSubtitleModal] = useState(false)
  const [messages, setMessages] = useState([])
  const [interimTranscript, setInterimTranscript] = useState('')
  const [currentSubtitle, setCurrentSubtitle] = useState('')
  const [currentTranslation, setCurrentTranslation] = useState('')
  const [turnCount, setTurnCount] = useState(0)
  const [wordCount, setWordCount] = useState(0)

  // Refs for accurate cumulative tracking (fixes React state batching issue)
  const turnCountRef = useRef(0)
  const wordCountRef = useRef(0)
  const [sttMode, setSttMode] = useState('streaming') // 'streaming' | 'transcribe'
  const [userSpeaking, setUserSpeaking] = useState(false) // 사용자가 말하는 중인지
  const [streamingText, setStreamingText] = useState('') // 실시간 스트리밍 텍스트

  // 세션 관리 (DynamoDB 저장용)
  const [sessionId] = useState(() => crypto.randomUUID())
  const deviceId = getDeviceId()
  const sessionStartedRef = useRef(false)

  const timerRef = useRef(null)
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const silenceTimerRef = useRef(null)
  const streamRef = useRef(null)

  // VAD (Voice Activity Detection) refs
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const vadIntervalRef = useRef(null)
  const lastSpeechTimeRef = useRef(Date.now())
  const isSpeakingUserRef = useRef(false) // 사용자가 현재 말하고 있는지

  // Streaming STT refs
  const streamingClientRef = useRef(null)
  const streamingStreamRef = useRef(null) // Streaming용 별도 MediaStream
  const finalTranscriptRef = useRef('') // 최종 확정 텍스트
  const silenceAfterSpeechTimerRef = useRef(null) // 말 끝난 후 침묵 타이머

  // Refs for closure-safe state access
  const isListeningRef = useRef(false)
  const isMutedRef = useRef(false)
  const isProcessingSTTRef = useRef(false)
  const sttModeRef = useRef('transcribe')
  const conversationStartedRef = useRef(false) // Prevent double start in StrictMode
  const audioInitializedRef = useRef(false) // Prevent double audio init in StrictMode

  // Context에서 튜터 설정 가져오기
  const { settings, tutorName, tutorInitial, gender } = useUserSettings()

  // VAD 설정
  const VAD_THRESHOLD = 15 // 음성 감지 임계값 (0-255, 낮을수록 민감)
  const SILENCE_DURATION = 3000 // 침묵으로 판단하는 시간 (ms) - 3초 (영어 학습자가 생각할 시간 충분히 확보)
  const MIN_SPEECH_DURATION = 500 // 최소 발화 시간 (ms) - 너무 짧은 소음 무시
  const MAX_RECORDING_TIME = 60000 // 최대 녹음 시간 60초 (안전장치)
  const maxRecordingTimerRef = useRef(null)

  // Sync refs with state (for closure-safe access)
  useEffect(() => { isListeningRef.current = isListening }, [isListening])
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  useEffect(() => { isProcessingSTTRef.current = isProcessingSTT }, [isProcessingSTT])
  useEffect(() => { sttModeRef.current = sttMode }, [sttMode])

  // 타이머
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCallTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // 마이크 및 음성 인식 초기화 (StrictMode에서 중복 초기화 방지)
  useEffect(() => {
    if (audioInitializedRef.current) return
    audioInitializedRef.current = true
    initializeAudio()
    return () => {
      cleanupAudio()
    }
  }, [])

  const initializeAudio = async () => {
    // 마이크 스트림 초기화 + VAD 설정
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      })
      streamRef.current = stream
      console.log('[STT] Microphone stream initialized')

      // VAD용 AudioContext 및 Analyser 설정
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.5
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      console.log('[VAD] Audio analyser initialized')
    } catch (err) {
      console.error('[STT] Microphone access error:', err)
      setSttMode('transcribe') // 마이크 접근 실패 시 batch Transcribe로 폴백
    }
  }

  const cleanupAudio = () => {
    // Streaming STT 정리
    if (streamingClientRef.current) {
      streamingClientRef.current.stop()
      streamingClientRef.current = null
    }
    if (streamingStreamRef.current) {
      streamingStreamRef.current.getTracks().forEach(track => track.stop())
      streamingStreamRef.current = null
    }
    if (silenceAfterSpeechTimerRef.current) {
      clearTimeout(silenceAfterSpeechTimerRef.current)
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    if (maxRecordingTimerRef.current) {
      clearTimeout(maxRecordingTimerRef.current)
    }
    // VAD 정리
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current)
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
  }

  // VAD 모니터링 시작
  const startVADMonitoring = () => {
    if (!analyserRef.current) {
      console.log('[VAD] Analyser not available')
      return
    }

    // 기존 VAD 인터벌 정리
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current)
    }

    lastSpeechTimeRef.current = Date.now()
    isSpeakingUserRef.current = false
    let speechStartTime = null

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

    vadIntervalRef.current = setInterval(() => {
      if (!isListeningRef.current || isProcessingSTTRef.current) {
        return
      }

      analyserRef.current.getByteFrequencyData(dataArray)

      // 평균 볼륨 계산
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length

      const now = Date.now()

      // 음성 감지됨 (임계값 초과)
      if (average > VAD_THRESHOLD) {
        if (!isSpeakingUserRef.current) {
          console.log('[VAD] Speech started, level:', average.toFixed(1))
          speechStartTime = now
          setUserSpeaking(true) // UI 업데이트
        }
        isSpeakingUserRef.current = true
        lastSpeechTimeRef.current = now
      } else {
        // 음성 감지 안됨
        const silenceTime = now - lastSpeechTimeRef.current

        // 충분히 말한 후 침묵이 지속되면 녹음 중지
        if (isSpeakingUserRef.current && silenceTime > SILENCE_DURATION) {
          const speechDuration = speechStartTime ? (lastSpeechTimeRef.current - speechStartTime) : 0

          // 최소 발화 시간을 넘었을 때만 처리
          if (speechDuration >= MIN_SPEECH_DURATION) {
            console.log('[VAD] Silence detected after', speechDuration, 'ms of speech. Stopping...')
            isSpeakingUserRef.current = false
            setUserSpeaking(false) // UI 업데이트
            stopRecordingAndProcess()
          } else {
            // 너무 짧은 소음은 무시하고 계속 듣기
            console.log('[VAD] Short noise ignored, duration:', speechDuration, 'ms')
            isSpeakingUserRef.current = false
            setUserSpeaking(false) // UI 업데이트
            lastSpeechTimeRef.current = now
          }
        }
      }
    }, 100) // 100ms마다 체크

    console.log('[VAD] Monitoring started')
  }

  // VAD 모니터링 중지
  const stopVADMonitoring = () => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current)
      vadIntervalRef.current = null
    }
    isSpeakingUserRef.current = false
    setUserSpeaking(false) // UI 업데이트
    console.log('[VAD] Monitoring stopped')
  }

  // ============================================
  // Streaming STT 함수들
  // ============================================

  // Streaming STT 시작
  const startStreamingSTT = async () => {
    if (streamingClientRef.current) {
      console.log('[Streaming] Already running, stopping first...')
      await stopStreamingSTT()
    }

    try {
      console.log('[Streaming] Starting...')
      finalTranscriptRef.current = ''
      setStreamingText('')
      setInterimTranscript('')

      // 마이크 스트림 생성
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamingStreamRef.current = stream

      // Transcribe Streaming 클라이언트 생성
      const client = new TranscribeStreamingClient({
        language: 'en-US',
        sampleRate: 16000,
        onPartialTranscript: (text) => {
          // 실시간 부분 결과 (UI 업데이트)
          setStreamingText(text)
          setInterimTranscript(text)
          setUserSpeaking(true)

          // 음성이 감지되면 타이머 리셋
          lastSpeechTimeRef.current = Date.now()
          isSpeakingUserRef.current = true

          // 침묵 타이머 리셋
          if (silenceAfterSpeechTimerRef.current) {
            clearTimeout(silenceAfterSpeechTimerRef.current)
          }
        },
        onTranscript: (text) => {
          // 최종 확정 결과 - 이전 텍스트에 추가 (교체 X)
          console.log('[Streaming] Final transcript:', text)
          if (text && text.trim()) {
            // 이전 텍스트가 있으면 공백으로 연결
            if (finalTranscriptRef.current) {
              finalTranscriptRef.current += ' ' + text.trim()
            } else {
              finalTranscriptRef.current = text.trim()
            }
            console.log('[Streaming] Accumulated transcript:', finalTranscriptRef.current)

            // 최종 결과가 오면 잠시 후 처리 (추가 발화 대기)
            if (silenceAfterSpeechTimerRef.current) {
              clearTimeout(silenceAfterSpeechTimerRef.current)
            }
            silenceAfterSpeechTimerRef.current = setTimeout(() => {
              if (finalTranscriptRef.current) {
                const finalText = finalTranscriptRef.current
                finalTranscriptRef.current = ''
                processStreamingResult(finalText)
              }
            }, 1500) // 1.5초 대기 후 처리 (더 긴 발화 대기)
          }
        },
        onError: (error) => {
          console.error('[Streaming] Error:', error)
          // 스트리밍 실패 시 batch 모드로 폴백
          setSttMode('transcribe')
          stopStreamingSTT()
          startListening()
        },
        onClose: () => {
          console.log('[Streaming] Connection closed')
        },
        onOpen: () => {
          console.log('[Streaming] Connection opened')
          setIsListening(true)
        },
      })

      streamingClientRef.current = client
      await client.start(stream)

    } catch (error) {
      console.error('[Streaming] Start error:', error)
      // 폴백: batch Transcribe 모드로 전환
      setSttMode('transcribe')
      startListening()
    }
  }

  // Streaming STT 중지
  const stopStreamingSTT = async () => {
    console.log('[Streaming] Stopping...')

    if (silenceAfterSpeechTimerRef.current) {
      clearTimeout(silenceAfterSpeechTimerRef.current)
      silenceAfterSpeechTimerRef.current = null
    }

    if (streamingClientRef.current) {
      streamingClientRef.current.stop()
      streamingClientRef.current = null
    }

    if (streamingStreamRef.current) {
      streamingStreamRef.current.getTracks().forEach(track => track.stop())
      streamingStreamRef.current = null
    }

    setIsListening(false)
    setUserSpeaking(false)
    setStreamingText('')
  }

  // Streaming 결과 처리
  const processStreamingResult = async (text) => {
    if (!text || !text.trim()) {
      // 텍스트가 없으면 다시 듣기
      startStreamingSTT()
      return
    }

    console.log('[Streaming] Processing result:', text)

    // 스트리밍 중지
    await stopStreamingSTT()

    // UI 업데이트
    setInterimTranscript('')
    setStreamingText('')

    // 사용자 발화 처리
    await handleUserSpeech(text)
  }

  // AWS Transcribe Batch로 처리
  const processWithTranscribe = async (audioBlob) => {
    setIsProcessingSTT(true)

    try {
      console.log('[STT] Sending audio to AWS Transcribe, size:', audioBlob.size)
      const result = await speechToText(audioBlob, 'en-US')

      // 처리 완료 - handleUserSpeech 호출 전에 플래그 해제
      setIsProcessingSTT(false)
      setInterimTranscript('')

      if (result.transcript && result.transcript.trim()) {
        console.log('[STT] Transcribe result:', result.transcript)
        await handleUserSpeech(result.transcript.trim())
      } else {
        console.log('[STT] No transcript returned, restarting...')
        startListening()
      }
    } catch (err) {
      console.error('[STT] Transcribe error:', err)
      setIsProcessingSTT(false)
      setInterimTranscript('')
      // Transcribe 실패 시 streaming 모드로 재시도
      setSttMode('streaming')
      startListening()
    }
  }

  // 녹음 중지 및 처리
  const stopRecordingAndProcess = () => {
    console.log('[STT] stopRecordingAndProcess called')

    // VAD 모니터링 중지
    stopVADMonitoring()

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    if (maxRecordingTimerRef.current) {
      clearTimeout(maxRecordingTimerRef.current)
    }

    // MediaRecorder 중지 → onstop에서 처리
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('[STT] Stopping MediaRecorder, chunks:', audioChunksRef.current.length)
      mediaRecorderRef.current.stop()
    } else {
      console.log('[STT] MediaRecorder not recording, state:', mediaRecorderRef.current?.state)
    }

    setIsListening(false)
  }

  // 번역 가져오기 (비동기)
  const fetchTranslation = async (text) => {
    try {
      const result = await translateText(text)
      if (result.translation) {
        setCurrentTranslation(result.translation)
        console.log('[Translation] Fetched:', result.translation)
      }
    } catch (err) {
      console.error('[Translation] Error:', err)
      setCurrentTranslation('')
    }
  }

  // 첫 인사 시작 (StrictMode에서 중복 실행 방지)
  useEffect(() => {
    if (conversationStartedRef.current) return
    conversationStartedRef.current = true
    startConversation()
  }, [])

  const startConversation = async () => {
    setIsLoading(true)
    try {
      // 1. DynamoDB에 세션 시작 기록
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true
        try {
          await startSession(deviceId, sessionId, settings, tutorName)
          console.log('[DB] Session started:', sessionId)
        } catch (dbErr) {
          console.error('[DB] Failed to start session:', dbErr)
        }
      }

      // 2. AI 응답 받기
      const response = await sendMessage([], settings)
      const aiMessage = {
        role: 'assistant',
        content: response.message,
        speaker: 'ai'
      }
      setMessages([aiMessage])
      setCurrentSubtitle(response.message)

      // 3. 번역 가져오기 (비동기, TTS 블로킹하지 않음)
      fetchTranslation(response.message)

      // 4. 첫 AI 메시지 DynamoDB에 저장
      try {
        await saveMessage(deviceId, sessionId, {
          role: 'assistant',
          content: response.message,
          turnNumber: 0
        })
        console.log('[DB] First AI message saved')
      } catch (dbErr) {
        console.error('[DB] Failed to save message:', dbErr)
      }

      await speakText(response.message)
    } catch (err) {
      console.error('Start conversation error:', err)
      const mockMessage = "Hello! This is " + tutorName + ". How are you doing today?"
      setMessages([{ speaker: 'ai', content: mockMessage }])
      setCurrentSubtitle(mockMessage)
      await speakText(mockMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const speakText = async (text) => {
    // 이미 재생 중인 오디오가 있으면 먼저 정지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }

    setIsSpeaking(true)
    setCurrentSubtitle(text)

    if (!isSpeakerOn) {
      setTimeout(() => {
        setIsSpeaking(false)
        startListening()
      }, 1000)
      return
    }

    try {
      const ttsResponse = await textToSpeech(text, settings)

      if (ttsResponse.audio) {
        await playAudioBase64(ttsResponse.audio, audioRef)
      }

      setIsSpeaking(false)
      startListening()
    } catch (err) {
      console.error('TTS error:', err)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        utterance.rate = settings.speed === 'slow' ? 0.8 : settings.speed === 'fast' ? 1.2 : 1.0

        utterance.onend = () => {
          setIsSpeaking(false)
          startListening()
        }

        speechSynthesis.speak(utterance)
      } else {
        setIsSpeaking(false)
        startListening()
      }
    }
  }

  const startListening = () => {
    if (isMutedRef.current || isProcessingSTTRef.current) {
      console.log('[STT] startListening blocked - muted:', isMutedRef.current, 'processing:', isProcessingSTTRef.current)
      return
    }

    console.log('[STT] startListening - mode:', sttModeRef.current)

    // Streaming 모드인 경우 별도 처리
    if (sttModeRef.current === 'streaming') {
      startStreamingSTT()
      return
    }

    setIsListening(true)
    audioChunksRef.current = []

    // MediaRecorder 새로 생성 (한번 stop된 MediaRecorder는 재사용 불가)
    if (streamRef.current && sttModeRef.current === 'transcribe') {
      try {
        const mediaRecorder = new MediaRecorder(streamRef.current, {
          mimeType: 'audio/webm;codecs=opus'
        })
        mediaRecorderRef.current = mediaRecorder

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          console.log('[STT] MediaRecorder stopped, chunks:', audioChunksRef.current.length)
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            console.log('[STT] Audio blob size:', audioBlob.size, 'bytes')
            audioChunksRef.current = []

            if (sttModeRef.current === 'transcribe' && audioBlob.size > 1000) {
              console.log('[STT] Sending to Transcribe...')
              await processWithTranscribe(audioBlob)
            } else {
              console.log('[STT] Skipped - mode:', sttModeRef.current, 'size:', audioBlob.size)
              startListening()
            }
          } else {
            console.log('[STT] No audio chunks, restarting')
            startListening()
          }
        }

        mediaRecorder.start(500)
        console.log('[STT] MediaRecorder started (new instance)')
      } catch (err) {
        console.error('[STT] MediaRecorder create error:', err)
      }
    }

    // VAD 모니터링 시작 (실시간 음성 감지)
    startVADMonitoring()

    // 최대 녹음 시간 안전장치 (60초)
    if (maxRecordingTimerRef.current) {
      clearTimeout(maxRecordingTimerRef.current)
    }
    maxRecordingTimerRef.current = setTimeout(() => {
      console.log('[STT] Max recording time (60s) reached, processing...')
      if (isListeningRef.current && !isProcessingSTTRef.current) {
        stopRecordingAndProcess()
      }
    }, MAX_RECORDING_TIME)
  }

  const stopListening = () => {
    // Streaming 모드인 경우
    if (sttModeRef.current === 'streaming') {
      stopStreamingSTT()
      return
    }

    // VAD 모니터링 중지
    stopVADMonitoring()

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    if (maxRecordingTimerRef.current) {
      clearTimeout(maxRecordingTimerRef.current)
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {}
    }

    setIsListening(false)
  }

  const toggleMute = () => {
    haptic.medium()
    if (isMuted) {
      setIsMuted(false)
      startListening()
    } else {
      setIsMuted(true)
      stopListening()
    }
  }

  const toggleSpeaker = () => {
    haptic.light()
    setIsSpeakerOn(!isSpeakerOn)
    if (isSpeakerOn) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
    }
  }

  const handleUserSpeech = async (text) => {
    if (!text.trim()) return

    // Use refs for accurate cumulative tracking (fixes React state batching issue)
    turnCountRef.current += 1
    const wordsInText = text.split(' ').filter(w => w.length > 0).length
    wordCountRef.current += wordsInText

    const newTurnCount = turnCountRef.current
    const newWordCount = wordCountRef.current

    console.log('[WordCount] Added', wordsInText, 'words, total:', newWordCount, 'turn:', newTurnCount)

    const userMessage = {
      role: 'user',
      content: text,
      speaker: 'user',
      turnNumber: newTurnCount,
      totalWords: newWordCount
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setTurnCount(newTurnCount)
    setWordCount(newWordCount)
    setCurrentSubtitle(text)

    // 사용자 메시지 DynamoDB에 저장
    try {
      await saveMessage(deviceId, sessionId, {
        role: 'user',
        content: text,
        turnNumber: newTurnCount
      })
      console.log('[DB] User message saved, turn:', newTurnCount)
    } catch (dbErr) {
      console.error('[DB] Failed to save user message:', dbErr)
    }

    stopListening()
    setIsLoading(true)

    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.role || (m.speaker === 'ai' ? 'assistant' : 'user'),
        content: m.content
      }))

      const response = await sendMessage(apiMessages, settings)

      const aiMessage = {
        role: 'assistant',
        content: response.message,
        speaker: 'ai'
      }

      setMessages(prev => [...prev, aiMessage])

      // 번역 가져오기 (비동기, TTS 블로킹하지 않음)
      fetchTranslation(response.message)

      // AI 응답 DynamoDB에 저장
      try {
        await saveMessage(deviceId, sessionId, {
          role: 'assistant',
          content: response.message,
          turnNumber: newTurnCount
        })
        console.log('[DB] AI response saved, turn:', newTurnCount)
      } catch (dbErr) {
        console.error('[DB] Failed to save AI message:', dbErr)
      }

      await speakText(response.message)
    } catch (err) {
      console.error('Chat error:', err)
      setTimeout(() => startListening(), 1000)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleEndCall = async () => {
    haptic.heavy() // 통화 종료는 강한 햅틱
    clearInterval(timerRef.current)
    cleanupAudio()

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }

    // Use ref values for accurate counts (state may be stale due to batching)
    const finalTurnCount = turnCountRef.current
    const finalWordCount = wordCountRef.current
    console.log('[EndCall] Final counts - turns:', finalTurnCount, 'words:', finalWordCount)

    // DynamoDB에 세션 종료 기록
    try {
      await endSession(deviceId, sessionId, callTime, finalTurnCount, finalWordCount)
      console.log('[DB] Session ended:', sessionId)
    } catch (dbErr) {
      console.error('[DB] Failed to end session:', dbErr)
    }

    const result = {
      duration: callTime,
      messages: messages,
      date: new Date().toISOString(),
      turnCount: finalTurnCount,
      wordCount: finalWordCount,
      tutorName,
      sessionId // 세션 ID 추가
    }
    localStorage.setItem('lastCallResult', JSON.stringify(result))

    const history = JSON.parse(localStorage.getItem('callHistory') || '[]')
    const now = new Date()
    history.unshift({
      id: Date.now(),
      sessionId, // 세션 ID 추가
      timestamp: now.toISOString(),
      date: now.toLocaleDateString('ko-KR'),
      fullDate: now.toLocaleString('ko-KR'),
      duration: formatTime(callTime),
      durationSeconds: callTime,
      words: finalWordCount,
      turnCount: finalTurnCount,
      tutorName
    })
    localStorage.setItem('callHistory', JSON.stringify(history.slice(0, 50)))

    navigate('/result')
  }

  const getSubtitleContent = () => {
    if (subtitleMode === 'off') return null
    if (subtitleMode === 'english') return cleanSubtitleText(currentSubtitle)
    if (subtitleMode === 'translation') return currentTranslation || '(번역 준비 중...)'
    return cleanSubtitleText(currentSubtitle)
  }

  const subtitleContent = getSubtitleContent()

  return (
    <div className="ringle-call">
      {/* Main Call Area */}
      <div className="call-main">
        {/* Tutor Avatar */}
        <div className="tutor-avatar">
          <span>{tutorInitial}</span>
        </div>

        {/* Tutor Name */}
        <h1 className="tutor-name">{tutorName}</h1>

        {/* Call Timer */}
        <div className="call-timer">{formatTime(callTime)}</div>

        {/* Subtitle Display */}
        {subtitleMode !== 'off' && subtitleContent && (
          <div className="subtitle-display">
            <p className="subtitle-text">{subtitleContent}</p>
            {subtitleMode === 'all' && currentTranslation && (
              <p className="subtitle-translation">{currentTranslation}</p>
            )}
          </div>
        )}

        {/* Speaking Indicator */}
        {isSpeaking && (
          <div className="speaking-indicator">
            <div className="dot-wave">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Controls */}
      <div className="call-controls">
        <div className="control-buttons">
          <button
            className={`control-btn ${isMuted ? 'active' : ''}`}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            <span>{isMuted ? '음소거됨' : '소리끔'}</span>
          </button>

          <button
            className={`control-btn ${!isSpeakerOn ? 'active' : ''}`}
            onClick={toggleSpeaker}
          >
            {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
            <span>{isSpeakerOn ? '스피커' : '스피커 끔'}</span>
          </button>

          <button
            className={`control-btn ${subtitleMode !== 'off' ? 'active' : ''}`}
            onClick={() => {
              haptic.light()
              setShowSubtitleModal(true)
            }}
          >
            <Captions size={24} />
            <span>{SUBTITLE_BUTTON_LABELS[subtitleMode]}</span>
          </button>
        </div>

        {/* End Call Button */}
        <button className="end-call-btn" onClick={handleEndCall}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
          </svg>
        </button>
      </div>

      {/* 자막 설정 바텀시트 모달 */}
      {showSubtitleModal && (
        <div className="modal-overlay" onClick={() => setShowSubtitleModal(false)}>
          <div className="subtitle-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>자막 설정</h3>
              <button className="close-btn" onClick={() => setShowSubtitleModal(false)}>
                <X size={24} color="#9ca3af" />
              </button>
            </div>
            <div className="modal-options">
              {SUBTITLE_OPTIONS.map(option => (
                <button
                  key={option.id}
                  className={`option-item ${subtitleMode === option.id ? 'selected' : ''}`}
                  onClick={() => {
                    haptic.selection()
                    setSubtitleMode(option.id)
                    setShowSubtitleModal(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ringle-call {
          min-height: 100vh;
          background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
          display: flex;
          flex-direction: column;
        }

        .call-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 20px 20px;
        }

        .tutor-avatar {
          width: 72px;
          height: 72px;
          background: #8b5cf6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .tutor-avatar span {
          font-size: 28px;
          font-weight: 600;
          color: white;
        }

        .tutor-name {
          font-size: 28px;
          font-weight: 600;
          color: white;
          margin-bottom: 8px;
        }

        .call-timer {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.6);
          font-variant-numeric: tabular-nums;
          margin-bottom: 24px;
        }

        .subtitle-display {
          width: 100%;
          padding: 0 20px;
          text-align: left;
        }

        .subtitle-text {
          color: white;
          font-size: 22px;
          font-weight: 500;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .subtitle-translation {
          color: rgba(255, 255, 255, 0.6);
          font-size: 16px;
          line-height: 1.4;
        }

        .speaking-indicator {
          margin-top: 24px;
        }

        .dot-wave {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .dot-wave span {
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          animation: dotWave 1.2s infinite ease-in-out;
        }

        .dot-wave span:nth-child(1) { animation-delay: 0s; }
        .dot-wave span:nth-child(2) { animation-delay: 0.1s; }
        .dot-wave span:nth-child(3) { animation-delay: 0.2s; }
        .dot-wave span:nth-child(4) { animation-delay: 0.3s; }
        .dot-wave span:nth-child(5) { animation-delay: 0.4s; }

        @keyframes dotWave {
          0%, 60%, 100% { opacity: 0.4; transform: scale(1); }
          30% { opacity: 1; transform: scale(1.2); }
        }

        .processing-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
          padding: 12px 24px;
          background: rgba(99, 102, 241, 0.3);
          border-radius: 12px;
        }

        .processing-indicator span {
          color: white;
          font-size: 14px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .listening-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
        }

        .pulse-ring {
          width: 60px;
          height: 60px;
          border: 3px solid rgba(34, 197, 94, 0.5);
          border-radius: 50%;
          animation: pulse 1.5s ease-out infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        .listening-indicator span {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }

        /* User Speaking Indicator */
        .user-speaking-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
        }

        .user-speaking-indicator span {
          color: #22c55e;
          font-size: 14px;
          font-weight: 500;
        }

        .sound-waves {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 40px;
        }

        .sound-waves span {
          width: 6px;
          background: #22c55e;
          border-radius: 3px;
          animation: soundWave 0.8s ease-in-out infinite;
        }

        .sound-waves span:nth-child(1) { height: 15px; animation-delay: 0s; }
        .sound-waves span:nth-child(2) { height: 25px; animation-delay: 0.1s; }
        .sound-waves span:nth-child(3) { height: 35px; animation-delay: 0.2s; }
        .sound-waves span:nth-child(4) { height: 25px; animation-delay: 0.3s; }
        .sound-waves span:nth-child(5) { height: 15px; animation-delay: 0.4s; }

        @keyframes soundWave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.5); }
        }

        .interim-transcript {
          margin-top: 20px;
          padding: 12px 20px;
          background: rgba(34, 197, 94, 0.2);
          border-radius: 12px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          max-width: 90%;
        }

        .interim-transcript p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          text-align: center;
        }

        .call-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          padding-bottom: 40px;
          gap: 30px;
        }

        .control-buttons {
          display: flex;
          justify-content: center;
          gap: 60px;
        }

        .control-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: none;
          color: rgba(255, 255, 255, 0.8);
          min-width: 60px;
        }

        .control-btn.active {
          color: #8b5cf6;
        }

        .control-btn span {
          font-size: 12px;
          white-space: nowrap;
        }

        .end-call-btn {
          width: 72px;
          height: 72px;
          background: #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
        }

        .end-call-btn:active {
          transform: scale(0.95);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1000;
        }

        .subtitle-modal {
          background: white;
          border-radius: 24px 24px 0 0;
          width: 100%;
          max-width: 480px;
          padding: 24px 0;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .subtitle-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .subtitle-modal .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .subtitle-modal .close-btn {
          background: none;
          padding: 4px;
        }

        .modal-options {
          padding: 8px 0;
        }

        .modal-options .option-item {
          width: 100%;
          padding: 16px 20px;
          text-align: left;
          font-size: 16px;
          color: #374151;
          background: white;
          border: none;
          transition: background 0.2s;
        }

        .modal-options .option-item:hover {
          background: #f9fafb;
        }

        .modal-options .option-item.selected {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

export default Call
