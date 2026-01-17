/**
 * @file pages/RoleplaySettings.jsx
 * @description 롤플레잉/디스커션 알림 설정 페이지 (링글 앱 100% 동일)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getFromStorage } from '../utils/helpers'

// 링글 원본과 동일한 말풍선 아이콘
const ChatBubbleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path
      d="M11 2C5.48 2 1 5.58 1 10c0 2.12 1.04 4.04 2.74 5.44L3 19l4.1-1.64C8.32 17.78 9.62 18 11 18c5.52 0 10-3.58 10-8s-4.48-8-10-8z"
      fill="#6B5CE7"
    />
    <text x="8" y="13" fontSize="8" fill="white">:)</text>
  </svg>
)

function RoleplaySettings() {
  const navigate = useNavigate()

  const [scheduleCount, setScheduleCount] = useState(0)
  const [selectedRoleplay, setSelectedRoleplay] = useState(null)

  useEffect(() => {
    // 일정 카운트 (롤플레잉 타입만)
    const schedules = getFromStorage('callSchedules', {})
    let roleplayCount = 0
    Object.values(schedules).forEach(daySchedules => {
      daySchedules.forEach(schedule => {
        if (schedule.type === 'roleplay') {
          roleplayCount++
        }
      })
    })
    setScheduleCount(roleplayCount)

    // 선택된 롤플레잉 주제
    const saved = getFromStorage('selectedRoleplay', null)
    setSelectedRoleplay(saved)
  }, [])

  return (
    <div className="roleplay-settings-page">
      {/* 헤더 */}
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#1a1a1a" />
        </button>
        <h1>롤플레잉/디스커션 알림</h1>
        <div className="header-spacer" />
      </header>

      {/* 선택된 주제 표시 */}
      <div className="next-topic-card">
        <div className="topic-left-bar" />
        <div className="topic-content">
          <div className="topic-label">
            <ChatBubbleIcon />
            <span>다음 주제</span>
          </div>
          <h3 className="topic-title">
            {selectedRoleplay?.title || '출입국 관리소에서'}
          </h3>
          <p className="topic-desc">
            {selectedRoleplay?.description || '입국 심사대에서 입국 수속과 통관 절차를 밟고 있습니다.'}
          </p>
        </div>
      </div>

      {/* 메뉴 리스트 */}
      <div className="menu-list">
        <div
          className="menu-item"
          onClick={() => navigate('/settings/schedule')}
        >
          <span className="menu-label">일정</span>
          <div className="menu-right">
            <span className="menu-value">주 {scheduleCount}회</span>
            <ChevronRight size={20} color="#C0C0C0" />
          </div>
        </div>

        <div
          className="menu-item"
          onClick={() => navigate('/settings/roleplay/category')}
        >
          <span className="menu-label">롤플레잉</span>
          <div className="menu-right">
            <span className="menu-value purple">
              {selectedRoleplay?.category || '해외여행 필수영어'}
            </span>
            <ChevronRight size={20} color="#C0C0C0" />
          </div>
        </div>

        <div className="menu-item disabled">
          <span className="menu-label disabled-text">디스커션</span>
          <div className="menu-right">
            <span className="menu-value disabled-text">오픈 준비중</span>
          </div>
        </div>
      </div>

      {/* 설명 섹션 */}
      <div className="info-section">
        <div className="info-divider" />
        <h3 className="info-title">롤플레잉/디스커션 알림이란?</h3>
        <ul className="info-list">
          <li>AI 올인원 멤버십을 사용하는 고객님만 받을 수 있는 한정 서비스예요.</li>
          <li>설정한 시간에 맞추어 롤플레잉/디스커션 대화로 연결되는 전화를 드려요.</li>
          <li>일반 전화와는 달리, 전화를 받으면 링글 앱이 열려요. 롤플레잉/디스커션을 꾸준히 이어가 보세요!</li>
        </ul>
      </div>

      <style>{`
        .roleplay-settings-page {
          min-height: 100vh;
          background: #F7F7F8;
          display: flex;
          flex-direction: column;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #F0F0F0;
        }

        .page-header h1 {
          font-size: 17px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .back-btn {
          background: none;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .header-spacer {
          width: 32px;
        }

        /* 다음 주제 카드 - 좌측 보라색 바 */
        .next-topic-card {
          margin: 20px;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          border: 1px solid #E8E8E8;
        }

        .topic-left-bar {
          width: 4px;
          background: #6B5CE7;
          flex-shrink: 0;
        }

        .topic-content {
          padding: 20px;
          flex: 1;
        }

        .topic-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .topic-label span {
          font-size: 14px;
          color: #6B5CE7;
          font-weight: 500;
        }

        .topic-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .topic-desc {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
        }

        /* 메뉴 리스트 */
        .menu-list {
          margin: 0 20px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 20px;
          background: white;
          border-radius: 12px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: background 0.15s;
          border: 1px solid #F0F0F0;
        }

        .menu-item:active:not(.disabled) {
          background: #F9F9F9;
        }

        .menu-item.disabled {
          cursor: default;
        }

        .menu-label {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .menu-label.disabled-text {
          color: #C0C0C0;
        }

        .menu-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .menu-value {
          font-size: 15px;
          color: #666;
          font-weight: 500;
        }

        .menu-value.purple {
          color: #6B5CE7;
        }

        .menu-value.disabled-text {
          color: #C0C0C0;
        }

        /* 설명 섹션 */
        .info-section {
          padding: 0 20px 40px;
          margin-top: auto;
        }

        .info-divider {
          height: 6px;
          background: #6B5CE7;
          margin: 0 -20px 24px;
        }

        .info-title {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 16px;
        }

        .info-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .info-list li {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
          margin-bottom: 12px;
          padding-left: 16px;
          position: relative;
        }

        .info-list li::before {
          content: '-';
          position: absolute;
          left: 0;
          color: #666;
        }
      `}</style>
    </div>
  )
}

export default RoleplaySettings
