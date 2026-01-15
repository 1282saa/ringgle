# Backend API Documentation

AWS Lambda 기반 AI 영어 학습 백엔드 API 문서

**Last Updated**: 2026-01-12
**Runtime**: Python 3.11
**Region**: us-east-1

---

## 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [AWS 서비스 의존성](#aws-서비스-의존성)
4. [API 엔드포인트](#api-엔드포인트)
5. [함수 상세](#함수-상세)
6. [데이터 모델](#데이터-모델)
7. [에러 처리](#에러-처리)
8. [배포 가이드](#배포-가이드)

---

## 개요

이 백엔드는 AWS Lambda로 구현된 서버리스 API로, AI 영어 회화 연습 앱의 핵심 기능을 제공합니다.

### 주요 기능

| 기능 | 설명 | AWS 서비스 |
|------|------|-----------|
| AI 대화 | Claude Haiku 기반 영어 튜터 | AWS Bedrock |
| 음성 합성 | 텍스트를 음성으로 변환 | Amazon Polly |
| 음성 인식 | 음성을 텍스트로 변환 | AWS Transcribe |
| 대화 분석 | CAFP 점수, 문법 교정 등 | AWS Bedrock |

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (REST)                         │
│              POST /prod/chat                                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Lambda Function                            │
│                    lambda_function.py                           │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐  │
│  │ handle_chat │ handle_tts  │ handle_stt  │ handle_analyze  │  │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                │              │              │
         ▼                ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌───────────┐  ┌─────────────┐
│   Bedrock   │  │    Polly    │  │Transcribe │  │   Bedrock   │
│Claude Haiku │  │   (TTS)     │  │  (STT)    │  │Claude Haiku │
└─────────────┘  └─────────────┘  └───────────┘  └─────────────┘
                                        │
                                        ▼
                                 ┌───────────┐
                                 │    S3     │
                                 │(임시 저장) │
                                 └───────────┘
```

---

## AWS 서비스 의존성

### 1. AWS Bedrock
- **모델**: `anthropic.claude-3-haiku-20240307-v1:0`
- **용도**: AI 대화 생성, 대화 분석
- **비용**: Haiku 모델 사용으로 약 92% 비용 절감

### 2. Amazon Polly
- **용도**: Text-to-Speech (TTS)
- **엔진**: Neural / Standard (음성별 상이)
- **출력 형식**: MP3

### 3. AWS Transcribe
- **용도**: Speech-to-Text (STT)
- **입력 형식**: WebM
- **언어**: en-US (기본)

### 4. Amazon S3
- **버킷**: `eng-learning-audio`
- **용도**: Transcribe 작업용 임시 오디오 저장
- **라이프사이클**: 작업 완료 후 즉시 삭제

---

## API 엔드포인트

**Base URL**: `https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat`

### 공통 헤더

```http
Content-Type: application/json
```

### 공통 응답 헤더

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Methods: POST, OPTIONS
```

---

### 1. Chat (AI 대화)

AI 튜터와 영어 대화를 수행합니다.

**Request**

```json
{
  "action": "chat",
  "messages": [
    { "role": "user", "content": "Hello, how are you?" },
    { "role": "assistant", "content": "I'm doing great! How about you?" },
    { "role": "user", "content": "I'm fine, thanks!" }
  ],
  "settings": {
    "accent": "us",
    "level": "intermediate",
    "topic": "business"
  }
}
```

**Parameters**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `action` | string | Yes | `"chat"` |
| `messages` | array | Yes | 대화 히스토리 |
| `messages[].role` | string | Yes | `"user"` 또는 `"assistant"` |
| `messages[].content` | string | Yes | 메시지 내용 |
| `settings.accent` | string | No | 악센트: `us`, `uk`, `au`, `in` |
| `settings.level` | string | No | 난이도: `beginner`, `intermediate`, `advanced` |
| `settings.topic` | string | No | 주제: `business`, `daily`, `travel`, `interview` |

**Response (200)**

```json
{
  "message": "That's wonderful to hear! What kind of work do you do?",
  "role": "assistant"
}
```

---

### 2. TTS (Text-to-Speech)

텍스트를 음성으로 변환합니다.

**Request**

```json
{
  "action": "tts",
  "text": "Hello, how are you today?",
  "settings": {
    "accent": "us",
    "gender": "female"
  }
}
```

**Parameters**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `action` | string | Yes | `"tts"` |
| `text` | string | Yes | 변환할 텍스트 |
| `settings.accent` | string | No | 악센트 (기본: `us`) |
| `settings.gender` | string | No | 성별: `female`, `male` |

**음성 매핑**

| 악센트 | 성별 | Voice ID | 엔진 |
|--------|------|----------|------|
| us | female | Joanna | neural |
| us | male | Matthew | neural |
| uk | female | Amy | neural |
| uk | male | Brian | neural |
| au | female | Nicole | standard |
| au | male | Russell | standard |
| in | female | Aditi | standard |
| in | male | Aditi | standard |

**Response (200)**

```json
{
  "audio": "<base64-encoded-mp3>",
  "contentType": "audio/mpeg",
  "voice": "Joanna",
  "engine": "neural"
}
```

---

### 3. STT (Speech-to-Text)

음성을 텍스트로 변환합니다.

**Request**

```json
{
  "action": "stt",
  "audio": "<base64-encoded-webm>",
  "language": "en-US"
}
```

**Parameters**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `action` | string | Yes | `"stt"` |
| `audio` | string | Yes | Base64 인코딩된 WebM 오디오 |
| `language` | string | No | 언어 코드 (기본: `en-US`) |

**Response (200)**

```json
{
  "transcript": "Hello, I am practicing English.",
  "success": true
}
```

**처리 과정**

1. Base64 오디오 디코딩
2. S3에 임시 저장 (`audio/{job_name}.webm`)
3. Transcribe 작업 시작
4. 최대 30초 대기 (1초 간격 폴링)
5. 결과 반환 및 리소스 정리

---

### 4. Analyze (대화 분석)

대화 내용을 분석하여 CAFP 점수, 문법 교정, 어휘 분석 등을 제공합니다.

**Request**

```json
{
  "action": "analyze",
  "messages": [
    { "role": "user", "content": "I go to school yesterday." },
    { "role": "assistant", "content": "Oh, you went to school yesterday? How was it?" },
    { "role": "user", "content": "Um, it was, like, really good." }
  ]
}
```

**Response (200)**

```json
{
  "analysis": {
    "cafp_scores": {
      "complexity": 45,
      "accuracy": 60,
      "fluency": 55,
      "pronunciation": 70
    },
    "fillers": {
      "count": 2,
      "words": ["um", "like"],
      "percentage": 15.4
    },
    "grammar_corrections": [
      {
        "original": "I go to school yesterday.",
        "corrected": "I went to school yesterday.",
        "explanation": "과거 시제를 나타내는 'yesterday'와 함께 동사도 과거형 'went'를 사용해야 합니다."
      }
    ],
    "vocabulary": {
      "total_words": 13,
      "unique_words": 11,
      "advanced_words": [],
      "suggested_words": ["attended", "fantastic", "enjoyable", "productive", "engaged"]
    },
    "overall_feedback": "기본적인 의사소통이 가능하지만, 시제 사용에 주의가 필요합니다. 필러 단어 사용을 줄이면 더 유창하게 들릴 거예요!",
    "improvement_tips": [
      "과거 시제 동사 변화를 연습해보세요",
      "'um', 'like' 같은 필러 단어 대신 잠시 멈추는 연습을 해보세요",
      "더 다양한 형용사를 사용해서 표현력을 높여보세요"
    ]
  },
  "success": true
}
```

**CAFP 점수 기준**

| 항목 | 설명 | 평가 기준 |
|------|------|----------|
| Complexity | 복잡성 | 어휘 다양성, 문장 구조 복잡도 |
| Accuracy | 정확성 | 문법적 정확성 |
| Fluency | 유창성 | 자연스러운 흐름, 일관성 |
| Pronunciation | 발음 | 발음 난이도 단어 사용 패턴 기반 추정 |

**필러 단어 목록**

```
um, uh, like, you know, basically, actually,
literally, i mean, so, well, kind of, sort of
```

---

## 함수 상세

### `lambda_handler(event, context)`

Lambda 진입점. HTTP 메서드와 action 파라미터에 따라 적절한 핸들러로 라우팅합니다.

```python
def lambda_handler(event, context):
    # OPTIONS 요청 처리 (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    # action에 따른 라우팅
    action = body.get('action', 'chat')
    if action == 'chat':
        return handle_chat(body, headers)
    elif action == 'tts':
        return handle_tts(body, headers)
    # ...
```

### `handle_chat(body, headers)`

Claude Haiku를 사용한 AI 대화 처리.

**시스템 프롬프트 구성**

```
You are Emma, a friendly AI English tutor...
- Accent: {accent}
- Difficulty Level: {level}
- Topic: {topic}
- Keep responses natural (2-3 sentences max)
- Ask follow-up questions
- Gently correct major grammar errors
```

**설정 매핑**

| 설정 | 값 | 설명 |
|------|-----|------|
| accent: us | American English | 미국식 영어 |
| accent: uk | British English | 영국식 영어 |
| accent: au | Australian English | 호주식 영어 |
| accent: in | Indian English | 인도식 영어 |
| level: beginner | simple words, short sentences | 초급 |
| level: intermediate | normal conversation | 중급 |
| level: advanced | complex vocabulary, idioms | 고급 |
| topic: business | Business and workplace | 비즈니스 |
| topic: daily | Daily life, casual | 일상 |
| topic: travel | Travel and tourism | 여행 |
| topic: interview | Job interviews | 면접 |

### `handle_tts(body, headers)`

Amazon Polly를 사용한 텍스트-음성 변환.

- Neural 엔진: 더 자연스러운 음성 (Joanna, Matthew, Amy, Brian)
- Standard 엔진: 기본 음성 (Nicole, Russell, Aditi)

### `handle_stt(body, headers)`

AWS Transcribe를 사용한 음성-텍스트 변환.

**처리 흐름**

```
1. Base64 디코딩
2. S3 업로드 (s3://eng-learning-audio/audio/{job_name}.webm)
3. Transcribe 작업 시작
4. 폴링 (최대 30회, 1초 간격)
5. 결과 파싱
6. 리소스 정리 (S3 삭제, Transcribe 작업 삭제)
```

### `handle_analyze(body, headers)`

대화 분석 수행. 실패 시 기본 분석 결과를 fallback으로 반환.

**분석 항목**

- CAFP 점수 (0-100)
- 필러 단어 탐지 (정규식 기반)
- 문법 교정 및 한국어 설명
- 어휘 분석 (총 단어, 고유 단어, 고급 어휘)
- 종합 피드백 (한국어)
- 개선 팁 3개 (한국어)

---

## 데이터 모델

### Message

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
}
```

### Settings

```typescript
interface Settings {
  accent?: 'us' | 'uk' | 'au' | 'in';
  level?: 'beginner' | 'intermediate' | 'advanced';
  topic?: 'business' | 'daily' | 'travel' | 'interview';
  gender?: 'female' | 'male';
}
```

### AnalysisResult

```typescript
interface AnalysisResult {
  cafp_scores: {
    complexity: number;    // 0-100
    accuracy: number;      // 0-100
    fluency: number;       // 0-100
    pronunciation: number; // 0-100
  };
  fillers: {
    count: number;
    words: string[];
    percentage: number;
  };
  grammar_corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;  // Korean
  }>;
  vocabulary: {
    total_words: number;
    unique_words: number;
    advanced_words: string[];
    suggested_words: string[];
  };
  overall_feedback: string;    // Korean
  improvement_tips: string[];  // Korean
}
```

---

## 에러 처리

### HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 (Invalid action, No audio data 등) |
| 500 | 서버 에러 |

### 에러 응답 형식

```json
{
  "error": "Error message description"
}
```

### Fallback 처리

`handle_analyze` 함수는 AI 분석 실패 시 기본값을 반환합니다:

```json
{
  "analysis": {
    "cafp_scores": { "complexity": 70, "accuracy": 75, "fluency": 72, "pronunciation": 78 },
    "fillers": { ... },  // 정규식 기반 계산 결과
    "grammar_corrections": [],
    "vocabulary": { ... },
    "overall_feedback": "대화를 잘 하셨습니다! 계속 연습하시면 더 좋아질 거예요.",
    "improvement_tips": [...]
  },
  "success": true,
  "fallback": true
}
```

---

## 배포 가이드

### 1. IAM 역할 설정

**Trust Policy** (`trust-policy.json`)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**필요 권한**

- `bedrock:InvokeModel` - Claude 모델 호출
- `polly:SynthesizeSpeech` - TTS
- `transcribe:StartTranscriptionJob` - STT 작업 시작
- `transcribe:GetTranscriptionJob` - STT 상태 확인
- `transcribe:DeleteTranscriptionJob` - STT 작업 삭제
- `s3:PutObject` - 오디오 업로드
- `s3:GetObject` - 오디오 읽기
- `s3:DeleteObject` - 오디오 삭제
- `logs:CreateLogGroup` - CloudWatch 로그
- `logs:CreateLogStream` - CloudWatch 로그
- `logs:PutLogEvents` - CloudWatch 로그

### 2. S3 버킷 생성

```bash
aws s3 mb s3://eng-learning-audio --region us-east-1
```

### 3. Lambda 함수 배포

```bash
# 패키징
cd backend
zip lambda_deploy.zip lambda_function.py

# 배포
aws lambda update-function-code \
  --function-name eng-learning-api \
  --zip-file fileb://lambda_deploy.zip \
  --region us-east-1
```

### 4. Lambda 설정

| 설정 | 값 |
|------|-----|
| Runtime | Python 3.11 |
| Memory | 256 MB (권장) |
| Timeout | 60초 (STT 작업 대기 필요) |
| Region | us-east-1 |

### 5. API Gateway 연결

- REST API 생성
- POST 메서드 추가 → Lambda 통합
- CORS 활성화
- 스테이지 배포 (`prod`)

---

## 비용 최적화

### Claude Haiku 사용

- Haiku는 Sonnet 대비 약 92% 저렴
- 빠른 응답 속도 (짧은 대화에 적합)
- `max_tokens: 300` (chat), `max_tokens: 1500` (analyze)

### Polly 엔진 선택

- Neural 엔진: 더 자연스럽지만 비용 높음
- Standard 엔진: 일부 음성만 지원, 저렴

### Transcribe 리소스 정리

- 작업 완료 후 즉시 S3 오디오 파일 삭제
- Transcribe 작업 기록 삭제

---

## 참고 자료

- [AWS Bedrock Claude Documentation](https://docs.aws.amazon.com/bedrock/)
- [Amazon Polly Voice List](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html)
- [AWS Transcribe Developer Guide](https://docs.aws.amazon.com/transcribe/)
