# Phase 3: AI Tutor Settings & Customization

**Timeline:** 2026-01-12
**Status:** Completed
**Impact:** Personalized learning experience with customizable tutor parameters

---

## Overview

Implemented a comprehensive settings system allowing users to customize their AI English tutor experience. Users can select accent, gender, speaking speed, difficulty level, and conversation topic. These settings persist across sessions and dynamically adjust the AI's behavior and voice characteristics.

**Impact**: Enables personalized English learning tailored to user preferences, supporting multiple English accents (US, UK, AU, IN) and adjustable difficulty levels.

---

## Feature Summary

| Setting | Options | Default |
|---------|---------|---------|
| **Accent** | US, UK, AU, IN | US |
| **Gender** | Female, Male | Female |
| **Speed** | Slow (0.8x), Normal (1.0x), Fast (1.2x) | Normal |
| **Level** | Beginner, Intermediate, Advanced | Intermediate |
| **Topic** | Business, Daily, Travel, Interview | Business |

---

## Implementation Details

### 1. Settings Data Structure

**File:** `src/pages/Settings.jsx`

```jsx
const ACCENTS = [
  { id: 'us', label: '미국', icon: '🇺🇸', sublabel: 'American' },
  { id: 'uk', label: '영국', icon: '🇬🇧', sublabel: 'British' },
  { id: 'au', label: '호주', icon: '🇦🇺', sublabel: 'Australian' },
  { id: 'in', label: '인도', icon: '🇮🇳', sublabel: 'Indian' },
]

const GENDERS = [
  { id: 'female', label: '여성', icon: '👩' },
  { id: 'male', label: '남성', icon: '👨' },
]

const SPEEDS = [
  { id: 'slow', label: '느리게', sublabel: '0.8x' },
  { id: 'normal', label: '보통', sublabel: '1.0x' },
  { id: 'fast', label: '빠르게', sublabel: '1.2x' },
]

const LEVELS = [
  { id: 'beginner', label: '초급', sublabel: 'Beginner' },
  { id: 'intermediate', label: '중급', sublabel: 'Intermediate' },
  { id: 'advanced', label: '고급', sublabel: 'Advanced' },
]

const TOPICS = [
  { id: 'business', label: '비즈니스', icon: '💼' },
  { id: 'daily', label: '일상 대화', icon: '💬' },
  { id: 'travel', label: '여행', icon: '✈️' },
  { id: 'interview', label: '면접', icon: '🎯' },
]
```

### 2. State Management

```jsx
function Settings() {
  const navigate = useNavigate()

  const [accent, setAccent] = useState('us')
  const [gender, setGender] = useState('female')
  const [speed, setSpeed] = useState('normal')
  const [level, setLevel] = useState('intermediate')
  const [topic, setTopic] = useState('business')

  // Load saved settings on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('tutorSettings') || '{}')
    if (saved.accent) setAccent(saved.accent)
    if (saved.gender) setGender(saved.gender)
    if (saved.speed) setSpeed(saved.speed)
    if (saved.level) setLevel(saved.level)
    if (saved.topic) setTopic(saved.topic)
  }, [])

  const handleSave = () => {
    const settings = { accent, gender, speed, level, topic }
    localStorage.setItem('tutorSettings', JSON.stringify(settings))
    navigate('/')
  }
}
```

### 3. Settings UI Component

```jsx
return (
  <>
    <header className="header">
      <div className="header-content">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={24} color="#374151" />
        </button>
        <span style={{ fontWeight: 600 }}>AI 튜터 설정</span>
        <button onClick={handleSave}>
          <Check size={24} color="#6366f1" />
        </button>
      </div>
    </header>

    <div className="page">
      {/* Accent Selection */}
      <div className="option-group">
        <label className="option-label">억양 선택</label>
        <div className="option-grid">
          {ACCENTS.map(item => (
            <div
              key={item.id}
              className={`option-item ${accent === item.id ? 'selected' : ''}`}
              onClick={() => setAccent(item.id)}
            >
              <div className="icon">{item.icon}</div>
              <div className="label">{item.label}</div>
              <div className="sublabel">{item.sublabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Similar structure for Gender, Speed, Level, Topic */}

      <button className="btn btn-primary btn-full btn-lg" onClick={handleSave}>
        저장하기
      </button>
    </div>
  </>
)
```

---

## Backend Integration

### Accent → Voice Mapping (Polly)

**File:** `backend/lambda_function.py`

```python
voice_map = {
    ('us', 'female'): ('Joanna', 'neural'),
    ('us', 'male'): ('Matthew', 'neural'),
    ('uk', 'female'): ('Amy', 'neural'),
    ('uk', 'male'): ('Brian', 'neural'),
    ('au', 'female'): ('Nicole', 'standard'),
    ('au', 'male'): ('Russell', 'standard'),
    ('in', 'female'): ('Aditi', 'standard'),
    ('in', 'male'): ('Aditi', 'standard'),
}
```

### Level → AI Behavior Mapping

```python
level_map = {
    'beginner': 'Beginner (use simple words and short sentences)',
    'intermediate': 'Intermediate (normal conversation level)',
    'advanced': 'Advanced (use complex vocabulary and idioms)'
}
```

### Topic → Conversation Context

```python
topic_map = {
    'business': 'Business and workplace situations',
    'daily': 'Daily life and casual conversation',
    'travel': 'Travel and tourism',
    'interview': 'Job interviews and professional settings'
}
```

### System Prompt Generation

```python
SYSTEM_PROMPT = """You are Emma, a friendly AI English tutor making a phone call to help the student practice English conversation.

Guidelines:
- Accent: {accent}
- Difficulty Level: {level}
- Topic: {topic}
- Keep responses natural and conversational (2-3 sentences max)
- Ask follow-up questions to keep the conversation flowing
- Gently correct major grammar errors when appropriate
- Be encouraging and supportive
- Respond in English only

If this is the first message, greet the student warmly and ask them a simple opening question related to the topic."""

system = SYSTEM_PROMPT.format(
    accent=accent_map.get(settings.get('accent', 'us'), 'American English'),
    level=level_map.get(settings.get('level', 'intermediate'), 'Intermediate'),
    topic=topic_map.get(settings.get('topic', 'business'), 'Business')
)
```

---

## Settings Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Settings Flow                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Home Page           Settings Page          LocalStorage     │
│  ┌─────────┐        ┌─────────────┐       ┌─────────────┐   │
│  │ Settings │───────▶│   Select    │──────▶│   Save      │   │
│  │  Button  │        │   Options   │       │  Settings   │   │
│  └─────────┘        └─────────────┘       └─────────────┘   │
│                            │                     │           │
│                            ▼                     ▼           │
│  Call Page           API Request           Load Settings     │
│  ┌─────────┐        ┌─────────────┐       ┌─────────────┐   │
│  │  Load   │◀───────│   Include   │◀──────│    Read     │   │
│  │Settings │        │  Settings   │       │  on Mount   │   │
│  └─────────┘        └─────────────┘       └─────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Home Page Integration

**File:** `src/pages/Home.jsx`

```jsx
// Load settings for tutor card display
const settings = JSON.parse(localStorage.getItem('tutorSettings') || '{}')
const accent = settings.accent || 'us'
const gender = settings.gender || 'female'

const accentLabel = {
  us: '미국',
  uk: '영국',
  au: '호주',
  in: '인도'
}[accent] || '미국'

const genderLabel = gender === 'male' ? '남성' : '여성'

// Dynamic tutor name based on gender
const tutorNames = {
  female: ['Gwen', 'Emma', 'Olivia', 'Sophia'],
  male: ['James', 'Liam', 'Noah', 'Oliver']
}
const tutorName = settings.tutorName || tutorNames[gender][0]

// Display on tutor card
<div className="tutor-card">
  <h2 className="tutor-name">{tutorName}</h2>
  <div className="tutor-info-tags">
    <span className="info-tag">#{accentLabel}</span>
    <span className="info-tag">#{genderLabel}</span>
  </div>
</div>
```

---

## Call Page Integration

**File:** `src/pages/Call.jsx`

```jsx
// Load settings for API calls
const settings = JSON.parse(localStorage.getItem('tutorSettings') || '{}')
const topic = settings.topic || 'daily'

// Topic labels for header display
const topicLabels = {
  business: 'Business English',
  daily: 'Daily Conversation',
  travel: 'Travel English',
  interview: 'Job Interview'
}
const topicLabel = topicLabels[topic] || 'Daily Conversation'

// Pass settings to API
const response = await sendMessage(apiMessages, settings)

// TTS with settings
const ttsResponse = await textToSpeech(text, settings)
```

---

## LocalStorage Schema

```json
{
  "tutorSettings": {
    "accent": "us",
    "gender": "female",
    "speed": "normal",
    "level": "intermediate",
    "topic": "business"
  }
}
```

---

## UI Styling

```css
.option-group {
  margin-bottom: 24px;
}

.option-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.option-grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.option-item {
  padding: 16px;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item.selected {
  background: #eef2ff;
  border-color: #6366f1;
}

.option-item .icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.option-item .label {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.option-item .sublabel {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
```

---

## Verification

### Test Settings Persistence

```bash
# 1. Open Settings page
# 2. Select different options
# 3. Save settings
# 4. Navigate to Home page
# 5. Verify tutor card reflects settings
# 6. Start a call
# 7. Verify AI behavior matches settings
# 8. Refresh browser
# 9. Verify settings persist
```

### Test API Integration

```bash
# Check settings sent to API
curl -X POST https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{
    "action": "chat",
    "messages": [],
    "settings": {
      "accent": "uk",
      "gender": "male",
      "level": "advanced",
      "topic": "business"
    }
  }'

# Expected: AI responds with British English style for advanced business conversation
```

---

## Results

| Feature | Status |
|---------|--------|
| Accent Selection | ✅ Working |
| Gender Selection | ✅ Working |
| Speed Selection | ✅ Working |
| Level Selection | ✅ Working |
| Topic Selection | ✅ Working |
| Settings Persistence | ✅ Working |
| API Integration | ✅ Working |
| Voice Matching | ✅ Working |

---

## Next Steps

- Phase 4: Call Result Analysis & CAFP Scoring
- Phase 5: UI/UX Refinement (Ringle Style)
- Future: Add more topics and customization options

---

## References

- [Amazon Polly Voice List](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html)
- [LocalStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [React State Management](https://react.dev/learn/managing-state)
