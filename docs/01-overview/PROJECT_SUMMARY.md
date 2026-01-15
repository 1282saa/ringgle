# 프로젝트 요약

> 링글 AI 전화영어 MVP - 한 페이지 요약
> 최종 수정: 2026-01-15

---

## 한 줄 요약

**AI 튜터와 영어로 전화 통화하며 회화 연습하는 앱**

---

## 핵심 정보

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 링글 AI 전화영어 MVP |
| 목표 | 플레이스토어 출시 |
| 개발 기간 | 2026-01-12 ~ 진행중 |
| 개발 방식 | AI-Assisted Development (Claude Code) |
| 라이브 URL | https://d3pw62uy753kuv.cloudfront.net |

---

## 사용자 시나리오

```
1. 앱 실행
2. 튜터 설정 (억양, 난이도, 주제)
3. "바로 전화하기" 버튼 클릭
4. AI 튜터가 먼저 인사
5. 사용자가 영어로 대답
6. AI가 듣고 → 응답 → 음성으로 말함
7. 자연스러운 대화 반복
8. 통화 종료
9. AI 분석 리포트 확인 (점수, 교정, 피드백)
```

---

## 주요 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| 음성 대화 | AI와 실시간 영어 통화 | ✅ |
| 튜터 설정 | 억양/성별/난이도/주제 선택 | ✅ |
| 실시간 자막 | 대화 내용 화면 표시 + 번역 | ✅ |
| AI 분석 | CAFP 점수, 문법 교정, 피드백 | ✅ |
| 교정 연습 | 틀린 표현 따라 말하기 | ✅ |
| 통화 기록 | 과거 통화 목록 및 상세 | ✅ |

---

## 기술 스택

### 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19.2.0 | UI 프레임워크 |
| Vite | 7.2.4 | 빌드 도구 |
| Capacitor | 8.0.0 | 모바일 앱 변환 |

### 백엔드 (AWS)
| 서비스 | 용도 |
|--------|------|
| Lambda | 서버리스 API |
| Bedrock (Claude) | AI 응답 생성 |
| Polly | 텍스트 → 음성 |
| Transcribe | 음성 → 텍스트 |
| DynamoDB | 데이터 저장 |
| S3 + CloudFront | 웹 호스팅 |

---

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│                    사용자                        │
└─────────────────────┬───────────────────────────┘
                      │
          ┌───────────▼───────────┐
          │   React 웹앱/모바일    │
          │   (Capacitor)         │
          └───────────┬───────────┘
                      │ HTTPS
          ┌───────────▼───────────┐
          │   AWS API Gateway     │
          └───────────┬───────────┘
                      │
          ┌───────────▼───────────┐
          │     AWS Lambda        │
          │   (Python 3.11)       │
          └───────────┬───────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐       ┌─────▼─────┐     ┌─────▼─────┐
│Bedrock│       │   Polly   │     │Transcribe │
│(Claude)│      │   (TTS)   │     │  (STT)    │
└───────┘       └───────────┘     └───────────┘
```

---

## 현재 상태

### 완료된 것
- 전체 기능 구현 (10개 Phase 완료)
- 웹 배포 (CloudFront)
- Android/iOS 빌드 준비

### 진행중인 것
- **음성 인식 속도 개선** (Streaming STT)
- 현재 E2E 레이턴시: 5~8초 → 목표: 2초 이하

### 핵심 과제
```
사용자가 말하고 → AI가 응답하기까지 5~8초 걸림
→ 자연스러운 대화가 안 됨
→ Streaming STT로 개선 중
```

---

## 팀 역할별 시작점

| 역할 | 시작할 문서 |
|------|------------|
| 기획자 | [FEATURE_SPECS.md](../04-features/FEATURE_SPECS.md) |
| 프론트엔드 | [FRONTEND_GUIDE.md](../02-development/FRONTEND_GUIDE.md) |
| 백엔드 | [BACKEND-API.md](../02-development/BACKEND-API.md) |
| 디자이너 | [UI_UX_SPECIFICATION.md](../04-features/UI_UX_SPECIFICATION.md) |

---

## 로컬 실행 방법

```bash
# 1. 클론
git clone https://github.com/1282saa/ringgle.git
cd ringgle

# 2. 설치
npm install

# 3. 실행
npm run dev
# → http://localhost:5173
```

---

## 주요 링크

| 항목 | URL |
|------|-----|
| 라이브 | https://d3pw62uy753kuv.cloudfront.net |
| GitHub | https://github.com/1282saa/ringgle |
| API | https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat |

---

## 문서 구조

```
docs/
├── 01-overview/      ← 지금 여기
├── 02-development/   # 개발자용
├── 03-infrastructure/# 인프라
├── 04-features/      # 기능 명세
├── 05-history/       # 개발 히스토리
└── templates/        # 템플릿
```

자세한 목차: [docs/README.md](../README.md)

---

*이 문서는 프로젝트 개요가 변경될 때 업데이트해주세요.*
