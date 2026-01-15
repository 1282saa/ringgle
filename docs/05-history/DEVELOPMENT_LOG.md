# Development Log

> Ringle AI English Learning MVP - Consolidated Development Record

---

## Overview

| Item | Description |
|------|-------------|
| **Project** | Ringle AI English Learning MVP |
| **Duration** | 2026-01-12 ~ Ongoing |
| **Total Phases** | 10 Completed |
| **Platforms** | Web, iOS, Android |

---

## Phase Summary

| Phase | Title | Date | Status | Key Deliverables |
|:-----:|-------|:----:|:------:|------------------|
| 1 | Project Setup | 01-12 | Done | React 19 + Vite 7 + Capacitor 8 initial setup |
| 2 | Voice Conversation | 01-12 | Done | Real-time voice chat (STT/TTS/AI) |
| 3 | Tutor Settings | 01-12 | Done | Accent/Gender/Level/Topic configuration |
| 4 | Call Analysis | 01-12 | Done | CAFP scoring + feedback system |
| 5 | GitHub Setup | 01-12 | Done | Git repository initialization |
| 6 | Settings Backend | 01-12 | Done | DynamoDB settings save/load |
| 7 | Settings UI | 01-12 | Done | Ringle-style settings screen |
| 8 | Code Refactoring | 01-12 | Done | Constants centralization, deduplication |
| 9 | UX/UI Improvements | 01-12 | Done | Subtitles, speaker toggle, accuracy calc |
| 10 | Call Tab UI | 01-12 | Done | Call tab UI refinement |

---

## Phase Details

### Phase 1: Project Setup
```
Project Structure
├── Frontend: React 19, Vite 7, React Router 7
├── Mobile: Capacitor 8 (iOS/Android)
├── Backend: AWS Lambda (Python 3.11)
└── Result: dist/ build, mobile sync complete
```

### Phase 2: Voice Conversation
```
Voice Chat Implementation
├── STT: Web Speech API → AWS Transcribe
├── AI: AWS Bedrock (Claude Haiku)
├── TTS: Amazon Polly (Neural/Standard)
└── Result: Real-time English conversation
```

### Phase 3: Tutor Settings
```
Tutor Customization
├── Accent: US, UK, AU, IN
├── Gender: Male, Female
├── Level: Beginner, Intermediate, Advanced
├── Topic: Business, Daily, Travel, Interview
└── Result: Personalized learning experience
```

### Phase 4: Call Analysis
```
Call Analysis System
├── CAFP Score: Confidence, Accuracy, Fluency, Pronunciation
├── Grammar: Error detection and correction
├── Filler Words: um, uh, like analysis
└── Result: Detailed feedback + improvement suggestions
```

### Phase 5: GitHub Setup
```
Version Control
├── Repository: github.com/1282saa/ringgle.git
├── Branch: main
└── Result: Source code version control initiated
```

### Phase 6: Settings Backend
```
Settings Backend Integration
├── Storage: DynamoDB (eng-learning-conversations)
├── API: save_settings, get_settings
├── Fallback: localStorage
└── Result: Cross-device settings sync
```

### Phase 7: Settings UI Refinement
```
Settings UI Improvement
├── Settings.jsx: Section list style
├── ScheduleSettings.jsx: Day-by-day scheduling
├── TutorSettings.jsx: Tutor carousel
├── CurriculumSettings.jsx: Topic accordion
└── Result: Ringle app-style UI
```

### Phase 8: Code Refactoring
```
Code Cleanup
├── constants.js: TUTORS, DIFFICULTIES, DURATIONS centralized
├── Deduplication: TutorSettings.jsx constants
├── Emoji removal: ACCENTS, GENDERS, TOPICS
└── Result: Improved maintainability
```

### Phase 9: UX/UI Improvements
```
User Experience Enhancement
├── Call.jsx: Subtitle toggle, speaker toggle, interim results
├── Practice.jsx: Levenshtein distance accuracy calculation
├── Result.jsx: Feedback modal improvements
├── Analysis.jsx: Audio playback, progress bar
├── Home.jsx: 150-word target UI
└── Result: Intuitive interface
```

### Phase 10: Call Tab UI Refinement
```
Call Tab UI
├── Layout improvements
├── Button style unification
└── Result: Clean call screen
```

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Frontend | React | 19.2.0 |
| Build | Vite | 7.2.4 |
| Mobile | Capacitor | 8.0.0 |
| Backend | AWS Lambda | Python 3.11 |
| AI | Claude Haiku | Bedrock |
| TTS | Amazon Polly | Neural |
| STT | AWS Transcribe | Streaming |
| Database | DynamoDB | - |
| Animation | Framer Motion | 12.25.0 |

---

## Deployment

| Resource | Value |
|----------|-------|
| **Live URL** | https://d3pw62uy753kuv.cloudfront.net |
| **CloudFront ID** | `E2EPS9DBLFD0FM` |
| **S3 Bucket** | `eng-call` (ap-northeast-2) |
| **API Gateway** | us-east-1 |

**Deploy Commands:**
```bash
npm run build
aws s3 sync dist/ s3://eng-call --delete --region ap-northeast-2
aws cloudfront create-invalidation --distribution-id E2EPS9DBLFD0FM --paths "/*"
```

---

## API Endpoints

**Base URL:** `https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat`

| Action | Description |
|--------|-------------|
| `chat` | AI conversation |
| `tts` | Text-to-speech |
| `stt` | Speech-to-text |
| `analyze` | Conversation analysis |
| `save_settings` | Save user settings |
| `get_settings` | Retrieve user settings |
| `start_session` | Start conversation session |
| `end_session` | End conversation session |
| `save_message` | Save chat message |
| `get_sessions` | List user sessions |
| `get_session_detail` | Get session with messages |
| `delete_session` | Delete session |

---

## Roadmap (Future)

| Phase | Title | Description | Priority |
|:-----:|-------|-------------|:--------:|
| 11 | Progress Tracking | Track learning progress over sessions | High |
| 12 | Lesson Plans | Structured learning paths | Medium |
| 13 | Mobile Deployment | App Store / Play Store release | High |
| 14 | Analytics | Usage and performance metrics | Medium |
| 15 | Component Extraction | Common component separation | Low |

---

## File Structure

```
eng-learning/
├── src/
│   ├── pages/
│   │   ├── Home.jsx          # Main screen
│   │   ├── Call.jsx          # Voice call
│   │   ├── Result.jsx        # Result analysis
│   │   └── Settings.jsx      # Settings
│   └── utils/
│       └── api.js            # API client
├── backend/
│   └── lambda_function.py    # Lambda handler
├── docs/
│   ├── phase/                # Detailed phase docs
│   ├── AWS_INFRASTRUCTURE.md
│   ├── AI_PIPELINE.md
│   ├── DATABASE_ERD.md
│   ├── API_REFERENCE.md
│   └── DEVELOPMENT_LOG.md    # This document
└── android/ & ios/           # Mobile projects
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [AWS Infrastructure](./AWS_INFRASTRUCTURE.md) | AWS service architecture |
| [AI Pipeline](./AI_PIPELINE.md) | AI/voice pipeline details |
| [Database ERD](./DATABASE_ERD.md) | DynamoDB schema design |
| [API Reference](./API_REFERENCE.md) | API specification |
| [OpenAPI Spec](./openapi.yaml) | Swagger/OpenAPI spec |

---

*Last Updated: 2026-01-13*
