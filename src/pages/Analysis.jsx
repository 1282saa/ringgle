/**
 * @file pages/Analysis.jsx
 * @description AI 분석 화면 - 링글 스타일
 *
 * 구성:
 * - CAFP 점수 카드 (Complexity, Accuracy, Fluency, Pronunciation)
 * - 추천 학습 영역 (필러워드, 문법 실수, 단어 반복)
 * - 상세 분석 모달
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, ChevronRight, ChevronDown, ChevronUp,
  Activity, Target, Zap, Mic, Play, Pause, X, MessageCircle
} from 'lucide-react'
import { textToSpeech, playAudioBase64 } from '../utils/api'

function Analysis() {
  const navigate = useNavigate()
  const location = useLocation()
  const { callId, callData } = location.state || {}

  const [analysis, setAnalysis] = useState(null)
  const [activeDetail, setActiveDetail] = useState(null) // 'filler' | 'grammar' | 'repetition'
  const [expandedItems, setExpandedItems] = useState({})
  const [playingIndex, setPlayingIndex] = useState(null) // 현재 재생 중인 인덱스
  const [audioProgress, setAudioProgress] = useState({}) // 각 인덱스별 재생 진행률
  const audioRef = useRef(null)

  useEffect(() => {
    if (callData?.analysis) {
      // API 응답 형식(snake_case)을 UI 형식으로 변환
      const rawAnalysis = callData.analysis

      // CAFP 점수 변환 (0-100 → 0-9 레벨)
      const transformCafpScores = (scores) => {
        if (!scores) return {}
        const toLevel = (score) => Math.round((score / 100) * 9)
        const toScore = (score) => (score / 100) * 9
        return {
          complexity: { score: toScore(scores.complexity || 0), level: toLevel(scores.complexity || 0) },
          accuracy: { score: toScore(scores.accuracy || 0), level: toLevel(scores.accuracy || 0) },
          fluency: { score: toScore(scores.fluency || 0), level: toLevel(scores.fluency || 0) },
          pronunciation: { score: toScore(scores.pronunciation || 0), level: toLevel(scores.pronunciation || 0), isBeta: true }
        }
      }

      // 필러워드 변환
      const transformFillers = (fillers) => {
        if (!fillers || fillers.count === 0) return null
        return {
          count: fillers.count || 0,
          instances: fillers.words?.map(word => ({
            text: `You used "${word}" frequently`,
            highlights: [word]
          })) || []
        }
      }

      // 문법 실수 변환
      const transformGrammar = (corrections) => {
        if (!corrections || corrections.length === 0) return null
        return {
          count: corrections.length,
          category: '문법',
          instances: corrections.map(c => ({
            original: c.original,
            error: c.original,
            corrected: c.corrected,
            explanation: c.explanation
          }))
        }
      }

      const transformed = {
        cafpScores: transformCafpScores(rawAnalysis.cafp_scores),
        summary: rawAnalysis.overall_feedback,
        fillers: transformFillers(rawAnalysis.fillers),
        grammarMistakes: transformGrammar(rawAnalysis.grammar_corrections),
        repetitiveWords: null, // API에서 제공하지 않음
        improvementTips: rawAnalysis.improvement_tips,
        vocabulary: rawAnalysis.vocabulary
      }

      setAnalysis(transformed)
    }
  }, [callData])

  // 아이템 확장/축소 토글
  const toggleItem = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  // 오디오 재생/정지
  const handlePlayAudio = async (text, index) => {
    // 이미 재생 중인 경우 정지
    if (playingIndex === index) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
      setPlayingIndex(null)
      return
    }

    // 다른 오디오 재생 중이면 먼저 정지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }

    setPlayingIndex(index)
    setAudioProgress(prev => ({ ...prev, [index]: 0 }))

    try {
      const settings = JSON.parse(localStorage.getItem('tutorSettings') || '{}')
      const ttsResponse = await textToSpeech(text, settings)

      if (ttsResponse.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${ttsResponse.audio}`)
        audioRef.current = audio

        audio.ontimeupdate = () => {
          if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100
            setAudioProgress(prev => ({ ...prev, [index]: progress }))
          }
        }

        audio.onended = () => {
          setPlayingIndex(null)
          setAudioProgress(prev => ({ ...prev, [index]: 0 }))
          audioRef.current = null
        }

        audio.play()
      }
    } catch (err) {
      console.error('TTS failed, using browser fallback:', err)
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        utterance.rate = 0.9

        utterance.onend = () => {
          setPlayingIndex(null)
          setAudioProgress(prev => ({ ...prev, [index]: 0 }))
        }

        speechSynthesis.speak(utterance)
      }
    }
  }

  // CAFP 점수 아이콘 매핑
  const cafpIcons = {
    complexity: <Target size={20} />,
    accuracy: <Activity size={20} />,
    fluency: <Zap size={20} />,
    pronunciation: <Mic size={20} />
  }

  // CAFP 한글 라벨
  const cafpLabels = {
    complexity: { en: 'Complexity', ko: '복잡성' },
    accuracy: { en: 'Accuracy', ko: '정확성' },
    fluency: { en: 'Fluency', ko: '유창성' },
    pronunciation: { en: 'Pronunciation', ko: '발음' }
  }

  if (!callData) {
    return (
      <div className="analysis-error">
        <p>분석 데이터를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/')}>홈으로 돌아가기</button>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="analysis-error">
        <p>이 대화는 AI 분석이 불가능합니다.</p>
        <p className="sub">30단어 이상 발화해야 분석이 가능합니다.</p>
        <button onClick={() => navigate('/', { state: { activeTab: 'history' } })}>돌아가기</button>
      </div>
    )
  }

  const { cafpScores, summary, fillers, grammarMistakes, repetitiveWords } = analysis

  return (
    <div className="analysis-page">
      {/* Header */}
      <header className="analysis-header">
        <button className="back-btn" onClick={() => navigate('/', { state: { activeTab: 'history' } })}>
          <ArrowLeft size={24} />
        </button>
        <h1>AI 분석</h1>
        <div style={{ width: 24 }} />
      </header>

      {/* Main Content */}
      <div className="analysis-content">
        {/* CAFP Score Cards */}
        <div className="cafp-section">
          {Object.entries(cafpScores || {}).map(([key, data]) => (
            <div key={key} className="cafp-card">
              <div className="cafp-header">
                <div className="cafp-icon">{cafpIcons[key]}</div>
                <span className="cafp-label-en">{cafpLabels[key]?.en}</span>
                <span className="cafp-label-ko">{cafpLabels[key]?.ko}</span>
                {data?.isBeta && <span className="beta-tag">Beta</span>}
                <span className="cafp-level">
                  Lv <span className="level-num">{data?.level || 0}</span>/9
                </span>
              </div>
              <div className="cafp-score-row">
                <span className="cafp-score-value">{data?.score?.toFixed(1) || '0.0'}</span>
              </div>
              <div className="cafp-bar">
                <div
                  className="cafp-bar-fill"
                  style={{ width: `${((data?.score || 0) / 9) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {summary && (
          <div className="summary-section">
            <p>{summary}</p>
          </div>
        )}

        {/* 추천 학습 영역 */}
        <div className="recommend-section">
          <h2 className="section-title">추천 학습 영역</h2>
          <p className="section-desc">
            수업 분석을 기반으로 향후 학습에서 집중해 보면 좋을 영역을 제안 드립니다.
          </p>

          {/* 필러워드 카드 */}
          {fillers && fillers.count > 0 && (
            <div
              className="recommend-card"
              onClick={() => setActiveDetail('filler')}
            >
              <div className="card-header">
                <div className="card-icon filler">
                  <Zap size={16} />
                </div>
                <span className="card-title">필러워드</span>
                <ChevronRight size={20} className="card-arrow" />
              </div>
              <p className="card-summary">
                <strong>필러워드</strong> 사용이 많았던 구간이 <strong>{fillers.instances?.length || 0}개</strong> 있어요.
              </p>
              {fillers.instances && fillers.instances[0] && (
                <div className="card-preview">
                  <p>{highlightFillers(fillers.instances[0].text, fillers.instances[0].highlights)}</p>
                </div>
              )}
            </div>
          )}

          {/* 문법 실수 카드 */}
          {grammarMistakes && grammarMistakes.count > 0 && (
            <div
              className="recommend-card"
              onClick={() => setActiveDetail('grammar')}
            >
              <div className="card-header">
                <div className="card-icon grammar">
                  <Activity size={16} />
                </div>
                <span className="card-title">문법 실수</span>
                <ChevronRight size={20} className="card-arrow" />
              </div>
              <p className="card-summary">
                <strong>{grammarMistakes.category}</strong> 관련 문법 실수가 <strong>{grammarMistakes.count}개</strong> 있어요.
              </p>
              {grammarMistakes.instances && grammarMistakes.instances[0] && (
                <div className="card-preview grammar">
                  <span className="error-icon">✕</span>
                  <p>
                    {highlightError(
                      grammarMistakes.instances[0].original,
                      grammarMistakes.instances[0].error
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 단어 반복 카드 */}
          {repetitiveWords && repetitiveWords.count > 0 && (
            <div
              className="recommend-card"
              onClick={() => setActiveDetail('repetition')}
            >
              <div className="card-header">
                <div className="card-icon repetition">
                  <Target size={16} />
                </div>
                <span className="card-title">단어 반복</span>
                <ChevronRight size={20} className="card-arrow" />
              </div>
              <p className="card-summary">
                반복적으로 사용한 단어가 <strong>{repetitiveWords.count}개</strong> 있어요.
              </p>
              <div className="word-tags">
                {repetitiveWords.words?.slice(0, 5).map((item, idx) => (
                  <span key={idx} className="word-tag">{item.word}</span>
                ))}
              </div>
            </div>
          )}

          {/* 전체 학습 영역보기 */}
          <button className="view-all-btn">
            전체 학습 영역보기 <ChevronRight size={16} />
          </button>
        </div>

        {/* 내가 집중하고 싶은 학습 영역 */}
        <div className="focus-section">
          <h2 className="section-title">내가 집중하고 싶은 학습 영역</h2>
          <div className="focus-card">
            <p>학습 영역을 고정하고 다른 수업에서</p>
            <p>어떻게 달라지는지 확인해보세요.</p>
            <button className="focus-btn">학습 영역 둘러보기</button>
          </div>
        </div>

        {/* FAQ */}
        <div className="faq-link">
          <MessageCircle size={18} />
          <span>링글 AI 분석이란 무엇인가요?</span>
          <ChevronRight size={18} />
        </div>
      </div>

      {/* 필러워드 상세 모달 */}
      {activeDetail === 'filler' && fillers && (
        <div className="detail-modal">
          <div className="modal-content">
            <header className="modal-header">
              <button className="back-btn" onClick={() => setActiveDetail(null)}>
                <ArrowLeft size={24} />
              </button>
              <h1>필러워드</h1>
              <div style={{ width: 24 }} />
            </header>

            <div className="modal-body">
              <div className="detail-summary">
                <p className="detail-title">필러워드 사용이 많았던 구간이 {fillers.instances?.length || 0}개 있어요.</p>
                <span className="detail-category">Fluency</span>
              </div>

              <div className="tip-card">
                <div className="tip-icon">💡</div>
                <span>Ringle's Tip</span>
                <ChevronRight size={16} />
              </div>

              <div className="detail-list">
                {fillers.instances?.map((instance, idx) => (
                  <div key={idx} className="detail-item">
                    <button
                      className="item-header"
                      onClick={() => toggleItem(idx)}
                    >
                      <span className="error-icon">✕</span>
                      {expandedItems[idx] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {expandedItems[idx] && (
                      <div className="item-content">
                        <div className="audio-player">
                          <button
                            className={`play-btn ${playingIndex === idx ? 'playing' : ''}`}
                            onClick={() => handlePlayAudio(instance.text, idx)}
                          >
                            {playingIndex === idx ? <Pause size={20} /> : <Play size={20} />}
                          </button>
                          <div className="audio-progress">
                            <div
                              className="progress-bar"
                              style={{ '--progress': `${audioProgress[idx] || 0}%` }}
                            />
                            <span className="time-start">00:00</span>
                            <span className="time-end">
                              {formatTime(instance.audioTimestamp)}
                            </span>
                          </div>
                        </div>
                        <div className="filler-text">
                          {highlightFillers(instance.text, instance.highlights)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 문법 실수 상세 모달 */}
      {activeDetail === 'grammar' && grammarMistakes && (
        <div className="detail-modal">
          <div className="modal-content">
            <header className="modal-header">
              <button className="back-btn" onClick={() => setActiveDetail(null)}>
                <ArrowLeft size={24} />
              </button>
              <h1>문법 실수</h1>
              <div style={{ width: 24 }} />
            </header>

            <div className="modal-body">
              <div className="detail-summary">
                <p className="detail-title">{grammarMistakes.category} 관련 문법 실수가 {grammarMistakes.count}개 있어요.</p>
                <span className="detail-category">Accuracy</span>
              </div>

              <div className="detail-list">
                {grammarMistakes.instances?.map((instance, idx) => (
                  <div key={idx} className="grammar-detail-item">
                    <div className="grammar-original">
                      <span className="error-icon">✕</span>
                      <p>{highlightError(instance.original, instance.error)}</p>
                    </div>
                    <div className="grammar-corrected">
                      <span className="check-icon">✓</span>
                      <p>{instance.corrected}</p>
                    </div>
                    <div className="grammar-explanation">
                      <p>{instance.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 핵심 표현 연습하기 버튼 */}
              <button
                className="practice-btn"
                onClick={() => navigate('/practice', {
                  state: {
                    corrections: grammarMistakes.instances,
                    callData
                  }
                })}
              >
                핵심 표현 연습하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 단어 반복 상세 모달 */}
      {activeDetail === 'repetition' && repetitiveWords && (
        <div className="detail-modal">
          <div className="modal-content">
            <header className="modal-header">
              <button className="back-btn" onClick={() => setActiveDetail(null)}>
                <ArrowLeft size={24} />
              </button>
              <h1>단어 반복</h1>
              <div style={{ width: 24 }} />
            </header>

            <div className="modal-body">
              <div className="detail-summary">
                <p className="detail-title">반복적으로 사용한 단어가 {repetitiveWords.count}개 있어요.</p>
                <span className="detail-category">Complexity</span>
              </div>

              <div className="word-tags large">
                {repetitiveWords.words?.map((item, idx) => (
                  <span key={idx} className="word-tag">
                    {item.word} ({item.count})
                  </span>
                ))}
              </div>

              {repetitiveWords.aiSuggestion && (
                <div className="ai-suggestion">
                  <h3>AI 추천 대체 표현</h3>
                  <p>{repetitiveWords.aiSuggestion}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .analysis-page {
          min-height: 100vh;
          background: #f9fafb;
          padding-bottom: 40px;
        }

        .analysis-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 12px;
          padding: 20px;
          text-align: center;
        }

        .analysis-error p {
          font-size: 16px;
          color: #374151;
        }

        .analysis-error .sub {
          font-size: 14px;
          color: #6b7280;
        }

        .analysis-error button {
          margin-top: 16px;
          padding: 12px 24px;
          background: #5046e4;
          color: white;
          border-radius: 8px;
          font-weight: 500;
        }

        /* Header */
        .analysis-header {
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

        .analysis-header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .back-btn {
          background: none;
          color: #374151;
          padding: 4px;
        }

        .analysis-content {
          padding: 20px;
        }

        /* CAFP Section */
        .cafp-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .cafp-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
        }

        .cafp-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .cafp-icon {
          color: #5046e4;
        }

        .cafp-label-en {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
        }

        .cafp-label-ko {
          font-size: 14px;
          color: #6b7280;
        }

        .beta-tag {
          padding: 2px 8px;
          background: #fef3c7;
          color: #d97706;
          font-size: 11px;
          font-weight: 500;
          border-radius: 4px;
        }

        .cafp-level {
          margin-left: auto;
          font-size: 15px;
          color: #6b7280;
        }

        .cafp-level .level-num {
          font-size: 20px;
          font-weight: 700;
          color: #5046e4;
        }

        .cafp-score-row {
          margin-bottom: 8px;
        }

        .cafp-score-value {
          font-size: 14px;
          color: #6b7280;
        }

        .cafp-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .cafp-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #5046e4, #7c3aed);
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        /* Summary */
        .summary-section {
          padding: 20px 0;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .summary-section p {
          font-size: 15px;
          color: #374151;
          line-height: 1.6;
        }

        /* Recommend Section */
        .recommend-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .section-desc {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
          margin-bottom: 16px;
        }

        /* Recommend Cards */
        .recommend-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          cursor: pointer;
        }

        .recommend-card:active {
          background: #f9fafb;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .card-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-icon.filler {
          background: #dbeafe;
          color: #2563eb;
        }

        .card-icon.grammar {
          background: #fce7f3;
          color: #db2777;
        }

        .card-icon.repetition {
          background: #d1fae5;
          color: #059669;
        }

        .card-title {
          font-size: 14px;
          font-weight: 500;
          color: #5046e4;
        }

        .card-arrow {
          margin-left: auto;
          color: #9ca3af;
        }

        .card-summary {
          font-size: 15px;
          color: #1f2937;
          margin-bottom: 12px;
        }

        .card-summary strong {
          color: #5046e4;
        }

        .card-preview {
          background: #f9fafb;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          color: #374151;
          line-height: 1.5;
        }

        .card-preview.grammar {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .error-icon {
          color: #ef4444;
          font-size: 12px;
          flex-shrink: 0;
        }

        .check-icon {
          color: #22c55e;
          font-size: 12px;
          flex-shrink: 0;
        }

        .highlight {
          color: #5046e4;
          font-weight: 500;
        }

        .error-highlight {
          background: #fecaca;
          color: #dc2626;
          padding: 0 2px;
          border-radius: 2px;
        }

        /* Word Tags */
        .word-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .word-tags.large {
          gap: 10px;
          margin-top: 16px;
        }

        .word-tag {
          padding: 8px 16px;
          background: #f3f4f6;
          color: #5046e4;
          font-size: 14px;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
        }

        /* View All Button */
        .view-all-btn {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          width: 100%;
          padding: 12px 0;
          background: none;
          color: #6b7280;
          font-size: 14px;
        }

        /* Focus Section */
        .focus-section {
          margin-bottom: 24px;
        }

        .focus-card {
          background: #f3f4f6;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }

        .focus-card p {
          font-size: 14px;
          color: #5046e4;
          margin-bottom: 4px;
        }

        .focus-btn {
          margin-top: 16px;
          padding: 12px 24px;
          background: white;
          border: 1px solid #5046e4;
          color: #5046e4;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
        }

        /* FAQ Link */
        .faq-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          color: #374151;
          font-size: 15px;
        }

        .faq-link svg:last-child {
          margin-left: auto;
          color: #9ca3af;
        }

        /* Detail Modal */
        .detail-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #f9fafb;
          z-index: 1000;
          overflow-y: auto;
        }

        .modal-content {
          min-height: 100vh;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .modal-header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .modal-body {
          padding: 20px;
        }

        .detail-summary {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .detail-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .detail-category {
          font-size: 14px;
          color: #6b7280;
        }

        .tip-card {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          cursor: pointer;
        }

        .tip-icon {
          font-size: 18px;
        }

        .tip-card span {
          font-size: 15px;
          color: #5046e4;
          font-weight: 500;
        }

        .tip-card svg {
          margin-left: auto;
          color: #9ca3af;
        }

        /* Detail List */
        .detail-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-item {
          background: white;
          border-radius: 12px;
          overflow: hidden;
        }

        .item-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: none;
          border-bottom: 1px solid #f3f4f6;
        }

        .item-content {
          padding: 16px;
        }

        .audio-player {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .play-btn {
          width: 40px;
          height: 40px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }

        .play-btn:hover {
          background: #e5e7eb;
        }

        .play-btn.playing {
          background: #5046e4;
          color: white;
        }

        .audio-progress {
          flex: 1;
          position: relative;
        }

        .progress-bar {
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          position: relative;
          overflow: visible;
        }

        .progress-bar::before {
          content: '';
          display: block;
          height: 100%;
          width: var(--progress, 0%);
          background: #5046e4;
          border-radius: 2px;
          transition: width 0.1s linear;
        }

        .progress-bar::after {
          content: '';
          display: block;
          width: 12px;
          height: 12px;
          background: #5046e4;
          border-radius: 50%;
          position: absolute;
          top: -4px;
          left: var(--progress, 0%);
          transform: translateX(-50%);
          transition: left 0.1s linear;
        }

        .time-start, .time-end {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 4px;
        }

        .time-end {
          position: absolute;
          right: 0;
          top: 8px;
        }

        .filler-text {
          font-size: 15px;
          color: #374151;
          line-height: 1.7;
        }

        /* Grammar Detail */
        .grammar-detail-item {
          background: white;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
        }

        .grammar-original {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          padding: 12px;
          background: #fef2f2;
          border-radius: 8px;
        }

        .grammar-original p {
          font-size: 14px;
          color: #374151;
          line-height: 1.5;
        }

        .grammar-corrected {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          padding: 12px;
          background: #f0fdf4;
          border-radius: 8px;
        }

        .grammar-corrected p {
          font-size: 14px;
          color: #374151;
          line-height: 1.5;
        }

        .grammar-explanation {
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .grammar-explanation p {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.6;
        }

        /* AI Suggestion */
        .ai-suggestion {
          margin-top: 20px;
          padding: 16px;
          background: #eff6ff;
          border-radius: 12px;
        }

        .ai-suggestion h3 {
          font-size: 14px;
          font-weight: 600;
          color: #1d4ed8;
          margin-bottom: 8px;
        }

        .ai-suggestion p {
          font-size: 14px;
          color: #374151;
          line-height: 1.6;
        }

        /* Practice Button */
        .practice-btn {
          width: 100%;
          margin-top: 24px;
          padding: 16px;
          background: #5046e4;
          color: white;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .practice-btn:hover {
          background: #4338ca;
        }

        .practice-btn:active {
          background: #3730a3;
        }
      `}</style>
    </div>
  )
}

// 필러워드 하이라이트 헬퍼 함수
function highlightFillers(text, highlights) {
  if (!text || !highlights || highlights.length === 0) return text

  let result = text
  highlights.forEach(word => {
    const regex = new RegExp(`\\b(${word})\\b`, 'gi')
    result = result.replace(regex, '<span class="highlight">$1</span>')
  })

  return <span dangerouslySetInnerHTML={{ __html: result }} />
}

// 문법 오류 하이라이트 헬퍼 함수
function highlightError(text, errorWord) {
  if (!text || !errorWord) return text

  const regex = new RegExp(`(${errorWord})`, 'gi')
  const result = text.replace(regex, '<span class="error-highlight">$1</span>')

  return <span dangerouslySetInnerHTML={{ __html: result }} />
}

// 시간 포맷팅 헬퍼 함수
function formatTime(seconds) {
  if (!seconds) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default Analysis
