/**
 * @file utils/helpers.js
 * @description 앱 전역에서 사용되는 유틸리티 함수 모음
 *
 * 주요 기능:
 * - 시간 포맷팅
 * - 로컬스토리지 관리
 * - 텍스트/문자열 처리
 */

import { STORAGE_KEYS, DEFAULT_SETTINGS, MAX_CALL_HISTORY } from '../constants'

// ============================================
// 시간 관련 유틸리티
// ============================================

/**
 * 초 단위 시간을 MM:SS 형식으로 변환
 *
 * @param {number} seconds - 변환할 초 단위 시간
 * @returns {string} MM:SS 형식의 문자열 (예: "05:30")
 *
 * @example
 * formatTime(125) // "02:05"
 * formatTime(0)   // "00:00"
 * formatTime(null) // "0:00"
 */
export function formatTime(seconds) {
  // null, undefined, NaN 처리
  if (!seconds || isNaN(seconds)) {
    return '0:00'
  }

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * formatTime의 별칭 (Result.jsx에서 사용하던 이름)
 * @see formatTime
 */
export const formatDuration = formatTime

// ============================================
// 로컬스토리지 유틸리티
// ============================================

/**
 * 로컬스토리지에서 JSON 데이터를 안전하게 읽기
 * 파싱 오류 시 기본값 반환
 *
 * @param {string} key - 로컬스토리지 키
 * @param {*} defaultValue - 파싱 실패 또는 값이 없을 때 반환할 기본값
 * @returns {*} 파싱된 값 또는 기본값
 *
 * @example
 * const settings = getFromStorage('tutorSettings', {})
 * const history = getFromStorage('callHistory', [])
 */
export function getFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    if (item === null) {
      return defaultValue
    }
    return JSON.parse(item)
  } catch (error) {
    console.warn(`[Storage] Failed to parse "${key}":`, error)
    return defaultValue
  }
}

/**
 * 로컬스토리지에 JSON 데이터를 안전하게 저장
 *
 * @param {string} key - 로컬스토리지 키
 * @param {*} value - 저장할 값 (JSON 직렬화 가능해야 함)
 * @returns {boolean} 저장 성공 여부
 *
 * @example
 * setToStorage('tutorSettings', { accent: 'us', gender: 'female' })
 */
export function setToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[Storage] Failed to save "${key}":`, error)
    return false
  }
}

/**
 * 튜터 설정을 로컬스토리지에서 로드
 * 저장된 값이 없으면 기본값 반환
 *
 * @returns {Object} 튜터 설정 객체
 *
 * @example
 * const settings = getTutorSettings()
 * console.log(settings.accent) // 'us'
 */
export function getTutorSettings() {
  return getFromStorage(STORAGE_KEYS.TUTOR_SETTINGS, DEFAULT_SETTINGS)
}

/**
 * 튜터 설정을 로컬스토리지에 저장
 *
 * @param {Object} settings - 저장할 설정 객체
 * @returns {boolean} 저장 성공 여부
 */
export function saveTutorSettings(settings) {
  return setToStorage(STORAGE_KEYS.TUTOR_SETTINGS, settings)
}

/**
 * 통화 기록 목록을 로컬스토리지에서 로드
 *
 * @returns {Array} 통화 기록 배열
 */
export function getCallHistory() {
  return getFromStorage(STORAGE_KEYS.CALL_HISTORY, [])
}

/**
 * 새 통화 기록을 추가하고 저장
 * 최대 개수(MAX_CALL_HISTORY)를 초과하면 오래된 기록 삭제
 *
 * @param {Object} callRecord - 추가할 통화 기록
 * @param {string} callRecord.date - 통화 날짜 (간략)
 * @param {string} callRecord.fullDate - 통화 날짜 (상세)
 * @param {string} callRecord.duration - 통화 시간 (포맷팅됨)
 * @param {number} callRecord.words - 발화 단어 수
 * @param {string} callRecord.tutorName - 튜터 이름
 * @returns {boolean} 저장 성공 여부
 */
export function addCallHistory(callRecord) {
  const history = getCallHistory()
  history.unshift(callRecord) // 최신 기록을 앞에 추가
  return setToStorage(
    STORAGE_KEYS.CALL_HISTORY,
    history.slice(0, MAX_CALL_HISTORY) // 최대 개수 제한
  )
}

/**
 * 마지막 통화 결과를 로컬스토리지에서 로드
 *
 * @returns {Object|null} 통화 결과 객체 또는 null
 */
export function getLastCallResult() {
  return getFromStorage(STORAGE_KEYS.LAST_CALL_RESULT, null)
}

/**
 * 통화 결과를 로컬스토리지에 저장
 *
 * @param {Object} result - 저장할 통화 결과
 * @returns {boolean} 저장 성공 여부
 */
export function saveLastCallResult(result) {
  return setToStorage(STORAGE_KEYS.LAST_CALL_RESULT, result)
}

// ============================================
// 텍스트/문자열 유틸리티
// ============================================

/**
 * 텍스트에서 단어 수 계산
 * 공백 기준으로 분리하여 빈 문자열 제외
 *
 * @param {string} text - 단어 수를 계산할 텍스트
 * @returns {number} 단어 수
 *
 * @example
 * countWords("Hello world") // 2
 * countWords("  Hello   world  ") // 2
 * countWords("") // 0
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') {
    return 0
  }
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * 설정에 따른 튜터 이름 가져오기
 *
 * @param {Object} settings - 튜터 설정
 * @param {string} settings.gender - 성별 ('male' | 'female')
 * @param {string} [settings.tutorName] - 사용자 지정 튜터 이름
 * @returns {string} 튜터 이름
 */
export function getTutorName(settings) {
  if (settings?.tutorName) {
    return settings.tutorName
  }
  return settings?.gender === 'male' ? 'James' : 'Gwen'
}

/**
 * 튜터 이름의 첫 글자(이니셜) 가져오기
 *
 * @param {string} name - 튜터 이름
 * @returns {string} 첫 글자
 */
export function getTutorInitial(name) {
  return name?.[0] || 'G'
}

// ============================================
// 날짜 유틸리티
// ============================================

/**
 * 현재 날짜를 한국어 형식으로 반환
 *
 * @returns {string} 날짜 문자열 (예: "2024. 1. 15.")
 */
export function getKoreanDate() {
  return new Date().toLocaleDateString('ko-KR')
}

/**
 * 현재 날짜/시간을 한국어 형식으로 반환
 *
 * @returns {string} 날짜/시간 문자열 (예: "2024. 1. 15. 오후 3:30:00")
 */
export function getKoreanDateTime() {
  return new Date().toLocaleString('ko-KR')
}

// ============================================
// 디바이스 ID 유틸리티
// ============================================

/**
 * 디바이스 고유 ID 가져오기
 * 없으면 새로 생성하여 저장
 *
 * @returns {string} UUID 형식의 디바이스 ID
 */
export function getDeviceId() {
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId)
  }
  return deviceId
}

// ============================================
// 배열 유틸리티
// ============================================

/**
 * 메시지 배열에서 특정 역할의 메시지만 필터링
 *
 * @param {Array} messages - 메시지 배열
 * @param {string} role - 필터링할 역할 ('user' | 'assistant')
 * @returns {Array} 필터링된 메시지 배열
 */
export function filterMessagesByRole(messages, role) {
  if (!Array.isArray(messages)) {
    return []
  }
  return messages.filter(m =>
    m.role === role || m.speaker === (role === 'assistant' ? 'ai' : role)
  )
}
