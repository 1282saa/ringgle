/**
 * @file pages/ScheduleSettings.jsx
 * @description 일정 설정 페이지 (링글 앱 스타일)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, X } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'
import { notificationService } from '../services/notificationService'

const DAYS = [
  { id: 'sunday', label: '일요일', labelEn: 'Sunday', short: '일' },
  { id: 'monday', label: '월요일', labelEn: 'Monday', short: '월' },
  { id: 'tuesday', label: '화요일', labelEn: 'Tuesday', short: '화' },
  { id: 'wednesday', label: '수요일', labelEn: 'Wednesday', short: '수' },
  { id: 'thursday', label: '목요일', labelEn: 'Thursday', short: '목' },
  { id: 'friday', label: '금요일', labelEn: 'Friday', short: '금' },
  { id: 'saturday', label: '토요일', labelEn: 'Saturday', short: '토' },
]

const CALL_TYPES = [
  { id: 'normal', label: '일반 AI 전화', color: '#22c55e', bgColor: '#dcfce7' },
  { id: 'roleplay', label: '롤플레잉', color: '#3b82f6', bgColor: '#dbeafe' },
]

function ScheduleSettings() {
  const navigate = useNavigate()

  const [schedules, setSchedules] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [editingDay, setEditingDay] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [selectedType, setSelectedType] = useState('normal')
  const [selectedTime, setSelectedTime] = useState('19:00')

  useEffect(() => {
    const saved = getFromStorage('callSchedules', {})
    setSchedules(saved)
  }, [])

  const openAddModal = (dayId) => {
    setEditingDay(dayId)
    setEditingIndex(null)
    setSelectedType('normal')
    setSelectedTime('19:00')
    setShowModal(true)
  }

  const openEditModal = (dayId, index) => {
    const schedule = schedules[dayId]?.[index]
    if (schedule) {
      setEditingDay(dayId)
      setEditingIndex(index)
      setSelectedType(schedule.type)
      setSelectedTime(schedule.time)
      setShowModal(true)
    }
  }

  const handleSave = async () => {
    const newSchedules = { ...schedules }
    if (!newSchedules[editingDay]) {
      newSchedules[editingDay] = []
    }
    const scheduleItem = { type: selectedType, time: selectedTime }
    if (editingIndex !== null) {
      newSchedules[editingDay][editingIndex] = scheduleItem
    } else {
      newSchedules[editingDay].push(scheduleItem)
    }
    newSchedules[editingDay].sort((a, b) => a.time.localeCompare(b.time))
    setSchedules(newSchedules)
    setToStorage('callSchedules', newSchedules)
    setShowModal(false)

    // 알림 리마인더 동기화
    await notificationService.syncReminders()
  }

  const handleDelete = async () => {
    if (editingIndex === null) return
    const newSchedules = { ...schedules }
    newSchedules[editingDay].splice(editingIndex, 1)
    if (newSchedules[editingDay].length === 0) {
      delete newSchedules[editingDay]
    }
    setSchedules(newSchedules)
    setToStorage('callSchedules', newSchedules)
    setShowModal(false)

    // 알림 리마인더 동기화
    await notificationService.syncReminders()
  }

  return (
    <div className="schedule-settings-page">
      {/* 헤더 */}
      <header className="page-header">
        <h1>일정 설정</h1>
        <button className="close-btn" onClick={() => navigate(-1)}>
          <X size={24} color="#6b7280" />
        </button>
      </header>

      {/* 설명 */}
      <div className="page-desc">
        <p>설정한 시간에 전화가 걸려와요.</p>
      </div>

      {/* 요일별 리스트 */}
      <div className="schedule-list">
        {DAYS.map((day) => (
          <div key={day.id} className="day-section">
            <div className="day-row">
              <span className="day-name">{day.label}</span>
              <button className="add-btn" onClick={() => openAddModal(day.id)}>
                <Plus size={22} color="#9ca3af" />
              </button>
            </div>

            {schedules[day.id]?.map((schedule, index) => {
              const typeInfo = CALL_TYPES.find(t => t.id === schedule.type)
              return (
                <div
                  key={index}
                  className="schedule-item"
                  onClick={() => openEditModal(day.id, index)}
                >
                  <div className="schedule-info">
                    <span
                      className="type-badge"
                      style={{
                        backgroundColor: typeInfo?.bgColor,
                        color: typeInfo?.color
                      }}
                    >
                      {typeInfo?.label}
                    </span>
                    <span className="schedule-time">{schedule.time}</span>
                  </div>
                  <ChevronRight size={20} color="#c0c0c0" />
                </div>
              )
            })}
          </div>
        ))}
      </div>


      {/* 일정 추가/수정 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{DAYS.find(d => d.id === editingDay)?.labelEn}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} color="#888" />
              </button>
            </div>

            {/* 전화 타입 선택 */}
            <div className="type-selector">
              {CALL_TYPES.map((type) => (
                <button
                  key={type.id}
                  className={`type-option ${selectedType === type.id ? 'selected' : ''}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* 시간 선택 */}
            <div className="time-picker-wrap">
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="time-picker"
              />
            </div>

            {/* 저장 버튼 */}
            <button className="primary-btn" onClick={handleSave}>
              저장
            </button>

            {/* 삭제 버튼 */}
            {editingIndex !== null && (
              <button className="delete-btn" onClick={handleDelete}>
                일정 삭제하기
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .schedule-settings-page {
          min-height: 100vh;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: white;
        }

        .page-header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .close-btn {
          background: none;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .page-desc {
          padding: 20px 20px 12px;
        }

        .page-desc p {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
        }

        .schedule-list {
          flex: 1;
          padding: 0 20px;
        }

        .day-section {
          margin-bottom: 4px;
        }

        .day-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid #e8e8e8;
        }

        .day-name {
          font-size: 16px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .add-btn {
          background: none;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .schedule-item {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 12px 0;
          cursor: pointer;
          gap: 8px;
        }

        .schedule-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .type-badge {
          font-size: 13px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 20px;
        }

        .schedule-time {
          font-size: 16px;
          color: #1a1a1a;
          font-weight: 600;
          letter-spacing: 0.5px;
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
          margin-bottom: 24px;
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .close-btn {
          background: none;
          padding: 4px;
        }

        .type-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
        }

        .type-option {
          flex: 1;
          padding: 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 24px;
          font-size: 15px;
          font-weight: 500;
          color: #6b7280;
          background: white;
          transition: all 0.2s;
        }

        .type-option.selected {
          border-color: transparent;
          color: #1f2937;
          background: #e0e7ff;
        }

        .time-picker-wrap {
          margin-bottom: 24px;
        }

        .time-picker {
          width: 100%;
          padding: 20px 16px;
          border: none;
          border-radius: 12px;
          font-size: 20px;
          font-weight: 500;
          text-align: center;
          box-sizing: border-box;
          background: #f3f4f6;
          color: #1a1a1a;
        }

        .time-picker:focus {
          outline: none;
          background: #e5e7eb;
        }

        .primary-btn {
          width: 100%;
          padding: 16px;
          background: #4338ca;
          color: white;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .primary-btn:active {
          background: #3730a3;
        }

        .delete-btn {
          width: 100%;
          padding: 14px;
          background: none;
          color: #374151;
          font-size: 15px;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

export default ScheduleSettings
