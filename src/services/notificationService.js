/**
 * @file services/notificationService.js
 * @description 푸시 알림 및 로컬 알림 서비스
 *
 * 기능:
 * - 푸시 알림 (Firebase Cloud Messaging)
 * - 로컬 알림 (예약 리마인더)
 * - 알림 탭 시 딥링크 처리
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { getFromStorage, setToStorage, getDeviceId } from '../utils/helpers';
import { registerFcmToken } from '../utils/api';

// 알림 채널 ID
const CHANNEL_AI_SPEAKING = 'ai-speaking-partner';
const CHANNEL_REMINDER = 'reminder';
const CHANNEL_ANALYSIS = 'ai-analysis-report';

/**
 * 알림 서비스 클래스
 */
class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.pushToken = null;
  }

  /**
   * 알림 서비스 초기화
   */
  async initialize() {
    if (this.isInitialized) return;

    // 웹에서는 알림 기능 제한
    if (!Capacitor.isNativePlatform()) {
      console.log('[NotificationService] Running on web, limited functionality');
      this.isInitialized = true;
      return;
    }

    try {
      // 로컬 알림 권한 요청
      await this.requestLocalNotificationPermission();

      // 푸시 알림 권한 요청
      await this.requestPushNotificationPermission();

      // 알림 채널 생성 (Android)
      await this.createNotificationChannels();

      // 리스너 등록
      this.registerListeners();

      this.isInitialized = true;
      console.log('[NotificationService] Initialized successfully');
    } catch (error) {
      console.error('[NotificationService] Initialization failed:', error);
    }
  }

  /**
   * 로컬 알림 권한 요청
   */
  async requestLocalNotificationPermission() {
    const permission = await LocalNotifications.requestPermissions();
    console.log('[NotificationService] Local notification permission:', permission);
    return permission.display === 'granted';
  }

  /**
   * 푸시 알림 권한 요청
   */
  async requestPushNotificationPermission() {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('[NotificationService] Push notification permission denied');
      return false;
    }

    // 푸시 알림 등록
    await PushNotifications.register();
    return true;
  }

  /**
   * 알림 채널 생성 (Android)
   */
  async createNotificationChannels() {
    if (Capacitor.getPlatform() !== 'android') return;

    await LocalNotifications.createChannel({
      id: CHANNEL_AI_SPEAKING,
      name: 'AI 스피킹 파트너',
      description: 'AI 전화 관련 알림',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: CHANNEL_REMINDER,
      name: '리마인더',
      description: '예약된 AI 전화 리마인더',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
    });

    await LocalNotifications.createChannel({
      id: CHANNEL_ANALYSIS,
      name: 'AI 분석 리포트',
      description: '대화 분석 결과 알림',
      importance: 4,
      visibility: 1,
      sound: 'default',
    });
  }

  /**
   * 이벤트 리스너 등록
   */
  registerListeners() {
    // 푸시 토큰 수신
    PushNotifications.addListener('registration', async (token) => {
      console.log('[NotificationService] Push registration token:', token.value);
      this.pushToken = token.value;
      setToStorage('pushToken', token.value);

      // 서버에 FCM 토큰 등록
      try {
        const deviceId = getDeviceId();
        const platform = Capacitor.getPlatform();
        await registerFcmToken(deviceId, token.value, platform);
        console.log('[NotificationService] FCM token registered with server');
      } catch (error) {
        console.error('[NotificationService] Failed to register FCM token:', error);
      }
    });

    // 푸시 등록 에러
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[NotificationService] Push registration error:', error);
    });

    // 푸시 알림 수신 (앱이 열려있을 때)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[NotificationService] Push received:', notification);
      this.handleNotification(notification.data);
    });

    // 푸시 알림 탭 (앱 백그라운드 또는 종료 상태)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[NotificationService] Push action:', action);
      this.handleNotificationAction(action.notification.data);
    });

    // 로컬 알림 탭
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('[NotificationService] Local notification action:', action);
      this.handleNotificationAction(action.notification.extra);
    });
  }

  /**
   * 알림 수신 처리
   */
  handleNotification(data) {
    // 앱이 열려있을 때 알림 수신 시 처리
    if (data?.type === 'incoming_call') {
      // 전화 수신 알림 - 전화 화면으로 이동
      window.dispatchEvent(new CustomEvent('incoming-call', { detail: data }));
    }
  }

  /**
   * 알림 탭 액션 처리
   */
  handleNotificationAction(data) {
    if (!data) return;

    switch (data.type) {
      case 'incoming_call':
        // 전화 화면으로 이동
        window.location.href = '/call';
        break;
      case 'analysis_report':
        // 분석 결과 화면으로 이동
        window.location.href = '/analysis';
        break;
      case 'reminder':
        // 홈 화면으로 이동
        window.location.href = '/';
        break;
      default:
        window.location.href = '/';
    }
  }

  /**
   * 예약 리마인더 설정
   * @param {Object} schedule - 일정 정보
   * @param {string} schedule.id - 알림 ID
   * @param {string} schedule.day - 요일 (sunday, monday, ... or sun, mon, ...)
   * @param {string} schedule.time - 시간 (HH:MM)
   */
  async scheduleReminder(schedule) {
    if (!Capacitor.isNativePlatform()) {
      console.log('[NotificationService] Cannot schedule on web');
      return;
    }

    const reminderEnabled = getFromStorage('notification_reminder', true);
    if (!reminderEnabled) {
      console.log('[NotificationService] Reminder notifications disabled');
      return;
    }

    const dayMap = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
    };

    const [hours, minutes] = schedule.time.split(':').map(Number);
    const dayOfWeek = dayMap[schedule.day];

    // 다음 발생 시간 계산
    const now = new Date();
    const scheduleDate = new Date();
    scheduleDate.setHours(hours, minutes, 0, 0);

    // 요일 맞추기
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0 || (daysUntil === 0 && scheduleDate <= now)) {
      daysUntil += 7;
    }
    scheduleDate.setDate(scheduleDate.getDate() + daysUntil);

    const notificationId = this.generateNotificationId(schedule.id);

    await LocalNotifications.schedule({
      notifications: [{
        id: notificationId,
        title: '📞 AI 전화 시간이에요!',
        body: '지금 AI 튜터와 영어 회화를 시작해보세요.',
        schedule: { at: scheduleDate, repeats: true },
        channelId: CHANNEL_REMINDER,
        sound: 'default',
        extra: {
          type: 'incoming_call',
          scheduleId: schedule.id,
        },
        actionTypeId: 'CALL_ACTION',
      }],
    });

    console.log(`[NotificationService] Scheduled reminder for ${schedule.day} ${schedule.time}`);
  }

  /**
   * 리마인더 취소
   */
  async cancelReminder(scheduleId) {
    if (!Capacitor.isNativePlatform()) return;

    const notificationId = this.generateNotificationId(scheduleId);
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
    console.log(`[NotificationService] Cancelled reminder: ${scheduleId}`);
  }

  /**
   * 모든 예약된 리마인더 동기화
   */
  async syncReminders() {
    if (!Capacitor.isNativePlatform()) return;

    // 기존 알림 모두 취소
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    // 저장된 일정 불러오기
    const schedules = getFromStorage('callSchedules', {});
    const reminderEnabled = getFromStorage('notification_reminder', true);

    if (!reminderEnabled) {
      console.log('[NotificationService] Reminders disabled, cleared all');
      return;
    }

    // 새로운 알림 등록
    let scheduledCount = 0;
    for (const [day, daySchedules] of Object.entries(schedules)) {
      for (const schedule of daySchedules) {
        await this.scheduleReminder({
          id: `${day}-${schedule.time}`,
          day,
          time: schedule.time,
        });
        scheduledCount++;
      }
    }

    console.log(`[NotificationService] Synced ${scheduledCount} reminders`);
  }

  /**
   * 수신 전화 스타일 알림 표시 (테스트용)
   */
  async showIncomingCallNotification() {
    if (!Capacitor.isNativePlatform()) {
      console.log('[NotificationService] Cannot show notification on web');
      return;
    }

    const speakingEnabled = getFromStorage('notification_speaking', true);
    if (!speakingEnabled) {
      console.log('[NotificationService] Speaking notifications disabled');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 100000),
        title: '📞 AI 튜터가 전화를 걸고 있어요!',
        body: '탭하여 영어 회화를 시작하세요',
        channelId: CHANNEL_AI_SPEAKING,
        sound: 'default',
        extra: {
          type: 'incoming_call',
        },
      }],
    });
  }

  /**
   * 분석 완료 알림
   */
  async showAnalysisCompleteNotification() {
    if (!Capacitor.isNativePlatform()) return;

    const analysisEnabled = getFromStorage('notification_analysis', true);
    if (!analysisEnabled) return;

    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 100000),
        title: '📊 AI 분석 리포트가 도착했어요!',
        body: '대화 분석 결과를 확인해보세요.',
        channelId: CHANNEL_ANALYSIS,
        sound: 'default',
        extra: {
          type: 'analysis_report',
        },
      }],
    });
  }

  /**
   * 알림 ID 생성 (문자열을 숫자로 변환)
   */
  generateNotificationId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return Math.abs(hash);
  }

  /**
   * 푸시 토큰 가져오기
   */
  getPushToken() {
    return this.pushToken || getFromStorage('pushToken', null);
  }
}

// 싱글톤 인스턴스
export const notificationService = new NotificationService();
export default notificationService;
