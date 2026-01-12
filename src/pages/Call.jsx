/**
 * @file pages/Call.jsx
 * @description AI 튜터와의 음성 대화 화면
 *
 * 주요 기능:
 * - 실시간 음성 인식 (Web Speech API)
 * - AI 응답 + 한국어 번역 표시
 * - 음성 합성 (Amazon Polly via Lambda)
 * - 대화 기록 DynamoDB 저장
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, MicOff, Volume2, Captions } from 'lucide-react'
import {
  sendMessage,
  textToSpeech,
  playAudioBase64,
  startSession,
  endSession,
  saveMessage,
  analyzeConversationWithSave
} from '../utils/api'
import { getDeviceId, generateSessionId } from '../utils/helpers'
import { TUTORS } from '../constants'

function Call() {
  const navigate = useNavigate()

  // 기본 상태
  const [callTime, setCallTime] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(true) // 기본 켜짐

  // 대화 데이터
  const [messages, setMessages] = useState([])
  const [transcript, setTranscript] = useState('')
  const [currentSubtitle, setCurrentSubtitle] = useState('')
  const [koreanSubtitle, setKoreanSubtitle] = useState('') // 한국어 번역
  const [turnCount, setTurnCount] = useState(0)
  const [wordCount, setWordCount] = useState(0)

  // 세션 관리
  const [deviceId] = useState(() => getDeviceId())
  const [sessionId] = useState(() => generateSessionId())
  const [sessionStarted, setSessionStarted] = useState(false)

  // Refs
  const timerRef = useRef(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)

  // 설정 로드
  const settings = JSON.parse(localStorage.getItem('tutorSettings') || '{}')
  const tutorId = settings.tutorId || 'gwen'
  const tutor = TUTORS.find(t => t.id === tutorId) || TUTORS[0]
  const tutorName = tutor.name
  const tutorInitial = tutorName[0]

  // 타이머
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCallTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Web Speech API 초기화
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }

        if (finalTranscript) {
          handleUserSpeech(finalTranscript)
        }
        setTranscript(interimTranscript || finalTranscript)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        if (event.error !== 'no-speech') {
          setIsListening(false)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // 첫 인사 시작
  useEffect(() => {
    startConversation()
  }, [])

  /**
   * 대화 시작 - 세션 생성 및 첫 인사
   */
  const startConversation = async () => {
    setIsLoading(true)

    try {
      // 1. 세션 시작 (DynamoDB 저장)
      await startSession(deviceId, sessionId, settings, tutorName)
      setSessionStarted(true)

      // 2. AI 첫 인사 요청
      const response = await sendMessage([], settings)

      const aiMessage = {
        role: 'assistant',
        content: response.message,
        translation: response.translation,
        speaker: 'ai',
        turnNumber: 1
      }
      setMessages([aiMessage])
      setCurrentSubtitle(response.message)
      setKoreanSubtitle(response.translation || '')
      setTurnCount(1)

      // 3. 메시지 저장 (비동기, 에러 무시)
      saveMessage(deviceId, sessionId, {
        role: 'assistant',
        content: response.message,
        translation: response.translation,
        turnNumber: 1
      }).catch(err => console.warn('Save message error:', err))

      // 4. 음성 출력
      await speakText(response.message)

    } catch (err) {
      console.error('Start conversation error:', err)
      // Fallback 메시지
      const mockMessage = `Hello! This is ${tutorName}. How are you doing today?`
      const mockTranslation = `안녕하세요! ${tutorName}입니다. 오늘 어떻게 지내세요?`
      setMessages([{ speaker: 'ai', content: mockMessage, translation: mockTranslation }])
      setCurrentSubtitle(mockMessage)
      setKoreanSubtitle(mockTranslation)
      setTurnCount(1)

      // Fallback에서도 음성 출력 시도
      try {
        await speakText(mockMessage)
      } catch (ttsErr) {
        console.warn('TTS fallback error:', ttsErr)
        startListening()
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 텍스트 음성 출력
   */
  const speakText = async (text) => {
    setIsSpeaking(true)
    setCurrentSubtitle(text)

    try {
      const ttsResponse = await textToSpeech(text, settings)

      if (ttsResponse.audio) {
        await playAudioBase64(ttsResponse.audio, audioRef)
      }

      setIsSpeaking(false)
      startListening()
    } catch (err) {
      console.error('TTS error:', err)
      // 브라우저 TTS 폴백
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

  /**
   * 음성 인식 시작
   */
  const startListening = () => {
    if (recognitionRef.current && !isMuted) {
      setIsListening(true)
      setTranscript('')
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.error('Recognition start error:', err)
      }
    }
  }

  /**
   * 음성 인식 중지
   */
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  /**
   * 마이크 토글
   */
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false)
      startListening()
    } else {
      setIsMuted(true)
      stopListening()
    }
  }

  /**
   * 사용자 발화 처리
   */
  const handleUserSpeech = async (text) => {
    if (!text.trim()) return

    const newTurnCount = turnCount + 1
    const newWordCount = wordCount + text.split(' ').length

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
    setKoreanSubtitle('') // 사용자 발화는 번역 없음

    // 음성 인식 중지 후 AI 응답 요청
    stopListening()
    setIsLoading(true)

    // 사용자 메시지 저장 (비동기)
    saveMessage(deviceId, sessionId, {
      role: 'user',
      content: text,
      turnNumber: newTurnCount
    }).catch(err => console.warn('Save user message error:', err))

    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.role || (m.speaker === 'ai' ? 'assistant' : 'user'),
        content: m.content
      }))

      const response = await sendMessage(apiMessages, settings)

      const aiTurnNumber = newTurnCount + 1
      const aiMessage = {
        role: 'assistant',
        content: response.message,
        translation: response.translation,
        speaker: 'ai',
        turnNumber: aiTurnNumber
      }

      setMessages(prev => [...prev, aiMessage])
      setTurnCount(aiTurnNumber)
      setCurrentSubtitle(response.message)
      setKoreanSubtitle(response.translation || '')

      // AI 메시지 저장 (비동기)
      saveMessage(deviceId, sessionId, {
        role: 'assistant',
        content: response.message,
        translation: response.translation,
        turnNumber: aiTurnNumber
      }).catch(err => console.warn('Save AI message error:', err))

      await speakText(response.message)

    } catch (err) {
      console.error('Chat error:', err)
      setTimeout(() => startListening(), 1000)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 시간 포맷팅
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * 통화 종료
   */
  const handleEndCall = async () => {
    // 타이머 및 음성 정리
    clearInterval(timerRef.current)
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }

    // 세션 종료 API 호출 (비동기)
    if (sessionStarted) {
      endSession(deviceId, sessionId, {
        duration: callTime,
        turnCount,
        wordCount
      }).catch(err => console.warn('End session error:', err))
    }

    // 통화 결과 저장 (로컬)
    const result = {
      duration: callTime,
      messages: messages,
      date: new Date().toISOString(),
      turnCount,
      wordCount,
      tutorName,
      deviceId,
      sessionId
    }
    localStorage.setItem('lastCallResult', JSON.stringify(result))

    // 통화 기록 저장 (로컬)
    const history = JSON.parse(localStorage.getItem('callHistory') || '[]')
    history.unshift({
      date: new Date().toLocaleDateString('ko-KR'),
      fullDate: new Date().toLocaleString('ko-KR'),
      duration: formatTime(callTime),
      words: wordCount,
      tutorName,
      sessionId
    })
    localStorage.setItem('callHistory', JSON.stringify(history.slice(0, 10)))

    navigate('/result')
  }

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

        {/* Status Indicator */}
        {isLoading && <div className="status-indicator">연결 중...</div>}
        {isSpeaking && <div className="status-indicator speaking">AI가 말하는 중</div>}
        {isListening && !isSpeaking && <div className="status-indicator listening">듣고 있어요</div>}

        {/* Subtitle Area - 영어 + 한국어 번역 */}
        {showSubtitles && currentSubtitle && (
          <div className="subtitle-area">
            <p className="subtitle-en">{currentSubtitle}</p>
            {koreanSubtitle && (
              <p className="subtitle-ko">{koreanSubtitle}</p>
            )}
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
            <span>소리끔</span>
          </button>

          <button className="control-btn">
            <Volume2 size={24} />
            <span>스피커</span>
          </button>

          <button
            className={`control-btn ${showSubtitles ? 'active' : ''}`}
            onClick={() => setShowSubtitles(!showSubtitles)}
          >
            <Captions size={24} />
            <span>모두 보기</span>
          </button>
        </div>

        {/* End Call Button */}
        <button className="end-call-btn" onClick={handleEndCall}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
          </svg>
        </button>
      </div>

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
          justify-content: center;
          padding: 40px 20px;
          position: relative;
        }

        .tutor-avatar {
          width: 100px;
          height: 100px;
          background: #8b5cf6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .tutor-avatar span {
          font-size: 40px;
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
        }

        .status-indicator {
          margin-top: 40px;
          padding: 8px 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        }

        .status-indicator.speaking {
          background: rgba(139, 92, 246, 0.3);
        }

        .status-indicator.listening {
          background: rgba(34, 197, 94, 0.3);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* Subtitle Area - 영어 + 한국어 */
        .subtitle-area {
          position: absolute;
          bottom: 200px;
          left: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 12px;
          padding: 16px 20px;
        }

        .subtitle-en {
          color: white;
          font-size: 16px;
          line-height: 1.5;
          text-align: center;
          margin-bottom: 8px;
        }

        .subtitle-ko {
          color: rgba(139, 92, 246, 0.9);
          font-size: 14px;
          line-height: 1.5;
          text-align: center;
          font-style: italic;
        }

        /* Bottom Controls */
        .call-controls {
          padding: 20px;
          padding-bottom: 40px;
        }

        .control-buttons {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-bottom: 30px;
        }

        .control-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: none;
          color: rgba(255, 255, 255, 0.8);
        }

        .control-btn.active {
          color: #8b5cf6;
        }

        .control-btn span {
          font-size: 12px;
        }

        .end-call-btn {
          width: 72px;
          height: 72px;
          background: #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
        }

        .end-call-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  )
}

export default Call
