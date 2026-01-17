import { ChevronRight } from 'lucide-react'

/**
 * 설정 섹션 컴포넌트
 *
 * @param {Object} props
 * @param {string} props.title - 섹션 제목
 * @param {React.ReactNode} props.children - 섹션 내용
 *
 * @example
 * <SettingSection title="알림 설정">
 *   <SettingToggle label="푸시 알림" ... />
 * </SettingSection>
 */
export function SettingSection({ title, children }) {
  return (
    <div className="setting-section">
      {title && <h2 className="section-title">{title}</h2>}
      <div className="section-content">
        {children}
      </div>

      <style>{`
        .setting-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 12px;
          padding: 0 4px;
        }

        .section-content {
          background: white;
          border-radius: 12px;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

/**
 * 설정 항목 (일반)
 */
export function SettingItem({
  label,
  sublabel,
  value,
  onClick,
  showArrow = true,
  icon,
  children
}) {
  return (
    <div
      className={`setting-item ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="item-left">
        {icon && <span className="item-icon">{icon}</span>}
        <div className="item-labels">
          <span className="item-label">{label}</span>
          {sublabel && <span className="item-sublabel">{sublabel}</span>}
        </div>
      </div>
      <div className="item-right">
        {value && <span className="item-value">{value}</span>}
        {children}
        {onClick && showArrow && <ChevronRight size={20} color="#9ca3af" />}
      </div>

      <style>{`
        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-item.clickable {
          cursor: pointer;
          transition: background 0.2s;
        }

        .setting-item.clickable:active {
          background: #f9fafb;
        }

        .item-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
        }

        .item-labels {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .item-label {
          font-size: 15px;
          color: #1f2937;
        }

        .item-sublabel {
          font-size: 13px;
          color: #9ca3af;
        }

        .item-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .item-value {
          font-size: 14px;
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

/**
 * 토글 설정 항목
 */
export function SettingToggle({
  label,
  sublabel,
  checked,
  onChange,
  disabled = false
}) {
  return (
    <div className={`setting-toggle ${disabled ? 'disabled' : ''}`}>
      <div className="toggle-labels">
        <span className="toggle-label">{label}</span>
        {sublabel && <span className="toggle-sublabel">{sublabel}</span>}
      </div>
      <button
        className={`toggle-switch ${checked ? 'on' : ''}`}
        onClick={() => !disabled && onChange?.(!checked)}
        disabled={disabled}
      >
        <span className="toggle-knob" />
      </button>

      <style>{`
        .setting-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .setting-toggle:last-child {
          border-bottom: none;
        }

        .setting-toggle.disabled {
          opacity: 0.5;
        }

        .toggle-labels {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .toggle-label {
          font-size: 15px;
          color: #1f2937;
        }

        .toggle-sublabel {
          font-size: 13px;
          color: #9ca3af;
        }

        .toggle-switch {
          width: 52px;
          height: 32px;
          background: #e5e7eb;
          border-radius: 16px;
          padding: 2px;
          cursor: pointer;
          transition: background 0.2s;
          border: none;
        }

        .toggle-switch.on {
          background: #5046e4;
        }

        .toggle-switch:disabled {
          cursor: not-allowed;
        }

        .toggle-knob {
          display: block;
          width: 28px;
          height: 28px;
          background: white;
          border-radius: 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;
        }

        .toggle-switch.on .toggle-knob {
          transform: translateX(20px);
        }
      `}</style>
    </div>
  )
}

/**
 * 옵션 선택 그룹
 */
export function SettingOptions({ options, value, onChange }) {
  return (
    <div className="setting-options">
      {options.map((option) => (
        <button
          key={option.id}
          className={`option-btn ${value === option.id ? 'selected' : ''}`}
          onClick={() => onChange?.(option.id)}
        >
          <span className="option-label">{option.label}</span>
          {option.sublabel && (
            <span className="option-sublabel">{option.sublabel}</span>
          )}
        </button>
      ))}

      <style>{`
        .setting-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 16px;
        }

        .option-btn {
          flex: 1;
          min-width: 80px;
          padding: 12px 16px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .option-btn:hover {
          border-color: #d1d5db;
        }

        .option-btn.selected {
          background: #ede9fe;
          border-color: #5046e4;
        }

        .option-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .option-sublabel {
          font-size: 12px;
          color: #9ca3af;
        }

        .option-btn.selected .option-label {
          color: #5046e4;
        }
      `}</style>
    </div>
  )
}

/**
 * 페이지 헤더 (설정 페이지용)
 */
export function PageHeader({ title, onClose, rightAction }) {
  return (
    <header className="page-header">
      <h1 className="header-title">{title}</h1>
      <div className="header-actions">
        {rightAction}
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            <span className="close-icon">×</span>
          </button>
        )}
      </div>

      <style>{`
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }

        .header-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .close-btn {
          background: none;
          border: none;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 24px;
          color: #6b7280;
          line-height: 1;
        }

        .close-btn:hover {
          color: #374151;
        }
      `}</style>
    </header>
  )
}
