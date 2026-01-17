import { useState, useEffect, useCallback } from 'react'

/**
 * localStorage와 동기화되는 상태를 관리하는 커스텀 훅
 *
 * @param {string} key - localStorage 키
 * @param {*} initialValue - 초기값 (localStorage에 값이 없을 때 사용)
 * @returns {[*, Function, Function]} [storedValue, setValue, removeValue]
 *
 * @example
 * const [settings, setSettings, removeSettings] = useLocalStorage('tutorSettings', {})
 * setSettings({ accent: 'us' })
 * removeSettings() // localStorage에서 삭제
 */
export function useLocalStorage(key, initialValue) {
  // 초기값 로드 (lazy initialization)
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`[useLocalStorage] Failed to parse "${key}":`, error)
      return initialValue
    }
  })

  // 값 설정 함수
  const setValue = useCallback((value) => {
    try {
      // 함수형 업데이트 지원
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`[useLocalStorage] Failed to save "${key}":`, error)
    }
  }, [key, storedValue])

  // 값 삭제 함수
  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.error(`[useLocalStorage] Failed to remove "${key}":`, error)
    }
  }, [key, initialValue])

  // 다른 탭/창에서 변경 시 동기화
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.warn(`[useLocalStorage] Failed to sync "${key}":`, error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [storedValue, setValue, removeValue]
}

export default useLocalStorage
