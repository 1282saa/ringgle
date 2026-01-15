# Database Schema & ERD Documentation

## Overview

Ringle AI English Learning MVP uses **Amazon DynamoDB** as its primary database. This document describes the data model, entity relationships, access patterns, and schema design.

---

## Table of Contents

1. [Database Configuration](#database-configuration)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Data Model](#data-model)
4. [Key Schema](#key-schema)
5. [Entity Definitions](#entity-definitions)
6. [Access Patterns](#access-patterns)
7. [Sample Data](#sample-data)
8. [Query Examples](#query-examples)

---

## Database Configuration

| Property | Value |
|----------|-------|
| Database | Amazon DynamoDB |
| Table Name | `eng-learning-conversations` |
| Region | us-east-1 |
| Billing Mode | Provisioned (5 RCU / 5 WCU) |
| TTL Attribute | `ttl` (90 days auto-delete) |

---

## Entity Relationship Diagram

### Conceptual ERD

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONCEPTUAL DATA MODEL                             │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   DEVICE    │
                              │  (User ID)  │
                              └──────┬──────┘
                                     │
                                     │ 1:1
                                     │
                              ┌──────▼──────┐
                              │  SETTINGS   │
                              │ (Preferences│
                              └─────────────┘
                                     │
                                     │ 1:N
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
             ┌───────────┐    ┌───────────┐    ┌───────────┐
             │  SESSION  │    │  SESSION  │    │  SESSION  │
             │    #1     │    │    #2     │    │    #3     │
             └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
                   │                │                │
                   │ 1:N            │ 1:N            │ 1:N
                   │                │                │
          ┌────────┼────────┐      ...              ...
          │        │        │
          ▼        ▼        ▼
       ┌─────┐  ┌─────┐  ┌─────┐
       │MSG 1│  │MSG 2│  │MSG 3│
       └─────┘  └─────┘  └─────┘
```

### DynamoDB Single-Table Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SINGLE TABLE DESIGN (DynamoDB)                       │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                    eng-learning-conversations                          │
├───────────────────┬───────────────────────────────────────────────────┤
│        PK         │                      SK                            │
├───────────────────┼───────────────────────────────────────────────────┤
│                   │                                                    │
│ DEVICE#abc123     │ SETTINGS                                          │
│                   │  └── User preferences (accent, gender, level...)  │
│                   │                                                    │
├───────────────────┼───────────────────────────────────────────────────┤
│                   │                                                    │
│ DEVICE#abc123     │ SESSION#2026-01-13T10:00:00Z#uuid-1234#META       │
│                   │  └── Session metadata (tutor, duration, stats...) │
│                   │                                                    │
│ DEVICE#abc123     │ SESSION#uuid-1234#MSG#2026-01-13T10:00:01Z        │
│                   │  └── Message 1 (AI greeting)                      │
│                   │                                                    │
│ DEVICE#abc123     │ SESSION#uuid-1234#MSG#2026-01-13T10:00:15Z        │
│                   │  └── Message 2 (User response)                    │
│                   │                                                    │
│ DEVICE#abc123     │ SESSION#uuid-1234#MSG#2026-01-13T10:00:20Z        │
│                   │  └── Message 3 (AI response)                      │
│                   │                                                    │
├───────────────────┼───────────────────────────────────────────────────┤
│                   │                                                    │
│ DEVICE#abc123     │ SESSION#2026-01-12T15:30:00Z#uuid-5678#META       │
│                   │  └── Another session...                           │
│                   │                                                    │
└───────────────────┴───────────────────────────────────────────────────┘
```

### GSI1 - Session Lookup Index

```
┌───────────────────────────────────────────────────────────────────────┐
│                         GSI1 (Global Secondary Index)                  │
├───────────────────┬───────────────────────────────────────────────────┤
│      GSI1PK       │                    GSI1SK                          │
├───────────────────┼───────────────────────────────────────────────────┤
│                   │                                                    │
│ SESSION#uuid-1234 │ META                                              │
│                   │  └── Session metadata                             │
│                   │                                                    │
│ SESSION#uuid-1234 │ MSG#2026-01-13T10:00:01Z                          │
│                   │  └── Message 1                                    │
│                   │                                                    │
│ SESSION#uuid-1234 │ MSG#2026-01-13T10:00:15Z                          │
│                   │  └── Message 2                                    │
│                   │                                                    │
│ SESSION#uuid-1234 │ MSG#2026-01-13T10:00:20Z                          │
│                   │  └── Message 3                                    │
│                   │                                                    │
└───────────────────┴───────────────────────────────────────────────────┘
```

---

## Data Model

### Visual Schema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ENTITY SCHEMA                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            USER_SETTINGS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ PK              │ DEVICE#{deviceId}                                     │
│ SK              │ SETTINGS                                              │
├─────────────────┼───────────────────────────────────────────────────────┤
│ type            │ "USER_SETTINGS"                                       │
│ deviceId        │ string (UUID)                                         │
│ settings        │ {                                                     │
│                 │   accent: "us" | "uk" | "au" | "in",                  │
│                 │   gender: "female" | "male",                          │
│                 │   level: "beginner" | "intermediate" | "advanced",    │
│                 │   topic: "business" | "daily" | "travel" | "interview"│
│                 │   speed: "slow" | "normal" | "fast",                  │
│                 │   tutorName: string                                   │
│                 │ }                                                     │
│ createdAt       │ ISO 8601 timestamp                                    │
│ updatedAt       │ ISO 8601 timestamp                                    │
│ ttl             │ Unix timestamp (90 days from now)                     │
└─────────────────┴───────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            SESSION_META                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ PK              │ DEVICE#{deviceId}                                     │
│ SK              │ SESSION#{startedAt}#{sessionId}#META                  │
│ GSI1PK          │ SESSION#{sessionId}                                   │
│ GSI1SK          │ META                                                  │
├─────────────────┼───────────────────────────────────────────────────────┤
│ type            │ "SESSION_META"                                        │
│ deviceId        │ string (UUID)                                         │
│ sessionId       │ string (UUID)                                         │
│ tutorName       │ string ("Gwen", "James", etc.)                        │
│ topic           │ "business" | "daily" | "travel" | "interview"         │
│ accent          │ "us" | "uk" | "au" | "in"                             │
│ level           │ "beginner" | "intermediate" | "advanced"              │
│ gender          │ "female" | "male"                                     │
│ settings        │ { full settings object }                              │
│ startedAt       │ ISO 8601 timestamp                                    │
│ endedAt         │ ISO 8601 timestamp | null                             │
│ duration        │ number (seconds)                                      │
│ turnCount       │ number                                                │
│ wordCount       │ number                                                │
│ status          │ "active" | "completed"                                │
│ createdAt       │ ISO 8601 timestamp                                    │
│ ttl             │ Unix timestamp (90 days from now)                     │
└─────────────────┴───────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              MESSAGE                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ PK              │ DEVICE#{deviceId}                                     │
│ SK              │ SESSION#{sessionId}#MSG#{timestamp}                   │
│ GSI1PK          │ SESSION#{sessionId}                                   │
│ GSI1SK          │ MSG#{timestamp}                                       │
├─────────────────┼───────────────────────────────────────────────────────┤
│ type            │ "MESSAGE"                                             │
│ deviceId        │ string (UUID)                                         │
│ sessionId       │ string (UUID)                                         │
│ role            │ "user" | "assistant"                                  │
│ content         │ string (message text)                                 │
│ translation     │ string | null (Korean translation)                    │
│ turnNumber      │ number                                                │
│ timestamp       │ ISO 8601 timestamp                                    │
│ createdAt       │ ISO 8601 timestamp                                    │
│ ttl             │ Unix timestamp (90 days from now)                     │
└─────────────────┴───────────────────────────────────────────────────────┘
```

---

## Key Schema

### Primary Key Design

| Entity | PK Pattern | SK Pattern |
|--------|------------|------------|
| Settings | `DEVICE#{deviceId}` | `SETTINGS` |
| Session | `DEVICE#{deviceId}` | `SESSION#{startedAt}#{sessionId}#META` |
| Message | `DEVICE#{deviceId}` | `SESSION#{sessionId}#MSG#{timestamp}` |

### GSI1 Design

| Entity | GSI1PK Pattern | GSI1SK Pattern |
|--------|----------------|----------------|
| Session | `SESSION#{sessionId}` | `META` |
| Message | `SESSION#{sessionId}` | `MSG#{timestamp}` |

### Key Design Rationale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KEY DESIGN DECISIONS                             │
└─────────────────────────────────────────────────────────────────────────┘

1. PK = DEVICE#{deviceId}
   ├── All user data partitioned by device
   ├── Enables efficient "get all data for user" queries
   └── Device ID = UUID stored in localStorage (anonymous users)

2. SK = SESSION#{startedAt}#{sessionId}#META
   ├── startedAt first → natural sorting by date (newest first)
   ├── sessionId for uniqueness
   └── #META suffix distinguishes from messages

3. GSI1PK = SESSION#{sessionId}
   ├── Enables direct session lookup by ID
   └── Groups all messages with their session metadata

4. TTL = 90 days
   ├── Auto-cleanup of old data
   ├── Reduces storage costs
   └── GDPR-friendly data retention
```

---

## Entity Definitions

### 1. USER_SETTINGS

Stores user preferences for the AI tutor.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | Yes | `DEVICE#{deviceId}` |
| SK | String | Yes | `SETTINGS` |
| type | String | Yes | `"USER_SETTINGS"` |
| deviceId | String | Yes | Device UUID |
| settings | Map | Yes | User preferences object |
| settings.accent | String | No | `us`, `uk`, `au`, `in` |
| settings.gender | String | No | `female`, `male` |
| settings.level | String | No | `beginner`, `intermediate`, `advanced` |
| settings.topic | String | No | `business`, `daily`, `travel`, `interview` |
| settings.speed | String | No | `slow`, `normal`, `fast` |
| settings.tutorName | String | No | Tutor display name |
| createdAt | String | Yes | ISO 8601 timestamp |
| updatedAt | String | Yes | ISO 8601 timestamp |
| ttl | Number | Yes | Unix timestamp for auto-delete |

### 2. SESSION_META

Stores metadata for each conversation session.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | Yes | `DEVICE#{deviceId}` |
| SK | String | Yes | `SESSION#{startedAt}#{sessionId}#META` |
| GSI1PK | String | Yes | `SESSION#{sessionId}` |
| GSI1SK | String | Yes | `META` |
| type | String | Yes | `"SESSION_META"` |
| deviceId | String | Yes | Device UUID |
| sessionId | String | Yes | Session UUID |
| tutorName | String | Yes | AI tutor name |
| topic | String | Yes | Conversation topic |
| accent | String | Yes | Tutor accent |
| level | String | Yes | Difficulty level |
| gender | String | Yes | Tutor gender |
| settings | Map | No | Full settings snapshot |
| startedAt | String | Yes | Session start time |
| endedAt | String | No | Session end time (null if active) |
| duration | Number | Yes | Call duration in seconds |
| turnCount | Number | Yes | Number of conversation turns |
| wordCount | Number | Yes | Total words spoken by user |
| status | String | Yes | `active` or `completed` |
| createdAt | String | Yes | ISO 8601 timestamp |
| ttl | Number | Yes | Unix timestamp for auto-delete |

### 3. MESSAGE

Stores individual conversation messages.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | Yes | `DEVICE#{deviceId}` |
| SK | String | Yes | `SESSION#{sessionId}#MSG#{timestamp}` |
| GSI1PK | String | Yes | `SESSION#{sessionId}` |
| GSI1SK | String | Yes | `MSG#{timestamp}` |
| type | String | Yes | `"MESSAGE"` |
| deviceId | String | Yes | Device UUID |
| sessionId | String | Yes | Session UUID |
| role | String | Yes | `user` or `assistant` |
| content | String | Yes | Message text |
| translation | String | No | Korean translation |
| turnNumber | Number | Yes | Turn sequence number |
| timestamp | String | Yes | Message timestamp |
| createdAt | String | Yes | ISO 8601 timestamp |
| ttl | Number | Yes | Unix timestamp for auto-delete |

---

## Access Patterns

### Access Pattern Matrix

| Access Pattern | Operation | Key Condition | Index |
|----------------|-----------|---------------|-------|
| Get user settings | GetItem | PK=`DEVICE#X`, SK=`SETTINGS` | Table |
| Save user settings | PutItem | PK=`DEVICE#X`, SK=`SETTINGS` | Table |
| List user sessions | Query | PK=`DEVICE#X`, SK begins_with `SESSION#` | Table |
| Get session by ID | Query | GSI1PK=`SESSION#X` | GSI1 |
| Get session messages | Query | GSI1PK=`SESSION#X`, GSI1SK begins_with `MSG#` | GSI1 |
| Get session + messages | Query | GSI1PK=`SESSION#X` | GSI1 |
| Delete session | BatchWrite | Multiple keys from GSI1 query | Table |

### Access Pattern Diagrams

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ACCESS PATTERNS                                  │
└─────────────────────────────────────────────────────────────────────────┘

1. GET USER SETTINGS
   ┌────────────┐
   │  Client    │─── GetItem ───> PK: DEVICE#abc123
   │            │                 SK: SETTINGS
   └────────────┘
                                  └──> Returns: USER_SETTINGS item

2. LIST USER SESSIONS (sorted by date, newest first)
   ┌────────────┐
   │  Client    │─── Query ────> PK: DEVICE#abc123
   │            │                SK: begins_with("SESSION#")
   └────────────┘                Filter: type = "SESSION_META"
                                 ScanIndexForward: false

                                  └──> Returns: [SESSION_META, SESSION_META, ...]

3. GET SESSION DETAIL (metadata + all messages)
   ┌────────────┐
   │  Client    │─── Query ────> GSI1PK: SESSION#uuid-1234
   │            │                (no SK condition = get all)
   └────────────┘
                                  └──> Returns: [SESSION_META, MESSAGE, MESSAGE, ...]

4. SAVE NEW MESSAGE
   ┌────────────┐
   │  Client    │─── PutItem ──> PK: DEVICE#abc123
   │            │                SK: SESSION#uuid-1234#MSG#2026-01-13T...
   └────────────┘                GSI1PK: SESSION#uuid-1234
                                 GSI1SK: MSG#2026-01-13T...

5. DELETE SESSION (cascade)
   ┌────────────┐
   │  Client    │─── Query ────> GSI1PK: SESSION#uuid-1234
   │            │                (get all items for session)
   │            │
   │            │─── BatchWrite ─> Delete each item by PK/SK
   └────────────┘
```

---

## Sample Data

### Example: User Settings

```json
{
  "PK": "DEVICE#a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "SK": "SETTINGS",
  "type": "USER_SETTINGS",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "settings": {
    "accent": "us",
    "gender": "female",
    "level": "intermediate",
    "topic": "business",
    "speed": "normal",
    "tutorName": "Gwen"
  },
  "createdAt": "2026-01-10T08:30:00.000Z",
  "updatedAt": "2026-01-13T10:00:00.000Z",
  "ttl": 1744531200
}
```

### Example: Session Metadata

```json
{
  "PK": "DEVICE#a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "SK": "SESSION#2026-01-13T10:00:00.000Z#f8e7d6c5-b4a3-2190-fedc-ba0987654321#META",
  "GSI1PK": "SESSION#f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "GSI1SK": "META",
  "type": "SESSION_META",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "tutorName": "Gwen",
  "topic": "business",
  "accent": "us",
  "level": "intermediate",
  "gender": "female",
  "settings": {
    "accent": "us",
    "gender": "female",
    "level": "intermediate",
    "topic": "business"
  },
  "startedAt": "2026-01-13T10:00:00.000Z",
  "endedAt": "2026-01-13T10:05:30.000Z",
  "duration": 330,
  "turnCount": 8,
  "wordCount": 156,
  "status": "completed",
  "createdAt": "2026-01-13T10:00:00.000Z",
  "ttl": 1744531200
}
```

### Example: Message (AI)

```json
{
  "PK": "DEVICE#a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "SK": "SESSION#f8e7d6c5-b4a3-2190-fedc-ba0987654321#MSG#2026-01-13T10:00:01.000Z",
  "GSI1PK": "SESSION#f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "GSI1SK": "MSG#2026-01-13T10:00:01.000Z",
  "type": "MESSAGE",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "role": "assistant",
  "content": "Hello! I'm Gwen, your English tutor. How's your day going so far?",
  "translation": null,
  "turnNumber": 0,
  "timestamp": "2026-01-13T10:00:01.000Z",
  "createdAt": "2026-01-13T10:00:01.000Z",
  "ttl": 1744531200
}
```

### Example: Message (User)

```json
{
  "PK": "DEVICE#a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "SK": "SESSION#f8e7d6c5-b4a3-2190-fedc-ba0987654321#MSG#2026-01-13T10:00:15.000Z",
  "GSI1PK": "SESSION#f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "GSI1SK": "MSG#2026-01-13T10:00:15.000Z",
  "type": "MESSAGE",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sessionId": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "role": "user",
  "content": "Hi Gwen! I'm doing great. I just had a meeting with my team.",
  "translation": "안녕 그웬! 잘 지내고 있어. 방금 팀 미팅을 했어.",
  "turnNumber": 1,
  "timestamp": "2026-01-13T10:00:15.000Z",
  "createdAt": "2026-01-13T10:00:15.000Z",
  "ttl": 1744531200
}
```

---

## Query Examples

### Python (Lambda)

```python
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('eng-learning-conversations')

# 1. Get user settings
def get_settings(device_id):
    response = table.get_item(
        Key={
            'PK': f'DEVICE#{device_id}',
            'SK': 'SETTINGS'
        }
    )
    return response.get('Item')

# 2. List user sessions (newest first)
def get_sessions(device_id, limit=10):
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f'DEVICE#{device_id}') &
                               Key('SK').begins_with('SESSION#'),
        FilterExpression='#type = :type_meta',
        ExpressionAttributeNames={'#type': 'type'},
        ExpressionAttributeValues={':type_meta': 'SESSION_META'},
        ScanIndexForward=False,  # Newest first
        Limit=limit
    )
    return response.get('Items', [])

# 3. Get session detail with messages
def get_session_detail(session_id):
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1PK').eq(f'SESSION#{session_id}')
    )

    items = response.get('Items', [])
    session_meta = None
    messages = []

    for item in items:
        if item.get('type') == 'SESSION_META':
            session_meta = item
        elif item.get('type') == 'MESSAGE':
            messages.append(item)

    messages.sort(key=lambda x: x.get('turnNumber', 0))
    return {'session': session_meta, 'messages': messages}

# 4. Delete session (cascade)
def delete_session(device_id, session_id):
    # Get all items for session
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1PK').eq(f'SESSION#{session_id}')
    )

    items = response.get('Items', [])

    # Verify ownership
    meta = next((i for i in items if i.get('type') == 'SESSION_META'), None)
    if meta and meta.get('deviceId') != device_id:
        raise Exception('Access denied')

    # Batch delete
    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(Key={'PK': item['PK'], 'SK': item['SK']})

    return len(items)
```

### JavaScript (Frontend)

```javascript
// Using api.js functions

import {
  getSettingsFromServer,
  saveSettingsToServer,
  getSessions,
  getSessionDetail,
  deleteSession
} from './utils/api'
import { getDeviceId } from './utils/helpers'

const deviceId = getDeviceId()

// 1. Get user settings
const { settings } = await getSettingsFromServer(deviceId)

// 2. Save user settings
await saveSettingsToServer(deviceId, {
  accent: 'uk',
  gender: 'male',
  level: 'advanced'
})

// 3. List sessions
const { sessions, hasMore } = await getSessions(deviceId, 10)

// 4. Get session detail
const { session, messages } = await getSessionDetail(deviceId, sessionId)

// 5. Delete session
await deleteSession(deviceId, sessionId)
```

---

## Data Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LIFECYCLE                                   │
└─────────────────────────────────────────────────────────────────────────┘

Day 0                    Day 90                   Day 90+
─────                    ──────                   ───────

┌─────────┐
│ Session │
│ Created │
└────┬────┘
     │
     │  Write to DynamoDB
     │  TTL = now + 90 days
     ▼
┌─────────┐              ┌─────────┐              ┌─────────┐
│ Active  │──────────────│ Stored  │──────────────│ Deleted │
│ Session │  endSession  │  Data   │   TTL        │  (auto) │
└─────────┘              └─────────┘   expires    └─────────┘

                         │
                         │ User can:
                         │ - View sessions
                         │ - View messages
                         │ - Delete manually
                         │
                         ▼
```

---

## Capacity Planning

### Estimated Item Sizes

| Entity | Avg Size | Items/Session |
|--------|----------|---------------|
| USER_SETTINGS | ~500 bytes | 1 per device |
| SESSION_META | ~800 bytes | 1 per session |
| MESSAGE | ~300 bytes | 10-20 per session |

### Monthly Estimates (1000 users, 10 sessions/user)

| Metric | Calculation | Value |
|--------|-------------|-------|
| Sessions | 1000 × 10 | 10,000 |
| Messages | 10,000 × 15 | 150,000 |
| Storage | 10K × 800B + 150K × 300B | ~53 MB |
| Write ops | 10K + 150K | ~160,000 WCU |
| Read ops | ~500K queries | ~500,000 RCU |

### Free Tier Coverage

| Resource | Free Tier | Estimated Usage | Status |
|----------|-----------|-----------------|--------|
| Storage | 25 GB | 53 MB | ✅ OK |
| WCU | 25 | 5 | ✅ OK |
| RCU | 25 | 5 | ✅ OK |

---

## Client-Side Storage (localStorage)

In addition to DynamoDB, the app uses browser localStorage for client-side data persistence.

### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `deviceId` | String (UUID) | Unique device identifier, auto-generated |
| `tutorSettings` | JSON Object | User's tutor preferences (synced to DynamoDB) |
| `lastCallResult` | JSON Object | Most recent call result for Result page |
| `callHistory` | JSON Array | Local call history (fallback when DB unavailable) |
| `lastFeedback` | JSON Object | Cached analysis feedback |

### localStorage Schema

```javascript
// deviceId
"a1b2c3d4-e5f6-7890-abcd-ef1234567890"

// tutorSettings
{
  "accent": "us",
  "gender": "female",
  "level": "intermediate",
  "topic": "business",
  "speed": "normal",
  "tutorName": "Gwen"
}

// lastCallResult
{
  "duration": 330,
  "messages": [...],
  "date": "2026-01-13T10:05:30.000Z",
  "turnCount": 8,
  "wordCount": 156,
  "tutorName": "Gwen",
  "sessionId": "uuid-1234"
}

// callHistory (array, max 50 items)
[
  {
    "id": 1736758530000,
    "sessionId": "uuid-1234",
    "timestamp": "2026-01-13T10:05:30.000Z",
    "date": "2026. 01. 13.",
    "fullDate": "2026. 01. 13. 오전 10:05",
    "duration": "5:30",
    "durationSeconds": 330,
    "words": 156,
    "turnCount": 8,
    "tutorName": "Gwen"
  },
  ...
]
```

### Data Sync Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLIENT ↔ SERVER DATA SYNC                             │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐                    ┌──────────────────────┐
│    localStorage      │                    │      DynamoDB        │
├──────────────────────┤                    ├──────────────────────┤
│                      │                    │                      │
│  tutorSettings ──────│── save_settings ──>│── USER_SETTINGS     │
│                      │<─ get_settings ────│                      │
│                      │                    │                      │
│  callHistory ────────│── (fallback) ─────>│                      │
│  (local backup)      │<─ get_sessions ────│── SESSION_META      │
│                      │                    │                      │
│  lastCallResult ─────│── start/end ──────>│── SESSION_META      │
│                      │   save_message ───>│── MESSAGE           │
│                      │                    │                      │
│  deviceId ───────────│── (all requests) ─>│── PK identifier     │
│                      │                    │                      │
└──────────────────────┘                    └──────────────────────┘

Priority: DynamoDB > localStorage (DB is source of truth)
Fallback: If DB unavailable, use localStorage
```

---

## Analysis Data (Not Persisted)

**Important:** Conversation analysis results are **NOT stored** in DynamoDB.

### Analysis Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ANALYSIS DATA FLOW                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Request  │────>│  Lambda  │────>│ Bedrock  │────>│ Response │
│ analyze  │     │          │     │ (Claude) │     │ (JSON)   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                                                         │ NOT saved to DB
                                                         │ (computed on-demand)
                                                         ▼
                                                   ┌──────────┐
                                                   │  Client  │
                                                   │ displays │
                                                   └──────────┘
```

### Why Not Persisted?

1. **On-demand computation** - Analysis is generated when user requests it
2. **Storage cost** - Analysis JSON can be large (~2-5KB per session)
3. **Freshness** - AI analysis can improve over time with model updates
4. **TTL concerns** - Would need separate TTL management

### Future Consideration

If analysis caching is needed, the schema would be:

```
PK: DEVICE#{deviceId}
SK: SESSION#{sessionId}#ANALYSIS
GSI1PK: SESSION#{sessionId}
GSI1SK: ANALYSIS
type: SESSION_ANALYSIS
analysisData: { cafp_scores, fillers, grammar_corrections, ... }
analyzedAt: ISO 8601 timestamp
```

---

## Best Practices

### Do's

1. **Always include TTL** - Prevents unbounded data growth
2. **Use GSI1 for session lookups** - Avoids scanning
3. **Batch writes for delete** - More efficient
4. **Validate deviceId** - Prevent cross-user access
5. **Sort by timestamp** - Natural ordering

### Don'ts

1. **Don't scan the table** - Always use Query with key conditions
2. **Don't store large blobs** - Audio goes to S3, not DynamoDB
3. **Don't forget GSI updates** - Always include GSI1PK/GSI1SK
4. **Don't hardcode table name** - Use constants

---

*Last Updated: 2026-01-13*
