# Phase 10: Call Tab UI Refinement

**Timeline:** 2026-01-12
**Status:** Completed
**Branch:** `main`
**Impact:** Refined Call tab UI to match Ringle app benchmark design

---

## Overview

Improved the Call tab (AI Phone) UI/UX to match the Ringle app benchmark design.

**Key Objectives:**
- Improve tutor settings page accessibility
- Optimize call screen layout
- Simplify call result screen
- Remove tone indicators from subtitles

---

## Changes Summary

### 1. App.jsx - Route Addition

```javascript
import TutorSettings from './pages/TutorSettings'

<Route path="/settings/tutor" element={<TutorSettings />} />
```

### 2. Home.jsx - Tutor Card Navigation

```jsx
// Navigate to tutor settings on card click
<div className="tutor-card" onClick={() => navigate('/settings/tutor')}>
  ...
</div>

// Added CSS
.tutor-card {
  cursor: pointer;
  transition: all 0.2s;
}
```

### 3. TutorSettings.jsx - UI Improvements

**Header Changes:**
- ChevronLeft (back) → X (close) button
- Layout: Title left, X button right

**Tutor Card Layout:**
```jsx
// Before: Horizontal (avatar + info)
// After: Vertical (nationality/gender → name → tags)

<div className="tutor-card">
  <span className="tutor-meta">{tutor.nationality} {tutor.genderLabel}</span>
  <h3 className="tutor-name">{tutor.name}</h3>
  <div className="tutor-tags">{tutor.tags.join('  ')}</div>
</div>
```

**Tag Format:**
- Before: `#bright #energetic`
- After: `bright  energetic` (space separated)

### 4. constants/index.js - SPEEDS Options

```javascript
// Before: 3 options
// After: 2 options (matching Ringle app)
export const SPEEDS = [
  { id: 'normal', label: '보통', sublabel: '1.0x', rate: 1.0 },
  { id: 'slow', label: '천천히', sublabel: '0.8x', rate: 0.8 },
]
```

### 5. Call.jsx - Call Screen Improvements

**Remove Tone Indicators from Subtitles:**
```javascript
const cleanSubtitleText = (text) => {
  if (!text) return ''
  return text
    .replace(/\*[^*]+\*\s*/g, '')  // Remove *...* patterns
    .replace(/^\s+/, '')
    .trim()
}
```

**Control Button Layout:**
```css
.call-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}

.control-buttons {
  display: flex;
  justify-content: center;
  gap: 60px;
}
```

### 6. Result.jsx - Result Screen Simplification

**Stats Cards:**
- Before: 3 cards (New Words, Words Spoken, Duration)
- After: 2 cards (Words Spoken, Duration)

**Layout Structure:**
```jsx
<div className="stats-container">  {/* Gray background */}
  <div className="stats-row">
    <div className="stat-card">...</div>  {/* White card */}
    <div className="stat-card">...</div>
  </div>
</div>
```

**Background Colors:**
- `.ringle-result`: `#f5f5f5` → `white`
- `.success-section`: `#e5e5e5` → `white`
- `.stats-container`: `#f3f4f6` (gray)

**Buttons:**
- Before: "AI Analysis Request" + "Check Expressions"
- After: "AI Analysis Request" + "Confirm"

**150 Words Notice:**
- Before: Always displayed on screen
- After: Toast notification on button click

**Auto Analysis Removed:**
- No automatic analysis on page load
- Analysis only when user clicks "AI Analysis Request"

---

## File Changes

| File | Changes |
|------|---------|
| `src/App.jsx` | Added TutorSettings route |
| `src/pages/Home.jsx` | Added tutor card onClick, cursor style |
| `src/pages/TutorSettings.jsx` | X button, vertical card layout, tag format |
| `src/pages/Call.jsx` | cleanSubtitleText, control layout |
| `src/pages/Result.jsx` | 2 cards, toast notification, background colors |
| `src/constants/index.js` | SPEEDS reduced to 2 options |

---

## Design Comparison

### Tutor Settings Page
```
Before:                          After (Ringle style):
┌─────────────────┐              ┌─────────────────┐
│ ← Tutor         │              │ Tutor         X │
│                 │              │                 │
│ [Avatar] Gwen   │              │ US Female       │
│ US #bright      │              │ Gwen            │
│                 │              │ bright energetic│
└─────────────────┘              └─────────────────┘
```

### Call Result Page
```
Before:                          After (Ringle style):
┌─────────────────┐              ┌─────────────────┐
│ (gray bg)       │              │ (white bg)      │
│ ✓ Complete      │              │ ✓ Complete      │
│                 │              │                 │
│ [New][Words][Time]│            │ ┌─────────────┐ │
│  +2   0    1:38  │             │ │[Words][Time]│ │ ← gray box
│                 │              │ │  0    n/a   │ │ ← white cards
│ [Request][Check] │             │ └─────────────┘ │
│                 │              │                 │
│ (CAFP shown)    │              │ [Request][OK]   │
└─────────────────┘              └─────────────────┘
```

---

## Testing Checklist

- [x] Home → Tutor card click → Navigate to tutor settings
- [x] Tutor settings → X button → Return to previous screen
- [x] Tutor settings → Save → Settings saved + return
- [x] Call screen → Subtitles have no tone indicators
- [x] Call screen → Control/end button layout correct
- [x] Result screen → White bg, gray box with white cards
- [x] Result screen → Under 150 words → Toast notification
- [x] Result screen → Confirm button → Navigate to home

---

## Next Steps

- Phase 11: Call History Tab UI Refinement
- Phase 12: Analysis Result Page Detailed Design
- Phase 13: Mobile Build and Testing

---

## References

- Ringle App Benchmark Screenshots
- [Phase 9: UX/UI Improvements](PHASE-09-ux-ui-improvements.md)
