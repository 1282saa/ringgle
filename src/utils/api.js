/**
 * @file utils/api.js
 * @description AWS Lambda API 통신 및 음성 처리 유틸리티
 *
 * 이 모듈은 다음 기능을 제공합니다:
 * - AI 채팅 (Claude via Bedrock)
 * - 텍스트 음성 변환 (TTS via Polly)
 * - 음성 텍스트 변환 (STT)
 * - 대화 분석
 *
 * 모든 API는 단일 Lambda 엔드포인트를 통해 action 파라미터로 구분됩니다.
 */

import { API_URL, SPEEDS } from '../constants'
import { getTutorSettings } from './helpers'

// ============================================
// API 액션 타입 정의
// ============================================

/**
 * API 액션 타입 상수
 * @constant {Object}
 */
const API_ACTIONS = {
  CHAT: 'chat',       // AI 대화
  TTS: 'tts',         // 텍스트 → 음성
  STT: 'stt',         // 음성 → 텍스트
  ANALYZE: 'analyze', // 대화 분석
}

// ============================================
// 내부 헬퍼 함수
// ============================================

/**
 * API 요청을 수행하는 공통 함수
 * 모든 API 호출에서 사용되는 중복 로직을 통합
 *
 * @private
 * @param {Object} body - 요청 본문
 * @param {string} actionName - 로깅용 액션 이름
 * @returns {Promise<Object>} API 응답 데이터
 * @throws {Error} API 요청 실패 시
 */
async function apiRequest(body, actionName) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`${actionName} API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`[API] ${actionName} Error:`, error)
    throw error
  }
}

/**
 * Blob을 Base64 문자열로 변환
 *
 * @private
 * @param {Blob} blob - 변환할 Blob 객체
 * @returns {Promise<string>} Base64 인코딩된 문자열
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      // data:audio/webm;base64,XXXX 형식에서 base64 부분만 추출
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ============================================
// AI 채팅 API
// ============================================

/**
 * AI 튜터에게 메시지를 보내고 응답 받기
 * AWS Bedrock의 Claude 모델을 사용
 *
 * @param {Array} messages - 대화 히스토리
 * @param {Object} messages[].role - 메시지 역할 ('user' | 'assistant')
 * @param {string} messages[].content - 메시지 내용
 * @param {Object} [settings] - 튜터 설정 (없으면 로컬스토리지에서 로드)
 * @returns {Promise<Object>} AI 응답
 * @returns {string} return.message - AI의 응답 메시지
 *
 * @example
 * const response = await sendMessage([
 *   { role: 'user', content: 'Hello!' }
 * ])
 * console.log(response.message) // "Hello! How are you today?"
 */
export async function sendMessage(messages, settings = null) {
  const currentSettings = settings || getTutorSettings()

  return apiRequest(
    {
      action: API_ACTIONS.CHAT,
      messages,
      settings: currentSettings,
    },
    'Chat'
  )
}

// ============================================
// 대화 분석 API
// ============================================

/**
 * 대화 내용을 AI로 분석
 * CAFP 점수, 필러워드, 문법 오류 등을 분석
 *
 * @param {Array} messages - 분석할 대화 메시지 배열
 * @returns {Promise<Object>} 분석 결과
 * @returns {Object} return.analysis - 분석 데이터
 * @returns {Object} return.analysis.cafp_scores - CAFP 점수
 * @returns {Object} return.analysis.fillers - 필러워드 분석
 * @returns {Array} return.analysis.grammar_corrections - 문법 교정 목록
 * @returns {Object} return.analysis.vocabulary - 어휘 분석
 * @returns {string} return.analysis.overall_feedback - 종합 피드백
 *
 * @example
 * const result = await analyzeConversation(messages)
 * console.log(result.analysis.cafp_scores.fluency) // 75
 */
export async function analyzeConversation(messages) {
  return apiRequest(
    {
      action: API_ACTIONS.ANALYZE,
      messages,
    },
    'Analyze'
  )
}

// ============================================
// 음성 합성 (TTS) API
// ============================================

/**
 * 텍스트를 음성으로 변환 (AWS Polly)
 *
 * @param {string} text - 변환할 텍스트
 * @param {Object} [settings] - 튜터 설정 (음성, 속도 등)
 * @returns {Promise<Object>} TTS 응답
 * @returns {string} return.audio - Base64 인코딩된 오디오 데이터
 *
 * @example
 * const response = await textToSpeech("Hello, how are you?")
 * await playAudioBase64(response.audio)
 */
export async function textToSpeech(text, settings = null) {
  const currentSettings = settings || getTutorSettings()

  return apiRequest(
    {
      action: API_ACTIONS.TTS,
      text,
      settings: currentSettings,
    },
    'TTS'
  )
}

/**
 * Base64 인코딩된 오디오를 재생
 *
 * @param {string} base64Audio - Base64 인코딩된 오디오 데이터
 * @param {Object} [audioRef] - React ref 객체 (재생 중 오디오 참조 저장용)
 * @returns {Promise<void>} 재생 완료 시 resolve
 *
 * @example
 * // 기본 사용
 * await playAudioBase64(audioData)
 *
 * // ref와 함께 사용 (재생 중 정지 가능하도록)
 * const audioRef = useRef(null)
 * await playAudioBase64(audioData, audioRef)
 * // 정지: audioRef.current?.pause()
 */
export function playAudioBase64(base64Audio, audioRef = null) {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`)

      // audioRef가 제공되면 참조 저장 (정지 가능하도록)
      if (audioRef) {
        audioRef.current = audio
      }

      audio.onended = () => {
        if (audioRef) audioRef.current = null
        resolve()
      }

      audio.onerror = (err) => {
        if (audioRef) audioRef.current = null
        reject(err)
      }

      audio.play()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 브라우저 내장 TTS를 사용한 폴백 음성 재생
 * AWS Polly 실패 시 사용
 *
 * @param {string} text - 읽을 텍스트
 * @param {Object} [settings] - 설정 객체
 * @param {string} [settings.speed] - 속도 ('slow' | 'normal' | 'fast')
 * @returns {Promise<void>} 재생 완료 시 resolve
 *
 * @example
 * await speakWithBrowserTTS("Hello!", { speed: 'slow' })
 */
export function speakWithBrowserTTS(text, settings = null) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      console.warn('[TTS] Browser speech synthesis not supported')
      resolve() // 지원하지 않으면 조용히 완료
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'

    // 속도 설정 적용
    const speedConfig = SPEEDS.find(s => s.id === settings?.speed)
    utterance.rate = speedConfig?.rate || 1.0

    utterance.onend = () => resolve()
    utterance.onerror = (err) => {
      console.error('[TTS] Browser TTS error:', err)
      resolve() // 에러가 나도 진행
    }

    speechSynthesis.speak(utterance)
  })
}

/**
 * TTS 재생 (Polly 우선, 실패 시 브라우저 TTS 폴백)
 *
 * @param {string} text - 읽을 텍스트
 * @param {Object} [settings] - 튜터 설정
 * @param {Object} [audioRef] - React ref 객체
 * @returns {Promise<void>} 재생 완료 시 resolve
 *
 * @example
 * await speakText("Hello!", settings, audioRef)
 */
export async function speakText(text, settings = null, audioRef = null) {
  const currentSettings = settings || getTutorSettings()

  try {
    const ttsResponse = await textToSpeech(text, currentSettings)

    if (ttsResponse.audio) {
      await playAudioBase64(ttsResponse.audio, audioRef)
    }
  } catch (err) {
    console.warn('[TTS] Polly failed, falling back to browser TTS:', err)
    await speakWithBrowserTTS(text, currentSettings)
  }
}

// ============================================
// 음성 인식 (STT) API
// ============================================

/**
 * 음성을 텍스트로 변환 (AWS Transcribe)
 * 현재는 Web Speech API를 주로 사용하므로 예비용
 *
 * @param {Blob} audioBlob - 오디오 데이터 Blob
 * @param {string} [language='en-US'] - 인식할 언어
 * @returns {Promise<Object>} STT 응답
 * @returns {string} return.transcript - 인식된 텍스트
 *
 * @example
 * const result = await speechToText(audioBlob)
 * console.log(result.transcript) // "Hello, how are you?"
 */
export async function speechToText(audioBlob, language = 'en-US') {
  // Blob을 Base64로 변환
  const base64Audio = await blobToBase64(audioBlob)

  return apiRequest(
    {
      action: API_ACTIONS.STT,
      audio: base64Audio,
      language,
    },
    'STT'
  )
}

// ============================================
// 사용자 설정 API
// ============================================

/**
 * 사용자 맞춤설정을 서버에 저장
 *
 * @param {string} deviceId - 디바이스 UUID
 * @param {Object} settings - 튜터 설정 객체
 * @returns {Promise<Object>} 저장 결과
 * @returns {boolean} return.success - 성공 여부
 * @returns {Object} return.settings - 저장된 설정
 * @returns {string} return.updatedAt - 업데이트 시간
 *
 * @example
 * const result = await saveSettingsToServer(deviceId, {
 *   tutorId: 'tutor-1',
 *   accent: 'uk',
 *   gender: 'male',
 *   speed: 'normal',
 *   level: 'intermediate'
 * })
 */
export async function saveSettingsToServer(deviceId, settings) {
  return apiRequest(
    {
      action: 'save_settings',
      deviceId,
      settings,
    },
    'SaveSettings'
  )
}

/**
 * 서버에서 사용자 맞춤설정 조회
 *
 * @param {string} deviceId - 디바이스 UUID
 * @returns {Promise<Object>} 설정 조회 결과
 * @returns {boolean} return.success - 성공 여부
 * @returns {Object} return.settings - 설정 객체 (없으면 null)
 * @returns {string} [return.updatedAt] - 마지막 업데이트 시간
 *
 * @example
 * const { success, settings } = await getSettingsFromServer(deviceId)
 * if (success && settings) {
 *   console.log('Loaded saved settings:', settings)
 * }
 */
export async function getSettingsFromServer(deviceId) {
  return apiRequest(
    {
      action: 'get_settings',
      deviceId,
    },
    'GetSettings'
  )
}
