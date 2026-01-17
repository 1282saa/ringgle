/**
 * @file pages/Settings.jsx
 * @description 맞춤설정 메인 페이지 (링글 앱 100% 동일 스타일)
 *
 * - 헤더: "AI 전화" + 탭 (전화/맞춤설정/전화내역)
 * - 동적 값 표시 (주 N회, 튜터명, 주제 N개)
 * - 하단 네비게이션 바 (6개 탭)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, X, Check, Flame, Menu } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'
import { haptic } from '../utils/capacitor'
import { TUTORS } from '../constants'

function Settings() {
  const navigate = useNavigate()

  // 설정 상태
  const [userName, setUserName] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)
  const [tempName, setTempName] = useState('')
  const [videoReviewAlert, setVideoReviewAlert] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // 동적 값 상태
  const [scheduleCount, setScheduleCount] = useState(0)
  const [tutorName, setTutorName] = useState('Gwen')
  const [topicCount, setTopicCount] = useState(0)

  // 토스트 표시 함수
  const displayToast = (message) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  // 초기 로드
  useEffect(() => {
    // 이름
    const savedName = getFromStorage('userName', '사용자')
    setUserName(savedName)

    // 알림 설정
    const savedVideoReviewAlert = getFromStorage('videoReviewAlert', true)
    setVideoReviewAlert(savedVideoReviewAlert)

    // 일정 카운트 (요일별 일정 합계)
    const schedules = getFromStorage('callSchedules', {})
    let totalSchedules = 0
    Object.values(schedules).forEach(daySchedules => {
      totalSchedules += daySchedules.length
    })
    setScheduleCount(totalSchedules)

    // 튜터 이름
    const savedTutor = getFromStorage('selectedTutor', 'gwen')
    const tutor = TUTORS.find(t => t.id === savedTutor)
    setTutorName(tutor?.name || 'Gwen')

    // 커리큘럼 카운트
    const curriculum = getFromStorage('selectedCurriculum', [])
    setTopicCount(curriculum.length)
  }, [])

  // 이름 저장
  const handleSaveName = () => {
    haptic.success()
    if (tempName.trim()) {
      setUserName(tempName.trim())
      setToStorage('userName', tempName.trim())
      displayToast('이름이 저장되었습니다')
    }
    setShowNameModal(false)
  }

  // 토글 핸들러
  const handleVideoReviewToggle = () => {
    haptic.selection()
    const newValue = !videoReviewAlert
    setVideoReviewAlert(newValue)
    setToStorage('videoReviewAlert', newValue)
    displayToast(newValue ? '알림이 켜졌습니다' : '알림이 꺼졌습니다')
  }

  // 네비게이션 핸들러
  const handleNav = (action) => {
    haptic.light()
    action()
  }

  return (
    <div className="settings-page">
      {/* 상단 헤더 */}
      <header className="main-header">
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

      {/* 탭 네비게이션 */}
      <nav className="tab-nav">
        <button
          className="tab-item"
          onClick={() => handleNav(() => navigate('/', { state: { activeTab: 'call' } }))}
        >
          전화
        </button>
        <button
          className="tab-item active"
        >
          맞춤설정
        </button>
        <button
          className="tab-item"
          onClick={() => handleNav(() => navigate('/', { state: { activeTab: 'history' } }))}
        >
          전화내역
        </button>
      </nav>

      {/* 메인 콘텐츠 */}
      <div className="page-content">
        {/* 공통 설정 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">공통 설정</h2>
          <div className="settings-list">
            <div className="settings-item" onClick={() => handleNav(() => navigate('/settings/schedule'))}>
              <span className="item-label">일정</span>
              <div className="item-right">
                <span className="item-value">주 {scheduleCount}회</span>
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
            <div className="settings-item" onClick={() => handleNav(() => navigate('/settings/tutor'))}>
              <span className="item-label">튜터</span>
              <div className="item-right">
                <span className="item-value">{tutorName}</span>
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
            <div
              className="settings-item"
              onClick={() => handleNav(() => {
                setTempName(userName)
                setShowNameModal(true)
              })}
            >
              <span className="item-label">내 이름</span>
              <div className="item-right">
                <span className="item-value">{userName}</span>
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
          </div>
        </section>

        {/* 일반 전화 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">일반 전화</h2>
          <div className="settings-list">
            <div className="settings-item" onClick={() => handleNav(() => navigate('/settings/curriculum'))}>
              <span className="item-label">커리큘럼</span>
              <div className="item-right">
                <span className="item-value">주제 {topicCount}개</span>
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
          </div>
        </section>

        {/* 그 외 전화 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">그 외 전화</h2>
          <div className="settings-list">
            <div className="settings-item" onClick={() => handleNav(() => navigate('/settings/roleplay'))}>
              <span className="item-label">롤플레잉/디스커션 알림</span>
              <div className="item-right">
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
            <div className="settings-item">
              <span className="item-label">화상 수업 리뷰</span>
              <div className="toggle-switch" onClick={handleVideoReviewToggle}>
                <div className={`toggle-track ${videoReviewAlert ? 'active' : ''}`}>
                  <div className="toggle-thumb" />
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="toast">
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 이름 수정 모달 */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>내 이름</h3>
              <button className="modal-close" onClick={() => setShowNameModal(false)}>
                <X size={24} color="#888" />
              </button>
            </div>
            <p className="modal-desc">AI 튜터가 부를 이름을 입력해주세요.</p>
            <input
              type="text"
              className="name-input"
              value={tempName}
              onChange={e => setTempName(e.target.value)}
              placeholder="이름 입력"
              autoFocus
            />
            <button className="primary-btn" onClick={handleSaveName}>
              저장
            </button>
          </div>
        </div>
      )}

      <style>{`
        .settings-page {
          min-height: 100vh;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          padding-bottom: 24px;
        }

        /* 상단 헤더 */
        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px 12px;
          background: white;
        }

        .main-header h1 {
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .header-icons {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .icon-btn {
          background: none;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        /* 탭 네비게이션 */
        .tab-nav {
          display: flex;
          background: white;
          border-bottom: 1px solid #e8e8e8;
          padding: 0 20px;
          gap: 24px;
        }

        .tab-item {
          padding: 14px 0;
          font-size: 15px;
          font-weight: 500;
          color: #888;
          background: none;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab-item.active {
          color: #1a1a1a;
          font-weight: 600;
          border-bottom-color: #1a1a1a;
        }

        /* 페이지 콘텐츠 */
        .page-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        /* 설정 섹션 */
        .settings-section {
          margin-bottom: 32px;
        }

        .section-label {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 10px;
          padding-left: 4px;
          letter-spacing: -0.3px;
        }

        .settings-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          background: #f8f7ff;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .settings-item:active {
          background: #f0eeff;
        }

        .item-label {
          font-size: 16px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .item-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .item-value {
          font-size: 15px;
          color: #888;
        }

        /* 토글 스위치 */
        .toggle-switch {
          cursor: pointer;
        }

        .toggle-track {
          width: 52px;
          height: 32px;
          background: #d0d0d0;
          border-radius: 16px;
          position: relative;
          transition: background 0.25s;
        }

        .toggle-track.active {
          background: #6366f1;
        }

        .toggle-thumb {
          width: 28px;
          height: 28px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.25s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
        }

        .toggle-track.active .toggle-thumb {
          transform: translateX(20px);
        }

        /* 토스트 메시지 */
        .toast {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          background: #1a1a1a;
          color: white;
          padding: 14px 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 500;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          animation: toastFadeIn 0.3s ease;
          z-index: 2000;
        }

        .toast svg {
          color: #22c55e;
        }

        @keyframes toastFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        /* 모달 */
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

        .modal-sheet {
          background: white;
          border-radius: 20px 20px 0 0;
          width: 100%;
          max-width: 480px;
          padding: 24px 20px 32px;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .modal-close {
          background: none;
          padding: 4px;
        }

        .modal-desc {
          font-size: 14px;
          color: #888;
          margin-bottom: 20px;
        }

        .name-input {
          width: 100%;
          padding: 16px;
          border: 1.5px solid #e0e0e0;
          border-radius: 12px;
          font-size: 16px;
          margin-bottom: 24px;
          box-sizing: border-box;
        }

        .name-input:focus {
          border-color: #6366f1;
          outline: none;
        }

        .primary-btn {
          width: 100%;
          padding: 16px;
          background: #6366f1;
          color: white;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
        }

        .primary-btn:active {
          background: #4f46e5;
        }
      `}</style>
    </div>
  )
}

export default Settings
