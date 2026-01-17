import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { DEFAULT_SETTINGS, ACCENT_LABELS, TUTORS, STORAGE_KEYS } from '../constants'

/**
 * 튜터 설정을 관리하는 커스텀 훅
 * localStorage의 tutorSettings와 동기화되며, 파생 데이터도 제공
 *
 * @returns {Object} 튜터 설정 및 유틸리티 함수
 *
 * @example
 * const { settings, updateSettings, tutorName, accentLabel, genderLabel } = useTutorSettings()
 * updateSettings({ accent: 'uk' })
 */
export function useTutorSettings() {
  const [settings, setSettings] = useLocalStorage(
    STORAGE_KEYS.TUTOR_SETTINGS,
    DEFAULT_SETTINGS
  )

  // 현재 설정값 (기본값과 병합)
  const mergedSettings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...settings
  }), [settings])

  // 튜터 이름 (설정된 이름 또는 성별 기반 기본 이름)
  const tutorName = useMemo(() => {
    if (mergedSettings.tutorName) {
      return mergedSettings.tutorName
    }
    // 성별에 맞는 첫 번째 튜터 이름 반환
    const matchingTutor = TUTORS.find(t => t.gender === mergedSettings.gender)
    return matchingTutor?.name || 'Gwen'
  }, [mergedSettings.tutorName, mergedSettings.gender])

  // 튜터 이니셜
  const tutorInitial = tutorName[0] || 'G'

  // 현재 선택된 튜터 객체
  const currentTutor = useMemo(() => {
    return TUTORS.find(t =>
      t.accent === mergedSettings.accent &&
      t.gender === mergedSettings.gender
    ) || TUTORS[0]
  }, [mergedSettings.accent, mergedSettings.gender])

  // 라벨들
  const accentLabel = ACCENT_LABELS[mergedSettings.accent] || '미국'
  const genderLabel = mergedSettings.gender === 'male' ? '남성' : '여성'

  // 설정 업데이트 함수 (부분 업데이트 지원)
  const updateSettings = (updates) => {
    setSettings(prev => ({
      ...prev,
      ...updates
    }))
  }

  // 설정 초기화 함수
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  return {
    // 설정 데이터
    settings: mergedSettings,
    accent: mergedSettings.accent,
    gender: mergedSettings.gender,
    speed: mergedSettings.speed,
    level: mergedSettings.level,
    topic: mergedSettings.topic,

    // 파생 데이터
    tutorName,
    tutorInitial,
    currentTutor,
    accentLabel,
    genderLabel,
    personalityTags: currentTutor?.tags || ['밝은', '활기찬'],

    // 함수
    updateSettings,
    resetSettings,
    setSettings
  }
}

export default useTutorSettings
