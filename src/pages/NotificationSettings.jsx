/**
 * @file pages/NotificationSettings.jsx
 * @description 알림 설정 페이지 (링글 앱 스타일)
 *
 * - AI 스피킹 파트너 알림 (앱푸시)
 * - 리마인더 알림 (예약된 전화 리마인더)
 * - AI 분석 리포트 알림
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Bell, Phone, FileText, Clock } from 'lucide-react';
import { getFromStorage, setToStorage } from '../utils/helpers';
import { notificationService } from '../services/notificationService';

function NotificationSettings() {
  const navigate = useNavigate();

  // 알림 설정 상태
  const [speakingNotification, setSpeakingNotification] = useState(true);
  const [reminderNotification, setReminderNotification] = useState(true);
  const [analysisNotification, setAnalysisNotification] = useState(true);

  // 토스트
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 초기 설정 로드
  useEffect(() => {
    setSpeakingNotification(getFromStorage('notification_speaking', true));
    setReminderNotification(getFromStorage('notification_reminder', true));
    setAnalysisNotification(getFromStorage('notification_analysis', true));
  }, []);

  // 토스트 표시
  const displayToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // 토글 핸들러
  const handleSpeakingToggle = () => {
    const newValue = !speakingNotification;
    setSpeakingNotification(newValue);
    setToStorage('notification_speaking', newValue);
    displayToast(newValue ? 'AI 스피킹 파트너 알림이 켜졌습니다' : 'AI 스피킹 파트너 알림이 꺼졌습니다');
  };

  const handleReminderToggle = async () => {
    const newValue = !reminderNotification;
    setReminderNotification(newValue);
    setToStorage('notification_reminder', newValue);

    // 리마인더 동기화
    await notificationService.syncReminders();

    displayToast(newValue ? '리마인더 알림이 켜졌습니다' : '리마인더 알림이 꺼졌습니다');
  };

  const handleAnalysisToggle = () => {
    const newValue = !analysisNotification;
    setAnalysisNotification(newValue);
    setToStorage('notification_analysis', newValue);
    displayToast(newValue ? 'AI 분석 리포트 알림이 켜졌습니다' : 'AI 분석 리포트 알림이 꺼졌습니다');
  };

  // 테스트 알림 전송
  const sendTestNotification = async () => {
    await notificationService.showIncomingCallNotification();
    displayToast('테스트 알림을 전송했습니다');
  };

  return (
    <div className="notification-settings-page">
      {/* 헤더 */}
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={28} color="#1a1a1a" />
        </button>
        <h1>알림 설정</h1>
        <div className="header-spacer" />
      </header>

      {/* 메인 콘텐츠 */}
      <div className="page-content">
        {/* 설명 */}
        <p className="page-description">
          AI 전화와 관련된 알림을 설정할 수 있어요.
        </p>

        {/* 알림 설정 목록 */}
        <div className="settings-card">
          {/* AI 스피킹 파트너 */}
          <div className="notification-item">
            <div className="item-left">
              <div className="item-icon speaking">
                <Phone size={20} color="white" />
              </div>
              <div className="item-info">
                <span className="item-title">AI 스피킹 파트너</span>
                <span className="item-desc">앱푸시</span>
              </div>
            </div>
            <div className="toggle-switch" onClick={handleSpeakingToggle}>
              <div className={`toggle-track ${speakingNotification ? 'active' : ''}`}>
                <div className="toggle-thumb" />
              </div>
            </div>
          </div>

          {/* 리마인더 */}
          <div className="notification-item">
            <div className="item-left">
              <div className="item-icon reminder">
                <Clock size={20} color="white" />
              </div>
              <div className="item-info">
                <span className="item-title">리마인더</span>
                <span className="item-desc">예약한 AI 스피킹 파트너 리마인더</span>
              </div>
            </div>
            <div className="toggle-switch" onClick={handleReminderToggle}>
              <div className={`toggle-track ${reminderNotification ? 'active' : ''}`}>
                <div className="toggle-thumb" />
              </div>
            </div>
          </div>

          {/* AI 분석 리포트 */}
          <div className="notification-item">
            <div className="item-left">
              <div className="item-icon analysis">
                <FileText size={20} color="white" />
              </div>
              <div className="item-info">
                <span className="item-title">AI 분석 리포트</span>
                <span className="item-desc">AI 분석 리포트가 도착하면 알림</span>
              </div>
            </div>
            <div className="toggle-switch" onClick={handleAnalysisToggle}>
              <div className={`toggle-track ${analysisNotification ? 'active' : ''}`}>
                <div className="toggle-thumb" />
              </div>
            </div>
          </div>
        </div>

        {/* 테스트 알림 버튼 */}
        <button className="test-btn" onClick={sendTestNotification}>
          <Bell size={18} />
          테스트 알림 보내기
        </button>

        {/* 안내 문구 */}
        <div className="info-box">
          <p className="info-title">알림이 오지 않나요?</p>
          <p className="info-text">
            기기 설정 {'>'} 앱 {'>'} AI English Call {'>'} 알림에서<br />
            알림이 허용되어 있는지 확인해주세요.
          </p>
        </div>
      </div>

      {/* 토스트 */}
      {showToast && (
        <div className="toast">
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      <style>{`
        .notification-settings-page {
          min-height: 100vh;
          background: #f7f7f8;
          display: flex;
          flex-direction: column;
        }

        /* 헤더 */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 8px;
          background: white;
          border-bottom: 1px solid #e8e8e8;
        }

        .page-header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .back-btn {
          background: none;
          padding: 8px;
          display: flex;
          align-items: center;
        }

        .header-spacer {
          width: 44px;
        }

        /* 메인 콘텐츠 */
        .page-content {
          flex: 1;
          padding: 24px 20px;
        }

        .page-description {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
        }

        /* 설정 카드 */
        .settings-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .notification-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid #f0f0f0;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .item-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .item-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .item-icon.speaking {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }

        .item-icon.reminder {
          background: linear-gradient(135deg, #f59e0b, #f97316);
        }

        .item-icon.analysis {
          background: linear-gradient(135deg, #10b981, #22c55e);
        }

        .item-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .item-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .item-desc {
          font-size: 13px;
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

        /* 테스트 버튼 */
        .test-btn {
          width: 100%;
          padding: 16px;
          background: white;
          border: 1.5px solid #e0e0e0;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          color: #6366f1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
          transition: all 0.2s;
        }

        .test-btn:active {
          background: #f5f5f5;
          border-color: #6366f1;
        }

        /* 안내 박스 */
        .info-box {
          background: #f0f4ff;
          border-radius: 12px;
          padding: 16px;
        }

        .info-title {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .info-text {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
        }

        /* 토스트 */
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
      `}</style>
    </div>
  );
}

export default NotificationSettings;
