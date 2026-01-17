/**
 * @file pages/RoleplayCategory.jsx
 * @description 롤플레잉 카테고리/시나리오 선택 페이지 (링글 앱 100% 동일)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { setToStorage } from '../utils/helpers'

const CATEGORIES = [
  { id: 'travel', label: '해외여행 필수영어' },
  { id: 'work', label: '직장에서의 일상대화' },
]

// 일러스트 SVG 컴포넌트들
const PassportIllust = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <rect x="20" y="15" width="40" height="50" rx="4" fill="#6B5CE7" />
    <circle cx="40" cy="35" r="12" stroke="white" strokeWidth="2" fill="none" />
    <path d="M28 35h24M40 23v24" stroke="white" strokeWidth="1.5" />
    <rect x="28" y="52" width="24" height="3" rx="1.5" fill="white" opacity="0.6" />
    <rect x="15" y="48" width="12" height="16" rx="2" fill="#8B7FE8" />
    <rect x="17" y="50" width="8" height="2" rx="1" fill="white" opacity="0.5" />
    <rect x="17" y="54" width="8" height="2" rx="1" fill="white" opacity="0.5" />
  </svg>
)

const CarIllust = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <ellipse cx="55" cy="55" rx="12" ry="6" fill="#E8B4D8" opacity="0.5" />
    <rect x="15" y="35" width="45" height="20" rx="8" fill="#6B5CE7" />
    <rect x="20" y="28" width="30" height="15" rx="4" fill="#8B7FE8" />
    <circle cx="25" cy="55" r="6" fill="#4A4A4A" />
    <circle cx="25" cy="55" r="3" fill="#888" />
    <circle cx="50" cy="55" r="6" fill="#4A4A4A" />
    <circle cx="50" cy="55" r="3" fill="#888" />
    <rect x="24" y="32" width="10" height="8" rx="2" fill="#B8D4E8" />
    <rect x="36" y="32" width="10" height="8" rx="2" fill="#B8D4E8" />
  </svg>
)

const LocalIllust = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <rect x="25" y="30" width="30" height="25" rx="4" fill="#6B5CE7" />
    <circle cx="40" cy="25" r="10" fill="#8B7FE8" />
    <ellipse cx="40" cy="22" rx="6" ry="4" fill="#FFD700" />
    <rect x="30" y="38" width="20" height="12" rx="2" fill="white" />
    <text x="33" y="47" fontSize="7" fill="#6B5CE7" fontWeight="bold">LOCAL</text>
    <rect x="48" y="48" width="8" height="15" rx="1" fill="#E8B4D8" />
    <circle cx="52" cy="46" r="3" fill="#FF6B6B" />
  </svg>
)

const HotelIllust = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <rect x="20" y="25" width="25" height="35" rx="2" fill="#8B7FE8" />
    <rect x="23" y="28" width="5" height="5" rx="1" fill="#B8D4E8" />
    <rect x="30" y="28" width="5" height="5" rx="1" fill="#B8D4E8" />
    <rect x="37" y="28" width="5" height="5" rx="1" fill="#B8D4E8" />
    <rect x="23" y="36" width="5" height="5" rx="1" fill="#B8D4E8" />
    <rect x="30" y="36" width="5" height="5" rx="1" fill="#B8D4E8" />
    <rect x="37" y="36" width="5" height="5" rx="1" fill="#B8D4E8" />
    <rect x="23" y="44" width="5" height="5" rx="1" fill="#B8D4E8" />
    <rect x="30" y="44" width="5" height="5" rx="1" fill="#B8D4E8" />
    <rect x="37" y="44" width="5" height="5" rx="1" fill="#B8D4E8" />
    <rect x="28" y="52" width="9" height="8" rx="1" fill="#6B5CE7" />
    <rect x="48" y="35" width="15" height="25" rx="2" fill="#6B5CE7" />
    <text x="50" y="48" fontSize="6" fill="white" fontWeight="bold">HOTEL</text>
    <rect x="50" y="50" width="4" height="4" fill="white" opacity="0.5" />
    <rect x="56" y="50" width="4" height="4" fill="white" opacity="0.5" />
    <text x="52" y="43" fontSize="10" fill="white">?</text>
    <text x="56" y="43" fontSize="10" fill="white">?</text>
  </svg>
)

const RestaurantIllust = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <ellipse cx="40" cy="50" rx="20" ry="8" fill="#8B7FE8" />
    <ellipse cx="40" cy="48" rx="18" ry="6" fill="white" />
    <rect x="38" y="25" width="4" height="20" fill="#6B5CE7" />
    <circle cx="30" cy="35" r="8" fill="#FFD700" opacity="0.8" />
    <circle cx="50" cy="35" r="8" fill="#FF6B6B" opacity="0.8" />
  </svg>
)

const ShoppingIllust = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <path d="M25 30 L30 55 L50 55 L55 30 Z" fill="#6B5CE7" />
    <rect x="32" y="35" width="16" height="15" rx="2" fill="white" opacity="0.3" />
    <path d="M30 30 Q40 20 50 30" stroke="#8B7FE8" strokeWidth="3" fill="none" />
    <circle cx="35" cy="42" r="3" fill="#FFD700" />
    <circle cx="45" cy="42" r="3" fill="#FF6B6B" />
  </svg>
)

const MeetingIllust = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <rect x="20" y="35" width="40" height="25" rx="3" fill="#6B5CE7" />
    <rect x="25" y="40" width="12" height="8" rx="1" fill="white" opacity="0.3" />
    <rect x="40" y="40" width="15" height="3" rx="1" fill="white" opacity="0.5" />
    <rect x="40" y="45" width="10" height="3" rx="1" fill="white" opacity="0.5" />
    <circle cx="30" cy="28" r="6" fill="#8B7FE8" />
    <circle cx="50" cy="28" r="6" fill="#8B7FE8" />
  </svg>
)

const EmailIllust = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <rect x="20" y="28" width="40" height="28" rx="3" fill="#6B5CE7" />
    <path d="M20 32 L40 45 L60 32" stroke="white" strokeWidth="2" fill="none" />
    <rect x="25" y="38" width="20" height="2" rx="1" fill="white" opacity="0.3" />
    <rect x="25" y="43" width="15" height="2" rx="1" fill="white" opacity="0.3" />
  </svg>
)

const ILLUSTRATION_MAP = {
  immigration: PassportIllust,
  rental: CarIllust,
  local: LocalIllust,
  hotel: HotelIllust,
  restaurant: RestaurantIllust,
  shopping: ShoppingIllust,
  meeting: MeetingIllust,
  email: EmailIllust,
  presentation: MeetingIllust,
  negotiation: MeetingIllust,
}

const SCENARIOS = {
  travel: [
    {
      id: 'immigration',
      title: '출입국 관리소에서',
      description: '입국 심사대에서 입국 수속과 통관 절차를 밟고 있습니다.',
      level: 'Basic',
      bgColor: '#E8E0F7',
    },
    {
      id: 'rental',
      title: '렌터카',
      description: '여행 목적지에 도착해서 렌터카를 빌리려고 합니다.',
      level: 'Basic',
      bgColor: '#E0E8F7',
    },
    {
      id: 'local',
      title: '로컬처럼 여행하기!',
      description: '여러분은 여행 목적지에서 현지인처럼 여행하고 싶습니다.',
      level: 'Basic',
      bgColor: '#E8E0F7',
    },
    {
      id: 'hotel',
      title: '호텔에서',
      description: '여러분은 며칠간 묵을 호텔에 체크인하려고 합니다.',
      level: 'Basic',
      bgColor: '#E0E8F7',
    },
    {
      id: 'restaurant',
      title: '레스토랑에서',
      description: '현지 레스토랑에서 음식을 주문하고 식사를 즐기려 합니다.',
      level: 'Basic',
      bgColor: '#E8E0F7',
    },
    {
      id: 'shopping',
      title: '쇼핑하기',
      description: '여행지에서 기념품이나 필요한 물건을 쇼핑하고 있습니다.',
      level: 'Basic',
      bgColor: '#E0E8F7',
    },
  ],
  work: [
    {
      id: 'meeting',
      title: '미팅 참석하기',
      description: '팀 미팅에서 의견을 나누고 프로젝트를 논의합니다.',
      level: 'Basic',
      bgColor: '#FEF3C7',
    },
    {
      id: 'email',
      title: '이메일 작성하기',
      description: '업무 관련 이메일을 영어로 작성해야 합니다.',
      level: 'Basic',
      bgColor: '#FCE7F3',
    },
    {
      id: 'presentation',
      title: '프레젠테이션',
      description: '영어로 프레젠테이션을 진행해야 합니다.',
      level: 'Intermediate',
      bgColor: '#FEF3C7',
    },
    {
      id: 'negotiation',
      title: '협상하기',
      description: '비즈니스 협상을 영어로 진행합니다.',
      level: 'Advanced',
      bgColor: '#FCE7F3',
    },
  ],
}

function RoleplayCategory() {
  const navigate = useNavigate()

  const [activeCategory, setActiveCategory] = useState('travel')
  const [selectedScenario, setSelectedScenario] = useState(null)

  const handleSelect = () => {
    if (!selectedScenario) return

    const categoryLabel = CATEGORIES.find(c => c.id === activeCategory)?.label
    setToStorage('selectedRoleplay', {
      ...selectedScenario,
      category: categoryLabel,
    })
    navigate(-1)
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'Basic':
        return { bg: '#DCFCE7', text: '#16A34A' }
      case 'Intermediate':
        return { bg: '#FEF3C7', text: '#D97706' }
      case 'Advanced':
        return { bg: '#FEE2E2', text: '#DC2626' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280' }
    }
  }

  return (
    <div className="roleplay-category-page">
      {/* 헤더 */}
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#1a1a1a" />
        </button>
        <h1>생활 필수영어</h1>
        <div className="header-spacer" />
      </header>

      {/* 카테고리 탭 */}
      <div className="category-tabs">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* 시나리오 그리드 */}
      <div className="scenario-grid">
        {SCENARIOS[activeCategory].map((scenario) => {
          const isSelected = selectedScenario?.id === scenario.id
          const levelStyle = getLevelColor(scenario.level)
          const IllustComponent = ILLUSTRATION_MAP[scenario.id] || PassportIllust

          return (
            <div
              key={scenario.id}
              className={`scenario-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedScenario(scenario)}
            >
              <div
                className="scenario-image"
                style={{ backgroundColor: scenario.bgColor }}
              >
                <IllustComponent />
              </div>
              <div className="scenario-content">
                <span
                  className="level-badge"
                  style={{
                    backgroundColor: levelStyle.bg,
                    color: levelStyle.text,
                  }}
                >
                  {scenario.level}
                </span>
                <h3 className="scenario-title">{scenario.title}</h3>
                <p className="scenario-desc">{scenario.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단 버튼 */}
      <div className="bottom-area">
        <button
          className={`select-btn ${selectedScenario ? 'active' : ''}`}
          onClick={handleSelect}
          disabled={!selectedScenario}
        >
          선택 완료
        </button>
      </div>

      <style>{`
        .roleplay-category-page {
          min-height: 100vh;
          background: #FFFFFF;
          display: flex;
          flex-direction: column;
          padding-bottom: 100px;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #F0F0F0;
        }

        .page-header h1 {
          font-size: 17px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .back-btn {
          background: none;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .header-spacer {
          width: 32px;
        }

        /* 카테고리 탭 - 링글 원본 스타일 */
        .category-tabs {
          display: flex;
          gap: 10px;
          padding: 20px 20px 16px;
          background: white;
        }

        .category-tab {
          padding: 12px 20px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          background: white;
          border: 1.5px solid #E0E0E0;
          transition: all 0.2s;
        }

        .category-tab.active {
          background: #6B5CE7;
          border-color: #6B5CE7;
          color: white;
        }

        /* 시나리오 그리드 */
        .scenario-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 8px 20px 20px;
        }

        .scenario-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid #F0F0F0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scenario-card.selected {
          border-color: #6B5CE7;
        }

        .scenario-card:active {
          transform: scale(0.98);
        }

        .scenario-image {
          height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .scenario-content {
          padding: 14px 14px 16px;
        }

        .level-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .scenario-title {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 6px;
          line-height: 1.3;
        }

        .scenario-desc {
          font-size: 13px;
          color: #888;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* 하단 버튼 */
        .bottom-area {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px 20px 34px;
          background: white;
          border-top: 1px solid #F0F0F0;
          max-width: 480px;
          margin: 0 auto;
        }

        .select-btn {
          width: 100%;
          padding: 18px;
          background: #E8E8E8;
          color: #A0A0A0;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .select-btn.active {
          background: #6B5CE7;
          color: white;
        }

        .select-btn.active:active {
          background: #5A4BD6;
        }
      `}</style>
    </div>
  )
}

export default RoleplayCategory
