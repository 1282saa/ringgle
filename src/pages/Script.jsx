/**
 * @file pages/Script.jsx
 * @description 대화 스크립트 확인 화면 (링글 스타일)
 *
 * 기능:
 * - 사용자: 원본(보라) + 교정(흰색) 두 버블 시스템
 * - AI: 흰색 버블 + 번역 보기
 * - 턴/단어 카운트 표시
 * - 모든 메시지 TTS 재생
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Volume2, ChevronDown, ChevronUp,
  MessageCircle, Loader, Settings, Sparkles, Pencil
} from 'lucide-react'
import { textToSpeech, playAudioBase64, getSessionDetail, translateText } from '../utils/api'
import { getDeviceId } from '../utils/helpers'

function Script() {
  const navigate = useNavigate()
  const location = useLocation()

  const { callId, callData, sessionId, isDbSession, sessionData } = location.state || {}

  const [messages, setMessages] = useState([])
  const [showTranslation, setShowTranslation] = useState({})
  const [translations, setTranslations] = useState({}) // 번역 캐시
  const [loadingTranslation, setLoadingTranslation] = useState({})
  const [showCorrection, setShowCorrection] = useState({}) // 'loading' | 'done' | undefined
  const [playingId, setPlayingId] = useState(null)
  const [tutorInfo, setTutorInfo] = useState({ name: 'AI', accent: 'us' })
  const [isLoading, setIsLoading] = useState(false)
  const [sessionMeta, setSessionMeta] = useState(null)
  const [topic, setTopic] = useState('Daily Conversation')

  // 토픽 매핑
  const topicMap = {
    'business': 'Business & Workplace',
    'daily': 'Daily Conversation',
    'travel': 'Travel & Tourism',
    'interview': 'Job Interview'
  }

  // DB 세션에서 대화 내용 로드
  const loadSessionFromDB = async (sessId) => {
    setIsLoading(true)
    try {
      const deviceId = getDeviceId()
      const result = await getSessionDetail(deviceId, sessId)

      if (result.messages && result.messages.length > 0) {
        const messagesWithId = result.messages.map((msg, idx) => ({
          ...msg,
          id: msg.messageId || `msg-${idx}`,
          role: msg.role,
          content: msg.content,
          turnNumber: msg.turnNumber || idx,
          wordCount: msg.content ? msg.content.split(' ').length : 0
        }))
        setMessages(messagesWithId)
        // 교정은 사용자가 "교정 받기" 클릭 시에만 표시
      }

      if (result.session) {
        setTutorInfo({
          name: result.session.tutorName || 'AI',
          accent: result.session.accent || 'us'
        })
        setSessionMeta(result.session)
        setTopic(topicMap[result.session.topic] || 'Daily Conversation')
      }
    } catch (err) {
      console.error('[Script] Failed to load session:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isDbSession && sessionId) {
      loadSessionFromDB(sessionId)
      if (sessionData) {
        setTutorInfo({
          name: sessionData.tutorName || 'AI',
          accent: sessionData.accent || 'us'
        })
        setTopic(topicMap[sessionData.topic] || 'Daily Conversation')
      }
    } else if (callData) {
      setMessages(callData.messages || [])
      setTutorInfo(callData.tutor || { name: 'AI', accent: 'us' })
    }
  }, [callData, isDbSession, sessionId, sessionData])

  // 번역 토글 (API에서 번역 가져오기)
  const toggleTranslation = async (messageId, content) => {
    const isCurrentlyShowing = showTranslation[messageId]

    // 이미 보이고 있으면 숨기기
    if (isCurrentlyShowing) {
      setShowTranslation(prev => ({ ...prev, [messageId]: false }))
      return
    }

    // 번역 표시
    setShowTranslation(prev => ({ ...prev, [messageId]: true }))

    // 이미 번역이 있으면 다시 가져오지 않음
    if (translations[messageId]) {
      return
    }

    // 번역 가져오기
    setLoadingTranslation(prev => ({ ...prev, [messageId]: true }))
    try {
      const result = await translateText(content)
      if (result.translation) {
        setTranslations(prev => ({ ...prev, [messageId]: result.translation }))
      }
    } catch (err) {
      console.error('[Translation] Error:', err)
      setTranslations(prev => ({ ...prev, [messageId]: '번역을 불러올 수 없습니다.' }))
    } finally {
      setLoadingTranslation(prev => ({ ...prev, [messageId]: false }))
    }
  }

  // 교정 요청/토글 (로딩 → 완료 → 숨기기 토글)
  const requestCorrection = (messageId) => {
    const currentState = showCorrection[messageId]

    // 완료 상태 → 숨기기
    if (currentState === 'done') {
      setShowCorrection(prev => ({
        ...prev,
        [messageId]: 'hidden'
      }))
      return
    }

    // 숨김 상태 → 다시 보이기 (로딩 없이)
    if (currentState === 'hidden') {
      setShowCorrection(prev => ({
        ...prev,
        [messageId]: 'done'
      }))
      return
    }

    // 첫 요청 → 로딩 상태로 변경
    setShowCorrection(prev => ({
      ...prev,
      [messageId]: 'loading'
    }))

    // 1.5초 후 완료 (실제로는 AI API 호출)
    setTimeout(() => {
      setShowCorrection(prev => ({
        ...prev,
        [messageId]: 'done'
      }))
    }, 1500)
  }

  // TTS 재생
  const handleSpeak = async (text, messageId) => {
    if (playingId === messageId) return

    setPlayingId(messageId)
    try {
      const settings = JSON.parse(localStorage.getItem('tutorSettings') || '{}')
      const ttsResponse = await textToSpeech(text, settings)
      if (ttsResponse.audio) {
        await playAudioBase64(ttsResponse.audio)
      }
    } catch (err) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        speechSynthesis.speak(utterance)
      }
    } finally {
      setPlayingId(null)
    }
  }

  // 교정된 텍스트 생성 (filler words 제거)
  const getCorrectedText = (rawText) => {
    if (!rawText) return ''

    // filler words 제거 및 정리
    let corrected = rawText
      .replace(/\b(um+|uh+|er+|ah+|like,?\s*you know,?)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,!?])/g, '$1')
      .replace(/([.,!?])\s*([.,!?])/g, '$1')
      .trim()

    // 첫 글자 대문자
    if (corrected.length > 0) {
      corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1)
    }

    // 마침표 추가
    if (corrected && !/[.!?]$/.test(corrected)) {
      corrected += '.'
    }

    return corrected
  }

  // 문법 설명 생성
  const getGrammarExplanation = (rawText, correctedText) => {
    const explanations = []

    // 반복되는 단어 체크
    const repeatPattern = /\b(\w+)\s+\1\b/gi
    if (repeatPattern.test(rawText)) {
      explanations.push("반복되는 단어가 제거되었습니다.")
    }

    // filler words 체크
    if (/\b(um+|uh+|er+|ah+)\b/gi.test(rawText)) {
      explanations.push("'um', 'uh' 등의 군더더기 표현이 제거되었습니다.")
    }

    // I 대문자 체크
    if (/\bi\b/.test(rawText) && /\bI\b/.test(correctedText)) {
      explanations.push("'i'는 항상 대문자 'I'로 써야 합니다.")
    }

    if (explanations.length === 0) {
      explanations.push("문법적으로 자연스럽게 다듬어졌습니다.")
    }

    return explanations.join(' ')
  }

  // 턴 번호 계산 (사용자 메시지 기준)
  const getUserTurnNumber = (index) => {
    let turnCount = 0
    for (let i = 0; i <= index; i++) {
      if (messages[i]?.role === 'user') {
        turnCount++
      }
    }
    return turnCount
  }

  // 누적 단어 수 계산
  const getCumulativeWordCount = (index) => {
    let wordCount = 0
    for (let i = 0; i <= index; i++) {
      if (messages[i]?.role === 'user' && messages[i]?.content) {
        wordCount += messages[i].content.split(' ').filter(w => w.length > 0).length
      }
    }
    return wordCount
  }

  if (!callData && !isDbSession && !isLoading) {
    return (
      <div className="script-error">
        <p>데이터를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/', { state: { activeTab: 'history' } })}>홈으로 돌아가기</button>
        <style>{styles}</style>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="script-loading">
        <Loader className="spinner" size={32} />
        <p>대화 내용을 불러오는 중...</p>
        <style>{styles}</style>
      </div>
    )
  }

  return (
    <div className="script-page">
      {/* Header - 링글 스타일 */}
      <header className="script-header">
        <button className="back-btn" onClick={() => navigate('/', { state: { activeTab: 'history' } })}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="header-title">{topic}</h1>
        <button className="settings-btn" onClick={() => navigate('/settings')}>
          <Settings size={22} />
        </button>
      </header>

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-messages">
            <MessageCircle size={48} color="#d1d5db" />
            <p>대화 내용이 없습니다.</p>
          </div>
        )}

        {messages.map((message, index) => {
          const isAI = message.role === 'assistant'
          const messageId = message.id
          const content = message.content || ''
          const correctedText = !isAI ? getCorrectedText(content) : ''
          const grammarExplanation = !isAI ? getGrammarExplanation(content, correctedText) : ''
          const hasDifference = !isAI && content !== correctedText
          const correctionState = showCorrection[messageId] // 'loading' | 'done' | undefined

          return (
            <div key={messageId} className="message-block">
              {/* === 사용자 메시지 === */}
              {!isAI && (
                <>
                  {/* 원본 발화 (보라색 버블) */}
                  <div className="user-message-wrapper">
                    <div className="user-bubble">
                      <p className="message-text">{content}</p>

                      {/* TTS + 교정 버튼 */}
                      <div className="bubble-actions">
                        <button
                          className={`tts-btn ${playingId === messageId ? 'playing' : ''}`}
                          onClick={() => handleSpeak(content, messageId)}
                        >
                          <Volume2 size={16} />
                        </button>

                        {hasDifference && (
                          <button
                            className={`correction-btn ${correctionState ? 'active' : ''}`}
                            onClick={() => requestCorrection(messageId)}
                            disabled={correctionState === 'loading'}
                          >
                            <Sparkles size={14} />
                            <span>
                              {correctionState === 'loading' ? '교정 중...' :
                               correctionState === 'done' ? '교정 숨기기' : '교정 받기'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 교정 박스 - 링글 스타일 (사용자 말풍선과 정렬) */}
                  {hasDifference && (correctionState === 'loading' || correctionState === 'done') && (
                    <div className="correction-wrapper">
                      <span className="correction-arrow">↳</span>
                      <div className={`correction-bubble ${correctionState}`}>
                        {correctionState === 'loading' ? (
                          /* 로딩 애니메이션 - 연필 */
                          <div className="correction-loading">
                            <Pencil size={18} className="pen-animation" />
                          </div>
                        ) : (
                          /* 교정 완료 */
                          <>
                            <p className="corrected-text">{correctedText}</p>
                            <p className="grammar-explanation">{grammarExplanation}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 턴/단어 카운트 */}
                  <div className="turn-count">
                    {getUserTurnNumber(index)} 턴 — {getCumulativeWordCount(index)}단어
                  </div>
                </>
              )}

              {/* === AI 메시지 === */}
              {isAI && (
                <div className="ai-message-wrapper">
                  <div className="ai-bubble">
                    <p className="message-text">{content}</p>

                    {/* 번역 보기 */}
                    <button
                      className="translation-btn"
                      onClick={() => toggleTranslation(messageId, content)}
                    >
                      {showTranslation[messageId] ? '번역 숨기기' : '번역 보기'}
                    </button>

                    {/* TTS 버튼 */}
                    <button
                      className={`ai-tts-btn ${playingId === messageId ? 'playing' : ''}`}
                      onClick={() => handleSpeak(content, messageId)}
                    >
                      <Volume2 size={18} />
                    </button>

                    {showTranslation[messageId] && (
                      <p className="translation-text">
                        {loadingTranslation[messageId]
                          ? '번역 중...'
                          : translations[messageId] || message.translation || '(번역 준비 중...)'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .script-page {
    min-height: 100vh;
    background: white;
    padding-bottom: 40px;
  }

  .script-loading,
  .script-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    color: #6b7280;
  }

  .script-loading .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .script-error button {
    padding: 12px 24px;
    background: #5046e4;
    color: white;
    border-radius: 8px;
  }

  /* Header - 링글 스타일 */
  .script-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .back-btn,
  .settings-btn {
    background: none;
    padding: 4px;
    color: #1f2937;
  }

  .header-title {
    font-size: 17px;
    font-weight: 600;
    color: #1f2937;
  }

  /* Messages Container */
  .messages-container {
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .empty-messages {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #9ca3af;
    text-align: center;
    gap: 16px;
  }

  .message-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* === 사용자 메시지 (보라색) === */
  .user-message-wrapper {
    display: flex;
    justify-content: flex-end;
  }

  .user-bubble {
    max-width: 85%;
    background: #8b5cf6;
    color: white;
    padding: 16px;
    border-radius: 16px;
  }

  .user-bubble .message-text {
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 12px;
  }

  .bubble-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .tts-btn {
    background: none;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.8);
  }

  .tts-btn.playing {
    color: white;
  }

  .correction-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    background: none;
    font-size: 13px;
    color: rgba(255,255,255,0.8);
  }

  /* === 교정 박스 (링글 스타일 - 사용자 말풍선과 정렬) === */
  .correction-wrapper {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }

  .correction-arrow {
    color: #9ca3af;
    font-size: 18px;
    margin-top: 8px;
    flex-shrink: 0;
  }

  .correction-bubble {
    max-width: 85%;
    background: white;
    border: 1px solid #e5e7eb;
    border-left: 3px solid #8b5cf6;
    padding: 16px;
    border-radius: 12px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .correction-bubble.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60px;
    min-width: 200px;
  }

  .correction-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }

  .pen-animation {
    color: #8b5cf6;
    animation: penWrite 0.8s ease-in-out infinite;
  }

  @keyframes penWrite {
    0% {
      transform: translateX(0) rotate(-15deg);
    }
    50% {
      transform: translateX(40px) rotate(15deg);
    }
    100% {
      transform: translateX(0) rotate(-15deg);
    }
  }

  .corrected-text {
    font-size: 15px;
    line-height: 1.7;
    color: #8b5cf6;
    font-weight: 500;
    margin-bottom: 16px;
  }

  .grammar-explanation {
    font-size: 14px;
    line-height: 1.7;
    color: #6b7280;
  }

  /* 턴/단어 카운트 */
  .turn-count {
    text-align: right;
    font-size: 12px;
    color: #9ca3af;
    padding-right: 4px;
  }

  /* === AI 메시지 (흰색) === */
  .ai-message-wrapper {
    display: flex;
    justify-content: flex-start;
  }

  .ai-bubble {
    max-width: 85%;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    padding: 16px;
    border-radius: 16px;
  }

  .ai-bubble .message-text {
    font-size: 15px;
    line-height: 1.6;
    color: #1f2937;
    margin-bottom: 12px;
  }

  .translation-btn {
    display: block;
    background: none;
    font-size: 13px;
    color: #9ca3af;
    padding: 4px 0;
    margin-bottom: 8px;
  }

  .ai-tts-btn {
    background: none;
    padding: 4px 0;
    display: flex;
    align-items: center;
    color: #d1d5db;
  }

  .ai-tts-btn.playing {
    color: #6b7280;
  }

  .translation-text {
    font-size: 14px;
    line-height: 1.6;
    color: #6b7280;
    padding: 12px;
    background: #f3f4f6;
    border-radius: 8px;
    margin-top: 12px;
  }
`

export default Script
