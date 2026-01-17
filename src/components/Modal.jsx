import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

/**
 * 재사용 가능한 Modal 컴포넌트
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {Function} props.onClose - 닫기 콜백
 * @param {string} props.title - 모달 제목
 * @param {React.ReactNode} props.children - 모달 내용
 * @param {string} props.size - 모달 크기 ('sm' | 'md' | 'lg' | 'full')
 * @param {boolean} props.showCloseButton - X 버튼 표시 여부
 * @param {string} props.className - 추가 CSS 클래스
 *
 * @example
 * <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="설정">
 *   <p>모달 내용</p>
 * </Modal>
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  className = ''
}) {
  // ESC 키로 닫기
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && onClose) {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
    full: 'modal-full'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-container ${sizeClasses[size]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <header className="modal-header">
            {title && <h2 className="modal-title">{title}</h2>}
            {showCloseButton && (
              <button className="modal-close-btn" onClick={onClose}>
                <X size={24} />
              </button>
            )}
          </header>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-container {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: modalSlideUp 0.2s ease-out;
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-sm { max-width: 320px; }
        .modal-md { max-width: 480px; }
        .modal-lg { max-width: 640px; }
        .modal-full { max-width: 100%; height: 100%; border-radius: 0; }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .modal-close-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .modal-close-btn:hover {
          background: #f3f4f6;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
      `}</style>
    </div>
  )
}

export default Modal
