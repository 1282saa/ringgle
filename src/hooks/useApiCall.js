import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * API 호출을 관리하는 커스텀 훅
 * 로딩 상태, 에러 처리, 요청 취소를 자동으로 처리
 *
 * @param {Function} apiFunction - 호출할 API 함수
 * @param {Object} options - 옵션
 * @param {*} options.initialData - 초기 데이터
 * @param {Function} options.onSuccess - 성공 콜백
 * @param {Function} options.onError - 에러 콜백
 * @param {boolean} options.immediate - 마운트 시 즉시 호출 여부
 * @returns {Object} { data, loading, error, execute, reset }
 *
 * @example
 * const { data, loading, error, execute } = useApiCall(getSessions)
 * execute(deviceId, 50) // API 호출
 */
export function useApiCall(apiFunction, options = {}) {
  const {
    initialData = null,
    onSuccess,
    onError,
    immediate = false
  } = options

  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 요청 취소를 위한 ref
  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)

  // 컴포넌트 언마운트 감지
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // API 실행 함수
  const execute = useCallback(async (...args) => {
    const currentRequestId = ++requestIdRef.current

    setLoading(true)
    setError(null)

    try {
      const result = await apiFunction(...args)

      // 컴포넌트가 언마운트되었거나 새 요청이 있으면 무시
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return null
      }

      setData(result)
      onSuccess?.(result)
      return result
    } catch (err) {
      // 컴포넌트가 언마운트되었으면 무시
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return null
      }

      const errorMessage = err.message || 'Unknown error'
      setError(errorMessage)
      onError?.(err)
      throw err
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [apiFunction, onSuccess, onError])

  // 상태 초기화 함수
  const reset = useCallback(() => {
    setData(initialData)
    setLoading(false)
    setError(null)
  }, [initialData])

  // immediate 옵션이 true면 마운트 시 즉시 호출
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, []) // execute를 의존성에서 제외 (마운트 시 1회만)

  return {
    data,
    loading,
    error,
    execute,
    reset,
    isSuccess: !loading && !error && data !== initialData,
    isError: !loading && error !== null
  }
}

/**
 * 여러 API를 순차적으로 호출하는 훅
 *
 * @param {Array<Function>} apiFunctions - API 함수 배열
 * @returns {Object} { results, loading, errors, executeAll }
 */
export function useApiCallSequence(apiFunctions) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])

  const executeAll = useCallback(async (argsArray = []) => {
    setLoading(true)
    setErrors([])
    const newResults = []
    const newErrors = []

    for (let i = 0; i < apiFunctions.length; i++) {
      try {
        const args = argsArray[i] || []
        const result = await apiFunctions[i](...args)
        newResults.push(result)
      } catch (err) {
        newResults.push(null)
        newErrors.push({ index: i, error: err })
      }
    }

    setResults(newResults)
    setErrors(newErrors)
    setLoading(false)
    return { results: newResults, errors: newErrors }
  }, [apiFunctions])

  return { results, loading, errors, executeAll }
}

export default useApiCall
