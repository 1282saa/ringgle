# Phase 6: Settings Backend Integration

**Timeline:** 2026-01-12
**Status:** Completed
**Branch:** `feature/backend/custom`
**Impact:** User settings now persist on server, enabling cross-device synchronization

---

## Overview

Implemented backend API for saving and retrieving user tutor settings. Previously, settings were only stored in localStorage (browser/device specific). Now settings are synchronized with AWS DynamoDB, allowing users to access their preferences across different devices.

**Impact**: Users can now maintain consistent tutor preferences across devices and sessions.

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Settings.jsx   │ ──▶ │   Lambda API     │ ──▶ │   DynamoDB       │
│   (Frontend)     │ ◀── │   (Backend)      │ ◀── │   (Database)     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │
         ▼
   localStorage
   (Offline Backup)
```

### Data Flow

**Load Settings (Page Open):**
1. Frontend calls `getSettingsFromServer(deviceId)`
2. Lambda queries DynamoDB with `PK: DEVICE#{deviceId}, SK: SETTINGS`
3. If found, return settings; otherwise return null
4. Frontend applies server settings or falls back to localStorage

**Save Settings (User Action):**
1. User clicks "Save" button
2. Frontend saves to localStorage immediately (offline-first)
3. Frontend calls `saveSettingsToServer(deviceId, settings)`
4. Lambda upserts to DynamoDB with TTL (90 days)

---

## Backend Implementation

### File: `backend/lambda_function.py`

#### New Dependencies

```python
from datetime import datetime, timedelta

# DynamoDB client
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# Constants
DYNAMODB_TABLE = 'eng-learning-conversations'
TTL_DAYS = 90
```

#### Helper Functions

```python
def get_table():
    """DynamoDB 테이블 객체 반환"""
    return dynamodb.Table(DYNAMODB_TABLE)

def get_ttl():
    """TTL 타임스탬프 계산 (90일 후)"""
    return int((datetime.utcnow() + timedelta(days=TTL_DAYS)).timestamp())
```

#### API Router Update

```python
# lambda_handler 내부
if action == 'save_settings':
    return handle_save_settings(body, headers)
elif action == 'get_settings':
    return handle_get_settings(body, headers)
```

#### save_settings Handler

```python
def handle_save_settings(body, headers):
    """
    사용자 맞춤설정 저장

    Request:
        deviceId: 디바이스 UUID
        settings: 튜터 설정 객체
            - tutorId: 튜터 ID
            - tutorName: 튜터 이름
            - accent: 억양 (us, uk, au, in)
            - gender: 성별 (male, female)
            - speed: 속도 (slow, normal, fast)
            - level: 난이도 (beginner, intermediate, advanced)
            - duration: 통화 시간 (5, 10)

    Response:
        success: boolean
        settings: 저장된 설정
        updatedAt: ISO timestamp
    """
    device_id = body.get('deviceId')
    settings = body.get('settings', {})

    if not device_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'deviceId is required'})
        }

    try:
        table = get_table()
        now = datetime.utcnow().isoformat() + 'Z'

        item = {
            'PK': f'DEVICE#{device_id}',
            'SK': 'SETTINGS',
            'type': 'USER_SETTINGS',
            'deviceId': device_id,
            'settings': settings,
            'updatedAt': now,
            'createdAt': now,
            'ttl': get_ttl()
        }

        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'settings': settings,
                'updatedAt': now
            })
        }

    except Exception as e:
        print(f"Save settings error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
```

#### get_settings Handler

```python
def handle_get_settings(body, headers):
    """
    사용자 맞춤설정 조회

    Request:
        deviceId: 디바이스 UUID

    Response:
        success: boolean
        settings: 설정 객체 (없으면 null)
        updatedAt: 마지막 업데이트 시간
    """
    device_id = body.get('deviceId')

    if not device_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'deviceId is required'})
        }

    try:
        table = get_table()

        response = table.get_item(
            Key={
                'PK': f'DEVICE#{device_id}',
                'SK': 'SETTINGS'
            }
        )

        item = response.get('Item')

        if item:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'settings': item.get('settings', {}),
                    'updatedAt': item.get('updatedAt')
                })
            }
        else:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'settings': None,
                    'message': 'No settings found for this device'
                })
            }

    except Exception as e:
        print(f"Get settings error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
```

---

## Frontend Implementation

### File: `src/utils/api.js`

#### New API Functions

```javascript
/**
 * 사용자 맞춤설정을 서버에 저장
 */
export async function saveSettingsToServer(deviceId, settings) {
  return apiRequest(
    {
      action: 'save_settings',
      deviceId,
      settings,
    },
    'SaveSettings'
  )
}

/**
 * 서버에서 사용자 맞춤설정 조회
 */
export async function getSettingsFromServer(deviceId) {
  return apiRequest(
    {
      action: 'get_settings',
      deviceId,
    },
    'GetSettings'
  )
}
```

### File: `src/pages/Settings.jsx`

#### Import Updates

```javascript
import { getDeviceId } from '../utils/helpers'
import { saveSettingsToServer, getSettingsFromServer } from '../utils/api'
```

#### State Updates

```javascript
const [isSaving, setIsSaving] = useState(false)
const [isLoading, setIsLoading] = useState(true)
```

#### Load Settings (useEffect)

```javascript
useEffect(() => {
  const loadSettings = async () => {
    setIsLoading(true)
    let saved = {}

    try {
      const deviceId = getDeviceId()
      const response = await getSettingsFromServer(deviceId)

      if (response.success && response.settings) {
        // 서버에서 로드 성공
        saved = response.settings
        // 로컬스토리지 동기화
        localStorage.setItem('tutorSettings', JSON.stringify(saved))
        console.log('[Settings] Loaded from server')
      } else {
        // 서버에 설정 없음 - 로컬에서 로드
        saved = JSON.parse(localStorage.getItem('tutorSettings') || '{}')
      }
    } catch (error) {
      console.warn('[Settings] Failed to load from server:', error)
      // 로컬에서 로드
      saved = JSON.parse(localStorage.getItem('tutorSettings') || '{}')
    }

    // 설정 적용
    if (saved.tutorId) setSelectedTutor(saved.tutorId)
    if (saved.level) setLevel(saved.level)
    if (saved.speed) setSpeed(saved.speed)
    if (saved.duration) setDuration(saved.duration)

    setIsLoading(false)
  }

  loadSettings()
}, [])
```

#### Save Settings (handleSave)

```javascript
const handleSave = async () => {
  if (isSaving) return

  setIsSaving(true)
  const tutor = TUTORS.find(t => t.id === selectedTutor)
  const settings = {
    tutorId: selectedTutor,
    tutorName: tutor?.name || 'Gwen',
    accent: tutor?.accent || 'us',
    gender: tutor?.gender || 'female',
    level,
    speed,
    duration,
  }

  // 로컬스토리지에 먼저 저장
  localStorage.setItem('tutorSettings', JSON.stringify(settings))

  // 서버에 비동기 저장 (실패해도 로컬은 저장됨)
  try {
    const deviceId = getDeviceId()
    await saveSettingsToServer(deviceId, settings)
    console.log('[Settings] Saved to server successfully')
  } catch (error) {
    console.warn('[Settings] Failed to save to server:', error)
  } finally {
    setIsSaving(false)
    navigate(-1)
  }
}
```

#### UI Updates

```jsx
<button
  className="save-btn"
  onClick={handleSave}
  disabled={isSaving || isLoading}
>
  {isSaving ? '저장 중...' : '저장'}
</button>
```

---

## DynamoDB Schema

### Settings Item

| Attribute | Type | Description |
|-----------|------|-------------|
| `PK` | String | `DEVICE#{deviceId}` |
| `SK` | String | `SETTINGS` |
| `type` | String | `USER_SETTINGS` |
| `deviceId` | String | Device UUID |
| `settings` | Map | Settings object |
| `updatedAt` | String | ISO timestamp |
| `createdAt` | String | ISO timestamp |
| `ttl` | Number | TTL epoch timestamp (90 days) |

### Settings Object Structure

```json
{
  "tutorId": "gwen",
  "tutorName": "Gwen",
  "accent": "us",
  "gender": "female",
  "level": "easy",
  "speed": "normal",
  "duration": "5"
}
```

---

## API Reference

### save_settings

**Request:**
```json
POST /prod/chat
{
  "action": "save_settings",
  "deviceId": "uuid-string",
  "settings": {
    "tutorId": "gwen",
    "tutorName": "Gwen",
    "accent": "us",
    "gender": "female",
    "level": "easy",
    "speed": "normal",
    "duration": "5"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "settings": { ... },
  "updatedAt": "2026-01-12T12:00:00.000Z"
}
```

**Response (Error):**
```json
{
  "error": "deviceId is required"
}
```

### get_settings

**Request:**
```json
POST /prod/chat
{
  "action": "get_settings",
  "deviceId": "uuid-string"
}
```

**Response (Found):**
```json
{
  "success": true,
  "settings": { ... },
  "updatedAt": "2026-01-12T12:00:00.000Z"
}
```

**Response (Not Found):**
```json
{
  "success": true,
  "settings": null,
  "message": "No settings found for this device"
}
```

---

## Files Changed

| File | Changes |
|------|---------|
| `backend/lambda_function.py` | +156 lines (DynamoDB setup, save/get handlers) |
| `src/utils/api.js` | +59 lines (saveSettingsToServer, getSettingsFromServer) |
| `src/pages/Settings.jsx` | Modified (async load/save, loading states) |

---

## Testing

### Manual Testing Steps

1. Open Settings page
2. Change tutor selection
3. Click Save button
4. Check browser console for `[Settings] Saved to server successfully`
5. Clear localStorage
6. Refresh page
7. Verify settings loaded from server

### API Testing (curl)

```bash
# Save settings
curl -X POST https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{
    "action": "save_settings",
    "deviceId": "test-device-123",
    "settings": {
      "tutorId": "james",
      "accent": "uk",
      "level": "intermediate"
    }
  }'

# Get settings
curl -X POST https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_settings",
    "deviceId": "test-device-123"
  }'
```

---

## Results

| Metric | Value |
|--------|-------|
| Backend APIs Added | 2 (save_settings, get_settings) |
| Frontend Functions Added | 2 (saveSettingsToServer, getSettingsFromServer) |
| Storage | DynamoDB + localStorage (hybrid) |
| TTL | 90 days |
| Offline Support | Yes (localStorage fallback) |

---

## Next Steps

- Add settings migration for existing users
- Implement settings sync conflict resolution
- Add settings export/import feature
- Consider adding more customization options

---

## References

- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [React useEffect](https://react.dev/reference/react/useEffect)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
