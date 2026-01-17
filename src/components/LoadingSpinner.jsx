import { Loader } from 'lucide-react'

/**
 * 로딩 스피너 컴포넌트
 *
 * @param {Object} props
 * @param {number} props.size - 스피너 크기 (기본: 24)
 * @param {string} props.color - 스피너 색상 (기본: #5046e4)
 * @param {string} props.text - 로딩 텍스트
 * @param {boolean} props.fullScreen - 전체 화면 오버레이 여부
 * @param {string} props.className - 추가 CSS 클래스
 *
 * @example
 * <LoadingSpinner />
 * <LoadingSpinner size={32} text="로딩 중..." />
 * <LoadingSpinner fullScreen />
 */
export function LoadingSpinner({
  size = 24,
  color = '#5046e4',
  text,
  fullScreen = false,
  className = ''
}) {
  const spinner = (
    <div className={`loading-spinner ${className}`}>
      <Loader
        size={size}
        color={color}
        className="spinner-icon"
      />
      {text && <span className="spinner-text">{text}</span>}

      <style>{`
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner-text {
          font-size: 14px;
          color: #6b7280;
        }

        .loading-overlay {
          position: fixed;
          inset: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
      `}</style>
    </div>
  )

  if (fullScreen) {
    return <div className="loading-overlay">{spinner}</div>
  }

  return spinner
}

/**
 * 인라인 로딩 표시 (버튼 등에서 사용)
 */
export function InlineLoader({ size = 16, color = 'currentColor' }) {
  return (
    <Loader
      size={size}
      color={color}
      style={{ animation: 'spin 1s linear infinite' }}
    />
  )
}

export default LoadingSpinner
