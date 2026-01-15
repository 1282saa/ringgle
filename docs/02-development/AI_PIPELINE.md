# AI Pipeline & Voice Call Architecture

## Overview

This document describes the AI model configuration, voice call pipeline, and real-time speech processing architecture used in the Ringle AI English Learning MVP.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Voice Call Pipeline](#voice-call-pipeline)
3. [AI Conversation Model](#ai-conversation-model)
4. [Speech-to-Text (STT) Pipeline](#speech-to-text-stt-pipeline)
5. [Text-to-Speech (TTS) Pipeline](#text-to-speech-tts-pipeline)
6. [Voice Activity Detection (VAD)](#voice-activity-detection-vad)
7. [Conversation Analysis](#conversation-analysis)
8. [Data Flow Diagrams](#data-flow-diagrams)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐           │
│   │  Microphone  │────>│   VAD +      │────>│  STT Client  │           │
│   │   (WebRTC)   │     │ MediaRecorder│     │ (Streaming)  │           │
│   └──────────────┘     └──────────────┘     └──────┬───────┘           │
│                                                      │                   │
│                                                      ▼                   │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐           │
│   │   Speaker    │<────│ Audio Player │<────│  API Client  │           │
│   │  (WebAudio)  │     │  (Base64)    │     │   (fetch)    │           │
│   └──────────────┘     └──────────────┘     └──────┬───────┘           │
│                                                      │                   │
└──────────────────────────────────────────────────────│───────────────────┘
                                                       │
                                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           AWS CLOUD                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌────────────────┐                                                    │
│   │  API Gateway   │                                                    │
│   └───────┬────────┘                                                    │
│           │                                                              │
│           ▼                                                              │
│   ┌────────────────┐                                                    │
│   │    Lambda      │                                                    │
│   │  (Dispatcher)  │                                                    │
│   └───────┬────────┘                                                    │
│           │                                                              │
│     ┌─────┴─────┬──────────┬──────────┐                                │
│     │           │          │          │                                 │
│     ▼           ▼          ▼          ▼                                 │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                            │
│ │Bedrock │ │ Polly  │ │Transcr.│ │DynamoDB│                            │
│ │(Claude)│ │ (TTS)  │ │ (STT)  │ │ (Data) │                            │
│ └────────┘ └────────┘ └────────┘ └────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Voice Call Pipeline

### Complete Call Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VOICE CALL LIFECYCLE                             │
└─────────────────────────────────────────────────────────────────────────┘

1. CALL START
   ┌─────────┐     ┌─────────────┐     ┌─────────┐     ┌─────────┐
   │  User   │────>│ Start Call  │────>│ AI Greet│────>│   TTS   │
   │ taps    │     │ (startConv) │     │ (Claude)│     │ (Polly) │
   └─────────┘     └─────────────┘     └─────────┘     └────┬────┘
                                                             │
                                                             ▼
                                                       ┌─────────┐
                                                       │  Play   │
                                                       │  Audio  │
                                                       └────┬────┘
                                                            │
2. LISTENING LOOP                                           │
   ┌────────────────────────────────────────────────────────┘
   │
   ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                    LISTEN → PROCESS → RESPOND                    │
   │                                                                   │
   │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐         │
   │  │  Start  │──>│   VAD   │──>│  Stop   │──>│   STT   │         │
   │  │Listening│   │ Monitor │   │Recording│   │ Process │         │
   │  └─────────┘   └─────────┘   └─────────┘   └────┬────┘         │
   │                                                   │              │
   │                                                   ▼              │
   │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐         │
   │  │  Play   │<──│   TTS   │<──│  Send   │<──│ Got     │         │
   │  │  Audio  │   │ (Polly) │   │  to AI  │   │ Text    │         │
   │  └────┬────┘   └─────────┘   └─────────┘   └─────────┘         │
   │       │                                                          │
   │       └──────────────────────> (Loop back to Start Listening)   │
   │                                                                   │
   └───────────────────────────────────────────────────────────────────┘

3. CALL END
   ┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
   │  User   │────>│ End Call    │────>│ Save Stats  │────>│ Navigate│
   │ taps    │     │ (cleanup)   │     │ (DynamoDB)  │     │ /result │
   └─────────┘     └─────────────┘     └─────────────┘     └─────────┘
```

### Call.jsx State Machine

```
                    ┌──────────────┐
                    │   INITIAL    │
                    └──────┬───────┘
                           │ componentMount
                           ▼
                    ┌──────────────┐
                    │   LOADING    │ ←── AI generating greeting
                    └──────┬───────┘
                           │ AI response received
                           ▼
                    ┌──────────────┐
                    │   SPEAKING   │ ←── TTS playing
                    └──────┬───────┘
                           │ audio ended
                           ▼
              ┌───────────────────────────┐
              │        LISTENING          │ ←── Microphone active
              └────────────┬──────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         user speaks    silence     max time
              │        detected     reached
              ▼            │            │
       ┌──────────┐        │            │
       │ SPEAKING │        │            │
       │ (user)   │        │            │
       └────┬─────┘        │            │
            │              │            │
            └──────────────┴────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PROCESSING  │ ←── STT converting
                    └──────┬───────┘
                           │ transcript ready
                           ▼
                    ┌──────────────┐
                    │   LOADING    │ ←── AI generating response
                    └──────┬───────┘
                           │ AI response received
                           ▼
                    ┌──────────────┐
                    │   SPEAKING   │ ←── TTS playing
                    └──────────────┘
                           │
                           └────────> (loop back to LISTENING)
```

---

## AI Conversation Model

### Model Configuration

| Property | Value |
|----------|-------|
| Provider | AWS Bedrock |
| Model | Claude 3 Haiku |
| Model ID | `anthropic.claude-3-haiku-20240307-v1:0` |
| Max Tokens | 300 |
| Temperature | Default (1.0) |
| Anthropic Version | `bedrock-2023-05-31` |

### System Prompt Design

```python
SYSTEM_PROMPT = """You are a friendly English conversation partner on a phone call.

CRITICAL RULES:
1. Keep responses SHORT: 1-2 sentences only
2. ALWAYS end with a simple follow-up question
3. NEVER re-introduce yourself after the first message
4. NEVER say "Hello", "Hi there", or greet again after the conversation has started
5. Focus on the CONTENT of what the user said, not their grammar
6. Be warm and natural, like a friend chatting

Context:
- Accent: {accent}          # American/British/Australian/Indian English
- Level: {level}            # Beginner/Intermediate/Advanced
- Topic: {topic}            # Business/Daily/Travel/Interview

Response style examples:
- "That sounds interesting! What made you choose that career?"
- "Oh nice! Do you do that often?"
- "I see. What do you enjoy most about it?"

Only for the VERY FIRST message: Give a brief, friendly greeting and ask ONE simple question.
After that: NO greetings, NO introductions, just continue the conversation naturally."""
```

### Prompt Variables

| Variable | Options | Effect on Response |
|----------|---------|-------------------|
| `accent` | us, uk, au, in | Adjusts speaking style, idioms, cultural references |
| `level` | beginner, intermediate, advanced | Adjusts vocabulary complexity |
| `topic` | business, daily, travel, interview | Focuses conversation context |

### API Request Format

```javascript
// Frontend (api.js)
const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'chat',
    messages: [
      { role: 'user', content: 'Hello!' },
      { role: 'assistant', content: 'Hi! How are you doing today?' },
      { role: 'user', content: "I'm good, thanks!" }
    ],
    settings: {
      accent: 'us',
      level: 'intermediate',
      topic: 'business'
    }
  })
})
```

```python
# Backend (lambda_function.py)
response = bedrock.invoke_model(
    modelId='anthropic.claude-3-haiku-20240307-v1:0',
    contentType='application/json',
    accept='application/json',
    body=json.dumps({
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': 300,
        'system': formatted_system_prompt,
        'messages': claude_messages
    })
)
```

---

## Speech-to-Text (STT) Pipeline

### STT Modes (3 options)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        STT MODE SELECTION                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    STREAMING     │     │   TRANSCRIBE     │     │     BROWSER      │
│   (Real-time)    │     │    (Batch)       │     │   (Fallback)     │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ WebSocket to AWS │     │ Upload → Poll    │     │ Web Speech API   │
│ Transcribe       │     │ → Download       │     │ (Chrome only)    │
│                  │     │                  │     │                  │
│ Latency: ~200ms  │     │ Latency: 2-5s    │     │ Latency: ~500ms  │
│ Accuracy: High   │     │ Accuracy: High   │     │ Accuracy: Medium │
│ Cost: Higher     │     │ Cost: Lower      │     │ Cost: Free       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │                        │
        │                        │                        │
        └────────────────────────┴────────────────────────┘
                                 │
                                 ▼
                     Auto-fallback on error
```

### 1. Streaming STT (Default)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STREAMING STT PIPELINE                                │
└─────────────────────────────────────────────────────────────────────────┘

Browser                                              AWS
───────                                              ───

┌─────────────┐                              ┌─────────────────┐
│ Microphone  │                              │   Lambda        │
│ getUserMedia│                              │ (get_transcribe │
└──────┬──────┘                              │  _url)          │
       │                                     └────────┬────────┘
       ▼                                              │
┌─────────────┐    Request URL                        │
│ TranscribeS │ ──────────────────────────────────────┤
│ treamClient │                                       │
└──────┬──────┘    Presigned WebSocket URL            │
       │      <───────────────────────────────────────┘
       │
       ▼
┌─────────────┐                              ┌─────────────────┐
│ AudioContext│                              │   Transcribe    │
│ (16kHz)     │                              │   Streaming     │
└──────┬──────┘                              │   WebSocket     │
       │                                     └────────┬────────┘
       │  PCM Audio Chunks (every ~256ms)             │
       │ ─────────────────────────────────────────────>│
       │                                              │
       │  Partial Transcript (real-time)              │
       │ <─────────────────────────────────────────────
       │                                              │
       │  Final Transcript (sentence complete)        │
       │ <─────────────────────────────────────────────
       │
       ▼
┌─────────────┐
│ Process     │
│ Text        │
└─────────────┘
```

**Audio Processing:**

```javascript
// Float32 → Int16 PCM conversion
_floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2)
  const view = new DataView(buffer)

  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return new Uint8Array(buffer)
}
```

**AWS Event Stream Format:**

```javascript
// Using @aws-sdk/eventstream-codec
const message = {
  headers: {
    ':content-type': { type: 'string', value: 'application/octet-stream' },
    ':event-type': { type: 'string', value: 'AudioEvent' },
    ':message-type': { type: 'string', value: 'event' },
  },
  body: pcmData,  // Uint8Array
}

const encoded = eventStreamCodec.encode(message)
websocket.send(encoded)
```

### 2. Batch STT (Fallback)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      BATCH STT PIPELINE                                  │
└─────────────────────────────────────────────────────────────────────────┘

Browser                               Lambda                          AWS
───────                               ──────                          ───

┌───────────┐
│ Recording │
│ Complete  │
└─────┬─────┘
      │
      ▼
┌───────────┐    POST /chat
│ Audio     │    action: 'stt'
│ Blob      │ ─────────────────> ┌───────────┐
│ (WebM)    │    audio: base64   │  Lambda   │
└───────────┘                    └─────┬─────┘
                                       │
                                       ▼
                                 ┌───────────┐     PUT
                                 │ Decode    │ ─────────> ┌────────┐
                                 │ Base64    │            │   S3   │
                                 └───────────┘            │ Bucket │
                                       │                  └────────┘
                                       ▼
                                 ┌───────────┐
                                 │ Start     │ ─────────> ┌────────────┐
                                 │ Transcr.  │            │ Transcribe │
                                 │ Job       │            │   Job      │
                                 └─────┬─────┘            └────────────┘
                                       │
                                       │ Poll (1s interval, max 30s)
                                       ▼
                                 ┌───────────┐
                                 │ Get       │
                                 │ Result    │ <─────────── Transcript JSON
                                 └─────┬─────┘
                                       │
                                       │ Cleanup (delete S3 + job)
                                       ▼
┌───────────┐                    ┌───────────┐
│ Received  │ <───────────────── │ Return    │
│ Transcript│    JSON response   │ Transcript│
└───────────┘                    └───────────┘
```

### 3. Browser STT (Fallback)

```javascript
// Web Speech API (Chrome/Edge only)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const recognition = new SpeechRecognition()

recognition.continuous = true
recognition.interimResults = true
recognition.lang = 'en-US'

recognition.onresult = (event) => {
  let finalTranscript = ''
  let interimTranscript = ''

  for (let i = event.resultIndex; i < event.results.length; i++) {
    if (event.results[i].isFinal) {
      finalTranscript += event.results[i][0].transcript
    } else {
      interimTranscript += event.results[i][0].transcript
    }
  }
}
```

---

## Text-to-Speech (TTS) Pipeline

### TTS Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TTS PIPELINE                                     │
└─────────────────────────────────────────────────────────────────────────┘

Frontend                              Lambda                        AWS Polly
────────                              ──────                        ─────────

┌───────────┐    POST /chat
│ AI Text   │    action: 'tts'
│ Response  │ ─────────────────> ┌───────────┐
└───────────┘    text: "Hello"   │  Lambda   │
                 settings: {...} └─────┬─────┘
                                       │
                                       │ Select Voice
                                       ▼
                                 ┌───────────┐     synthesize_speech()
                                 │ Voice     │ ─────────────────────────>
                                 │ Selection │                           ┌────────┐
                                 └───────────┘                           │ Polly  │
                                       │                                 │ Engine │
                                       │                                 └───┬────┘
                                       │                                     │
                                       │ <────────────────────────── Audio Stream
                                       ▼
                                 ┌───────────┐
                                 │ Base64    │
                                 │ Encode    │
                                 └─────┬─────┘
                                       │
┌───────────┐                          │
│ Receive   │ <────────────────────────┘
│ Audio     │    { audio: "base64..." }
└─────┬─────┘
      │
      ▼
┌───────────┐
│ new Audio │
│ (data:    │
│ audio/mp3;│
│ base64,...│
└─────┬─────┘
      │
      ▼
┌───────────┐
│ Play()    │ ────────> Speaker Output
└───────────┘
```

### Voice Selection Map

```python
voice_map = {
    # (accent, gender): (voice_id, engine)
    ('us', 'female'): ('Joanna', 'neural'),   # Best quality
    ('us', 'male'): ('Matthew', 'neural'),
    ('uk', 'female'): ('Amy', 'neural'),
    ('uk', 'male'): ('Brian', 'neural'),
    ('au', 'female'): ('Nicole', 'standard'), # Neural not available
    ('au', 'male'): ('Russell', 'standard'),
    ('in', 'female'): ('Aditi', 'standard'),
    ('in', 'male'): ('Aditi', 'standard'),    # Same voice
}
```

### Audio Playback

```javascript
// api.js - playAudioBase64()
function playAudioBase64(base64Audio, audioRef = null) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`)

    if (audioRef) {
      audioRef.current = audio  // Store for pause control
    }

    audio.onended = () => resolve()
    audio.onerror = (err) => reject(err)
    audio.play()
  })
}
```

### Fallback: Browser TTS

```javascript
// Used when Polly fails
function speakWithBrowserTTS(text, settings) {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = settings?.speed === 'slow' ? 0.8 :
                   settings?.speed === 'fast' ? 1.2 : 1.0

  speechSynthesis.speak(utterance)
}
```

---

## Voice Activity Detection (VAD)

### VAD Configuration

```javascript
const VAD_THRESHOLD = 15        // Volume threshold (0-255)
const SILENCE_DURATION = 1500   // ms of silence to stop
const MIN_SPEECH_DURATION = 500 // Minimum speech to process
const MAX_RECORDING_TIME = 60000 // Safety timeout
```

### VAD Algorithm

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VAD MONITORING LOOP                              │
└─────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │   Start      │
                         │  Monitoring  │
                         └──────┬───────┘
                                │
                                ▼
                    ┌───────────────────────┐
            ┌──────>│ Read Audio Levels     │ ◄─── Every 100ms
            │       │ (AnalyserNode)        │
            │       └───────────┬───────────┘
            │                   │
            │                   ▼
            │       ┌───────────────────────┐
            │       │ Calculate Average     │
            │       │ Volume (0-255)        │
            │       └───────────┬───────────┘
            │                   │
            │           ┌───────┴───────┐
            │           │               │
            │     volume > 15     volume <= 15
            │           │               │
            │           ▼               ▼
            │    ┌──────────────┐ ┌──────────────┐
            │    │ User Speaking│ │   Silence    │
            │    │ isSpeaking=T │ │              │
            │    │ updateTime() │ │              │
            │    └──────────────┘ └──────┬───────┘
            │                            │
            │                    silenceTime > 1.5s
            │                    && speechDuration > 0.5s?
            │                            │
            │                    ┌───────┴───────┐
            │                    │               │
            │                   Yes              No
            │                    │               │
            │                    ▼               │
            │           ┌──────────────┐        │
            │           │ Stop Record  │        │
            │           │ Process STT  │        │
            │           └──────────────┘        │
            │                                   │
            └───────────────────────────────────┘
```

### Implementation

```javascript
// Start VAD monitoring
const startVADMonitoring = () => {
  const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

  vadIntervalRef.current = setInterval(() => {
    analyserRef.current.getByteFrequencyData(dataArray)

    // Calculate average volume
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    const average = sum / dataArray.length

    const now = Date.now()

    if (average > VAD_THRESHOLD) {
      // Speech detected
      if (!isSpeakingUserRef.current) {
        speechStartTime = now
      }
      isSpeakingUserRef.current = true
      lastSpeechTimeRef.current = now
    } else {
      // Silence
      const silenceTime = now - lastSpeechTimeRef.current

      if (isSpeakingUserRef.current && silenceTime > SILENCE_DURATION) {
        const speechDuration = lastSpeechTimeRef.current - speechStartTime

        if (speechDuration >= MIN_SPEECH_DURATION) {
          stopRecordingAndProcess()
        }
      }
    }
  }, 100)
}
```

---

## Conversation Analysis

### Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONVERSATION ANALYSIS PIPELINE                        │
└─────────────────────────────────────────────────────────────────────────┘

Frontend                              Lambda                        Bedrock
────────                              ──────                        ───────

┌───────────┐    POST /chat
│ Call End  │    action: 'analyze'
│ Messages  │ ─────────────────────> ┌───────────┐
│ Array     │                        │  Lambda   │
└───────────┘                        └─────┬─────┘
                                           │
                                           │ Format conversation
                                           ▼
                                     ┌───────────┐
                                     │ Build     │
                                     │ Analysis  │
                                     │ Prompt    │
                                     └─────┬─────┘
                                           │
                                           │ invoke_model()
                                           ▼
                                     ┌───────────┐     ┌───────────┐
                                     │  Claude   │────>│  Analyze  │
                                     │  Haiku    │     │  Student  │
                                     │           │<────│  Messages │
                                     └─────┬─────┘     └───────────┘
                                           │
                                           │ Parse JSON response
                                           ▼
┌───────────┐                        ┌───────────┐
│ Analysis  │ <───────────────────── │  Return   │
│ Results   │                        │  JSON     │
│           │                        └───────────┘
└───────────┘
```

### Analysis Output Schema

```json
{
  "cafp_scores": {
    "complexity": 75,      // Vocabulary & sentence complexity
    "accuracy": 80,        // Grammatical correctness
    "fluency": 72,         // Natural flow & coherence
    "pronunciation": 78    // Estimated from word choices
  },
  "fillers": {
    "count": 3,
    "words": ["um", "like", "you know"],
    "percentage": 2.5
  },
  "grammar_corrections": [
    {
      "original": "I go to school yesterday",
      "corrected": "I went to school yesterday",
      "explanation": "과거 시제를 사용해야 합니다"
    }
  ],
  "vocabulary": {
    "total_words": 120,
    "unique_words": 85,
    "advanced_words": ["consequently", "nevertheless"],
    "suggested_words": ["moreover", "furthermore", "subsequently"]
  },
  "overall_feedback": "전반적으로 잘 하셨습니다! 문법적으로 몇 가지 실수가 있었지만...",
  "improvement_tips": [
    "과거 시제 사용에 주의하세요",
    "필러 단어 사용을 줄여보세요",
    "더 다양한 접속사를 사용해보세요"
  ]
}
```

---

## Data Flow Diagrams

### Complete Message Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SINGLE TURN DATA FLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

Time ─────────────────────────────────────────────────────────────────────>

     User                                   System
     ────                                   ──────

[1] Speaks "Hello, I'm learning English"
        │
        ▼
[2] ┌─────────────────┐
    │ Microphone      │
    │ MediaRecorder   │
    │ VAD Detection   │
    └────────┬────────┘
             │ (silence detected)
             ▼
[3] ┌─────────────────┐
    │ Audio Blob      │ ─────────────┐
    │ (WebM, ~2-5KB)  │              │
    └─────────────────┘              │
                                     ▼
[4]                          ┌─────────────────┐
                             │ STT (Transcribe)│
                             │ "Hello, I'm     │
                             │ learning English│
                             └────────┬────────┘
                                      │
                                      ▼
[5]                          ┌─────────────────┐
                             │ AI (Claude)     │
                             │ Generate        │
                             │ Response        │
                             └────────┬────────┘
                                      │
                                      ▼
[6]                          ┌─────────────────┐
                             │ "That's great!  │
                             │ How long have   │
                             │ you been        │
                             │ studying?"      │
                             └────────┬────────┘
                                      │
                                      ▼
[7]                          ┌─────────────────┐
                             │ TTS (Polly)     │
                             │ Audio Base64    │
                             │ (~10-20KB)      │
                             └────────┬────────┘
                                      │
                                      ▼
[8]                          ┌─────────────────┐
                             │ Play Audio      │
                             │ via Speaker     │
                             └────────┬────────┘
                                      │
                                      ▼
[9] Hears AI response       (Start listening again)
```

### Latency Breakdown

| Step | Operation | Typical Latency |
|------|-----------|-----------------|
| 1-2 | User speaks + VAD | ~1.5-3s |
| 3 | Audio encoding | ~10ms |
| 4 | STT (Streaming) | ~200-500ms |
| 4 | STT (Batch) | ~2-5s |
| 5 | AI Response (Claude Haiku) | ~500-1500ms |
| 6-7 | TTS (Polly) | ~200-500ms |
| 8 | Audio playback | 1-3s (depends on length) |
| **Total** | **One turn (Streaming)** | **~3-6s** |
| **Total** | **One turn (Batch)** | **~5-10s** |

---

## Error Handling & Fallbacks

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ERROR FALLBACK CHAIN                             │
└─────────────────────────────────────────────────────────────────────────┘

STT Errors:
    Streaming STT ──(fail)──> Batch Transcribe ──(fail)──> Browser STT

TTS Errors:
    Polly Neural ──(fail)──> Polly Standard ──(fail)──> Browser TTS

AI Errors:
    Bedrock Claude ──(fail)──> Static fallback response

DynamoDB Errors:
    Save to DB ──(fail)──> Continue (logged, non-blocking)
```

---

*Last Updated: 2026-01-13*
