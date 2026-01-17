/**
 * Capacitor 플러그인 유틸리티
 * 모바일 앱 기능 (뒤로가기, 상태바, 스플래시 등)
 */

import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

// 플랫폼 체크
export const isNative = () => Capacitor.isNativePlatform()
export const isAndroid = () => Capacitor.getPlatform() === 'android'
export const isIOS = () => Capacitor.getPlatform() === 'ios'
export const isWeb = () => Capacitor.getPlatform() === 'web'

/**
 * Android 뒤로가기 버튼 핸들러 설정
 * @param {Function} onBack - 뒤로가기 콜백 (true 반환 시 기본 동작 방지)
 * @returns {Function} cleanup 함수
 */
export const setupBackButton = (onBack) => {
  if (!isNative()) return () => {}

  const listener = App.addListener('backButton', ({ canGoBack }) => {
    // 커스텀 핸들러 실행
    const handled = onBack?.(canGoBack)

    // 핸들러가 처리하지 않았고, 뒤로 갈 수 있으면 히스토리 뒤로
    if (!handled && canGoBack) {
      window.history.back()
    } else if (!handled && !canGoBack) {
      // 더 이상 뒤로 갈 곳이 없으면 앱 종료
      App.exitApp()
    }
  })

  return () => {
    listener.then(l => l.remove())
  }
}

/**
 * 상태바 설정
 * @param {Object} options - 상태바 옵션
 */
export const configureStatusBar = async (options = {}) => {
  if (!isNative()) return

  const {
    style = 'light', // 'light' | 'dark'
    backgroundColor = '#ffffff',
    overlay = false
  } = options

  try {
    // 상태바 스타일 설정
    await StatusBar.setStyle({
      style: style === 'dark' ? Style.Dark : Style.Light
    })

    // Android에서만 배경색 설정 가능
    if (isAndroid()) {
      await StatusBar.setBackgroundColor({ color: backgroundColor })
    }

    // 오버레이 모드 (콘텐츠가 상태바 아래로)
    if (overlay) {
      await StatusBar.setOverlaysWebView({ overlay: true })
    }
  } catch (error) {
    console.warn('[Capacitor] StatusBar error:', error)
  }
}

/**
 * 상태바 숨기기/보이기
 */
export const hideStatusBar = async () => {
  if (!isNative()) return
  try {
    await StatusBar.hide()
  } catch (error) {
    console.warn('[Capacitor] Hide StatusBar error:', error)
  }
}

export const showStatusBar = async () => {
  if (!isNative()) return
  try {
    await StatusBar.show()
  } catch (error) {
    console.warn('[Capacitor] Show StatusBar error:', error)
  }
}

/**
 * 스플래시 화면 숨기기
 * @param {number} fadeOutDuration - 페이드 아웃 시간 (ms)
 */
export const hideSplash = async (fadeOutDuration = 300) => {
  if (!isNative()) return

  try {
    await SplashScreen.hide({
      fadeOutDuration
    })
  } catch (error) {
    console.warn('[Capacitor] SplashScreen error:', error)
  }
}

/**
 * 햅틱 피드백
 */
export const haptic = {
  // 가벼운 탭
  light: async () => {
    if (!isNative()) return
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (error) {
      console.warn('[Capacitor] Haptics error:', error)
    }
  },

  // 중간 탭
  medium: async () => {
    if (!isNative()) return
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch (error) {
      console.warn('[Capacitor] Haptics error:', error)
    }
  },

  // 강한 탭
  heavy: async () => {
    if (!isNative()) return
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch (error) {
      console.warn('[Capacitor] Haptics error:', error)
    }
  },

  // 성공 알림
  success: async () => {
    if (!isNative()) return
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch (error) {
      console.warn('[Capacitor] Haptics error:', error)
    }
  },

  // 경고 알림
  warning: async () => {
    if (!isNative()) return
    try {
      await Haptics.notification({ type: NotificationType.Warning })
    } catch (error) {
      console.warn('[Capacitor] Haptics error:', error)
    }
  },

  // 에러 알림
  error: async () => {
    if (!isNative()) return
    try {
      await Haptics.notification({ type: NotificationType.Error })
    } catch (error) {
      console.warn('[Capacitor] Haptics error:', error)
    }
  },

  // 선택 변경
  selection: async () => {
    if (!isNative()) return
    try {
      await Haptics.selectionChanged()
    } catch (error) {
      console.warn('[Capacitor] Haptics error:', error)
    }
  }
}

/**
 * 앱 초기화 (App.jsx에서 호출)
 */
export const initializeApp = async () => {
  if (!isNative()) {
    console.log('[Capacitor] Running on web, skipping native initialization')
    return
  }

  console.log('[Capacitor] Initializing native app...')
  console.log('[Capacitor] Platform:', Capacitor.getPlatform())

  // 상태바 설정
  await configureStatusBar({
    style: 'dark', // 어두운 아이콘 (밝은 배경)
    backgroundColor: '#ffffff'
  })

  // 스플래시 화면 숨기기 (앱 준비 완료 후)
  await hideSplash(500)

  console.log('[Capacitor] Native initialization complete')
}
