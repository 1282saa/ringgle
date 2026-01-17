/**
 * 재사용 가능한 Card 컴포넌트
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - 카드 내용
 * @param {string} props.title - 카드 제목
 * @param {React.ReactNode} props.header - 커스텀 헤더
 * @param {React.ReactNode} props.footer - 카드 푸터
 * @param {boolean} props.clickable - 클릭 가능 여부
 * @param {Function} props.onClick - 클릭 핸들러
 * @param {string} props.variant - 카드 스타일 ('default' | 'outlined' | 'elevated')
 * @param {string} props.padding - 패딩 크기 ('none' | 'sm' | 'md' | 'lg')
 * @param {string} props.className - 추가 CSS 클래스
 *
 * @example
 * <Card title="설정">내용</Card>
 * <Card clickable onClick={() => navigate('/settings')}>클릭하세요</Card>
 */
export function Card({
  children,
  title,
  header,
  footer,
  clickable = false,
  onClick,
  variant = 'default',
  padding = 'md',
  className = ''
}) {
  const variantClasses = {
    default: 'card-default',
    outlined: 'card-outlined',
    elevated: 'card-elevated'
  }

  const paddingClasses = {
    none: 'card-p-none',
    sm: 'card-p-sm',
    md: 'card-p-md',
    lg: 'card-p-lg'
  }

  return (
    <div
      className={`card ${variantClasses[variant]} ${paddingClasses[padding]} ${clickable ? 'card-clickable' : ''} ${className}`}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {(title || header) && (
        <div className="card-header">
          {header || <h3 className="card-title">{title}</h3>}
        </div>
      )}
      <div className="card-content">
        {children}
      </div>
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}

      <style>{`
        .card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
        }

        .card-default {
          border: 1px solid #e5e7eb;
        }

        .card-outlined {
          border: 2px solid #e5e7eb;
        }

        .card-elevated {
          border: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .card-clickable {
          cursor: pointer;
          transition: all 0.2s;
        }

        .card-clickable:hover {
          border-color: #5046e4;
        }

        .card-clickable:active {
          background: #f9fafb;
        }

        .card-p-none .card-content { padding: 0; }
        .card-p-sm .card-content { padding: 12px; }
        .card-p-md .card-content { padding: 16px; }
        .card-p-lg .card-content { padding: 24px; }

        .card-header {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .card-footer {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }
      `}</style>
    </div>
  )
}

/**
 * 통계 카드 (숫자 표시용)
 */
export function StatCard({ label, value, sublabel, color = '#5046e4' }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ color }}>{value}</span>
      {sublabel && <span className="stat-sublabel">{sublabel}</span>}

      <style>{`
        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: #6b7280;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
        }

        .stat-sublabel {
          font-size: 12px;
          color: #9ca3af;
        }
      `}</style>
    </div>
  )
}

export default Card
