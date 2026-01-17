import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Phone, ChevronLeft, ChevronRight, Menu, Flame, Check } from 'lucide-react'
import { LoadingSpinner } from '../components'
import { getSessions } from '../utils/api'
import { getDeviceId, formatDuration } from '../utils/helpers'
import { haptic } from '../utils/capacitor'
import { useApiCall } from '../hooks'
import { useUserSettings } from '../context'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'call')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [filterAnalysisOnly, setFilterAnalysisOnly] = useState(false)

  // Context에서 튜터 설정 가져오기
  const {
    tutorName,
    tutorInitial,
    accentLabel,
    genderLabel,
    personalityTags
  } = useUserSettings()

  // API 호출 훅으로 세션 로드 관리
  const {
    data: sessionsData,
    loading: isLoadingSessions,
    execute: loadSessionsFromDB
  } = useApiCall(
    useCallback(async () => {
      const deviceId = getDeviceId()
      console.log('[Home] Fetching sessions from DynamoDB...')
      const result = await getSessions(deviceId, 50)
      console.log('[Home] Loaded', result.sessions?.length || 0, 'sessions from DB')
      return result
    }, []),
    { initialData: { sessions: [] } }
  )

  const dbSessions = sessionsData?.sessions || []

  // 네비게이션 상태로 탭 변경
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state])

  // 초기 로드
  useEffect(() => {
    loadSessionsFromDB()
  }, [loadSessionsFromDB])

  // 히스토리 탭 활성화 시 세션 새로고침
  useEffect(() => {
    if (activeTab === 'history') {
      loadSessionsFromDB()
    }
  }, [activeTab, loadSessionsFromDB])

  // 월 변경
  const changeMonth = (delta) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentMonth(newDate)
  }

  // 완료한 전화 개수
  const completedCalls = dbSessions.length

  // DB 세션을 현재 월로 필터링
  const filteredDbSessions = dbSessions.filter(session => {
    const sessionDate = new Date(session.startedAt || session.timestamp)
    const sameMonth = sessionDate.getMonth() === currentMonth.getMonth() &&
                      sessionDate.getFullYear() === currentMonth.getFullYear()
    if (!sameMonth) return false
    if (filterAnalysisOnly) return (session.wordCount || 0) >= 150
    return true
  })

  // DB 세션 날짜 포맷팅 (KST 변환)
  const formatSessionDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    // 한국 시간대로 명시적 변환
    const kstOptions = { timeZone: 'Asia/Seoul' }
    const year = date.toLocaleString('en-US', { ...kstOptions, year: 'numeric' })
    const month = String(date.toLocaleString('en-US', { ...kstOptions, month: 'numeric' })).padStart(2, '0')
    const day = String(date.toLocaleString('en-US', { ...kstOptions, day: 'numeric' })).padStart(2, '0')
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const dayIndex = new Date(date.toLocaleString('en-US', kstOptions)).getDay()
    const dayName = dayNames[dayIndex]
    const hours = parseInt(date.toLocaleString('en-US', { ...kstOptions, hour: 'numeric', hour12: false }))
    const minutes = String(date.toLocaleString('en-US', { ...kstOptions, minute: 'numeric' })).padStart(2, '0')
    const ampm = hours >= 12 ? '오후' : '오전'
    const hour12 = hours % 12 || 12
    return `${year}. ${month}. ${day}(${dayName}) ${ampm} ${String(hour12).padStart(2, '0')}:${minutes}`
  }

  const handleCall = () => {
    haptic.medium()
    navigate('/call')
  }

  // 네비게이션 핸들러 (햅틱 포함)
  const handleNavClick = (action) => {
    haptic.light()
    action()
  }

  // 탭 변경 핸들러 (햅틱 포함)
  const handleTabChange = (tab) => {
    haptic.selection()
    if (tab === 'settings') {
      navigate('/settings')
    }
    setActiveTab(tab)
  }

  return (
    <div className="ringle-home">
      {/* Header */}
      <header className="ringle-header">
        <h1>AI 전화</h1>
        <div className="header-icons">
          <button className="icon-btn">
            <Flame size={22} color="#22d3ee" fill="#22d3ee" />
          </button>
          <button className="icon-btn">
            <Menu size={22} color="#1f2937" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'call' ? 'active' : ''}`}
          onClick={() => handleTabChange('call')}
        >
          전화
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabChange('settings')}
        >
          맞춤설정
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          전화내역
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'call' && (
          <>
            {/* Tutor Card - 링글 스타일 (클릭 시 튜터 설정) */}
            <div className="tutor-card" onClick={() => handleNavClick(() => navigate('/settings/tutor'))}>
              <div className="tutor-avatar-wrapper">
                <div className="tutor-avatar">
                  <span>{tutorInitial}</span>
                </div>
              </div>

              <div className="tutor-tags">
                {personalityTags.map(tag => (
                  <span key={tag} className="personality-tag">{tag}</span>
                ))}
              </div>

              <h2 className="tutor-name">{tutorName}</h2>

              <div className="tutor-info-tags">
                <span className="info-tag">#{accentLabel}</span>
                <span className="info-tag">#{genderLabel}</span>
              </div>
            </div>

            {/* Call Button - 링글 스타일 */}
            <button className="call-btn" onClick={handleCall}>
              바로 전화하기
            </button>
          </>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            {/* Summary Card */}
            <div className="summary-card">
              <div className="summary-item">
                <span className="summary-value">{completedCalls}개</span>
                <span className="summary-label">완료한 전화</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <span className="summary-value">무제한</span>
                <span className="summary-label">남은 AI 분석 이용권</span>
              </div>
            </div>

            {/* Divider Line */}
            <div className="summary-divider-line" />

            {/* Notice Banner */}
            <div className="notice-banner">
              <div className="notice-icon">🚧</div>
              <div className="notice-text">
                <p className="notice-title">AI 분석 결과는 잠시 준비 중이에요.</p>
                <p className="notice-desc">곧 '성취' 메뉴에서 더 나은 모습으로 돌아올게요.</p>
              </div>
            </div>

            {/* Month Navigator */}
            <div className="month-navigator">
              <h2 className="month-title">{currentMonth.getMonth() + 1}월</h2>
              <div className="month-arrows">
                <button onClick={() => changeMonth(-1)}>
                  <ChevronLeft size={24} />
                </button>
                <button onClick={() => changeMonth(1)}>
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>

            {/* Filter Checkbox */}
            <label className="filter-checkbox">
              <div
                className={`checkbox ${filterAnalysisOnly ? 'checked' : ''}`}
                onClick={() => setFilterAnalysisOnly(!filterAnalysisOnly)}
              >
                {filterAnalysisOnly && <Check size={14} />}
              </div>
              <span>AI 분석 있는 대화만 보기</span>
            </label>

            {/* DB Sessions */}
            {filteredDbSessions.length > 0 && (
              <>
                {filteredDbSessions.map((session) => {
                  const hasAnalysis = (session.wordCount || 0) >= 150
                  const words = session.wordCount || 0
                  return (
                    <div key={session.sessionId} className="call-card">
                      <span className="call-type-tag">전화</span>
                      <p className="call-date">{formatSessionDate(session.startedAt)}</p>
                      <p className="call-words">
                        <span className={hasAnalysis ? 'word-count-ok' : 'word-count-low'}>
                          {words}단어
                        </span>
                        <span className="word-threshold"> / 150단어</span>
                      </p>

                      <div className="call-buttons">
                        <button
                          className="call-btn-item"
                          onClick={() => handleNavClick(() => navigate('/script', {
                            state: {
                              sessionId: session.sessionId,
                              isDbSession: true,
                              sessionData: session
                            }
                          }))}
                        >
                          대화 스크립트 확인
                        </button>

                        {hasAnalysis && (
                          <button
                            className="call-btn-item"
                            onClick={() => handleNavClick(() => navigate('/analysis', {
                              state: {
                                sessionId: session.sessionId,
                                isDbSession: true,
                                sessionData: session
                              }
                            }))}
                          >
                            AI 분석 확인
                          </button>
                        )}

                        <button
                          className="call-btn-item"
                          onClick={() => handleNavClick(() => navigate('/practice', {
                            state: {
                              sessionId: session.sessionId,
                              isDbSession: true,
                              sessionData: session
                            }
                          }))}
                        >
                          핵심 표현 연습하기
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Empty State */}
            {filteredDbSessions.length === 0 && (
              <div className="empty-history">
                <div className="empty-icon">
                  <Phone size={32} color="#9ca3af" />
                </div>
                <p>이 달에는 전화 내역이 없어요</p>
                <p className="sub">AI와 대화를 시작해보세요!</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

export default Home
