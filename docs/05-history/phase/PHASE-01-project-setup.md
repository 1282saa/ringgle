# Phase 1: Project Setup & Core Infrastructure

**Timeline:** 2026-01-12
**Status:** Completed
**Impact:** Foundation for AI English Learning Mobile App

---

## Overview

Established the foundational infrastructure for the Ringle AI English Learning MVP application. This phase includes setting up the React frontend with Vite, configuring Capacitor for cross-platform mobile deployment, and establishing the AWS Lambda backend with Claude AI integration.

**Impact**: Created a fully functional development environment capable of building and deploying to iOS, Android, and Web platforms with AI-powered conversation capabilities.

---

## Tech Stack Selection

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| Vite | 7.2.4 | Build Tool & Dev Server |
| React Router DOM | 7.12.0 | Client-side Routing |
| Framer Motion | 12.25.0 | Animations |
| Lucide React | 0.562.0 | Icon Library |
| Capacitor | 8.0.0 | Native Mobile Bridge |

### Backend
| Technology | Purpose |
|------------|---------|
| AWS Lambda | Serverless Functions |
| AWS API Gateway | REST API Endpoint |
| AWS Bedrock (Claude Haiku) | AI Conversation |
| Amazon Polly | Text-to-Speech |
| AWS Transcribe | Speech-to-Text |
| Python 3.11 | Lambda Runtime |

### Why These Choices?

**React 19 + Vite 7:**
- Latest React with improved performance
- Vite provides fastest HMR (Hot Module Replacement)
- Native ESM support for modern development

**Capacitor over React Native:**
- Single codebase for Web + iOS + Android
- Leverages existing React/Web skills
- Web Speech API works natively in WebView
- Easier maintenance for small team

**AWS Bedrock Claude Haiku:**
- 92% cheaper than Claude Opus
- Sub-second response times
- Sufficient for conversational English tutoring
- Native AWS integration (no API key management)

---

## Project Structure

```
eng-learning/
├── src/
│   ├── pages/
│   │   ├── Home.jsx        # Main screen with tutor card
│   │   ├── Call.jsx        # Voice conversation interface
│   │   ├── Result.jsx      # Post-call analysis & feedback
│   │   └── Settings.jsx    # Tutor customization
│   ├── utils/
│   │   └── api.js          # API client functions
│   ├── App.jsx             # Route definitions
│   ├── App.css             # Global styles
│   ├── index.css           # Base styles
│   └── main.jsx            # React entry point
├── backend/
│   ├── lambda_function.py  # Main Lambda handler
│   ├── policy.json         # IAM policy
│   └── trust-policy.json   # Lambda trust policy
├── android/                # Capacitor Android project
├── ios/                    # Capacitor iOS project
├── public/                 # Static assets
├── index.html              # HTML entry point
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
└── capacitor.config.json   # Capacitor configuration
```

---

## Implementation Details

### 1. Vite Configuration

**File:** `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

### 2. Capacitor Configuration

**File:** `capacitor.config.json`

```json
{
  "appId": "com.aienglish.call",
  "appName": "AI English Call",
  "webDir": "dist"
}
```

**Mobile Platform Setup:**
```bash
# Initialize Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init

# Add platforms
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios

# Build and sync
npm run build
npx cap sync
```

### 3. React Router Setup

**File:** `src/App.jsx`

```jsx
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Call from './pages/Call'
import Result from './pages/Result'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/call" element={<Call />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </div>
  )
}
```

### 4. AWS Lambda Handler Structure

**File:** `backend/lambda_function.py`

```python
def lambda_handler(event, context):
    """
    Main Lambda handler for AI English conversation
    Supports: chat, tts, stt, analyze actions
    """
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    body = json.loads(event.get('body', '{}'))
    action = body.get('action', 'chat')

    if action == 'chat':
        return handle_chat(body, headers)
    elif action == 'tts':
        return handle_tts(body, headers)
    elif action == 'stt':
        return handle_stt(body, headers)
    elif action == 'analyze':
        return handle_analyze(body, headers)
```

---

## API Endpoint

**Production URL:**
```
https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat
```

| Action | Method | Description |
|--------|--------|-------------|
| `chat` | POST | AI conversation with Claude Haiku |
| `tts` | POST | Text-to-Speech with Amazon Polly |
| `stt` | POST | Speech-to-Text with AWS Transcribe |
| `analyze` | POST | Conversation analysis (CAFP scores) |

---

## Dependencies

**File:** `package.json`

```json
{
  "name": "ringle-mvp",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@capacitor/android": "^8.0.0",
    "@capacitor/cli": "^8.0.0",
    "@capacitor/core": "^8.0.0",
    "@capacitor/ios": "^8.0.0",
    "framer-motion": "^12.25.0",
    "lucide-react": "^0.562.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.12.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.1.1",
    "vite": "^7.2.4",
    "eslint": "^9.39.1"
  }
}
```

---

## Verification

### Development Server
```bash
cd eng-learning
npm run dev
# Server running at http://localhost:5173
```

### Production Build
```bash
npm run build
# Output: dist/ directory

ls -la dist/
# index.html
# assets/
```

### Mobile Sync
```bash
npx cap sync
# Synced web assets to android/ and ios/
```

---

## Results

| Metric | Value |
|--------|-------|
| Setup Time | ~30 minutes |
| Bundle Size (gzip) | ~180KB |
| Dev Server Start | <1 second |
| Build Time | ~8 seconds |
| Platforms Supported | Web, iOS, Android |

---

## Next Steps

- Phase 2: Voice Conversation Feature Implementation
- Phase 3: AI Tutor Settings & Customization
- Phase 4: Call Result Analysis & Feedback

---

## References

- [Vite Documentation](https://vitejs.dev/)
- [Capacitor Documentation](https://capacitorjs.com/)
- [AWS Lambda Python](https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html)
- [AWS Bedrock Claude](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html)
