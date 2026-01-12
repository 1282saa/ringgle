/**
 * @file pages/Settings.jsx
 * @description 튜터 설정 모달 페이지
 *
 * 링글 앱 스타일의 튜터 선택 및 설정 화면
 * - 튜터 선택 (가로 스와이프 카드)
 * - 난이도 선택 (Easy / Intermediate)
 * - 속도 선택 (보통 / 천천히)
 * - 시간 선택 (5분 / 10분)
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import {
  TUTORS,
  LEVELS,
  SPEEDS,
  DURATIONS,
  ACCENT_LABELS,
  DEFAULT_SETTINGS,
} from '../constants'
import { getTutorSettings, saveTutorSettings, getDeviceId } from '../utils/helpers'
import { saveSettingsToServer, getSettingsFromServer } from '../utils/api'

function Settings() {
  const navigate = useNavigate()
  const scrollRef = useRef(null)

  // State
  const [selectedTutor, setSelectedTutor] = useState(DEFAULT_SETTINGS.tutorId)
  const [level, setLevel] = useState(DEFAULT_SETTINGS.level)
  const [speed, setSpeed] = useState(DEFAULT_SETTINGS.speed)
  const [duration, setDuration] = useState(DEFAULT_SETTINGS.duration)
  const [currentPage, setCurrentPage] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 저장된 설정 로드 (서버 우선, 실패 시 로컬스토리지)
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      try {
        const deviceId = getDeviceId()
        const response = await getSettingsFromServer(deviceId)

        if (response.success && response.settings) {
          // 서버에서 로드 성공
          const serverSettings = response.settings
          if (serverSettings.tutorId) setSelectedTutor(serverSettings.tutorId)
          if (serverSettings.level) setLevel(serverSettings.level)
          if (serverSettings.speed) setSpeed(serverSettings.speed)
          if (serverSettings.duration) setDuration(serverSettings.duration)

          // 선택된 튜터로 스크롤
          const tutorIndex = TUTORS.findIndex(t => t.id === (serverSettings.tutorId || DEFAULT_SETTINGS.tutorId))
          if (tutorIndex > 0) {
            setCurrentPage(tutorIndex)
          }

          // 로컬스토리지도 동기화
          saveTutorSettings(serverSettings)
        } else {
          // 서버에 설정 없음 - 로컬스토리지에서 로드
          const saved = getTutorSettings()
          if (saved.tutorId) setSelectedTutor(saved.tutorId)
          if (saved.level) setLevel(saved.level)
          if (saved.speed) setSpeed(saved.speed)
          if (saved.duration) setDuration(saved.duration)

          const tutorIndex = TUTORS.findIndex(t => t.id === (saved.tutorId || DEFAULT_SETTINGS.tutorId))
          if (tutorIndex > 0) {
            setCurrentPage(tutorIndex)
          }
        }
      } catch (error) {
        console.warn('[Settings] Failed to load from server, using local:', error)
        // 서버 실패 시 로컬스토리지에서 로드
        const saved = getTutorSettings()
        if (saved.tutorId) setSelectedTutor(saved.tutorId)
        if (saved.level) setLevel(saved.level)
        if (saved.speed) setSpeed(saved.speed)
        if (saved.duration) setDuration(saved.duration)

        const tutorIndex = TUTORS.findIndex(t => t.id === (saved.tutorId || DEFAULT_SETTINGS.tutorId))
        if (tutorIndex > 0) {
          setCurrentPage(tutorIndex)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // 스크롤 시 현재 페이지 업데이트
  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft
      const cardWidth = scrollRef.current.offsetWidth * 0.75
      const page = Math.round(scrollLeft / cardWidth)
      setCurrentPage(page)
    }
  }

  // 튜터 카드 클릭
  const handleTutorSelect = (tutorId, index) => {
    setSelectedTutor(tutorId)
    // 해당 카드로 스크롤
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth * 0.75
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      })
    }
  }

  // 저장 (로컬 + 서버)
  const handleSave = async () => {
    if (isSaving) return

    setIsSaving(true)
    const tutor = TUTORS.find(t => t.id === selectedTutor)
    const settings = {
      tutorId: selectedTutor,
      tutorName: tutor?.name || 'Gwen',
      accent: tutor?.accent || 'us',
      gender: tutor?.gender || 'female',
      level,
      speed,
      duration,
    }

    // 로컬스토리지에 먼저 저장
    saveTutorSettings(settings)

    // 서버에 비동기 저장 (실패해도 로컬은 저장됨)
    try {
      const deviceId = getDeviceId()
      await saveSettingsToServer(deviceId, settings)
      console.log('[Settings] Saved to server successfully')
    } catch (error) {
      console.warn('[Settings] Failed to save to server:', error)
    } finally {
      setIsSaving(false)
      navigate(-1)
    }
  }

  // 닫기
  const handleClose = () => {
    navigate(-1)
  }

  return (
    <div className="settings-modal">
      {/* Header */}
      <header className="settings-header">
        <h1>튜터</h1>
        <button className="close-btn" onClick={handleClose}>
          <X size={24} color="#9ca3af" />
        </button>
      </header>

      <div className="settings-content">
        {/* 튜터 선택 섹션 */}
        <section className="section">
          <h2 className="section-title">튜터 선택</h2>

          <div
            className="tutor-carousel"
            ref={scrollRef}
            onScroll={handleScroll}
          >
            {TUTORS.map((tutor, index) => {
              const accentLabel = ACCENT_LABELS[tutor.accent] || '미국'
              const genderLabel = tutor.gender === 'male' ? '남성' : '여성'

              return (
                <div
                  key={tutor.id}
                  className={`tutor-card ${selectedTutor === tutor.id ? 'selected' : ''}`}
                  onClick={() => handleTutorSelect(tutor.id, index)}
                >
                  <span className="tutor-info">{accentLabel} {genderLabel}</span>
                  <h3 className="tutor-name">{tutor.name}</h3>
                  <div className="tutor-tags">
                    {tutor.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 페이지 인디케이터 */}
          <div className="page-dots">
            {TUTORS.map((_, index) => (
              <span
                key={index}
                className={`dot ${currentPage === index ? 'active' : ''}`}
              />
            ))}
          </div>
        </section>

        {/* 난이도 선택 */}
        <section className="section">
          <h2 className="section-title">난이도 선택</h2>
          <div className="option-buttons">
            {LEVELS.map(item => (
              <button
                key={item.id}
                className={`option-btn ${level === item.id ? 'selected' : ''}`}
                onClick={() => setLevel(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* 속도 선택 */}
        <section className="section">
          <h2 className="section-title">속도 선택</h2>
          <div className="option-buttons">
            {SPEEDS.map(item => (
              <button
                key={item.id}
                className={`option-btn ${speed === item.id ? 'selected' : ''}`}
                onClick={() => setSpeed(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* 시간 선택 */}
        <section className="section">
          <h2 className="section-title">시간 선택</h2>
          <p className="section-desc">종료 전 5분 단위로 연장할 수 있어요.</p>
          <div className="option-buttons">
            {DURATIONS.map(item => (
              <button
                key={item.id}
                className={`option-btn ${duration === item.id ? 'selected' : ''}`}
                onClick={() => setDuration(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* 저장 버튼 */}
      <div className="save-section">
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={isSaving || isLoading}
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>

      <style>{`
        .settings-modal {
          min-height: 100vh;
          background: white;
          display: flex;
          flex-direction: column;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
        }

        .settings-header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .close-btn {
          background: none;
          padding: 4px;
        }

        .settings-content {
          flex: 1;
          padding: 24px 20px;
          overflow-y: auto;
        }

        .section {
          margin-bottom: 32px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 16px;
        }

        .section-desc {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 12px;
          margin-top: -8px;
        }

        /* 튜터 카루셀 */
        .tutor-carousel {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 8px;
        }

        .tutor-carousel::-webkit-scrollbar {
          display: none;
        }

        .tutor-card {
          flex: 0 0 75%;
          min-width: 75%;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          padding: 20px;
          scroll-snap-align: start;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tutor-card.selected {
          background: #ede9fe;
          border-color: #8b5cf6;
        }

        .tutor-info {
          font-size: 13px;
          color: #6b7280;
          display: block;
          margin-bottom: 8px;
        }

        .tutor-card.selected .tutor-info {
          color: #7c3aed;
        }

        .tutor-name {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 12px;
        }

        .tutor-tags {
          display: flex;
          gap: 8px;
        }

        .tag {
          font-size: 13px;
          color: #6b7280;
        }

        .tutor-card.selected .tag {
          color: #7c3aed;
        }

        /* 페이지 인디케이터 */
        .page-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 16px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e5e7eb;
          transition: all 0.2s ease;
        }

        .dot.active {
          background: #5046e4;
          width: 16px;
          border-radius: 4px;
        }

        /* 옵션 버튼 */
        .option-buttons {
          display: flex;
          gap: 12px;
        }

        .option-btn {
          padding: 14px 24px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          color: #374151;
          background: white;
          transition: all 0.2s ease;
        }

        .option-btn.selected {
          border-color: #8b5cf6;
          background: #ede9fe;
          color: #7c3aed;
        }

        /* 저장 버튼 */
        .save-section {
          padding: 16px 20px 32px;
          background: white;
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

        .save-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

export default Settings
