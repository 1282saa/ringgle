# AWS Infrastructure Documentation

## Overview

Ringle AI English Learning MVP uses a serverless architecture on AWS to provide real-time AI-powered English conversation practice.

| Component | Region | Purpose |
|-----------|--------|---------|
| Frontend (S3 + CloudFront) | ap-northeast-2 | Static web hosting |
| Backend (Lambda + API Gateway) | us-east-1 | API services |
| AI/ML Services (Bedrock, Polly, Transcribe) | us-east-1 | AI processing |
| Database (DynamoDB) | us-east-1 | Data storage |

**Live URL:** https://d3pw62uy753kuv.cloudfront.net

---

## Architecture Diagram

```
                                              +------------------+
                                              |   React Client   |
                                              |  (Web/iOS/Android)|
                                              +--------+---------+
                                                       |
                              +------------------------+------------------------+
                              |                                                 |
                              | Static Assets                                   | API Calls
                              v                                                 v
                    +------------------+                               +------------------+
                    |   CloudFront     |                               |   API Gateway    |
                    |     (CDN)        |                               |    (REST API)    |
                    +--------+---------+                               +--------+---------+
                             |                                                  |
                             v                                                  | Invoke
                    +------------------+                                        v
                    |       S3         |                               +------------------+
                    |  (Static Web)    |                               |     Lambda       |
                    +------------------+                               |  (Python 3.11)   |
                                                                       +--------+---------+
                                                                                |
                                         +-------------+------------+------------+-------------+
                                         |             |            |            |             |
                                         v             v            v            v             v
                                   +---------+   +---------+  +-----------+  +----------+  +--------+
                                   | Bedrock |   |  Polly  |  | Transcribe|  | DynamoDB |  |   S3   |
                                   | (Claude)|   |  (TTS)  |  |   (STT)   |  |  (Data)  |  | (Audio)|
                                   +---------+   +---------+  +-----------+  +----------+  +--------+
```

---

## AWS Services

### 1. API Gateway

| Property | Value |
|----------|-------|
| Type | REST API |
| Endpoint | `https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat` |
| Stage | `prod` |
| Methods | POST, OPTIONS |
| CORS | Enabled (Allow-Origin: *) |

**Request Format:**
```json
{
  "action": "chat|tts|stt|analyze|...",
  "messages": [...],
  "settings": {...}
}
```

---

### 2. Lambda Function

| Property | Value |
|----------|-------|
| Function Name | `eng-learning-api` |
| Runtime | Python 3.11 |
| Memory | 256 MB |
| Timeout | 60 seconds |
| Handler | `lambda_function.lambda_handler` |

**Supported Actions:**

| Action | Description | AWS Service Used |
|--------|-------------|------------------|
| `chat` | AI conversation | Bedrock (Claude Haiku) |
| `tts` | Text-to-Speech | Polly |
| `stt` | Speech-to-Text | Transcribe + S3 |
| `analyze` | Conversation analysis | Bedrock |
| `save_settings` | Save user preferences | DynamoDB |
| `get_settings` | Retrieve user preferences | DynamoDB |
| `start_session` | Start conversation session | DynamoDB |
| `end_session` | End conversation session | DynamoDB |
| `save_message` | Save chat message | DynamoDB |
| `get_sessions` | List user sessions | DynamoDB |
| `get_session_detail` | Get session with messages | DynamoDB |
| `delete_session` | Delete session and messages | DynamoDB |
| `get_transcribe_url` | Get presigned WebSocket URL | Transcribe Streaming |

---

### 3. Amazon Bedrock (AI)

| Property | Value |
|----------|-------|
| Model | Claude 3 Haiku |
| Model ID | `anthropic.claude-3-haiku-20240307-v1:0` |
| Max Tokens | 300 (chat), 1500 (analysis) |
| Use Cases | Conversation, CAFP Analysis |

**System Prompt Features:**
- Accent-aware responses (US, UK, AU, IN)
- Level-adjusted vocabulary (Beginner, Intermediate, Advanced)
- Topic-focused conversation (Business, Daily, Travel, Interview)
- Short, natural responses (1-2 sentences)

---

### 4. Amazon Polly (TTS)

| Property | Value |
|----------|-------|
| Output Format | MP3 |
| Engine | Neural (US/UK), Standard (AU/IN) |

**Voice Configuration:**

| Accent | Female Voice | Male Voice | Engine |
|--------|--------------|------------|--------|
| US | Joanna | Matthew | Neural |
| UK | Amy | Brian | Neural |
| AU | Nicole | Russell | Standard |
| IN | Aditi | Aditi | Standard |

---

### 5. Amazon Transcribe (STT)

#### Batch Mode
| Property | Value |
|----------|-------|
| Media Format | WebM |
| Language | en-US |
| Timeout | 30 seconds polling |

**Flow:**
1. Upload audio to S3
2. Start transcription job
3. Poll for completion
4. Retrieve transcript
5. Clean up (delete S3 file and job)

#### Streaming Mode
| Property | Value |
|----------|-------|
| Protocol | WebSocket (wss://) |
| Sample Rate | 16000 Hz |
| Encoding | PCM |
| Endpoint | `transcribestreaming.us-east-1.amazonaws.com:8443` |

---

### 6. Amazon DynamoDB

| Property | Value |
|----------|-------|
| Table Name | `eng-learning-conversations` |
| Billing Mode | Provisioned (5 RCU / 5 WCU) |
| TTL | 90 days |
| Region | us-east-1 |

#### Table Schema

**Primary Key:**
| Attribute | Type | Description |
|-----------|------|-------------|
| PK | String | Partition key: `DEVICE#{deviceId}` |
| SK | String | Sort key: varies by item type |

**Global Secondary Index (GSI1):**
| Attribute | Type | Description |
|-----------|------|-------------|
| GSI1PK | String | `SESSION#{sessionId}` |
| GSI1SK | String | `META` or `MSG#{timestamp}` |

#### Item Types

**1. User Settings**
```
PK: DEVICE#{deviceId}
SK: SETTINGS
type: USER_SETTINGS
settings: { accent, gender, level, topic, ... }
```

**2. Session Metadata**
```
PK: DEVICE#{deviceId}
SK: SESSION#{timestamp}#{sessionId}#META
GSI1PK: SESSION#{sessionId}
GSI1SK: META
type: SESSION_META
tutorName, topic, accent, level, gender
startedAt, endedAt, duration, turnCount, wordCount
status: active | completed
```

**3. Messages**
```
PK: DEVICE#{deviceId}
SK: SESSION#{sessionId}#MSG#{timestamp}
GSI1PK: SESSION#{sessionId}
GSI1SK: MSG#{timestamp}
type: MESSAGE
role: user | assistant
content, translation, turnNumber
```

#### Access Patterns

| Pattern | Key Condition | Use Case |
|---------|---------------|----------|
| Get user settings | PK = DEVICE#{id}, SK = SETTINGS | Load preferences |
| List user sessions | PK = DEVICE#{id}, SK begins_with SESSION# | History page |
| Get session detail | GSI1PK = SESSION#{id} | Script/Analysis page |
| Get session messages | GSI1PK = SESSION#{id}, GSI1SK begins_with MSG# | Load conversation |

---

### 7. Amazon S3 (Audio)

| Property | Value |
|----------|-------|
| Bucket Name | `eng-learning-audio` |
| Region | us-east-1 |
| Purpose | Temporary audio storage for STT |

**Lifecycle:**
- Audio files are uploaded for Transcribe processing
- Deleted immediately after transcription completes
- No long-term storage

---

### 8. Amazon CloudFront (CDN)

| Property | Value |
|----------|-------|
| Distribution ID | `E2EPS9DBLFD0FM` |
| Domain | `d3pw62uy753kuv.cloudfront.net` |
| Origin | S3 (`eng-call`) |
| Status | Deployed |

**Features:**
- Global edge locations for low latency
- HTTPS by default
- Automatic Gzip compression
- Cache invalidation support

---

### 9. Amazon S3 (Static Website)

| Property | Value |
|----------|-------|
| Bucket Name | `eng-call` |
| Region | ap-northeast-2 (Seoul) |
| Purpose | Frontend static hosting |

**Contents:**
```
eng-call/
├── index.html
├── vite.svg
└── assets/
    ├── index-*.js
    └── index-*.css
```

**Deployment Commands:**
```bash
# Build and deploy
npm run build
aws s3 sync dist/ s3://eng-call --delete --region ap-northeast-2

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E2EPS9DBLFD0FM --paths "/*"
```

---

## IAM Policy

The Lambda function requires the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["polly:SynthesizeSpeech"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob",
        "transcribe:DeleteTranscriptionJob"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::eng-learning-audio/*"
    },
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
  ]
}
```

---

## Deployment

### Prerequisites
- AWS CLI configured with appropriate credentials
- Python 3.11
- zip utility

### Deploy Lambda Function

```bash
# 1. Package the function
cd backend
zip function.zip lambda_function.py

# 2. Update Lambda function
aws lambda update-function-code \
  --function-name eng-learning-api \
  --zip-file fileb://function.zip \
  --region us-east-1
```

### Create DynamoDB Table

```bash
# Run the setup script
chmod +x setup_dynamodb.sh
./setup_dynamodb.sh
```

### Create S3 Bucket

```bash
aws s3 mb s3://eng-learning-audio --region us-east-1
```

---

## Cost Estimation

### Free Tier Eligible (12 months)

| Service | Free Tier Limit | Typical Usage |
|---------|-----------------|---------------|
| Lambda | 1M requests/month | ~10K requests |
| API Gateway | 1M calls/month | ~10K calls |
| DynamoDB | 25 GB + 25 WCU/RCU | < 1 GB |
| S3 | 5 GB storage | < 100 MB |
| Polly | 5M characters/month | ~500K chars |
| Transcribe | 60 minutes/month | ~30 minutes |

### Pay-as-you-go (after Free Tier)

| Service | Unit | Price (us-east-1) |
|---------|------|-------------------|
| Bedrock (Claude Haiku) | 1M input tokens | $0.25 |
| Bedrock (Claude Haiku) | 1M output tokens | $1.25 |
| Polly (Neural) | 1M characters | $16.00 |
| Transcribe | per minute | $0.024 |

---

## Monitoring

### CloudWatch Logs

Lambda logs are automatically sent to CloudWatch:
- Log Group: `/aws/lambda/eng-learning-api`
- Log retention: 7 days (recommended)

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| Lambda Duration | > 30s | Optimize code |
| Lambda Errors | > 1% | Check logs |
| DynamoDB Throttling | Any | Increase capacity |
| API Gateway 5XX | > 0.1% | Investigate Lambda |

---

## Security Considerations

1. **API Gateway**: No authentication (MVP). Consider adding API keys or Cognito for production.
2. **DynamoDB**: Device-based isolation using PK pattern. Not suitable for multi-tenant production.
3. **S3**: Audio files are temporary and deleted after processing.
4. **CORS**: Currently allows all origins (`*`). Restrict for production.

---

## Future Improvements

1. **Authentication**: Add Amazon Cognito for user authentication
2. **Caching**: Add ElastiCache for frequent queries
3. **Multi-region**: Deploy to multiple regions for lower latency
4. **Monitoring**: Add X-Ray for distributed tracing
5. **CI/CD**: Set up CodePipeline for automated deployments
6. **Custom Domain**: Connect custom domain with Route 53 + ACM

---

## References

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Amazon Polly Documentation](https://docs.aws.amazon.com/polly/)
- [Amazon Transcribe Documentation](https://docs.aws.amazon.com/transcribe/)
- [Amazon DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)

---

*Last Updated: 2026-01-13*
