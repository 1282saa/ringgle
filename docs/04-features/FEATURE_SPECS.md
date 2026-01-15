# 기능별 개발 명세서

> **프론트엔드 개발자용 - 기능별 상세 구현 가이드**
> 버전: 1.0 | 최종 수정일: 2026-01-12

---

## 목차

1. [Feature 1: AI 전화 통화](#feature-1-ai-전화-통화)
2. [Feature 2: 튜터 맞춤 설정](#feature-2-튜터-맞춤-설정)
3. [Feature 3: 통화 결과 및 피드백](#feature-3-통화-결과-및-피드백)
4. [Feature 4: AI 분석 (CAFP)](#feature-4-ai-분석-cafp)
5. [Feature 5: 핵심 표현 연습](#feature-5-핵심-표현-연습)
6. [Feature 6: 전화 내역 관리](#feature-6-전화-내역-관리)

---

## Feature 1: AI 전화 통화

### 담당 파일
- `src/pages/Call.jsx`

### 기능 요약
사용자가 AI 튜터와 음성으로 실시간 영어 대화를 진행합니다.

### 사용자 시나리오

```
1. 사용자가 "바로 전화하기" 버튼 클릭
2. 통화 화면으로 이동
3. AI 튜터가 먼저 인사 (TTS 재생)
4. 사용자가 마이크 버튼 탭하여 응답
5. 음성 인식 → 텍스트 변환
6. AI가 응답 생성 → TTS 재생
7. 반복...
8. 사용자가 "통화 종료" 클릭
9. 결과 화면으로 이동
```

### 상태 관리

```javascript
// 필수 상태
const [messages, setMessages] = useState([])        // 대화 기록
const [isListening, setIsListening] = useState(false)  // 음성 인식 중
const [isSpeaking, setIsSpeaking] = useState(false)    // AI 말하는 중
const [isLoading, setIsLoading] = useState(false)      // AI 응답 생성 중
const [callDuration, setCallDuration] = useState(0)    // 통화 시간 (초)
const [totalWords, setTotalWords] = useState(0)        // 총 발화 단어 수
```

### 음성 인식 구현 (Web Speech API)

```javascript
// 음성 인식 초기화
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
recognition.lang = 'en-US'
recognition.continuous = false
recognition.interimResults = false

// 음성 인식 시작
const startListening = () => {
  if (isSpeaking || isLoading) return  // AI가 말하는 중이면 무시

  setIsListening(true)
  recognition.start()
}

// 결과 처리
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript
  handleUserMessage(transcript)
}

recognition.onend = () => {
  setIsListening(false)
}
```

### AI 응답 흐름

```javascript
const handleUserMessage = async (text) => {
  // 1. 사용자 메시지 추가
  const userMessage = { role: 'user', content: text }
  const newMessages = [...messages, userMessage]
  setMessages(newMessages)

  // 2. 단어 수 업데이트
  setTotalWords(prev => prev + countWords(text))

  // 3. AI 응답 요청
  setIsLoading(true)
  try {
    const response = await sendMessage(newMessages)

    // 4. AI 메시지 추가
    const aiMessage = { role: 'assistant', content: response.message }
    setMessages([...newMessages, aiMessage])

    // 5. TTS 재생
    setIsSpeaking(true)
    await speakText(response.message)
    setIsSpeaking(false)

  } catch (error) {
    console.error('AI 응답 실패:', error)
  } finally {
    setIsLoading(false)
  }
}
```

### UI 상태별 표시

| 상태 | 마이크 버튼 | 상태 텍스트 |
|------|-----------|------------|
| `isSpeaking` | 비활성 (회색) | "AI가 말하는 중..." |
| `isListening` | 펄스 애니메이션 | "듣고 있어요..." |
| `isLoading` | 비활성 | "AI가 생각하는 중..." |
| 대기 | 기본 | "마이크를 눌러 말하세요" |

### 통화 종료 처리

```javascript
const endCall = () => {
  // 1. 음성 인식 중지
  recognition.stop()

  // 2. 통화 결과 저장
  const callResult = {
    messages,
    duration: callDuration,
    totalWords,
    date: new Date().toISOString(),
    tutorName: getTutorName(settings),
  }
  saveLastCallResult(callResult)

  // 3. 히스토리에 추가
  addCallHistory({
    date: getKoreanDate(),
    fullDate: getKoreanDateTime(),
    duration: formatTime(callDuration),
    words: totalWords,
    tutorName: getTutorName(settings),
  })

  // 4. 결과 페이지로 이동
  navigate('/result')
}
```

---

## Feature 2: 튜터 맞춤 설정

### 담당 파일
- `src/pages/Settings.jsx`
- `src/constants/index.js`

### 기능 요약
사용자가 AI 튜터의 억양, 성별, 말하기 속도, 난이도, 대화 주제를 설정합니다.

### 설정 옵션

```javascript
// 억양 (Accent)
const ACCENTS = [
  { id: 'us', label: '미국', icon: '🇺🇸', sublabel: 'American' },
  { id: 'uk', label: '영국', icon: '🇬🇧', sublabel: 'British' },
  { id: 'au', label: '호주', icon: '🇦🇺', sublabel: 'Australian' },
  { id: 'in', label: '인도', icon: '🇮🇳', sublabel: 'Indian' },
]

// 성별 (Gender)
const GENDERS = [
  { id: 'female', label: '여성', icon: '👩' },
  { id: 'male', label: '남성', icon: '👨' },
]

// 말하기 속도 (Speed)
const SPEEDS = [
  { id: 'slow', label: '느리게', sublabel: '0.8x', rate: 0.8 },
  { id: 'normal', label: '보통', sublabel: '1.0x', rate: 1.0 },
  { id: 'fast', label: '빠르게', sublabel: '1.2x', rate: 1.2 },
]

// 난이도 (Level)
const LEVELS = [
  { id: 'beginner', label: '초급', sublabel: 'Beginner' },
  { id: 'intermediate', label: '중급', sublabel: 'Intermediate' },
  { id: 'advanced', label: '고급', sublabel: 'Advanced' },
]

// 대화 주제 (Topic)
const TOPICS = [
  { id: 'business', label: '비즈니스', icon: '💼' },
  { id: 'daily', label: '일상 대화', icon: '💬' },
  { id: 'travel', label: '여행', icon: '✈️' },
  { id: 'interview', label: '면접', icon: '🎯' },
]
```

### 상태 관리

```javascript
const [settings, setSettings] = useState({
  accent: 'us',
  gender: 'female',
  speed: 'normal',
  level: 'intermediate',
  topic: 'business',
})

// 개별 설정 변경
const handleChange = (key, value) => {
  setSettings(prev => ({ ...prev, [key]: value }))
}

// 저장
const handleSave = () => {
  saveTutorSettings(settings)
  navigate(-1)  // 이전 페이지로
}
```

### 옵션 선택 UI 컴포넌트

```jsx
// 재사용 가능한 옵션 그리드 컴포넌트
function OptionGrid({ options, selected, onChange, columns = 4 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 12,
    }}>
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          style={{
            padding: '16px 12px',
            border: selected === option.id
              ? '2px solid #5046e4'
              : '1px solid #e5e7eb',
            borderRadius: 12,
            background: selected === option.id ? '#f3f4f6' : 'white',
          }}
        >
          {option.icon && <span style={{ fontSize: 24 }}>{option.icon}</span>}
          <div>{option.label}</div>
          {option.sublabel && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {option.sublabel}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
```

---

## Feature 3: 통화 결과 및 피드백

### 담당 파일
- `src/pages/Result.jsx`

### 기능 요약
통화 종료 후 결과 요약을 보여주고, 사용자 피드백을 수집합니다.

### 필요한 데이터

```javascript
// useLocation으로 받거나 localStorage에서 로드
const callResult = getLastCallResult()

// 표시할 데이터
const stats = {
  newWords: callResult.newWords || 0,      // 새로운 단어 (AI 분석 필요)
  totalWords: callResult.totalWords,       // 말한 단어 수
  duration: formatTime(callResult.duration), // 대화 시간
}
```

### 피드백 모달

```jsx
const [showFeedback, setShowFeedback] = useState(true)
const [rating, setRating] = useState(0)

// 별점 컴포넌트
function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onChange(star)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 32,
            color: star <= value ? '#a78bfa' : '#e5e7eb',
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// 피드백 제출
const handleFeedbackSubmit = () => {
  setToStorage(STORAGE_KEYS.LAST_FEEDBACK, { rating, date: new Date() })
  setShowFeedback(false)
}
```

### Stats Card 컴포넌트

```jsx
function StatCard({ label, value, highlight = false }) {
  return (
    <div style={{
      flex: 1,
      background: 'white',
      borderRadius: 12,
      padding: 16,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, color: '#6b7280' }}>{label}</div>
      <div style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: highlight ? '#22c55e' : '#1f2937',
        marginTop: 8,
      }}>
        {highlight && '+ '}{value}
      </div>
    </div>
  )
}

// 사용
<div style={{ display: 'flex', gap: 12 }}>
  <StatCard label="새로운 단어" value={stats.newWords} highlight />
  <StatCard label="말한 단어" value={stats.totalWords} />
  <StatCard label="대화 시간" value={stats.duration} />
</div>
```

### 조건부 버튼 표시

```jsx
// 150단어 이상일 때만 AI 분석 버튼 활성화
const canAnalyze = stats.totalWords >= 150

<button
  onClick={handleAnalyze}
  disabled={!canAnalyze}
  style={{
    opacity: canAnalyze ? 1 : 0.5,
    cursor: canAnalyze ? 'pointer' : 'not-allowed',
  }}
>
  AI 분석 요청
</button>

{!canAnalyze && (
  <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
    AI 분석을 받으려면 최소 150단어가 필요해요.
  </p>
)}
```

---

## Feature 4: AI 분석 (CAFP)

### 담당 파일
- `src/pages/Analysis.jsx`

### 기능 요약
대화 내용을 AI로 분석하여 CAFP 점수와 학습 추천을 제공합니다.

### CAFP 점수 체계

| 항목 | 설명 | 레벨 범위 |
|------|------|----------|
| **C**omplexity (복잡성) | 문장 구성 능력, 어휘 다양성 | 1-9 |
| **A**ccuracy (정확성) | 문법 정확도 | 1-9 |
| **F**luency (유창성) | 자연스러운 속도, 멈춤 없는 발화 | 1-9 |
| **P**ronunciation (발음) | 소리와 억양의 자연스러움 | 1-9 |

### 분석 요청

```javascript
const [analysis, setAnalysis] = useState(null)
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  const fetchAnalysis = async () => {
    const callResult = getLastCallResult()
    if (!callResult?.messages) return

    try {
      const result = await analyzeConversation(callResult.messages)
      setAnalysis(result.analysis)
    } catch (error) {
      console.error('분석 실패:', error)
      setAnalysis(DEFAULT_ANALYSIS)  // 폴백
    } finally {
      setIsLoading(false)
    }
  }

  fetchAnalysis()
}, [])
```

### CAFP Score Card 컴포넌트

```jsx
function CAFPScoreCard({ type, label, labelKo, score, level, isBeta }) {
  const colors = {
    complexity: '#5046e4',
    accuracy: '#22c55e',
    fluency: '#f59e0b',
    pronunciation: '#ef4444',
  }

  const icons = {
    complexity: '🔷',
    accuracy: '🎯',
    fluency: '〰️',
    pronunciation: '🎤',
  }

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 12,
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{icons[type]}</span>
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span style={{ color: '#6b7280' }}>{labelKo}</span>
          {isBeta && (
            <span style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 12,
            }}>
              Beta
            </span>
          )}
        </div>
        <div>
          <span style={{ fontSize: 24, fontWeight: 'bold', color: colors[type] }}>
            Lv {level}
          </span>
          <span style={{ color: '#d1d5db' }}>/9</span>
        </div>
      </div>

      {/* 점수 */}
      <div style={{
        textAlign: 'right',
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 4,
      }}>
        {score.toFixed(1)}
      </div>

      {/* 프로그레스 바 */}
      <div style={{
        height: 8,
        background: '#e5e7eb',
        borderRadius: 4,
        marginTop: 8,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${(score / 9) * 100}%`,
          background: colors[type],
          borderRadius: 4,
        }} />
      </div>
    </div>
  )
}
```

### 추천 학습 영역 컴포넌트

```jsx
function LearningRecommendation({ type, icon, title, count, examples, onPress }) {
  return (
    <div
      onClick={onPress}
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        cursor: 'pointer',
      }}
    >
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{icon}</span>
          <span style={{ color: '#5046e4', fontWeight: 600 }}>{title}</span>
        </div>
        <span style={{ color: '#9ca3af' }}>›</span>
      </div>

      {/* 설명 */}
      <p style={{ fontWeight: 600, marginTop: 8 }}>
        {title} 사용이 많았던 구간이 {count}개 있어요.
      </p>

      {/* 예시 */}
      {examples && (
        <div style={{
          background: '#f9fafb',
          borderRadius: 8,
          padding: '12px 16px',
          marginTop: 12,
          fontSize: 14,
        }}>
          {examples}
        </div>
      )}
    </div>
  )
}
```

---

## Feature 5: 핵심 표현 연습

### 담당 파일
- `src/pages/Practice.jsx`

### 기능 요약
AI가 교정한 표현을 3단계로 연습합니다.

### 연습 데이터 구조

```javascript
const corrections = [
  {
    id: 1,
    original: "What's your daughter's solo, cantankerous laptop?",
    corrected: "What do you think about your daughter's difficult laptop?",
    translation: "딸의 어려운 노트북에 대해 어떻게 생각하세요?",
    explanation: "'Cantankerous'는 일반적으로 사람에게 사용되며, 노트북에 대해 이야기할 때는 'difficult'가 더 적절합니다.",
  },
  // ...
]
```

### 단계별 상태 관리

```javascript
const [currentStep, setCurrentStep] = useState(1)      // 1, 2, 3
const [currentIndex, setCurrentIndex] = useState(0)    // 연습 중인 표현 인덱스
const [isRecording, setIsRecording] = useState(false)
const [hasRecorded, setHasRecorded] = useState(false)

const currentCorrection = corrections[currentIndex]
const totalCorrections = corrections.length
const progress = ((currentIndex + 1) / totalCorrections) * 100
```

### Step 1: 설명 화면

```jsx
function Step1({ correction, onNext }) {
  return (
    <div style={{ padding: 20 }}>
      <h2>이 표현을 짧게 연습해볼게요.</h2>

      {/* 교정된 문장 카드 */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 24,
        marginTop: 32,
      }}>
        <p style={{ fontSize: 18, fontWeight: 600 }}>
          {correction.corrected}
        </p>
        <p style={{ color: '#8b5cf6', marginTop: 16 }}>
          {correction.translation}
        </p>
      </div>

      {/* 설명 박스 */}
      <div style={{
        background: '#eff6ff',
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
        lineHeight: 1.6,
      }}>
        '{correction.original}'라는 표현은 자연스럽지 않아서,
        '{correction.corrected}'로 바꾸는 것이 좋습니다.
        {correction.explanation}
      </div>

      <button onClick={onNext} style={styles.primaryButton}>
        다음
      </button>
    </div>
  )
}
```

### Step 2: 따라 말하기

```jsx
function Step2({ correction, progress, onComplete }) {
  const [isRecording, setIsRecording] = useState(false)

  const handleListen = async () => {
    await speakText(correction.corrected)
  }

  const handleRecord = () => {
    setIsRecording(true)
    // 음성 인식 시작
  }

  return (
    <div style={{ padding: 20 }}>
      {/* 프로그레스 바 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button onClick={() => navigate(-1)}>←</button>
        <div style={{
          flex: 1,
          height: 4,
          background: '#e5e7eb',
          borderRadius: 2,
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#5046e4',
            borderRadius: 2,
          }} />
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>듣고 따라 말해보세요.</h2>

      {/* 문장 카드 */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 24,
        marginTop: 32,
      }}>
        <p style={{ fontSize: 18, fontWeight: 600 }}>
          {correction.corrected}
        </p>
        <p style={{ color: '#8b5cf6', marginTop: 16 }}>
          {correction.translation}
        </p>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button onClick={handleListen} style={styles.outlineButton}>
          🔊 문장 듣기
        </button>
        <button style={styles.outlineButton}>
          🎧 내 발음 듣기
        </button>
      </div>

      {/* 마이크 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
        <button
          onClick={handleRecord}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: isRecording ? '#5046e4' : '#8b5cf6',
            border: 'none',
            color: 'white',
            fontSize: 32,
          }}
        >
          🎤
        </button>
      </div>
    </div>
  )
}
```

### Step 3: 완료

```jsx
function Step3({ onNext }) {
  return (
    <div style={{
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
    }}>
      {/* 완료 아이콘 */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: '#22c55e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 40,
        color: 'white',
      }}>
        ✓
      </div>

      <h2 style={{ marginTop: 24 }}>잘했어요!</h2>
      <p style={{ color: '#6b7280', marginTop: 8 }}>
        다음 학습 활동을 진행해보세요.
      </p>

      <button onClick={onNext} style={{
        ...styles.primaryButton,
        marginTop: 40,
        width: '100%',
      }}>
        다음
      </button>
    </div>
  )
}
```

---

## Feature 6: 전화 내역 관리

### 담당 파일
- `src/pages/Home.jsx` (히스토리 탭)
- `src/utils/helpers.js` (스토리지 함수)

### 기능 요약
사용자의 통화 기록을 저장하고 표시합니다.

### 데이터 구조

```javascript
// 단일 통화 기록
const callRecord = {
  id: Date.now(),                          // 고유 ID
  date: '2026. 1. 12.',                   // 간략 날짜
  fullDate: '2026. 1. 12. 오후 7:08:00',  // 상세 날짜
  duration: '05:30',                       // 통화 시간 (포맷팅됨)
  words: 156,                              // 발화 단어 수
  tutorName: 'Gwen',                       // 튜터 이름
  hasAnalysis: true,                       // AI 분석 여부
}

// 통화 기록 배열 (최대 10개)
const callHistory = [callRecord, ...]
```

### 스토리지 함수

```javascript
// helpers.js에서 제공하는 함수들

// 통화 기록 조회
export function getCallHistory() {
  return getFromStorage(STORAGE_KEYS.CALL_HISTORY, [])
}

// 통화 기록 추가
export function addCallHistory(callRecord) {
  const history = getCallHistory()
  history.unshift(callRecord)  // 최신 기록을 앞에
  return setToStorage(
    STORAGE_KEYS.CALL_HISTORY,
    history.slice(0, MAX_CALL_HISTORY)  // 최대 10개
  )
}
```

### 히스토리 리스트 UI

```jsx
function CallHistoryList({ history, onItemClick }) {
  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
        아직 통화 기록이 없습니다.
      </div>
    )
  }

  return (
    <div>
      {history.map(item => (
        <div
          key={item.id}
          onClick={() => onItemClick(item)}
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            cursor: 'pointer',
          }}
        >
          {/* 타입 태그 */}
          <span style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 13,
          }}>
            전화
          </span>

          {/* 날짜 */}
          <div style={{ marginTop: 12, fontWeight: 600 }}>
            {item.fullDate}
          </div>

          {/* 단어 수 */}
          <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            {item.words}단어 / 150단어
          </div>

          {/* 화살표 */}
          <div style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af',
          }}>
            ›
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 월별 필터링 (확장 기능)

```javascript
// 월별 필터링
const filterByMonth = (history, year, month) => {
  return history.filter(item => {
    const date = new Date(item.fullDate)
    return date.getFullYear() === year && date.getMonth() + 1 === month
  })
}

// 사용
const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
const filteredHistory = filterByMonth(callHistory, 2026, currentMonth)
```

---

## 공통 스타일 참조

```javascript
// 자주 사용하는 스타일 상수
const styles = {
  // Primary 버튼 (CTA)
  primaryButton: {
    width: '100%',
    padding: '16px 0',
    background: '#5046e4',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 17,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Outline 버튼
  outlineButton: {
    flex: 1,
    padding: '14px 20px',
    background: 'white',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: 24,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
  },

  // 카드
  card: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
  },

  // 섹션 타이틀
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 16,
  },
}
```

---

> 각 Feature는 독립적으로 개발 가능합니다.
> 의존성: Feature 1(통화) → Feature 3(결과) → Feature 4(분석) / Feature 5(연습)
