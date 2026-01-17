import { createContext, useContext, useMemo, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { DEFAULT_SETTINGS, ACCENT_LABELS, TUTORS, STORAGE_KEYS } from '../constants'

/**
 * 사용자 설정 Context
 * 앱 전역에서 튜터 설정에 접근할 수 있게 해줌
 */
const UserSettingsContext = createContext(null)

/**
 * UserSettingsProvider
 * App.jsx에서 전체 앱을 감싸서 사용
 *
 * @example
 * <UserSettingsProvider>
 *   <App />
 * </UserSettingsProvider>
 */
export function UserSettingsProvider({ children }) {
  const [storedSettings, setStoredSettings] = useLocalStorage(
    STORAGE_KEYS.TUTOR_SETTINGS,
    DEFAULT_SETTINGS
  )

  // 기본값과 병합된 설정
  const settings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...storedSettings
  }), [storedSettings])

  // 튜터 이름 계산
  const tutorName = useMemo(() => {
    if (settings.tutorName) {
      return settings.tutorName
    }
    const matchingTutor = TUTORS.find(t => t.gender === settings.gender)
    return matchingTutor?.name || 'Gwen'
  }, [settings.tutorName, settings.gender])

  // 현재 선택된 튜터 객체
  const currentTutor = useMemo(() => {
    return TUTORS.find(t =>
      t.accent === settings.accent &&
      t.gender === settings.gender
    ) || TUTORS[0]
  }, [settings.accent, settings.gender])

  // 파생 데이터
  const tutorInitial = tutorName[0] || 'G'
  const accentLabel = ACCENT_LABELS[settings.accent] || '미국'
  const genderLabel = settings.gender === 'male' ? '남성' : '여성'
  const personalityTags = currentTutor?.tags || ['밝은', '활기찬']

  // 설정 업데이트 (부분 업데이트)
  const updateSettings = useCallback((updates) => {
    setStoredSettings(prev => ({
      ...prev,
      ...updates
    }))
  }, [setStoredSettings])

  // 설정 초기화
  const resetSettings = useCallback(() => {
    setStoredSettings(DEFAULT_SETTINGS)
  }, [setStoredSettings])

  // 특정 필드 업데이트 헬퍼
  const setAccent = useCallback((accent) => updateSettings({ accent }), [updateSettings])
  const setGender = useCallback((gender) => updateSettings({ gender }), [updateSettings])
  const setSpeed = useCallback((speed) => updateSettings({ speed }), [updateSettings])
  const setLevel = useCallback((level) => updateSettings({ level }), [updateSettings])
  const setTopic = useCallback((topic) => updateSettings({ topic }), [updateSettings])
  const setTutorName = useCallback((tutorName) => updateSettings({ tutorName }), [updateSettings])

  const value = useMemo(() => ({
    // 전체 설정 객체
    settings,

    // 개별 설정값
    accent: settings.accent,
    gender: settings.gender,
    speed: settings.speed,
    level: settings.level,
    topic: settings.topic,

    // 파생 데이터
    tutorName,
    tutorInitial,
    currentTutor,
    accentLabel,
    genderLabel,
    personalityTags,

    // 업데이트 함수
    updateSettings,
    resetSettings,
    setAccent,
    setGender,
    setSpeed,
    setLevel,
    setTopic,
    setTutorName
  }), [
    settings,
    tutorName,
    tutorInitial,
    currentTutor,
    accentLabel,
    genderLabel,
    personalityTags,
    updateSettings,
    resetSettings,
    setAccent,
    setGender,
    setSpeed,
    setLevel,
    setTopic,
    setTutorName
  ])

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  )
}

/**
 * useUserSettings 훅
 * Context에서 사용자 설정을 가져오는 훅
 *
 * @returns {Object} 사용자 설정 및 유틸리티 함수
 * @throws {Error} Provider 외부에서 사용 시 에러
 *
 * @example
 * const { tutorName, accentLabel, updateSettings } = useUserSettings()
 */
export function useUserSettings() {
  const context = useContext(UserSettingsContext)
  if (!context) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider')
  }
  return context
}

export default UserSettingsContext
