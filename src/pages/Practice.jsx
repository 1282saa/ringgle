/**
 * @file pages/Practice.jsx
 * @description 핵심 표현 연습 - 링글 원본 UI 100% 재현
 *
 * Step 1: 설명 화면 - 교정된 표현과 설명 표시
 * Step 2: 따라 말하기 - TTS 듣기 + 녹음
 * Step 3: 완료
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, ArrowLeft, Volume2, Headphones, Mic, Check } from 'lucide-react'
import { textToSpeech, playAudioBase64, translateText, uploadPracticeAudio } from '../utils/api'
import { getDeviceId } from '../utils/helpers'

function Practice() {
  const navigate = useNavigate()
  const location = useLocation()

  // location.state에서 corrections 데이터 받기
  const { corrections: passedCorrections, callData } = location.state || {}

  const [step, setStep] = useState(1) // 1: 설명, 2: 따라말하기, 3: 따라말하기 완료, 4: 대화하기, 5: 대화 완료, 6: 마무리
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [userRecording, setUserRecording] = useState(null) // 녹음된 오디오 blob
  const [userRecordingUrl, setUserRecordingUrl] = useState(null) // S3 URL 또는 local blob URL
  const [userTranscript, setUserTranscript] = useState('')
  const [translations, setTranslations] = useState({}) // 번역 캐시
  const [isUploading, setIsUploading] = useState(false)
  const [practiceResults, setPracticeResults] = useState([]) // 연습 결과 저장

  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const settings = JSON.parse(localStorage.getItem('tutorSettings') || '{}')

  // corrections 데이터 설정 (전달받은 데이터 또는 callData에서 추출)
  const [corrections, setCorrections] = useState([])

  useEffect(() => {
    if (passedCorrections && passedCorrections.length > 0) {
      setCorrections(passedCorrections)
    } else if (callData?.analysis?.grammar_corrections) {
      setCorrections(callData.analysis.grammar_corrections)
    } else {
      // 테스트용 기본 데이터
      setCorrections([
        {
          original: "What's your daughter's solo, cantankerous laptop?",
          corrected: "What do you think about your daughter's difficult laptop?",
          explanation: "'Cantankerous'는 일반적으로 사람에게 사용되며, 노트북에 대해 이야기할 때는 'difficult'가 더 적절합니다."
        }
      ])
    }
  }, [passedCorrections, callData])

  // 현재 연습할 표현
  const currentCorrection = corrections[currentIndex]
  const totalCount = corrections.length

  // 프로그레스: 따라말하기(step 2) = 50%, 대화하기(step 4) = 100%
  const getProgress = () => {
    if (step === 2 || step === 3) return 50
    if (step === 4 || step === 5) return 100
    return 0
  }
  const progress = getProgress()

  // 번역 가져오기
  useEffect(() => {
    const fetchTranslation = async () => {
      if (currentCorrection?.corrected && !translations[currentIndex]) {
        try {
          const result = await translateText(currentCorrection.corrected)
          if (result.translation) {
            setTranslations(prev => ({
              ...prev,
              [currentIndex]: result.translation
            }))
          }
        } catch (err) {
          console.error('Translation error:', err)
        }
      }
    }
    fetchTranslation()
  }, [currentIndex, currentCorrection, translations])

  // Speech Recognition 초기화
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        const text = event.results[0][0].transcript
        setUserTranscript(text)
        setIsRecording(false)
      }

      recognitionRef.current.onerror = () => {
        setIsRecording(false)
      }

      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // 문장 듣기 (TTS)
  const handleListenSentence = async () => {
    if (isPlaying || !currentCorrection) return

    setIsPlaying(true)
    try {
      const ttsResponse = await textToSpeech(currentCorrection.corrected, settings)
      if (ttsResponse.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${ttsResponse.audio}`)
        audioRef.current = audio
        audio.onended = () => setIsPlaying(false)
        audio.play()
      }
    } catch (err) {
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(currentCorrection.corrected)
        utterance.lang = 'en-US'
        utterance.rate = 0.9
        utterance.onend = () => setIsPlaying(false)
        speechSynthesis.speak(utterance)
      } else {
        setIsPlaying(false)
      }
    }
  }

  // 내 발음 듣기
  const handleListenMyVoice = () => {
    if (userRecordingUrl) {
      const audio = new Audio(userRecordingUrl)
      audio.play()
    }
  }

  // 마이크 토글
  const handleMicToggle = async () => {
    if (isRecording) {
      // 녹음 중지
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      // 녹음 시작
      setUserTranscript('')
      setUserRecording(null)
      setIsRecording(true)

      // 음성 인식 시작
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (err) {
          console.error('Recognition start error:', err)
        }
      }

      // 오디오 녹음 시작
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        chunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
          chunksRef.current.push(e.data)
        }

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          setUserRecording(blob)

          // 로컬 URL 생성 (즉시 재생 가능하도록)
          const localUrl = URL.createObjectURL(blob)
          setUserRecordingUrl(localUrl)

          stream.getTracks().forEach(track => track.stop())

          // S3 업로드 (백그라운드)
          try {
            setIsUploading(true)
            const sessionId = callData?.id || `practice-${Date.now()}`
            const result = await uploadPracticeAudio(blob, sessionId, currentIndex)

            if (result.audioUrl) {
              setUserRecordingUrl(result.audioUrl)
              console.log('Audio uploaded to S3:', result.audioUrl)
            }
          } catch (err) {
            console.error('S3 upload failed, using local blob:', err)
            // 업로드 실패해도 로컬 blob URL로 재생 가능
          } finally {
            setIsUploading(false)
          }
        }

        mediaRecorder.start()
      } catch (err) {
        console.error('Audio recording error:', err)
      }
    }
  }

  // 다음 버튼 핸들러
  const handleNext = () => {
    if (step === 1) {
      // 설명 → 따라말하기
      setStep(2)
    } else if (step === 2) {
      // 따라말하기 완료 → 잘했어요 바텀시트
      setStep(3)
    } else if (step === 3) {
      // 잘했어요 → 대화하기
      setUserTranscript('')
      setUserRecording(null)
      setUserRecordingUrl(null)
      setStep(4)
    } else if (step === 4) {
      // 대화하기 완료 시 결과 저장
      const result = {
        index: currentIndex,
        original: currentCorrection.original,
        corrected: currentCorrection.corrected,
        userTranscript,
        audioUrl: userRecordingUrl,
        timestamp: Date.now()
      }
      setPracticeResults(prev => [...prev, result])
      // 대화하기 완료 → 잘했어요 바텀시트 (최종)
      setStep(5)
    } else if (step === 5) {
      // 대화 완료 잘했어요 → 마무리 or 다음 표현
      if (currentIndex < totalCount - 1) {
        // 다음 표현으로
        setCurrentIndex(prev => prev + 1)
        setStep(1)
        setUserTranscript('')
        setUserRecording(null)
        setUserRecordingUrl(null)
      } else {
        // 마지막 표현 완료 → 마무리 화면
        setStep(6)
      }
    } else if (step === 6) {
      // 마무리 → 전화내역으로
      savePracticeToHistory()
      navigate('/', { state: { activeTab: 'history' } })
    }
  }

  // 연습 결과를 localStorage에 저장
  const savePracticeToHistory = () => {
    try {
      const deviceId = getDeviceId()
      const historyKey = `practiceHistory_${deviceId}`
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')

      const newEntry = {
        id: `practice-${Date.now()}`,
        sessionId: callData?.id,
        completedAt: new Date().toISOString(),
        totalExpressions: totalCount,
        results: practiceResults,
      }

      existingHistory.unshift(newEntry)

      // 최근 50개만 유지
      if (existingHistory.length > 50) {
        existingHistory.splice(50)
      }

      localStorage.setItem(historyKey, JSON.stringify(existingHistory))
      console.log('Practice history saved:', newEntry)
    } catch (err) {
      console.error('Failed to save practice history:', err)
    }
  }

  // 닫기
  const handleClose = () => {
    navigate(-1)
  }

  // 뒤로가기
  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    } else if (step === 4) {
      // 대화하기에서 뒤로 → 따라말하기 완료 상태로
      setStep(3)
    } else {
      navigate(-1)
    }
  }

  if (!currentCorrection) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <p>연습할 표현이 없습니다.</p>
          <button style={styles.primaryButton} onClick={() => navigate(-1)}>
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  const translation = translations[currentIndex] || '번역을 불러오는 중...'

  // Step 1: 설명 화면
  if (step === 1) {
    return (
      <div style={styles.container}>
        {/* Header with X button */}
        <header style={styles.headerStep1}>
          <div style={{ width: 24 }} />
          <button style={styles.closeButton} onClick={handleClose}>
            <X size={24} color="#9ca3af" />
          </button>
        </header>

        {/* Title */}
        <h1 style={styles.title}>이 표현을 짧게 연습해볼게요.</h1>

        {/* Main Content */}
        <div style={styles.content}>
          {/* Corrected Sentence Card */}
          <div style={styles.sentenceCard}>
            <p style={styles.sentenceText}>{currentCorrection.corrected}</p>
            <p style={styles.translationText}>{translation}</p>
          </div>

          {/* Explanation Box */}
          <div style={styles.explanationBox}>
            <p style={styles.explanationText}>
              '{currentCorrection.original}'라는 표현은 자연스럽지 않아서, '{currentCorrection.corrected}'로 바꾸는 것이 좋습니다. {currentCorrection.explanation}
            </p>
          </div>
        </div>

        {/* Next Button */}
        <div style={styles.bottomArea}>
          <button style={styles.primaryButton} onClick={handleNext}>
            다음
          </button>
        </div>
      </div>
    )
  }

  // Step 2: 따라 말하기
  if (step === 2) {
    return (
      <div style={styles.container}>
        {/* Header with Back and Progress */}
        <header style={styles.headerStep2}>
          <button style={styles.backButton} onClick={handleBack}>
            <ArrowLeft size={24} color="#374151" />
          </button>
          <div style={styles.progressBarContainer}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {/* Title */}
        <h1 style={styles.title}>듣고 따라 말해보세요.</h1>

        {/* Main Content */}
        <div style={styles.content}>
          {/* Sentence Card */}
          <div style={styles.sentenceCard}>
            <p style={styles.sentenceText}>{currentCorrection.corrected}</p>
            <p style={styles.translationText}>{translation}</p>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button
              style={styles.actionButton}
              onClick={handleListenSentence}
              disabled={isPlaying}
            >
              <Volume2 size={20} color="#374151" />
              <span style={styles.actionButtonText}>문장 듣기</span>
            </button>
            <button
              style={{
                ...styles.actionButton,
                opacity: userRecordingUrl ? 1 : 0.5
              }}
              onClick={handleListenMyVoice}
              disabled={!userRecordingUrl || isUploading}
            >
              <Headphones size={20} color="#374151" />
              <span style={styles.actionButtonText}>
                {isUploading ? '저장 중...' : '내 발음 듣기'}
              </span>
            </button>
          </div>

          {/* User Transcript Display */}
          {userTranscript && (
            <div style={styles.transcriptBox}>
              <p style={styles.transcriptText}>{userTranscript}</p>
            </div>
          )}
        </div>

        {/* Mic Button */}
        <div style={styles.micArea}>
          <button
            style={{
              ...styles.micButton,
              background: isRecording ? '#ef4444' : '#5046e4'
            }}
            onClick={handleMicToggle}
          >
            <Mic size={28} color="white" />
          </button>
          {isRecording && (
            <p style={styles.recordingText}>듣고 있어요...</p>
          )}
        </div>

        {/* Bottom Button (shows after recording) */}
        {userTranscript && (
          <div style={styles.bottomArea}>
            <button style={styles.primaryButton} onClick={handleNext}>
              다음
            </button>
          </div>
        )}
      </div>
    )
  }

  // Step 3: 따라말하기 완료 바텀시트
  if (step === 3) {
    return (
      <div style={styles.container}>
        {/* Header with Back and Progress */}
        <header style={styles.headerStep2}>
          <button style={styles.backButton} onClick={handleBack}>
            <ArrowLeft size={24} color="#374151" />
          </button>
          <div style={styles.progressBarContainer}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {/* Title */}
        <h1 style={styles.title}>듣고 따라 말해보세요.</h1>

        {/* Main Content - Keep showing the sentence */}
        <div style={styles.content}>
          <div style={styles.sentenceCard}>
            <p style={styles.sentenceText}>{currentCorrection.corrected}</p>
            <p style={styles.translationText}>{translation}</p>
          </div>
        </div>

        {/* Bottom Sheet Overlay */}
        <div style={styles.bottomSheetOverlay}>
          <div className="bottom-sheet-animated" style={styles.bottomSheet}>
            <div style={styles.bottomSheetHeader}>
              <div style={styles.bottomSheetIcon}>
                <Check size={18} color="white" />
              </div>
              <h2 style={styles.bottomSheetTitle}>잘했어요!</h2>
            </div>
            <p style={styles.bottomSheetSubtitle}>다음 학습 활동을 진행해보세요.</p>
            <button style={styles.bottomSheetButton} onClick={handleNext}>
              다음
            </button>
          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .bottom-sheet-animated {
            animation: slideUp 0.3s ease;
          }
        `}</style>
      </div>
    )
  }

  // Step 4: 대화하기 (빈칸 채우기)
  if (step === 4) {
    // 빈칸 채우기를 위해 문장에서 일부 단어를 빈칸으로 만들기
    const createFillInBlank = (sentence) => {
      const words = sentence.split(' ')
      if (words.length <= 3) return { display: sentence, blanks: [] }

      // 중간 부분 단어들을 빈칸으로 (2-3개)
      const blankCount = Math.min(2, Math.floor(words.length / 3))
      const startIdx = Math.floor(words.length / 3)
      const blanks = words.slice(startIdx, startIdx + blankCount)

      const displayWords = words.map((word, idx) => {
        if (idx >= startIdx && idx < startIdx + blankCount) {
          return '______'
        }
        return word
      })

      return { display: displayWords.join(' '), blanks }
    }

    const fillInBlank = createFillInBlank(currentCorrection.corrected)

    return (
      <div style={styles.container}>
        {/* Header with Back and Progress */}
        <header style={styles.headerStep2}>
          <button style={styles.backButton} onClick={handleBack}>
            <ArrowLeft size={24} color="#374151" />
          </button>
          <div style={styles.progressBarContainer}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {/* Title */}
        <h1 style={styles.title}>이 표현으로 대화해 보세요.</h1>

        {/* Main Content */}
        <div style={styles.content}>
          {/* Question Card - 상단 회색 카드 */}
          <div style={styles.questionCard}>
            <p style={styles.questionText}>{currentCorrection.corrected}</p>
            <p style={styles.questionTranslation}>{translation}</p>
            <button
              style={styles.playButton}
              onClick={handleListenSentence}
              disabled={isPlaying}
            >
              <Volume2 size={18} color="#6b7280" />
            </button>
          </div>

          {/* Fill in the Blank Card - 하단 흰색 카드 */}
          <div style={styles.blankCard}>
            <p style={styles.blankText}>{fillInBlank.display}</p>
            <p style={styles.blankTranslation}>{translation}</p>
            <div style={styles.blankDivider} />
            <button style={styles.eyeButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>

          {/* User Transcript Display */}
          {userTranscript && (
            <div style={styles.transcriptBox}>
              <p style={styles.transcriptText}>{userTranscript}</p>
            </div>
          )}
        </div>

        {/* Mic Button */}
        <div style={styles.micArea}>
          <button
            style={{
              ...styles.micButton,
              background: isRecording ? '#ef4444' : '#5046e4'
            }}
            onClick={handleMicToggle}
          >
            <Mic size={28} color="white" />
          </button>
          {isRecording && (
            <p style={styles.recordingText}>듣고 있어요...</p>
          )}
        </div>

        {/* Bottom Button (shows after recording) */}
        {userTranscript && (
          <div style={styles.bottomArea}>
            <button style={styles.primaryButton} onClick={handleNext}>
              다음
            </button>
          </div>
        )}
      </div>
    )
  }

  // Step 5: 대화하기 완료 바텀시트
  if (step === 5) {
    return (
      <div style={styles.container}>
        {/* Header with Back and Progress */}
        <header style={styles.headerStep2}>
          <button style={styles.backButton} onClick={handleBack}>
            <ArrowLeft size={24} color="#374151" />
          </button>
          <div style={styles.progressBarContainer}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {/* Title */}
        <h1 style={styles.title}>이 표현으로 대화해 보세요.</h1>

        {/* Main Content */}
        <div style={styles.content}>
          <div style={styles.sentenceCard}>
            <p style={styles.sentenceText}>{currentCorrection.corrected}</p>
            <p style={styles.translationText}>{translation}</p>
          </div>
        </div>

        {/* Bottom Sheet Overlay */}
        <div style={styles.bottomSheetOverlay}>
          <div className="bottom-sheet-animated" style={styles.bottomSheet}>
            <div style={styles.bottomSheetHeader}>
              <div style={styles.bottomSheetIcon}>
                <Check size={18} color="white" />
              </div>
              <h2 style={styles.bottomSheetTitle}>잘했어요!</h2>
            </div>
            <p style={styles.bottomSheetSubtitle}>전화 후 표현학습을 완료했어요!</p>
            <button style={styles.bottomSheetButton} onClick={handleNext}>
              다음
            </button>
          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .bottom-sheet-animated {
            animation: slideUp 0.3s ease;
          }
        `}</style>
      </div>
    )
  }

  // Step 6: 마무리까지 완벽해요!
  if (step === 6) {
    return (
      <div style={styles.container}>
        <div style={styles.completeContent}>
          {/* Celebration Icon */}
          <div style={styles.celebrationIcon}>
            <span style={styles.celebrationEmoji}>🎉</span>
          </div>

          <h1 style={styles.completeTitle}>마무리까지 완벽해요!</h1>
          <p style={styles.completeSubtitle}>
            모든 핵심 표현 연습을 완료했습니다.
          </p>

          <button style={styles.primaryButtonLarge} onClick={handleNext}>
            확인
          </button>
        </div>
      </div>
    )
  }

  return null
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'white',
    display: 'flex',
    flexDirection: 'column',
  },

  // Step 1 Header
  headerStep1: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
  },

  // Step 2 Header
  headerStep2: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBar: {
    height: '6px',
    background: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#5046e4',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },

  // Title
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1f2937',
    padding: '0 20px',
    marginBottom: '32px',
  },

  // Content
  content: {
    flex: 1,
    padding: '0 20px',
  },

  // Sentence Card
  sentenceCard: {
    background: '#f9fafb',
    borderRadius: '16px',
    padding: '32px 24px',
    marginBottom: '20px',
  },
  sentenceText: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  translationText: {
    fontSize: '15px',
    color: '#8b5cf6',
    lineHeight: '1.5',
  },

  // Explanation Box
  explanationBox: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '20px 24px',
  },
  explanationText: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.7',
  },

  // Question Card (Step 4 상단)
  questionCard: {
    background: '#f3f4f6',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
    position: 'relative',
  },
  questionText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  questionTranslation: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  playButton: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
  },

  // Blank Card (Step 4 하단)
  blankCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
  },
  blankText: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: '1.6',
    marginBottom: '12px',
  },
  blankTranslation: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  blankDivider: {
    height: '1px',
    background: '#e5e7eb',
    marginBottom: '12px',
  },
  eyeButton: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
  },

  // Action Buttons (Step 2)
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  actionButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 20px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '30px',
    cursor: 'pointer',
  },
  actionButtonText: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#374151',
  },

  // Transcript Box
  transcriptBox: {
    background: '#f0fdf4',
    border: '2px solid #22c55e',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  transcriptText: {
    fontSize: '16px',
    color: '#374151',
    textAlign: 'center',
  },

  // Mic Area
  micArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },
  micButton: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(80, 70, 228, 0.3)',
    transition: 'all 0.2s',
  },
  recordingText: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#6b7280',
  },

  // Bottom Area
  bottomArea: {
    padding: '20px',
    paddingBottom: '40px',
  },
  primaryButton: {
    width: '100%',
    padding: '18px',
    background: '#5046e4',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '17px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  primaryButtonLarge: {
    width: '100%',
    padding: '18px',
    background: '#5046e4',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '17px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '40px',
  },

  // Empty State
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },

  // Bottom Sheet (for success feedback) - 흰색 배경
  bottomSheetOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
  },
  bottomSheet: {
    background: 'white',
    borderRadius: '24px 24px 0 0',
    width: '100%',
    maxWidth: '480px',
    padding: '32px 24px 40px',
    textAlign: 'left',
  },
  bottomSheetHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  bottomSheetIcon: {
    width: '32px',
    height: '32px',
    background: '#8b5cf6',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#8b5cf6',
  },
  bottomSheetSubtitle: {
    fontSize: '15px',
    color: '#6b7280',
    marginBottom: '24px',
    marginLeft: '44px',
  },
  bottomSheetButton: {
    width: '100%',
    padding: '18px',
    background: '#5046e4',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '17px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // Complete Screen (Final)
  completeContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  celebrationIcon: {
    width: '100px',
    height: '100px',
    background: '#f0f9ff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  celebrationEmoji: {
    fontSize: '48px',
  },
  completeTitle: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '12px',
  },
  completeSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
}

export default Practice
