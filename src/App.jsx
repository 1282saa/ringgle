import { useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Settings from './pages/Settings'
import TutorSettings from './pages/TutorSettings'
import ScheduleSettings from './pages/ScheduleSettings'
import CurriculumSettings from './pages/CurriculumSettings'
import RoleplaySettings from './pages/RoleplaySettings'
import RoleplayCategory from './pages/RoleplayCategory'
import NotificationSettings from './pages/NotificationSettings'
import Call from './pages/Call'
import Result from './pages/Result'
import Script from './pages/Script'
import Analysis from './pages/Analysis'
import Practice from './pages/Practice'
import { notificationService } from './services/notificationService'
import { UserSettingsProvider } from './context'
import { initializeApp, setupBackButton } from './utils/capacitor'
import './App.css'

// 뒤로가기 핸들링을 위한 내부 컴포넌트
function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()

  // Android 뒤로가기 버튼 핸들링
  useEffect(() => {
    const cleanup = setupBackButton((canGoBack) => {
      // 홈 화면에서는 앱 종료 허용 (false 반환)
      if (location.pathname === '/') {
        return false
      }

      // 통화 중에는 뒤로가기 방지
      if (location.pathname === '/call') {
        // 통화 종료 확인 모달 표시 등 처리 가능
        // 일단은 뒤로가기 허용
        navigate(-1)
        return true
      }

      // 다른 페이지에서는 뒤로가기
      if (canGoBack) {
        navigate(-1)
        return true
      }

      return false
    })

    return cleanup
  }, [location.pathname, navigate])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/tutor" element={<TutorSettings />} />
      <Route path="/settings/schedule" element={<ScheduleSettings />} />
      <Route path="/settings/curriculum" element={<CurriculumSettings />} />
      <Route path="/settings/roleplay" element={<RoleplaySettings />} />
      <Route path="/settings/roleplay/category" element={<RoleplayCategory />} />
      <Route path="/settings/notifications" element={<NotificationSettings />} />
      <Route path="/call" element={<Call />} />
      <Route path="/result" element={<Result />} />
      <Route path="/script" element={<Script />} />
      <Route path="/analysis" element={<Analysis />} />
      <Route path="/practice" element={<Practice />} />
    </Routes>
  )
}

function App() {
  // 앱 초기화 (Capacitor 플러그인 + 알림 서비스)
  useEffect(() => {
    // Capacitor 네이티브 초기화
    initializeApp()

    // 알림 서비스 초기화
    notificationService.initialize()
  }, [])

  return (
    <UserSettingsProvider>
      <div className="app">
        <AppContent />
      </div>
    </UserSettingsProvider>
  )
}

export default App
