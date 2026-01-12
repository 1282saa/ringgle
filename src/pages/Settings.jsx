/**
 * @file pages/Settings.jsx
 * @description 맞춤설정 메인 페이지
 *
 * 링글 앱 스타일의 설정 메인 화면
 * 섹션: 공통 설정, 일반 전화, 그 외 전화
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, X } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'

function Settings() {
  const navigate = useNavigate()

  // 설정 상태
  const [userName, setUserName] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)
  const [tempName, setTempName] = useState('')
  const [roleplayAlert, setRoleplayAlert] = useState(true)
  const [videoReviewAlert, setVideoReviewAlert] = useState(true)

  // 초기 로드
  useEffect(() => {
    const savedName = getFromStorage('userName', '사용자')
    setUserName(savedName)

    const savedRoleplayAlert = getFromStorage('roleplayAlert', true)
    const savedVideoReviewAlert = getFromStorage('videoReviewAlert', true)
    setRoleplayAlert(savedRoleplayAlert)
    setVideoReviewAlert(savedVideoReviewAlert)
  }, [])

  // 이름 저장
  const handleSaveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim())
      setToStorage('userName', tempName.trim())
    }
    setShowNameModal(false)
  }

  // 토글 핸들러
  const handleRoleplayToggle = () => {
    const newValue = !roleplayAlert
    setRoleplayAlert(newValue)
    setToStorage('roleplayAlert', newValue)
  }

  const handleVideoReviewToggle = () => {
    const newValue = !videoReviewAlert
    setVideoReviewAlert(newValue)
    setToStorage('videoReviewAlert', newValue)
  }

  return (
    <div className="settings-main-page">
      {/* 헤더 */}
      <header className="settings-main-header">
        <h1>맞춤설정</h1>
        <button className="close-btn" onClick={() => navigate('/')}>
          <X size={24} color="#9ca3af" />
        </button>
      </header>

      <div className="settings-main-content">
        {/* 공통 설정 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">공통 설정</h2>
          <div className="settings-list">
            <div className="settings-item" onClick={() => navigate('/settings/schedule')}>
              <span className="item-label">일정</span>
              <ChevronRight size={20} color="#9ca3af" />
            </div>
            <div className="settings-item" onClick={() => navigate('/settings/tutor')}>
              <span className="item-label">튜터</span>
              <ChevronRight size={20} color="#9ca3af" />
            </div>
            <div
              className="settings-item"
              onClick={() => {
                setTempName(userName)
                setShowNameModal(true)
              }}
            >
              <span className="item-label">내 이름</span>
              <div className="item-right">
                <span className="item-value">{userName}</span>
                <ChevronRight size={20} color="#9ca3af" />
              </div>
            </div>
          </div>
        </section>

        {/* 일반 전화 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">일반 전화</h2>
          <div className="settings-list">
            <div className="settings-item" onClick={() => navigate('/settings/curriculum')}>
              <span className="item-label">커리큘럼</span>
              <ChevronRight size={20} color="#9ca3af" />
            </div>
          </div>
        </section>

        {/* 그 외 전화 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">그 외 전화</h2>
          <div className="settings-list">
            <div className="settings-item">
              <span className="item-label">롤플레잉/디스커션 알림</span>
              <div className="toggle-switch" onClick={handleRoleplayToggle}>
                <div className={`toggle-track ${roleplayAlert ? 'active' : ''}`}>
                  <div className="toggle-thumb" />
                </div>
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

      {/* 이름 수정 모달 */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>내 이름</h3>
              <button className="close-btn" onClick={() => setShowNameModal(false)}>
                <X size={24} color="#9ca3af" />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">AI 튜터가 부를 이름을 입력해주세요.</p>
              <input
                type="text"
                className="name-input"
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                placeholder="이름 입력"
                autoFocus
              />
            </div>
            <button className="save-btn" onClick={handleSaveName}>
              저장
            </button>
          </div>
        </div>
      )}

      <style>{`
        .settings-main-page {
          min-height: 100vh;
          background: #f5f5f5;
          display: flex;
          flex-direction: column;
        }

        .settings-main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }

        .settings-main-header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .close-btn {
          background: none;
          padding: 4px;
        }

        .settings-main-content {
          flex: 1;
          padding: 20px;
        }

        .settings-section {
          margin-bottom: 24px;
        }

        .section-label {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 8px;
          padding-left: 4px;
        }

        .settings-list {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: background 0.2s;
        }

        .settings-item:last-child {
          border-bottom: none;
        }

        .settings-item:active {
          background: #f9fafb;
        }

        .item-label {
          font-size: 16px;
          color: #1f2937;
        }

        .item-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .item-value {
          font-size: 14px;
          color: #9ca3af;
        }

        /* 토글 스위치 */
        .toggle-switch {
          cursor: pointer;
        }

        .toggle-track {
          width: 52px;
          height: 32px;
          background: #d1d5db;
          border-radius: 16px;
          position: relative;
          transition: background 0.3s;
        }

        .toggle-track.active {
          background: #5046e4;
        }

        .toggle-thumb {
          width: 28px;
          height: 28px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .toggle-track.active .toggle-thumb {
          transform: translateX(20px);
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

        .modal-content {
          background: white;
          border-radius: 24px 24px 0 0;
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
          margin-bottom: 20px;
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .modal-body {
          margin-bottom: 24px;
        }

        .modal-desc {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 16px;
        }

        .name-input {
          width: 100%;
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 16px;
          box-sizing: border-box;
        }

        .name-input:focus {
          border-color: #5046e4;
          outline: none;
        }

        .save-btn {
          width: 100%;
          padding: 18px;
          background: #5046e4;
          color: white;
          border-radius: 12px;
          font-size: 17px;
          font-weight: 600;
        }

        .save-btn:active {
          background: #4338ca;
        }
      `}</style>
    </div>
  )
}

export default Settings
