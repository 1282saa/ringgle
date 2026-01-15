# Phase 8: Constant Refactoring & Code Cleanup

**Timeline:** 2026-01-12
**Status:** Completed
**Branch:** `main`
**Impact:** 코드 중복 제거, 유지보수성 향상, 이모지 의존성 제거

---

## Overview

프로젝트 전체 코드 리뷰 후 발견된 상수 중복 문제를 해결하고, 이모지 아이콘을 텍스트 기반으로 교체하여 코드 일관성과 유지보수성을 개선했습니다.

**주요 목표:**
- 상수 중앙화 (Single Source of Truth)
- 중복 코드 제거
- 이모지 의존성 제거 (접근성 및 일관성)

---

## Problem Analysis

### 발견된 문제점

#### 1. 상수 중복 정의

**Before:** 여러 파일에서 동일한 상수가 중복 정의됨

```
src/constants/index.js      → SPEEDS, LEVELS, ACCENTS 정의
src/pages/TutorSettings.jsx → TUTORS, SPEEDS, DIFFICULTIES, DURATIONS 재정의
src/pages/CurriculumSettings.jsx → TOPICS 별도 정의 (이모지 포함)
```

**문제점:**
- 수정 시 여러 파일을 동시에 변경해야 함
- 불일치 발생 위험
- 코드 검색 및 추적 어려움

#### 2. 이모지 아이콘 사용

**Before:** 상수에 이모지 직접 포함

```javascript
// constants/index.js
export const ACCENTS = [
  { id: 'us', label: '미국', icon: '🇺🇸', sublabel: 'American' },
  // ...
]

// TutorSettings.jsx
const TUTORS = [
  { id: 'gwen', name: 'Gwen', avatar: '👩🏼', ... },
  // ...
]
```

**문제점:**
- 일부 환경에서 이모지 렌더링 불일치
- 스크린 리더 접근성 문제
- 폰트 의존성

---

## Implementation

### 1. constants/index.js 확장

#### 추가된 상수

```javascript
// ============================================
// 튜터 데이터
// ============================================

/**
 * AI 튜터 목록 (전체 데이터)
 * @constant {Array<Object>}
 */
export const TUTORS = [
  { id: 'gwen', name: 'Gwen', nationality: '미국', accent: 'us', gender: 'female', genderLabel: '여성', tags: ['밝은', '활기찬'] },
  { id: 'chris', name: 'Chris', nationality: '미국', accent: 'us', gender: 'male', genderLabel: '남성', tags: ['밝은', '활기찬'] },
  { id: 'emma', name: 'Emma', nationality: '영국', accent: 'uk', gender: 'female', genderLabel: '여성', tags: ['차분한', '친절한'] },
  { id: 'james', name: 'James', nationality: '영국', accent: 'uk', gender: 'male', genderLabel: '남성', tags: ['차분한', '전문적'] },
  { id: 'olivia', name: 'Olivia', nationality: '호주', accent: 'au', gender: 'female', genderLabel: '여성', tags: ['활발한', '유쾌한'] },
  { id: 'noah', name: 'Noah', nationality: '호주', accent: 'au', gender: 'male', genderLabel: '남성', tags: ['친근한', '편안한'] },
  { id: 'sophia', name: 'Sophia', nationality: '인도', accent: 'in', gender: 'female', genderLabel: '여성', tags: ['따뜻한', '인내심'] },
  { id: 'liam', name: 'Liam', nationality: '인도', accent: 'in', gender: 'male', genderLabel: '남성', tags: ['논리적', '체계적'] },
]

/**
 * 난이도 옵션 (간략 - 설정 화면용)
 * @constant {Array<Object>}
 */
export const DIFFICULTIES = [
  { id: 'easy', label: 'Easy' },
  { id: 'intermediate', label: 'Intermediate' },
]

/**
 * 통화 시간 옵션
 * @constant {Array<Object>}
 */
export const DURATIONS = [
  { id: '5', label: '5분' },
  { id: '10', label: '10분' },
]
```

#### 이모지 제거

```javascript
// Before
export const ACCENTS = [
  { id: 'us', label: '미국', icon: '🇺🇸', sublabel: 'American' },
  { id: 'uk', label: '영국', icon: '🇬🇧', sublabel: 'British' },
  // ...
]

// After
export const ACCENTS = [
  { id: 'us', label: '미국', sublabel: 'American' },
  { id: 'uk', label: '영국', sublabel: 'British' },
  // ...
]
```

### 2. TutorSettings.jsx 리팩토링

#### Before (중복 상수 포함)

```javascript
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'

const TUTORS = [
  { id: 'gwen', name: 'Gwen', nationality: '미국', gender: '여성', tags: ['밝은', '활기찬'], avatar: '👩🏼' },
  // ... 8개 튜터 정의
]

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy' },
  { id: 'intermediate', label: 'Intermediate' },
]

const SPEEDS = [
  { id: 'normal', label: '보통' },
  { id: 'slow', label: '천천히' },
]

const DURATIONS = [
  { id: '5', label: '5분' },
  { id: '10', label: '10분' },
]
```

#### After (중앙 상수 import)

```javascript
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'
import { TUTORS, DIFFICULTIES, DURATIONS, SPEEDS } from '../constants'
```

#### 템플릿 수정

```jsx
// Before (이모지 avatar 사용)
<div className="tutor-avatar">{tutor.avatar}</div>
<span className="tutor-meta">{tutor.nationality} {tutor.gender}</span>

// After (텍스트 기반)
<div className="tutor-avatar">{tutor.name[0]}</div>
<span className="tutor-meta">{tutor.nationality} {tutor.genderLabel}</span>
```

### 3. CurriculumSettings.jsx 수정

#### 이모지 제거

```javascript
// Before
const TOPICS = [
  {
    id: 'youtube',
    label: '유튜브',
    icon: '📺',
    subtopics: ['유튜브 트렌드', '인기 영상 분석', '크리에이터 문화']
  },
  // ...
]

// After
const TOPICS = [
  {
    id: 'youtube',
    label: '유튜브',
    subtopics: ['유튜브 트렌드', '인기 영상 분석', '크리에이터 문화']
  },
  // ...
]
```

#### 템플릿 수정

```jsx
// Before
<span className="topic-icon">{topic.icon}</span>

// After (라벨 첫 글자 사용)
<span className="topic-icon">{topic.label[0]}</span>
```

---

## File Changes

| File | Lines Changed | Description |
|------|---------------|-------------|
| `src/constants/index.js` | +47, -14 | TUTORS, DIFFICULTIES, DURATIONS 추가, 이모지 제거 |
| `src/pages/TutorSettings.jsx` | 리팩토링 | 중복 상수 제거, constants import |
| `src/pages/CurriculumSettings.jsx` | 수정 | 이모지 제거, 텍스트 대체 |

---

## Constants Structure (After)

### 전체 상수 목록

```
src/constants/index.js
├── API_URL                 # API 엔드포인트
├── STORAGE_KEYS            # 로컬스토리지 키
├── ACCENTS                 # 억양 옵션 (이모지 제거)
├── ACCENT_LABELS           # 억양 라벨 맵
├── GENDERS                 # 성별 옵션 (이모지 제거)
├── SPEEDS                  # 속도 옵션
├── LEVELS                  # 난이도 옵션 (상세)
├── DIFFICULTIES            # 난이도 옵션 (간략) [NEW]
├── DURATIONS               # 통화 시간 옵션 [NEW]
├── TOPICS                  # 대화 주제 (이모지 제거)
├── TUTORS                  # AI 튜터 목록 [NEW]
├── TUTOR_NAMES             # 튜터 이름 (레거시)
├── PERSONALITY_TAGS        # 성격 태그
├── DEFAULT_SETTINGS        # 기본 설정
├── MAX_CALL_HISTORY        # 최대 기록 수
├── DEFAULT_ANALYSIS        # 기본 분석 결과
├── BOTTOM_NAV_TABS         # 네비게이션 탭
└── COLORS                  # 테마 색상
```

### TUTORS 스키마

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | 튜터 고유 ID |
| `name` | string | 튜터 이름 |
| `nationality` | string | 국적 (한글) |
| `accent` | string | 억양 코드 (us, uk, au, in) |
| `gender` | string | 성별 코드 (male, female) |
| `genderLabel` | string | 성별 라벨 (한글) |
| `tags` | string[] | 성격 태그 배열 |

---

## Benefits

### 1. 유지보수성 향상

```
Before: 상수 수정 시 3개 파일 수정 필요
After:  constants/index.js 한 곳만 수정
```

### 2. 일관성 보장

```
Before: 파일마다 다른 형식 가능
After:  단일 정의, 단일 형식
```

### 3. 접근성 개선

```
Before: 이모지 → 스크린 리더 불일치
After:  텍스트 → 명확한 읽기
```

### 4. 번들 크기

```
이모지 제거로 인한 미세한 번들 크기 감소
```

---

## Usage Examples

### 튜터 목록 사용

```javascript
import { TUTORS } from '../constants'

// 튜터 찾기
const tutor = TUTORS.find(t => t.id === 'gwen')

// 억양별 필터링
const usTutors = TUTORS.filter(t => t.accent === 'us')

// 성별별 필터링
const femaleTutors = TUTORS.filter(t => t.gender === 'female')
```

### 설정 옵션 사용

```javascript
import { DIFFICULTIES, DURATIONS, SPEEDS } from '../constants'

// 난이도 선택 UI
{DIFFICULTIES.map(item => (
  <button key={item.id}>{item.label}</button>
))}
```

---

## Testing

### 수동 테스트 체크리스트

- [x] TutorSettings 페이지 정상 렌더링
- [x] 튜터 카드 아바타 표시 (이름 첫 글자)
- [x] 튜터 선택 및 저장 동작
- [x] CurriculumSettings 토픽 아이콘 표시 (라벨 첫 글자)
- [x] 기존 기능 정상 동작

---

## Git History

```
commit 32f57bb
Author: User
Date:   2026-01-12

    refactor: Centralize constants and remove emoji icons

    - Add TUTORS, DIFFICULTIES, DURATIONS to constants/index.js
    - Remove duplicate constants from TutorSettings.jsx
    - Remove emoji icons from ACCENTS, GENDERS, TOPICS, TUTORS
    - Update CurriculumSettings.jsx to use text instead of emoji
```

---

## Next Steps

### 추가 리팩토링 권장사항

1. **페이지 컴포넌트 분리**
   - Analysis.jsx (1,012줄) → 작은 컴포넌트로 분리
   - Result.jsx (786줄) → 작은 컴포넌트로 분리

2. **공통 컴포넌트 추출**
   - OptionButton 컴포넌트
   - SectionHeader 컴포넌트
   - Modal 베이스 컴포넌트

3. **커스텀 훅 도입**
   - useSettings 훅
   - useCall 훅

4. **CurriculumSettings TOPICS 중앙화**
   - constants/index.js로 이동 고려
   - 또는 별도 constants/topics.js 파일 생성

---

## References

- [React Best Practices - Organizing Constants](https://react.dev/learn)
- [JavaScript Module Pattern](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Web Accessibility Guidelines - Text Alternatives](https://www.w3.org/WAI/WCAG21/Understanding/text-alternatives)
