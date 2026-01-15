# Development Phases

This directory contains detailed documentation for each development phase of the Ringle AI English Learning MVP.

---

## Phase Overview

| Phase | Title | Status | Date |
|-------|-------|--------|------|
| [Phase 1](PHASE-01-project-setup.md) | Project Setup & Core Infrastructure | ✅ Completed | 2026-01-12 |
| [Phase 2](PHASE-02-voice-conversation.md) | Voice Conversation Feature | ✅ Completed | 2026-01-12 |
| [Phase 3](PHASE-03-tutor-settings.md) | AI Tutor Settings & Customization | ✅ Completed | 2026-01-12 |
| [Phase 4](PHASE-04-call-analysis.md) | Call Result Analysis & CAFP Scoring | ✅ Completed | 2026-01-12 |
| [Phase 5](PHASE-05-github-setup.md) | GitHub Repository Setup | ✅ Completed | 2026-01-12 |
| [Phase 6](PHASE-06-settings-backend.md) | Settings Backend Integration | ✅ Completed | 2026-01-12 |
| [Phase 7](PHASE-07-settings-ui-refinement.md) | Settings UI/UX Refinement | ✅ Completed | 2026-01-12 |
| [Phase 8](PHASE-08-constant-refactoring.md) | Constant Refactoring & Code Cleanup | ✅ Completed | 2026-01-12 |
| [Phase 9](PHASE-09-ux-ui-improvements.md) | UX/UI Improvements | ✅ Completed | 2026-01-12 |

---

## Quick Summary

### Phase 1: Project Setup
- React 19 + Vite 7 frontend
- Capacitor for iOS/Android
- AWS Lambda backend structure
- Project directory organization

### Phase 2: Voice Conversation
- Web Speech API for speech recognition
- Claude Haiku AI for conversation
- Amazon Polly for text-to-speech
- Real-time conversation flow

### Phase 3: Tutor Settings
- Accent selection (US, UK, AU, IN)
- Gender selection
- Speed control
- Difficulty levels
- Topic selection

### Phase 4: Call Analysis
- CAFP scoring system
- Grammar correction detection
- Filler word analysis
- Vocabulary metrics
- Feedback system

### Phase 5: GitHub Setup
- Git initialization
- Remote repository connection
- Initial commit
- Version control workflow

### Phase 6: Settings Backend Integration
- DynamoDB settings storage
- save_settings / get_settings APIs
- Cross-device settings sync
- Offline-first with localStorage fallback

### Phase 7: Settings UI/UX Refinement
- Settings.jsx: 링글 앱 스타일 섹션 리스트
- ScheduleSettings.jsx: 요일별 일정 관리
- TutorSettings.jsx: 튜터 캐러셀 + 옵션 선택
- CurriculumSettings.jsx: 체크박스 아코디언 토픽

### Phase 8: Constant Refactoring & Code Cleanup
- 상수 중앙화 (TUTORS, DIFFICULTIES, DURATIONS)
- 중복 상수 제거 (TutorSettings.jsx)
- 이모지 아이콘 제거 (ACCENTS, GENDERS, TOPICS)
- 코드 일관성 및 유지보수성 향상

### Phase 9: UX/UI Improvements
- Call.jsx: 자막 버튼 동적 텍스트, 스피커 토글, 음성 인식 중간 결과
- Practice.jsx: Levenshtein 거리 알고리즘 정확도 계산
- Result.jsx: 피드백 모달 개선, 한글화
- Analysis.jsx: 음성 재생 버튼, 프로그레스 바
- Home.jsx: 150단어 기준 UI, 하단 네비게이션 액션
- Settings.jsx: 저장 토스트 알림

---

## Tech Stack Summary

| Category | Technology |
|----------|------------|
| Frontend | React 19, Vite 7, React Router 7 |
| Mobile | Capacitor 8 (iOS/Android) |
| Backend | AWS Lambda, Python 3.11 |
| AI | AWS Bedrock (Claude Haiku) |
| TTS | Amazon Polly |
| STT | Web Speech API |
| Icons | Lucide React |
| Animation | Framer Motion |

---

## API Endpoints

**Base URL:** `https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat`

| Action | Description |
|--------|-------------|
| `chat` | AI conversation |
| `tts` | Text-to-speech |
| `stt` | Speech-to-text |
| `analyze` | Conversation analysis |
| `save_settings` | Save user settings to DynamoDB |
| `get_settings` | Retrieve user settings from DynamoDB |

---

## Future Phases (Planned)

| Phase | Title | Description |
|-------|-------|-------------|
| Phase 9 | Progress Tracking | Track learning over sessions |
| Phase 10 | Lesson Plans | Structured learning paths |
| Phase 11 | Mobile Deployment | App Store & Play Store |
| Phase 12 | Analytics | Usage & performance metrics |
| Phase 13 | Component Extraction | Common components, CSS separation |

---

## Document Template

When creating new phase documentation, use this structure:

```markdown
# Phase X: Feature Name

**Timeline:** YYYY-MM-DD
**Status:** In Progress / Completed
**Impact:** Brief impact description

---

## Overview

Description of the phase and its goals.

---

## Implementation Details

Technical implementation details with code examples.

---

## Verification

How to verify the implementation works correctly.

---

## Results

Summary of what was achieved.

---

## Next Steps

What comes next after this phase.

---

## References

Links to relevant documentation.
```

---

## Contributing

1. Create feature branch from `main`
2. Implement feature with tests
3. Update relevant phase documentation
4. Create pull request with detailed description

---

Copyright 2026 Ringle AI English Learning Project.
