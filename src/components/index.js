/**
 * @file components/index.js
 * @description 공통 컴포넌트 모음
 *
 * 사용법:
 * import { Modal, Card, LoadingSpinner, SettingSection } from '../components'
 */

// 레이아웃 컴포넌트
export { default as BottomNav } from './BottomNav'
export { default as TutorAvatar } from './TutorAvatar'

// UI 컴포넌트
export { Modal } from './Modal'
export { Card, StatCard } from './Card'
export { LoadingSpinner, InlineLoader } from './LoadingSpinner'

// 설정 관련 컴포넌트
export {
  SettingSection,
  SettingItem,
  SettingToggle,
  SettingOptions,
  PageHeader
} from './SettingComponents'
