# Phase 7: Settings UI/UX Refinement

**Timeline:** 2026-01-12
**Status:** Completed
**Impact:** 맞춤설정 탭 전체 UI를 실제 링글 앱 디자인에 맞춰 재구현

---

## Overview

사용자 피드백을 바탕으로 맞춤설정(Settings) 탭의 UI/UX를 실제 링글 앱 디자인과 일치하도록 전면 재작업했습니다.

### 주요 변경사항
- Settings.jsx: 섹션 기반 리스트 UI로 변경
- ScheduleSettings.jsx: 요일별 일정 관리 UI
- TutorSettings.jsx: 튜터 캐러셀 + 옵션 선택
- CurriculumSettings.jsx: 체크박스 + 아코디언 토픽 선택

---

## Problem Statement

### 기존 문제점
1. Settings 페이지가 실제 링글 앱과 완전히 다른 디자인
2. 단순한 옵션 그리드 형태로 구현되어 있었음
3. 섹션 구분, 동적 값 표시, 탭 네비게이션 없음
4. 서브페이지 스타일 불일치

### 사용자 피드백 (스크린샷 기반)
- 실제 앱: "AI 전화" 헤더 + 탭(전화/맞춤설정/전화내역)
- 실제 앱: 공통 설정 / 일반 전화 / 그 외 전화 섹션 구분
- 실제 앱: 일정(주 2회), 튜터(Gwen), 커리큘럼(주제 1개) 등 동적 값 표시
- 실제 앱: 하단 6개 탭 네비게이션

---

## Implementation Details

### 1. Settings.jsx (메인 맞춤설정)

**파일:** `src/pages/Settings.jsx`

**구조:**
```
┌─────────────────────────────────┐
│ 맞춤설정                      X │
├─────────────────────────────────┤
│ 공통 설정                       │
│ ┌─────────────────────────────┐ │
│ │ 일정                      > │ │
│ │ 튜터                      > │ │
│ │ 내 이름            사용자 > │ │
│ └─────────────────────────────┘ │
│                                 │
│ 일반 전화                       │
│ ┌─────────────────────────────┐ │
│ │ 커리큘럼                  > │ │
│ └─────────────────────────────┘ │
│                                 │
│ 그 외 전화                      │
│ ┌─────────────────────────────┐ │
│ │ 롤플레잉/디스커션 알림  ◉── │ │
│ │ 화상 수업 리뷰          ◉── │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**주요 기능:**
- 3개 섹션으로 설정 항목 분류
- 내 이름: 바텀시트 모달로 편집
- 토글 스위치: 롤플레잉 알림, 화상 수업 리뷰
- ChevronRight 아이콘으로 서브페이지 네비게이션 표시

**상태 관리:**
```javascript
const [userName, setUserName] = useState('')
const [showNameModal, setShowNameModal] = useState(false)
const [roleplayAlert, setRoleplayAlert] = useState(true)
const [videoReviewAlert, setVideoReviewAlert] = useState(true)
```

---

### 2. ScheduleSettings.jsx (일정 설정)

**파일:** `src/pages/ScheduleSettings.jsx`

**구조:**
```
┌─────────────────────────────────┐
│ <     일정                      │
├─────────────────────────────────┤
│ 설정한 시간에 전화가 걸려와요.  │
│                                 │
│ 일요일                        + │
│ 월요일                        + │
│   ┌──────────────────────────┐  │
│   │ 일반 AI 전화  19:00    > │  │
│   └──────────────────────────┘  │
│ 화요일                        + │
│ ...                             │
│                                 │
│            Asia/Seoul           │
└─────────────────────────────────┘
```

**주요 기능:**
- 요일별 일정 추가/수정/삭제
- 전화 타입 선택: 일반 AI 전화 / 롤플레잉
- 시간 선택: `<input type="time">`
- 바텀시트 모달 UI

**데이터 구조:**
```javascript
// localStorage key: 'callSchedules'
{
  monday: [{ type: 'normal', time: '19:00' }],
  wednesday: [{ type: 'roleplay', time: '20:30' }]
}
```

---

### 3. TutorSettings.jsx (튜터 설정)

**파일:** `src/pages/TutorSettings.jsx`

**구조:**
```
┌─────────────────────────────────┐
│ <     튜터                      │
├─────────────────────────────────┤
│ 튜터 선택                       │
│ ┌────────┐ ┌────────┐          │
│ │ 👩🏼    │ │ 👨🏼    │ ← scroll │
│ │미국 여성│ │미국 남성│          │
│ │ Gwen   │ │ Chris  │          │
│ │#밝은   │ │#밝은   │          │
│ └────────┘ └────────┘          │
│       ● ○ ○ ○ ○ ○ ○ ○           │
│                                 │
│ 난이도 선택                     │
│ [Easy] [Intermediate]           │
│                                 │
│ 속도 선택                       │
│ [보통] [천천히]                 │
│                                 │
│ 시간 선택                       │
│ [5분] [10분]                    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │           저장              │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**튜터 목록 (8명):**
| ID | Name | 국적 | 성별 | 태그 |
|----|------|------|------|------|
| gwen | Gwen | 미국 | 여성 | 밝은, 활기찬 |
| chris | Chris | 미국 | 남성 | 밝은, 활기찬 |
| emma | Emma | 영국 | 여성 | 차분한, 친절한 |
| james | James | 영국 | 남성 | 차분한, 전문적 |
| olivia | Olivia | 호주 | 여성 | 활발한, 유쾌한 |
| noah | Noah | 호주 | 남성 | 친근한, 편안한 |
| sophia | Sophia | 인도 | 여성 | 따뜻한, 인내심 |
| liam | Liam | 인도 | 남성 | 논리적, 체계적 |

**주요 기능:**
- 가로 스크롤 캐러셀 (scroll-snap)
- 페이지 인디케이터 (8개 도트)
- 옵션 버튼 그룹 (난이도/속도/시간)

---

### 4. CurriculumSettings.jsx (커리큘럼 설정)

**파일:** `src/pages/CurriculumSettings.jsx`

**구조:**
```
┌─────────────────────────────────┐
│ <     커리큘럼                  │
├─────────────────────────────────┤
│ 주제를 선택하고 나만의          │
│ 커리큘럼을 만들어 보세요.       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ☑ 📺 유튜브              ∨ │ │
│ │   • 유튜브 트렌드           │ │
│ │   • 인기 영상 분석          │ │
│ │   • 크리에이터 문화         │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ☐ ✈️ 여행               ∧ │ │
│ └─────────────────────────────┘ │
│ ...                             │
│                                 │
│ ┌─────────────────────────────┐ │
│ │           저장              │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**토픽 목록 (10개):**
| ID | 라벨 | 아이콘 | 서브토픽 예시 |
|----|------|--------|--------------|
| youtube | 유튜브 | 📺 | 유튜브 트렌드, 인기 영상 분석 |
| travel | 여행 | ✈️ | 여행 계획, 공항 대화, 호텔 예약 |
| daily | 일상과 취미 | 🧩 | 주말 계획, 취미 소개 |
| food | 음식과 요리 | 🍳 | 레시피 설명, 식당 주문 |
| career | 직장과 커리어 | 💼 | 직장 생활, 면접 연습 |
| tech | 기술과 트렌드 | 🔧 | AI 기술, 스마트폰, 테크 뉴스 |
| education | 교육과 자기계발 | 🎓 | 학습 방법, 온라인 강의 |
| health | 건강과 운동 | 🏃 | 운동 루틴, 다이어트 |
| culture | 문화와 예술 | 🎨 | 영화 리뷰, 전시회 |
| news | 시사와 뉴스 | 📰 | 최신 뉴스, 경제 이슈 |

**주요 기능:**
- 체크박스 + 아코디언 UI
- 선택 시 보라색 테두리 하이라이트
- 서브토픽 펼침/접기

---

## Design System

### 색상 팔레트
```css
--color-primary: #6366f1;        /* 보라색 (메인) */
--color-primary-light: #f5f3ff;  /* 보라색 배경 */
--color-primary-dark: #4f46e5;   /* 보라색 (눌림) */
--color-background: #f7f7f8;     /* 페이지 배경 */
--color-card: #ffffff;           /* 카드 배경 */
--color-text-primary: #1a1a1a;   /* 주요 텍스트 */
--color-text-secondary: #666666; /* 보조 텍스트 */
--color-text-muted: #888888;     /* 흐린 텍스트 */
--color-border: #e8e8e8;         /* 테두리 */
--color-success: #22c55e;        /* 성공/일반 전화 */
```

### 간격
```css
--spacing-page: 20px;            /* 페이지 패딩 */
--spacing-section: 28px;         /* 섹션 간격 */
--spacing-card: 18px 16px;       /* 카드 내부 패딩 */
--spacing-item: 16px;            /* 아이템 간격 */
```

### 라운드
```css
--radius-card: 16px;             /* 카드 */
--radius-button: 12px;           /* 버튼 */
--radius-checkbox: 6px;          /* 체크박스 */
--radius-badge: 20px;            /* 배지 */
```

### 폰트
```css
--font-title: 18px / 600;        /* 페이지 타이틀 */
--font-section: 13px / 600;      /* 섹션 라벨 */
--font-body: 16px / 500;         /* 본문 */
--font-sub: 14px / 400;          /* 서브 텍스트 */
--font-small: 13px / 400;        /* 작은 텍스트 */
```

---

## LocalStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `userName` | string | 사용자 이름 |
| `callSchedules` | object | 요일별 일정 배열 |
| `tutorSettings` | object | 튜터 + 난이도 + 속도 + 시간 |
| `selectedTutor` | string | 선택된 튜터 ID |
| `selectedCurriculum` | array | 선택된 토픽 ID 배열 |
| `roleplayAlert` | boolean | 롤플레잉 알림 설정 |
| `videoReviewAlert` | boolean | 화상 수업 리뷰 설정 |

---

## Routing Structure

```
/settings              → Settings.jsx
/settings/schedule     → ScheduleSettings.jsx
/settings/tutor        → TutorSettings.jsx
/settings/curriculum   → CurriculumSettings.jsx
```

**App.jsx 라우트:**
```jsx
<Route path="/settings" element={<Settings />} />
<Route path="/settings/schedule" element={<ScheduleSettings />} />
<Route path="/settings/tutor" element={<TutorSettings />} />
<Route path="/settings/curriculum" element={<CurriculumSettings />} />
```

---

## Verification

### 테스트 체크리스트

**Settings.jsx:**
- [ ] 섹션별 리스트 표시
- [ ] 내 이름 모달 열기/닫기
- [ ] 이름 저장 후 표시 갱신
- [ ] 토글 스위치 동작
- [ ] 서브페이지 네비게이션

**ScheduleSettings.jsx:**
- [ ] 요일별 리스트 표시
- [ ] + 버튼으로 일정 추가
- [ ] 기존 일정 클릭 시 수정 모달
- [ ] 전화 타입 선택
- [ ] 시간 선택
- [ ] 일정 삭제

**TutorSettings.jsx:**
- [ ] 튜터 캐러셀 가로 스크롤
- [ ] 페이지 인디케이터 연동
- [ ] 튜터 선택 시 하이라이트
- [ ] 난이도/속도/시간 옵션 선택
- [ ] 저장 후 Settings로 복귀

**CurriculumSettings.jsx:**
- [ ] 토픽 체크박스 선택/해제
- [ ] 아코디언 펼침/접기
- [ ] 선택 시 보라색 테두리
- [ ] 저장 후 Settings로 복귀

---

## Known Issues

### 1. Settings.jsx 외부 수정
- 제가 작성한 버전(탭 네비 + 동적 값 + 하단 네비)이 외부에서 단순 버전으로 리버트됨
- 현재 버전: 섹션 리스트만 있는 간소화된 버전

### 2. 인라인 CSS 중복
- 4개 파일에서 비슷한 스타일이 반복 정의됨
- 향후 공통 스타일 파일로 분리 필요

### 3. 공통 컴포넌트 미분리
- Toggle, Modal, PageHeader 등 재사용 가능한 컴포넌트가 각 페이지에 인라인으로 구현됨

---

## Future Improvements

### 단기
1. Settings.jsx 최종 버전 확정
2. 공통 스타일 변수 파일 생성 (`variables.css`)

### 중기
1. 공통 컴포넌트 분리
   - `components/ui/Toggle.jsx`
   - `components/ui/Modal.jsx`
   - `components/layout/PageHeader.jsx`
2. 커스텀 훅 생성
   - `hooks/useLocalStorage.js`
   - `hooks/useTutorSettings.js`

### 장기
1. CSS-in-JS 또는 Tailwind 도입 검토
2. Storybook으로 컴포넌트 문서화
3. 단위 테스트 추가

---

## References

- [링글 앱 스크린샷] - 사용자 제공
- [Lucide React Icons](https://lucide.dev/)
- [React Router v7](https://reactrouter.com/)

---

## Summary

Settings 탭 전체를 실제 링글 앱 디자인에 맞춰 재구현했습니다:

| 페이지 | 변경 전 | 변경 후 |
|--------|---------|---------|
| Settings | 단순 옵션 그리드 | 섹션 기반 리스트 + 모달 |
| ScheduleSettings | 없음 | 요일별 일정 관리 |
| TutorSettings | 없음 | 튜터 캐러셀 + 옵션 |
| CurriculumSettings | 없음 | 체크박스 아코디언 |

**총 작업량:**
- Settings.jsx: ~360줄
- ScheduleSettings.jsx: ~430줄
- TutorSettings.jsx: ~410줄
- CurriculumSettings.jsx: ~340줄
- **합계: ~1,540줄**

---

Copyright 2026 Ringle AI English Learning Project.
