# Phase 9: UX/UI Improvements

**Timeline:** 2026-01-12
**Status:** Completed
**Branch:** `main`
**Commit:** `e17899c`
**Impact:** Frontend-wide UX/UI improvements, enhanced user experience

---

## Overview

Reviewed all frontend pages from a user perspective and improved discovered UX/UI issues. Main improvement areas include Call, Practice, Result, Analysis, Home, and Settings pages.

**Main Goals:**
- Implement user feedback
- Improve button functionality
- Complete Korean localization
- Implement audio playback features
- Add toast notifications

---

## Problem Analysis

### Discovered Issues

| Page | Issue | Severity |
|------|-------|----------|
| Call.jsx | Subtitle button text always shows "Subtitle" | Medium |
| Call.jsx | Speaker button has no response on click | High |
| Call.jsx | Interim speech recognition results not displayed | Medium |
| Call.jsx | Data structure mismatch with Home | High |
| Practice.jsx | Accuracy calculation too simple | Medium |
| Result.jsx | Feedback modal forced to show first | High |
| Result.jsx | "Submit" button shown in English | Low |
| Analysis.jsx | Audio playback button not working | High |
| Home.jsx | 150-word threshold guidance insufficient | Medium |
| Settings.jsx | No feedback on save | Medium |

---

## Implementation

### 1. Call.jsx Improvements

#### Dynamic Subtitle Button Text

```javascript
// Subtitle button label constants
const SUBTITLE_BUTTON_LABELS = {
  all: 'Show All',
  english: 'English Only',
  translation: 'Translation Only',
  off: 'Hide Subtitles'
}

// Display based on current state in UI
<button onClick={cycleSubtitleMode}>
  {SUBTITLE_BUTTON_LABELS[subtitleMode]}
</button>
```

#### Speaker Button Implementation

```javascript
const [isSpeakerOn, setIsSpeakerOn] = useState(true)

const toggleSpeaker = () => {
  setIsSpeakerOn(!isSpeakerOn)
  if (isSpeakerOn) {
    // Stop currently playing audio
    if (audioRef.current) audioRef.current.pause()
    if ('speechSynthesis' in window) speechSynthesis.cancel()
  }
}

// Check speaker state in speakText function
const speakText = async (text) => {
  if (!isSpeakerOn) return  // Don't play if speaker is off
  // ...
}
```

#### Interim Speech Recognition Display

```javascript
const [interimTranscript, setInterimTranscript] = useState('')

recognitionRef.current.onresult = (event) => {
  let finalTranscript = ''
  let interim = ''

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i]
    if (result.isFinal) {
      finalTranscript += result[0].transcript
    } else {
      interim += result[0].transcript
    }
  }

  setInterimTranscript(interim)

  if (finalTranscript) {
    setInterimTranscript('')
    handleUserSpeech(finalTranscript)
  }
}
```

#### Data Structure Unification

```javascript
// Before
history.unshift({
  date: now.toLocaleDateString('ko-KR'),
  duration: formatTime(callTime),
  words: wordCount,
})

// After
history.unshift({
  id: Date.now(),
  timestamp: now.toISOString(),
  date: now.toLocaleDateString('ko-KR'),
  fullDate: now.toLocaleString('ko-KR'),
  duration: formatTime(callTime),
  durationSeconds: callTime,
  words: wordCount,
  turnCount,
  tutorName
})
```

---

### 2. Practice.jsx Accuracy Calculation Improvement

#### Levenshtein Distance Algorithm

```javascript
const levenshteinDistance = (str1, str2) => {
  const m = str1.length, n = str2.length
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}
```

#### Weighted Accuracy Calculation

```javascript
const evaluatePronunciation = (spoken, target) => {
  // Character similarity (Levenshtein)
  const distance = levenshteinDistance(spokenClean, targetClean)
  const charSimilarity = Math.max(0, 100 - (distance / maxLen) * 100)

  // Word match rate
  const matchedWords = spokenWords.filter(w => targetWords.includes(w)).length
  const wordMatchRate = (matchedWords / targetWords.length) * 100

  // Order bonus
  const orderBonus = /* +5 if order matches */

  // Final score: 40% character + 60% word + bonus
  const accuracy = Math.min(100, Math.round(
    charSimilarity * 0.4 + wordMatchRate * 0.6 + orderBonus
  ))

  return accuracy
}
```

---

### 3. Result.jsx Improvements

#### Feedback Modal Order Change

```javascript
// Before: Modal shows immediately on page load
const [showFeedback, setShowFeedback] = useState(true)

// After: User chooses to show after viewing analysis
const [showFeedback, setShowFeedback] = useState(false)
```

#### Korean Localization

```jsx
// Button
<button onClick={submitFeedback}>Submit Feedback</button>

// Placeholder
<textarea
  placeholder="Please share your honest experience. Detailed feedback greatly helps improve features."
/>
```

#### Close Button Addition

```jsx
<button className="modal-close-btn" onClick={() => setShowFeedback(false)}>
  <X size={24} />
</button>
```

#### Feedback Trigger Button

```jsx
<button
  className="feedback-trigger-btn"
  onClick={() => setShowFeedback(true)}
>
  Leave Feedback
</button>
```

---

### 4. Analysis.jsx Audio Playback Implementation

#### TTS Playback Function

```javascript
const handlePlayAudio = async (text, index) => {
  // Stop if already playing
  if (playingIndex === index) {
    audioRef.current?.pause()
    speechSynthesis.cancel()
    setPlayingIndex(null)
    return
  }

  setPlayingIndex(index)

  try {
    const ttsResponse = await textToSpeech(text, settings)
    if (ttsResponse.audio) {
      const audio = new Audio(`data:audio/mp3;base64,${ttsResponse.audio}`)

      audio.ontimeupdate = () => {
        const progress = (audio.currentTime / audio.duration) * 100
        setAudioProgress(prev => ({ ...prev, [index]: progress }))
      }

      audio.onended = () => {
        setPlayingIndex(null)
        setAudioProgress(prev => ({ ...prev, [index]: 0 }))
      }

      audio.play()
    }
  } catch (err) {
    // Fallback to browser TTS
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    speechSynthesis.speak(utterance)
  }
}
```

#### Progress Bar CSS

```css
.progress-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  position: relative;
}

.progress-bar::before {
  content: '';
  width: var(--progress, 0%);
  background: #5046e4;
  transition: width 0.1s linear;
}

.progress-bar::after {
  left: var(--progress, 0%);
  transform: translateX(-50%);
}
```

---

### 5. Home.jsx Improvements

#### 150-Word Threshold UI

```javascript
// Display word count in call card
<p className="call-words">
  <span className={hasAnalysis ? 'word-count-ok' : 'word-count-low'}>
    {call.words} words
  </span>
  <span className="word-threshold"> / 150 words</span>
</p>

// Conditional AI analysis button rendering
{call.words >= 150 && (
  <button onClick={() => navigate('/analysis', { state: { callData } })}>
    View AI Analysis
  </button>
)}
```

#### Bottom Navigation Actions

```jsx
<nav className="bottom-nav">
  <button onClick={() => setActiveTab('call')}>Home</button>
  <button onClick={() => alert('1:1 Lesson feature coming soon.')}>1:1 Lesson</button>
  <button onClick={() => navigate('/call')}>AI Tutor</button>
  <button onClick={() => setActiveTab('call')}>AI Call</button>
  <button onClick={() => setActiveTab('history')}>Progress</button>
  <button onClick={() => navigate('/settings')}>My Ringle</button>
</nav>
```

---

### 6. Settings.jsx Toast Notification

#### Toast State and Function

```javascript
const [showToast, setShowToast] = useState(false)
const [toastMessage, setToastMessage] = useState('')

const displayToast = (message) => {
  setToastMessage(message)
  setShowToast(true)
  setTimeout(() => setShowToast(false), 2000)
}
```

#### Save Handler Modification

```javascript
const handleSaveName = () => {
  if (tempName.trim()) {
    setUserName(tempName.trim())
    setToStorage('userName', tempName.trim())
    displayToast('Name saved successfully')  // Show toast
  }
  setShowNameModal(false)
}

const handleRoleplayToggle = () => {
  const newValue = !roleplayAlert
  setRoleplayAlert(newValue)
  setToStorage('roleplayAlert', newValue)
  displayToast(newValue ? 'Notification enabled' : 'Notification disabled')
}
```

#### Toast UI

```jsx
{showToast && (
  <div className="toast">
    <Check size={18} />
    <span>{toastMessage}</span>
  </div>
)}
```

#### Toast CSS

```css
.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  padding: 14px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: toastFadeIn 0.3s ease;
  z-index: 2000;
}

.toast svg {
  color: #22c55e;
}

@keyframes toastFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
```

---

## File Changes

| File | Lines Changed | Description |
|------|---------------|-------------|
| `src/pages/Call.jsx` | +94 | Dynamic subtitle text, speaker toggle, interim results, data structure |
| `src/pages/Practice.jsx` | +62 | Levenshtein algorithm, weighted accuracy calculation |
| `src/pages/Result.jsx` | +65 | Feedback modal improvements, localization, CSS |
| `src/pages/Analysis.jsx` | +705 | Audio playback, progress bar |
| `src/pages/Home.jsx` | +368 | 150-word UI, navigation actions |
| `src/pages/Settings.jsx` | +157 | Toast messages, dynamic value display |
| `src/pages/ScheduleSettings.jsx` | +new | Schedule settings page |
| `src/pages/Script.jsx` | +new | Conversation script page |
| `src/data/mockCallHistory.js` | +new | Mock data |

---

## Testing Checklist

- [x] Call.jsx - Dynamic subtitle button text
- [x] Call.jsx - Speaker button on/off
- [x] Call.jsx - Interim speech recognition display
- [x] Practice.jsx - Improved accuracy calculation
- [x] Result.jsx - Feedback modal close button
- [x] Result.jsx - Korean button/placeholder
- [x] Analysis.jsx - Audio play/pause
- [x] Analysis.jsx - Progress bar display
- [x] Home.jsx - Sub-150 word guidance
- [x] Home.jsx - All bottom navigation buttons work
- [x] Settings.jsx - Toast on save

---

## Git History

```
commit e17899c
Author: User
Date:   2026-01-12

    feat: Improve UX/UI across all frontend pages

    - Call.jsx: Add dynamic subtitle button text, speaker toggle, interim speech recognition display
    - Practice.jsx: Improve accuracy calculation using Levenshtein distance algorithm
    - Result.jsx: Add feedback modal close button, Korean localization, CSS styles
    - Analysis.jsx: Implement audio playback with TTS API and progress bar
    - Home.jsx: Add 150-word threshold UI, bottom nav actions
    - Settings.jsx: Add save toast notifications, dynamic value display
    - Add new pages: ScheduleSettings.jsx, Script.jsx
    - Add mock data for call history
```

---

## Next Steps

1. **Additional UX Improvements**
   - Add loading skeleton UI
   - Implement error boundary
   - Support offline mode

2. **Accessibility Improvements**
   - Add ARIA labels
   - Support keyboard navigation
   - Screen reader testing

3. **Performance Optimization**
   - Apply React.memo
   - Image lazy loading
   - Bundle size analysis

---

## References

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Levenshtein Distance Algorithm](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [Toast Notification UX Best Practices](https://uxdesign.cc/toast-notification-ux-best-practices)
