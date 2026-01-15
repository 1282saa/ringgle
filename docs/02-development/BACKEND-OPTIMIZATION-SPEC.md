# Backend Optimization Specification

대화 번역 및 저장 기능 백엔드 최적화 작업 명세서

**Branch**: `feature/backend/conversation-translation-storage`
**작성일**: 2026-01-12
**작성자**: AI-Assisted Development (Claude Code)
**상태**: 🟡 In Progress

---

## 목차

1. [개요](#1-개요)
2. [현재 상태 분석](#2-현재-상태-분석)
3. [목표 기능](#3-목표-기능)
4. [기술 스택](#4-기술-스택)
5. [시스템 아키텍처](#5-시스템-아키텍처)
6. [DynamoDB 설계](#6-dynamodb-설계)
7. [API 명세](#7-api-명세)
8. [프론트엔드 변경사항](#8-프론트엔드-변경사항)
9. [구현 체크리스트](#9-구현-체크리스트)
10. [테스트 계획](#10-테스트-계획)
11. [배포 가이드](#11-배포-가이드)
12. [롤백 계획](#12-롤백-계획)

---

## 1. 개요

### 1.1 배경

현재 Call 화면에서 다음 기능이 누락되어 있습니다:
- AI 응답의 한국어 번역 표시
- 대화 기록의 서버 저장 (현재 localStorage만 사용)
- 사용자별 대화 히스토리 관리

### 1.2 목적

1. **실시간 한국어 번역**: AI 응답을 한국어로 번역하여 사용자 이해도 향상
2. **대화 기록 영구 저장**: DynamoDB에 대화 기록 저장으로 데이터 영속성 확보
3. **사용자 식별**: 디바이스 UUID 기반 사용자 관리

### 1.3 범위

| 구분 | 포함 | 제외 |
|------|------|------|
| 백엔드 | Lambda 함수 수정, DynamoDB 테이블 생성 | RDS, ElastiCache |
| 프론트엔드 | Call.jsx 수정, UUID 생성 | 로그인/회원가입 UI |
| 인프라 | DynamoDB, IAM 정책 | VPC, CloudFront |

---

## 2. 현재 상태 분석

### 2.1 기존 아키텍처

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│ API Gateway │────▶│   Lambda    │
│  (React)    │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
              ┌───────────┐           ┌───────────┐             ┌───────────┐
              │  Bedrock  │           │   Polly   │             │Transcribe │
              │  (Claude) │           │   (TTS)   │             │   (STT)   │
              └───────────┘           └───────────┘             └───────────┘
```

### 2.2 현재 데이터 흐름

```
1. 사용자 음성 입력
   └─▶ Web Speech API (브라우저) ─▶ 텍스트 변환

2. AI 대화
   └─▶ Lambda (handle_chat) ─▶ Bedrock Claude ─▶ 영어 응답만 반환

3. 음성 출력
   └─▶ Lambda (handle_tts) ─▶ Polly ─▶ MP3 반환

4. 데이터 저장
   └─▶ localStorage (브라우저 로컬) ─▶ 영구 저장 안됨 ❌
```

### 2.3 문제점

| 문제 | 영향 | 심각도 |
|------|------|--------|
| 한국어 번역 없음 | 초급 사용자 이해 어려움 | 🔴 High |
| localStorage만 사용 | 브라우저 삭제 시 데이터 손실 | 🔴 High |
| 사용자 식별 없음 | 개인화 불가능 | 🟡 Medium |
| 대화 분석 데이터 미저장 | 학습 진도 추적 불가 | 🟡 Medium |

---

## 3. 목표 기능

### 3.1 한국어 번역 기능

**요구사항**:
- AI 영어 응답을 실시간으로 한국어 번역
- 번역은 자연스럽고 문맥에 맞아야 함
- 응답 지연 최소화 (추가 500ms 이내)

**구현 방식**:
- Claude Haiku를 활용한 번역 (기존 Bedrock 인프라 재사용)
- `handle_chat` 응답에 `translation` 필드 추가

**예시**:
```json
// Before (현재)
{
  "message": "Hello! How was your day today?",
  "role": "assistant"
}

// After (목표)
{
  "message": "Hello! How was your day today?",
  "translation": "안녕하세요! 오늘 하루는 어떠셨나요?",
  "role": "assistant"
}
```

### 3.2 대화 저장 기능

**요구사항**:
- 모든 대화 턴을 실시간으로 DynamoDB에 저장
- 대화 세션 단위로 그룹화
- 사용자별 대화 히스토리 조회 가능

**저장 데이터**:
- 대화 세션 ID
- 디바이스 ID (사용자 식별)
- 메시지 (영어 + 한국어 번역)
- 타임스탬프
- 튜터 설정 (악센트, 레벨, 주제)
- 분석 결과 (통화 종료 시)

### 3.3 대화 조회 기능

**요구사항**:
- 사용자별 과거 대화 목록 조회
- 특정 대화 세션 상세 조회
- 최근 N개 대화 조회 (페이지네이션)

---

## 4. 기술 스택

### 4.1 선택된 기술

| 영역 | 기술 | 선택 이유 |
|------|------|----------|
| 번역 | Claude Haiku (Bedrock) | 기존 인프라 재사용, 자연스러운 번역, 비용 효율 |
| 저장소 | DynamoDB | 서버리스, Lambda 궁합, 무료 티어 |
| 사용자 ID | UUID v4 | 로그인 없이 디바이스 식별, 간단한 구현 |

### 4.2 비용 예측

| 서비스 | 무료 티어 | 예상 사용량 (MVP) | 예상 비용 |
|--------|----------|------------------|----------|
| DynamoDB | 25GB 저장, 2500만 읽기/쓰기 | 1GB, 10만 요청 | $0 |
| Bedrock (번역) | N/A | 10만 토큰/일 | ~$0.25/일 |
| **총계** | | | **~$7.5/월** |

---

## 5. 시스템 아키텍처

### 5.1 목표 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Call.jsx   │  │  Home.jsx   │  │ History.jsx │  │ DeviceID (UUID)     │ │
│  │  - 대화 UI  │  │  - 메인     │  │  - 기록     │  │ - localStorage 저장 │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API Gateway (REST)                               │
│                         POST /prod/chat                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Lambda Function                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ handle_chat  │ │ handle_tts   │ │handle_analyze│ │ handle_history     │  │
│  │ + 번역 추가  │ │              │ │ + 저장 추가  │ │ (신규)             │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ save_message │ │ get_sessions │ │ get_session  │ │ delete_session     │  │
│  │ (신규)       │ │ (신규)       │ │ (신규)       │ │ (신규)             │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
         │                │                │                    │
         ▼                ▼                ▼                    ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐        ┌───────────┐
   │  Bedrock  │   │   Polly   │   │Transcribe │        │ DynamoDB  │
   │  Claude   │   │   (TTS)   │   │   (STT)   │        │ (신규)    │
   │ + 번역    │   │           │   │           │        │           │
   └───────────┘   └───────────┘   └───────────┘        └───────────┘
```

### 5.2 데이터 흐름 (개선 후)

```
1. 앱 시작
   └─▶ 디바이스 UUID 확인/생성 ─▶ localStorage 저장

2. 대화 시작
   └─▶ 새 세션 ID 생성 (UUID v4)

3. AI 대화 (handle_chat 개선)
   └─▶ Bedrock Claude ─▶ 영어 응답
   └─▶ Bedrock Claude ─▶ 한국어 번역
   └─▶ DynamoDB 저장 (선택적)
   └─▶ 응답 반환 { message, translation }

4. 대화 저장 (save_message 신규)
   └─▶ DynamoDB에 메시지 저장

5. 통화 종료 (handle_analyze 개선)
   └─▶ 분석 수행
   └─▶ DynamoDB에 분석 결과 저장
   └─▶ 응답 반환

6. 히스토리 조회 (handle_history 신규)
   └─▶ DynamoDB 쿼리 ─▶ 사용자 대화 목록 반환
```

---

## 6. DynamoDB 설계

### 6.1 테이블 구조

**테이블명**: `eng-learning-conversations`

#### Primary Key 설계

| 키 타입 | 속성명 | 타입 | 설명 |
|---------|--------|------|------|
| Partition Key | `PK` | String | `DEVICE#{deviceId}` |
| Sort Key | `SK` | String | `SESSION#{sessionId}#MSG#{timestamp}` |

#### GSI (Global Secondary Index)

**GSI1**: 세션별 조회용
| 키 타입 | 속성명 | 타입 |
|---------|--------|------|
| Partition Key | `GSI1PK` | String | `SESSION#{sessionId}` |
| Sort Key | `GSI1SK` | String | `MSG#{timestamp}` |

### 6.2 데이터 모델

#### 메시지 아이템

```json
{
  "PK": "DEVICE#550e8400-e29b-41d4-a716-446655440000",
  "SK": "SESSION#660e8400-e29b-41d4-a716-446655440001#MSG#2026-01-12T10:30:00.000Z",
  "GSI1PK": "SESSION#660e8400-e29b-41d4-a716-446655440001",
  "GSI1SK": "MSG#2026-01-12T10:30:00.000Z",
  "type": "MESSAGE",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "660e8400-e29b-41d4-a716-446655440001",
  "role": "assistant",
  "content": "Hello! How was your day today?",
  "translation": "안녕하세요! 오늘 하루는 어떠셨나요?",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "turnNumber": 1,
  "createdAt": "2026-01-12T10:30:00.000Z",
  "ttl": 1739289600
}
```

#### 세션 메타데이터 아이템

```json
{
  "PK": "DEVICE#550e8400-e29b-41d4-a716-446655440000",
  "SK": "SESSION#660e8400-e29b-41d4-a716-446655440001#META",
  "GSI1PK": "SESSION#660e8400-e29b-41d4-a716-446655440001",
  "GSI1SK": "META",
  "type": "SESSION_META",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "660e8400-e29b-41d4-a716-446655440001",
  "tutorName": "Gwen",
  "settings": {
    "accent": "us",
    "level": "intermediate",
    "topic": "business",
    "gender": "female"
  },
  "startedAt": "2026-01-12T10:30:00.000Z",
  "endedAt": "2026-01-12T10:45:00.000Z",
  "duration": 900,
  "turnCount": 12,
  "wordCount": 156,
  "status": "completed",
  "createdAt": "2026-01-12T10:30:00.000Z",
  "ttl": 1739289600
}
```

#### 분석 결과 아이템

```json
{
  "PK": "DEVICE#550e8400-e29b-41d4-a716-446655440000",
  "SK": "SESSION#660e8400-e29b-41d4-a716-446655440001#ANALYSIS",
  "GSI1PK": "SESSION#660e8400-e29b-41d4-a716-446655440001",
  "GSI1SK": "ANALYSIS",
  "type": "ANALYSIS",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "660e8400-e29b-41d4-a716-446655440001",
  "cafpScores": {
    "complexity": 72,
    "accuracy": 85,
    "fluency": 78,
    "pronunciation": 80
  },
  "fillers": {
    "count": 3,
    "words": ["um", "like", "you know"],
    "percentage": 2.5
  },
  "grammarCorrections": [...],
  "vocabulary": {...},
  "overallFeedback": "...",
  "improvementTips": [...],
  "createdAt": "2026-01-12T10:45:00.000Z",
  "ttl": 1739289600
}
```

### 6.3 TTL 설정

- 기본 TTL: 90일 (7776000초)
- MVP 단계에서 저장 비용 관리
- 추후 유료 사용자는 TTL 제거 가능

### 6.4 용량 설계

| 항목 | 예상 크기 | 계산 근거 |
|------|----------|----------|
| 메시지 1개 | ~500 bytes | JSON 평균 |
| 세션 메타 | ~800 bytes | 설정 포함 |
| 분석 결과 | ~2 KB | 상세 분석 |
| 세션 1개 (10턴) | ~8 KB | 메시지 + 메타 + 분석 |
| 사용자 1명/월 | ~240 KB | 30세션/월 가정 |
| **1000명/월** | **~240 MB** | 무료 티어 충분 |

---

## 7. API 명세

### 7.1 기존 API 수정

#### 7.1.1 Chat (수정)

번역 기능 추가

**Request** (변경 없음)
```json
{
  "action": "chat",
  "messages": [...],
  "settings": {...}
}
```

**Response** (변경됨)
```json
{
  "message": "Hello! How was your day today?",
  "translation": "안녕하세요! 오늘 하루는 어떠셨나요?",
  "role": "assistant"
}
```

| 필드 | 타입 | 설명 | 변경 |
|------|------|------|------|
| `message` | string | AI 영어 응답 | 기존 |
| `translation` | string | 한국어 번역 | **신규** |
| `role` | string | 역할 | 기존 |

---

### 7.2 신규 API

#### 7.2.1 Save Message (신규)

대화 메시지를 DynamoDB에 저장

**Request**
```json
{
  "action": "save_message",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "660e8400-e29b-41d4-a716-446655440001",
  "message": {
    "role": "user",
    "content": "I went to the park yesterday.",
    "translation": null,
    "turnNumber": 2
  }
}
```

**Response**
```json
{
  "success": true,
  "messageId": "MSG#2026-01-12T10:30:15.000Z"
}
```

**Parameters**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `action` | string | Yes | `"save_message"` |
| `deviceId` | string | Yes | 디바이스 UUID |
| `sessionId` | string | Yes | 세션 UUID |
| `message.role` | string | Yes | `"user"` 또는 `"assistant"` |
| `message.content` | string | Yes | 메시지 내용 (영어) |
| `message.translation` | string | No | 한국어 번역 |
| `message.turnNumber` | number | Yes | 대화 턴 번호 |

---

#### 7.2.2 Start Session (신규)

새 대화 세션 시작 및 메타데이터 저장

**Request**
```json
{
  "action": "start_session",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "660e8400-e29b-41d4-a716-446655440001",
  "settings": {
    "accent": "us",
    "level": "intermediate",
    "topic": "business",
    "gender": "female"
  },
  "tutorName": "Gwen"
}
```

**Response**
```json
{
  "success": true,
  "sessionId": "660e8400-e29b-41d4-a716-446655440001",
  "startedAt": "2026-01-12T10:30:00.000Z"
}
```

---

#### 7.2.3 End Session (신규)

세션 종료 및 최종 정보 업데이트

**Request**
```json
{
  "action": "end_session",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "660e8400-e29b-41d4-a716-446655440001",
  "duration": 900,
  "turnCount": 12,
  "wordCount": 156
}
```

**Response**
```json
{
  "success": true,
  "endedAt": "2026-01-12T10:45:00.000Z"
}
```

---

#### 7.2.4 Get Sessions (신규)

사용자의 대화 세션 목록 조회

**Request**
```json
{
  "action": "get_sessions",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "limit": 10,
  "lastKey": null
}
```

**Response**
```json
{
  "sessions": [
    {
      "sessionId": "660e8400-e29b-41d4-a716-446655440001",
      "tutorName": "Gwen",
      "startedAt": "2026-01-12T10:30:00.000Z",
      "duration": 900,
      "turnCount": 12,
      "wordCount": 156,
      "status": "completed",
      "settings": {...}
    }
  ],
  "lastKey": "...",
  "hasMore": true
}
```

---

#### 7.2.5 Get Session Detail (신규)

특정 세션의 전체 대화 내용 조회

**Request**
```json
{
  "action": "get_session_detail",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response**
```json
{
  "session": {
    "sessionId": "660e8400-e29b-41d4-a716-446655440001",
    "tutorName": "Gwen",
    "settings": {...},
    "startedAt": "2026-01-12T10:30:00.000Z",
    "endedAt": "2026-01-12T10:45:00.000Z",
    "duration": 900,
    "status": "completed"
  },
  "messages": [
    {
      "role": "assistant",
      "content": "Hello! How was your day?",
      "translation": "안녕하세요! 오늘 하루는 어떠셨나요?",
      "timestamp": "2026-01-12T10:30:00.000Z",
      "turnNumber": 1
    },
    {
      "role": "user",
      "content": "I went to the park.",
      "translation": null,
      "timestamp": "2026-01-12T10:30:15.000Z",
      "turnNumber": 2
    }
  ],
  "analysis": {
    "cafpScores": {...},
    "fillers": {...},
    "grammarCorrections": [...],
    "overallFeedback": "..."
  }
}
```

---

#### 7.2.6 Delete Session (신규)

세션 삭제 (사용자 요청 시)

**Request**
```json
{
  "action": "delete_session",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response**
```json
{
  "success": true,
  "deletedCount": 15
}
```

---

### 7.3 API 요약

| Action | Method | 설명 | 상태 |
|--------|--------|------|------|
| `chat` | POST | AI 대화 + 번역 | 수정 |
| `tts` | POST | 텍스트→음성 | 기존 |
| `stt` | POST | 음성→텍스트 | 기존 |
| `analyze` | POST | 대화 분석 + 저장 | 수정 |
| `save_message` | POST | 메시지 저장 | **신규** |
| `start_session` | POST | 세션 시작 | **신규** |
| `end_session` | POST | 세션 종료 | **신규** |
| `get_sessions` | POST | 세션 목록 조회 | **신규** |
| `get_session_detail` | POST | 세션 상세 조회 | **신규** |
| `delete_session` | POST | 세션 삭제 | **신규** |

---

## 8. 프론트엔드 변경사항

### 8.1 디바이스 ID 관리

**새 파일**: `src/utils/device.js`

```javascript
/**
 * 디바이스 고유 ID 관리
 * UUID v4를 생성하여 localStorage에 저장
 */

const DEVICE_ID_KEY = 'deviceId';

export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}
```

### 8.2 Call.jsx 수정사항

#### 8.2.1 상태 추가

```javascript
const [sessionId] = useState(() => crypto.randomUUID());
const [koreanSubtitle, setKoreanSubtitle] = useState('');
const deviceId = getDeviceId();
```

#### 8.2.2 대화 시작 시 세션 저장

```javascript
const startConversation = async () => {
  // 세션 시작 API 호출
  await startSession(deviceId, sessionId, settings, tutorName);

  // 기존 로직...
  const response = await sendMessage([], settings);

  // 번역 표시
  setCurrentSubtitle(response.message);
  setKoreanSubtitle(response.translation);

  // 메시지 저장
  await saveMessage(deviceId, sessionId, {
    role: 'assistant',
    content: response.message,
    translation: response.translation,
    turnNumber: 1
  });
};
```

#### 8.2.3 자막 UI 수정

```jsx
{showSubtitles && currentSubtitle && (
  <div className="subtitle-area">
    <p className="subtitle-en">{currentSubtitle}</p>
    {koreanSubtitle && (
      <p className="subtitle-ko">{koreanSubtitle}</p>
    )}
  </div>
)}
```

#### 8.2.4 통화 종료 시 세션 저장

```javascript
const handleEndCall = async () => {
  // 세션 종료 API 호출
  await endSession(deviceId, sessionId, {
    duration: callTime,
    turnCount,
    wordCount
  });

  // 기존 localStorage 저장 로직 유지 (오프라인 대비)
  // ...
};
```

### 8.3 API 함수 추가

**파일**: `src/utils/api.js`

```javascript
// 세션 시작
export async function startSession(deviceId, sessionId, settings, tutorName) {
  return apiRequest({
    action: 'start_session',
    deviceId,
    sessionId,
    settings,
    tutorName
  }, 'StartSession');
}

// 메시지 저장
export async function saveMessage(deviceId, sessionId, message) {
  return apiRequest({
    action: 'save_message',
    deviceId,
    sessionId,
    message
  }, 'SaveMessage');
}

// 세션 종료
export async function endSession(deviceId, sessionId, stats) {
  return apiRequest({
    action: 'end_session',
    deviceId,
    sessionId,
    ...stats
  }, 'EndSession');
}

// 세션 목록 조회
export async function getSessions(deviceId, limit = 10, lastKey = null) {
  return apiRequest({
    action: 'get_sessions',
    deviceId,
    limit,
    lastKey
  }, 'GetSessions');
}

// 세션 상세 조회
export async function getSessionDetail(deviceId, sessionId) {
  return apiRequest({
    action: 'get_session_detail',
    deviceId,
    sessionId
  }, 'GetSessionDetail');
}
```

---

## 9. 구현 체크리스트

### Phase 1: 인프라 설정

- [ ] DynamoDB 테이블 생성
  - [ ] `eng-learning-conversations` 테이블
  - [ ] GSI1 인덱스 생성
  - [ ] TTL 설정 활성화
- [ ] IAM 정책 업데이트
  - [ ] Lambda에 DynamoDB 권한 추가
- [ ] Lambda 환경 변수 설정
  - [ ] `DYNAMODB_TABLE` 추가

### Phase 2: 백엔드 개발

- [ ] `lambda_function.py` 수정
  - [ ] DynamoDB 클라이언트 추가
  - [ ] `handle_chat` 번역 기능 추가
  - [ ] `handle_save_message` 구현
  - [ ] `handle_start_session` 구현
  - [ ] `handle_end_session` 구현
  - [ ] `handle_get_sessions` 구현
  - [ ] `handle_get_session_detail` 구현
  - [ ] `handle_delete_session` 구현
  - [ ] `handle_analyze` 저장 기능 추가
- [ ] 에러 핸들링 추가
- [ ] 로깅 추가

### Phase 3: 프론트엔드 개발

- [ ] `src/utils/device.js` 생성
- [ ] `src/utils/api.js` 수정
  - [ ] 새 API 함수 추가
- [ ] `src/pages/Call.jsx` 수정
  - [ ] 세션 관리 로직 추가
  - [ ] 번역 표시 UI 추가
  - [ ] 메시지 저장 로직 추가
- [ ] `src/pages/Home.jsx` 수정 (선택)
  - [ ] 대화 히스토리 표시
- [ ] CSS 스타일 추가

### Phase 4: 테스트

- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] E2E 테스트

### Phase 5: 배포

- [ ] Lambda 함수 업데이트
- [ ] 프론트엔드 빌드 & 배포
- [ ] 모니터링 설정

---

## 10. 테스트 계획

### 10.1 단위 테스트

| 테스트 케이스 | 예상 결과 |
|--------------|----------|
| `handle_chat` 번역 포함 응답 | `translation` 필드 존재 |
| `save_message` DynamoDB 저장 | 아이템 생성 확인 |
| `get_sessions` 빈 결과 | 빈 배열 반환 |
| `get_sessions` 페이지네이션 | `lastKey` 정상 작동 |

### 10.2 통합 테스트

| 시나리오 | 검증 항목 |
|---------|----------|
| 전체 대화 흐름 | 시작→대화→종료→조회 정상 작동 |
| 오프라인 복구 | localStorage 데이터로 복구 가능 |
| 동시 세션 | 여러 세션 독립적 관리 |

### 10.3 성능 테스트

| 항목 | 목표 |
|------|------|
| `handle_chat` + 번역 | < 3초 |
| `save_message` | < 500ms |
| `get_sessions` (10개) | < 1초 |

---

## 11. 배포 가이드

### 11.1 DynamoDB 테이블 생성

```bash
aws dynamodb create-table \
  --table-name eng-learning-conversations \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[{
      "IndexName": "GSI1",
      "KeySchema": [
        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
        {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### 11.2 TTL 활성화

```bash
aws dynamodb update-time-to-live \
  --table-name eng-learning-conversations \
  --time-to-live-specification Enabled=true,AttributeName=ttl \
  --region us-east-1
```

### 11.3 IAM 정책 추가

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:UpdateItem",
    "dynamodb:DeleteItem",
    "dynamodb:Query",
    "dynamodb:BatchWriteItem"
  ],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:*:table/eng-learning-conversations",
    "arn:aws:dynamodb:us-east-1:*:table/eng-learning-conversations/index/*"
  ]
}
```

### 11.4 Lambda 배포

```bash
cd backend
zip -r lambda_deploy.zip lambda_function.py
aws lambda update-function-code \
  --function-name eng-learning-api \
  --zip-file fileb://lambda_deploy.zip \
  --region us-east-1
```

---

## 12. 롤백 계획

### 12.1 롤백 트리거 조건

- API 오류율 > 5%
- 응답 시간 > 10초
- DynamoDB 스로틀링 발생

### 12.2 롤백 절차

1. **Lambda 롤백**
   ```bash
   aws lambda update-function-code \
     --function-name eng-learning-api \
     --s3-bucket eng-learning-deploy \
     --s3-key lambda_backup_YYYYMMDD.zip
   ```

2. **프론트엔드 롤백**
   - 이전 버전 dist 배포
   - 또는 기능 플래그로 비활성화

3. **DynamoDB**
   - 테이블 삭제 불필요 (기존 기능에 영향 없음)
   - 필요시 아이템만 삭제

### 12.3 기능 플래그

```javascript
// src/config.js
export const FEATURES = {
  TRANSLATION_ENABLED: true,
  DB_STORAGE_ENABLED: true,
  HISTORY_ENABLED: true
};
```

롤백 시 플래그를 `false`로 변경하여 기능 비활성화

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-01-12 | Claude Code | 초안 작성 |

---

## 승인

| 역할 | 이름 | 승인일 | 서명 |
|------|------|--------|------|
| 개발자 | | | |
| 리뷰어 | | | |
