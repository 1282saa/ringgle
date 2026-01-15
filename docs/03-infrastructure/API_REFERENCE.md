# API Reference

## Overview

Ringle AI English Learning API provides AI-powered English conversation practice capabilities.

| Property | Value |
|----------|-------|
| Base URL | `https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod` |
| Endpoint | `/chat` (single endpoint for all actions) |
| Method | `POST` |
| Content-Type | `application/json` |
| Authentication | None (MVP - uses deviceId for identification) |

---

## Quick Reference

| Action | Description | Category |
|--------|-------------|----------|
| [`chat`](#1-chat---ai-conversation) | AI conversation | Conversation |
| [`tts`](#2-tts---text-to-speech) | Text to speech | Speech |
| [`stt`](#3-stt---speech-to-text) | Speech to text | Speech |
| [`analyze`](#4-analyze---conversation-analysis) | Analyze conversation | Conversation |
| [`save_settings`](#5-save_settings---save-user-settings) | Save user settings | Settings |
| [`get_settings`](#6-get_settings---get-user-settings) | Get user settings | Settings |
| [`start_session`](#7-start_session---start-conversation) | Start session | Sessions |
| [`end_session`](#8-end_session---end-conversation) | End session | Sessions |
| [`save_message`](#9-save_message---save-chat-message) | Save message | Sessions |
| [`get_sessions`](#10-get_sessions---list-sessions) | List sessions | Sessions |
| [`get_session_detail`](#11-get_session_detail---get-session-detail) | Get session detail | Sessions |
| [`delete_session`](#12-delete_session---delete-session) | Delete session | Sessions |
| [`get_transcribe_url`](#13-get_transcribe_url---get-streaming-url) | Get streaming URL | Speech |

---

## Common Types

### TutorSettings

```json
{
  "accent": "us",           // "us" | "uk" | "au" | "in"
  "gender": "female",       // "female" | "male"
  "level": "intermediate",  // "beginner" | "intermediate" | "advanced"
  "topic": "business",      // "business" | "daily" | "travel" | "interview"
  "speed": "normal",        // "slow" | "normal" | "fast"
  "tutorName": "Gwen"       // Display name
}
```

### Message

```json
{
  "role": "user",           // "user" | "assistant"
  "content": "Hello!"       // Message text
}
```

### Error Response

```json
{
  "error": "Error message here"
}
```

---

## API Endpoints

### 1. `chat` - AI Conversation

Sends a message to the AI tutor and receives a response.

**Request:**

```json
{
  "action": "chat",
  "messages": [
    { "role": "user", "content": "Hello!" },
    { "role": "assistant", "content": "Hi! How are you?" },
    { "role": "user", "content": "I'm great, thanks!" }
  ],
  "settings": {
    "accent": "us",
    "level": "intermediate",
    "topic": "business"
  }
}
```

**Response:**

```json
{
  "message": "That's wonderful! What do you do for work?",
  "role": "assistant"
}
```

**Notes:**
- Send empty `messages` array for initial greeting
- AI model: Claude 3 Haiku via AWS Bedrock
- Max tokens: 300

---

### 2. `tts` - Text-to-Speech

Converts text to speech audio using Amazon Polly.

**Request:**

```json
{
  "action": "tts",
  "text": "Hello, how are you doing today?",
  "settings": {
    "accent": "us",
    "gender": "female"
  }
}
```

**Response:**

```json
{
  "audio": "//uQxAAAAAANIAAAAAExBTUUzLjEwMFVV...",
  "contentType": "audio/mpeg",
  "voice": "Joanna",
  "engine": "neural"
}
```

**Voice Selection:**

| Accent | Female | Male | Engine |
|--------|--------|------|--------|
| `us` | Joanna | Matthew | Neural |
| `uk` | Amy | Brian | Neural |
| `au` | Nicole | Russell | Standard |
| `in` | Aditi | Aditi | Standard |

**Usage (JavaScript):**

```javascript
const audio = new Audio(`data:audio/mpeg;base64,${response.audio}`)
audio.play()
```

---

### 3. `stt` - Speech-to-Text

Converts audio to text using Amazon Transcribe.

**Request:**

```json
{
  "action": "stt",
  "audio": "GkXfo59ChoEBQveBAULygQRC84...",  // Base64 WebM
  "language": "en-US"
}
```

**Response:**

```json
{
  "transcript": "Hello, I'm learning English.",
  "success": true
}
```

**Notes:**
- Audio format: WebM (base64 encoded)
- Timeout: 30 seconds
- Temporary S3 storage (auto-deleted)

---

### 4. `analyze` - Conversation Analysis

Analyzes conversation for CAFP scores, grammar, and vocabulary.

**Request:**

```json
{
  "action": "analyze",
  "messages": [
    { "role": "assistant", "content": "How was your day?" },
    { "role": "user", "content": "It was good. I go to meeting yesterday." },
    { "role": "assistant", "content": "That sounds busy!" },
    { "role": "user", "content": "Yeah, um, it was like really busy." }
  ]
}
```

**Response:**

```json
{
  "analysis": {
    "cafp_scores": {
      "complexity": 65,
      "accuracy": 70,
      "fluency": 72,
      "pronunciation": 78
    },
    "fillers": {
      "count": 2,
      "words": ["um", "like"],
      "percentage": 8.3
    },
    "grammar_corrections": [
      {
        "original": "I go to meeting yesterday",
        "corrected": "I went to a meeting yesterday",
        "explanation": "과거 시제와 관사 'a'를 사용해야 합니다"
      }
    ],
    "vocabulary": {
      "total_words": 24,
      "unique_words": 18,
      "advanced_words": [],
      "suggested_words": ["conference", "hectic", "productive"]
    },
    "overall_feedback": "좋은 시작이에요! 과거 시제 사용에 조금 더 신경 쓰시면 좋겠어요.",
    "improvement_tips": [
      "과거 시제 사용에 주의하세요",
      "필러 단어(um, like) 사용을 줄여보세요",
      "관사(a, an, the) 사용을 연습하세요"
    ]
  },
  "success": true
}
```

**CAFP Scores:**

| Score | Description | Range |
|-------|-------------|-------|
| Complexity | Vocabulary diversity, sentence structure | 0-100 |
| Accuracy | Grammatical correctness | 0-100 |
| Fluency | Natural flow, coherence | 0-100 |
| Pronunciation | Estimated from word choices | 0-100 |

---

### 5. `save_settings` - Save User Settings

Saves user preferences to DynamoDB.

**Request:**

```json
{
  "action": "save_settings",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "settings": {
    "accent": "uk",
    "gender": "male",
    "level": "advanced",
    "topic": "interview"
  }
}
```

**Response:**

```json
{
  "success": true,
  "settings": {
    "accent": "uk",
    "gender": "male",
    "level": "advanced",
    "topic": "interview"
  },
  "updatedAt": "2026-01-13T10:00:00.000Z"
}
```

---

### 6. `get_settings` - Get User Settings

Retrieves user preferences from DynamoDB.

**Request:**

```json
{
  "action": "get_settings",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (found):**

```json
{
  "success": true,
  "settings": {
    "accent": "uk",
    "gender": "male",
    "level": "advanced"
  },
  "updatedAt": "2026-01-13T10:00:00.000Z"
}
```

**Response (not found):**

```json
{
  "success": true,
  "settings": null,
  "message": "No settings found for this device"
}
```

---

### 7. `start_session` - Start Conversation

Starts a new conversation session.

**Request:**

```json
{
  "action": "start_session",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "settings": {
    "accent": "us",
    "level": "intermediate",
    "topic": "business"
  },
  "tutorName": "Gwen"
}
```

**Response:**

```json
{
  "success": true,
  "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "startedAt": "2026-01-13T10:00:00.000Z"
}
```

---

### 8. `end_session` - End Conversation

Ends a conversation session and saves statistics.

**Request:**

```json
{
  "action": "end_session",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "duration": 330,
  "turnCount": 8,
  "wordCount": 156
}
```

**Response:**

```json
{
  "success": true,
  "endedAt": "2026-01-13T10:05:30.000Z"
}
```

---

### 9. `save_message` - Save Chat Message

Saves a conversation message to DynamoDB.

**Request:**

```json
{
  "action": "save_message",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "message": {
    "role": "user",
    "content": "Hello, I'm learning English!",
    "translation": "안녕하세요, 저는 영어를 배우고 있어요!",
    "turnNumber": 1
  }
}
```

**Response:**

```json
{
  "success": true,
  "messageId": "MSG#2026-01-13T10:00:15.000Z"
}
```

---

### 10. `get_sessions` - List Sessions

Lists user's conversation sessions with pagination.

**Request:**

```json
{
  "action": "get_sessions",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "limit": 10,
  "lastKey": null
}
```

**Response:**

```json
{
  "sessions": [
    {
      "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "tutorName": "Gwen",
      "topic": "business",
      "accent": "us",
      "level": "intermediate",
      "startedAt": "2026-01-13T10:00:00.000Z",
      "endedAt": "2026-01-13T10:05:30.000Z",
      "duration": 330,
      "turnCount": 8,
      "wordCount": 156,
      "status": "completed"
    }
  ],
  "lastKey": { "PK": "...", "SK": "..." },
  "hasMore": true
}
```

---

### 11. `get_session_detail` - Get Session Detail

Gets session metadata with all messages.

**Request:**

```json
{
  "action": "get_session_detail",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
}
```

**Response:**

```json
{
  "session": {
    "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "tutorName": "Gwen",
    "startedAt": "2026-01-13T10:00:00.000Z",
    "endedAt": "2026-01-13T10:05:30.000Z",
    "duration": 330,
    "turnCount": 8,
    "wordCount": 156,
    "status": "completed"
  },
  "messages": [
    {
      "role": "assistant",
      "content": "Hello! I'm Gwen. How are you today?",
      "timestamp": "2026-01-13T10:00:01.000Z",
      "turnNumber": 0
    },
    {
      "role": "user",
      "content": "Hi Gwen! I'm doing great.",
      "translation": "안녕 그웬! 잘 지내고 있어.",
      "timestamp": "2026-01-13T10:00:15.000Z",
      "turnNumber": 1
    }
  ]
}
```

---

### 12. `delete_session` - Delete Session

Deletes a session and all its messages.

**Request:**

```json
{
  "action": "delete_session",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
}
```

**Response:**

```json
{
  "success": true,
  "deletedCount": 12
}
```

**Error (not found):**

```json
{
  "error": "Session not found"
}
```

**Error (access denied):**

```json
{
  "error": "Access denied"
}
```

---

### 13. `get_transcribe_url` - Get Streaming URL

Gets a presigned WebSocket URL for real-time speech recognition.

**Request:**

```json
{
  "action": "get_transcribe_url",
  "language": "en-US",
  "sampleRate": 16000
}
```

**Response:**

```json
{
  "url": "wss://transcribestreaming.us-east-1.amazonaws.com:8443/stream-transcription-websocket?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "region": "us-east-1",
  "language": "en-US",
  "sampleRate": 16000,
  "expiresIn": 300
}
```

**Usage:**

```javascript
const ws = new WebSocket(response.url)
ws.binaryType = 'arraybuffer'

ws.onopen = () => {
  // Send PCM audio chunks via AWS EventStream format
}

ws.onmessage = (event) => {
  // Receive transcript events
}
```

---

## Error Codes

| HTTP Status | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad request (missing parameters) |
| 403 | Access denied (wrong deviceId) |
| 404 | Resource not found |
| 500 | Internal server error |

---

## Rate Limits

Currently no rate limits (MVP phase).

**Recommended limits for production:**
- Chat: 60 requests/minute
- TTS: 100 requests/minute
- STT: 30 requests/minute
- Analyze: 10 requests/minute

---

## cURL Examples

### Chat

```bash
curl -X POST https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{
    "action": "chat",
    "messages": [{"role": "user", "content": "Hello!"}],
    "settings": {"accent": "us", "level": "intermediate"}
  }'
```

### TTS

```bash
curl -X POST https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{
    "action": "tts",
    "text": "Hello, how are you?",
    "settings": {"accent": "us", "gender": "female"}
  }'
```

### Get Sessions

```bash
curl -X POST https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_sessions",
    "deviceId": "your-device-uuid",
    "limit": 10
  }'
```

---

## SDK Usage (JavaScript)

```javascript
import {
  sendMessage,
  textToSpeech,
  playAudioBase64,
  speechToText,
  analyzeConversation,
  startSession,
  endSession,
  saveMessage,
  getSessions,
  getSessionDetail,
  deleteSession
} from './utils/api'

// Chat
const response = await sendMessage(
  [{ role: 'user', content: 'Hello!' }],
  { accent: 'us', level: 'intermediate' }
)

// TTS
const ttsResponse = await textToSpeech('Hello!', settings)
await playAudioBase64(ttsResponse.audio)

// Analyze
const analysis = await analyzeConversation(messages)
console.log(analysis.cafp_scores)

// Session management
await startSession(deviceId, sessionId, settings, 'Gwen')
await saveMessage(deviceId, sessionId, { role: 'user', content: 'Hi!' })
await endSession(deviceId, sessionId, duration, turnCount, wordCount)
```

---

## OpenAPI Specification

Full OpenAPI 3.0 specification available at:
- [`docs/openapi.yaml`](./openapi.yaml)

Import into Swagger UI or Postman for interactive testing.

---

*Last Updated: 2026-01-13*
