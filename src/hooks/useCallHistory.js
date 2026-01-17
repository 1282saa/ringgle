import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS, MAX_CALL_HISTORY } from '../constants'

/**
 * 통화 기록을 관리하는 커스텀 훅
 *
 * @returns {Object} 통화 기록 및 관리 함수
 *
 * @example
 * const { history, addCall, clearHistory } = useCallHistory()
 */
export function useCallHistory() {
  const [history, setHistory] = useLocalStorage(STORAGE_KEYS.CALL_HISTORY, [])

  // 새 통화 기록 추가 (최신이 앞에)
  const addCall = useCallback((callRecord) => {
    setHistory(prev => {
      const newHistory = [callRecord, ...prev]
      return newHistory.slice(0, MAX_CALL_HISTORY)
    })
  }, [setHistory])

  // 특정 기록 삭제
  const removeCall = useCallback((index) => {
    setHistory(prev => prev.filter((_, i) => i !== index))
  }, [setHistory])

  // 전체 기록 삭제
  const clearHistory = useCallback(() => {
    setHistory([])
  }, [setHistory])

  // 가장 최근 통화
  const lastCall = history.length > 0 ? history[0] : null

  // 총 통화 수
  const totalCalls = history.length

  return {
    history,
    addCall,
    removeCall,
    clearHistory,
    lastCall,
    totalCalls
  }
}

export default useCallHistory
