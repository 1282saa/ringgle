# Phase 11: Native Call Scheduling & Firebase Push Notifications

**Timeline:** 2026-01-17
**Status:** Completed
**Branch:** `main`
**Commit:** `34e1e10`
**Impact:** 네이티브 Android 전화 예약 시스템 및 Firebase 푸시 알림 구현

---

## Overview

사용자가 설정한 시간에 실제 전화처럼 AI 튜터 전화가 오는 기능 구현. 화면이 꺼진 상태에서도 전화 수신 화면이 표시되고, 예약 10분 전 동기부여 메시지 알림 발송.

**Key Objectives:**
- 네이티브 Android 전화 수신 화면 구현
- 정확한 시간에 전화 예약 (AlarmManager + Foreground Service)
- 화면 꺼진 상태에서도 전화 수신 (Full-Screen Intent)
- Firebase Cloud Messaging 푸시 알림 연동
- 전화 10분 전 동기부여 메시지 알림

---

## Implementation Details

### 1. 네이티브 전화 수신 화면 (IncomingCallActivity.java)

**파일:** `android/app/src/main/java/com/aienglish/call/IncomingCallActivity.java`

```java
public class IncomingCallActivity extends AppCompatActivity {
    // 화면 켜기 및 잠금 해제
    private void setupScreenWake() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            keyguardManager.requestDismissKeyguard(this, null);
        }

        // WakeLock으로 화면 유지
        wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK |
            PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "AIEnglishCall::IncomingCallWakeLock"
        );
        wakeLock.acquire(60 * 1000L);
    }

    // 벨소리 및 진동
    private void startRinging() {
        // 진동 패턴: 1초 진동, 1초 쉬고 반복
        long[] pattern = {0, 1000, 1000};
        vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));

        // 기본 벨소리 재생
        ringtone = RingtoneManager.getRingtone(this, ringtoneUri);
        ringtone.setLooping(true);
        ringtone.play();
    }

    // 전화 받기 - MainActivity /call 경로로 이동
    public void answerCall() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("route", "/call");
        startActivity(intent);
        finish();
    }
}
```

**레이아웃:** `android/app/src/main/res/layout/activity_incoming_call.xml`
- 튜터 아바타 (펄스 애니메이션)
- 튜터 이름
- "AI 튜터가 전화를 걸고 있습니다..." 텍스트
- 받기/거절 버튼

---

### 2. Capacitor 브릿지 플러그인 (CallSchedulerPlugin.java)

**파일:** `android/app/src/main/java/com/aienglish/call/CallSchedulerPlugin.java`

```java
@CapacitorPlugin(name = "CallScheduler")
public class CallSchedulerPlugin extends Plugin {

    @PluginMethod
    public void scheduleCall(PluginCall call) {
        long triggerTime = call.getLong("triggerTime");
        String tutorName = call.getString("tutorName", "AI Tutor");
        int requestCode = call.getInt("requestCode", 1000);

        // AlarmManager.setAlarmClock() 사용 - 정확한 시간 보장
        AlarmManager.AlarmClockInfo alarmInfo =
            new AlarmManager.AlarmClockInfo(triggerTime, pendingIntent);
        alarmManager.setAlarmClock(alarmInfo, pendingIntent);
    }

    @PluginMethod
    public void ensurePermissions(PluginCall call) {
        // SCHEDULE_EXACT_ALARM 권한 확인
        if (!alarmManager.canScheduleExactAlarms()) {
            // 설정 화면으로 이동
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            startActivity(intent);
        }

        // 배터리 최적화 무시 요청
        if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + packageName));
            startActivity(intent);
        }
    }
}
```

**JavaScript 브릿지:** `src/utils/callScheduler.js`

```javascript
export const scheduleCall = async (date, tutorName, requestCode = 1000) => {
  if (!isAndroid()) return false

  const { CallScheduler } = await import('@capacitor/core').then(m => m.Plugins)
  await CallScheduler.scheduleCall({
    triggerTime: date.getTime(),
    tutorName,
    requestCode
  })
  return true
}
```

---

### 3. Foreground Service (CallSchedulerService.java)

**파일:** `android/app/src/main/java/com/aienglish/call/CallSchedulerService.java`

```java
public class CallSchedulerService extends Service {
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent.getAction();

        if ("SCHEDULE_CALL".equals(action)) {
            long triggerTime = intent.getLongExtra("triggerTime", 0);
            String tutorName = intent.getStringExtra("tutorName");
            int requestCode = intent.getIntExtra("requestCode", 1000);

            scheduleAlarm(triggerTime, tutorName, requestCode);
        }

        // Foreground Service로 실행
        startForeground(NOTIFICATION_ID, createNotification("AI 전화 대기 중..."));
        return START_STICKY;
    }

    private void scheduleAlarm(long triggerTime, String tutorName, int requestCode) {
        AlarmManager.AlarmClockInfo alarmInfo =
            new AlarmManager.AlarmClockInfo(triggerTime, pendingIntent);
        alarmManager.setAlarmClock(alarmInfo, pendingIntent);
    }
}
```

---

### 4. 알람 수신 BroadcastReceiver (CallAlarmReceiver.java)

**파일:** `android/app/src/main/java/com/aienglish/call/CallAlarmReceiver.java`

```java
public class CallAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String tutorName = intent.getStringExtra("tutorName");

        // Full-Screen Intent Notification으로 전화 수신 화면 표시
        showFullScreenNotification(context, tutorName);
    }

    private void showFullScreenNotification(Context context, String tutorName) {
        // Full-Screen Intent 생성
        Intent fullScreenIntent = new Intent(context, IncomingCallActivity.class);
        fullScreenIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_NO_USER_ACTION |
            Intent.FLAG_ACTIVITY_CLEAR_TOP
        );

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context, 0, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Notification 생성
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_call)
            .setContentTitle(tutorName)
            .setContentText("AI 튜터가 전화를 걸고 있습니다...")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPendingIntent, true)  // Full-Screen Intent!
            .setAutoCancel(true);

        notificationManager.notify(NOTIFICATION_ID, builder.build());
    }
}
```

---

### 5. 부팅 후 알람 복구 (BootReceiver.java)

**파일:** `android/app/src/main/java/com/aienglish/call/BootReceiver.java`

```java
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            // 앱 시작하여 알람 재등록
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launchIntent);
        }
    }
}
```

---

### 6. MainActivity 라우팅 (MainActivity.java)

**파일:** `android/app/src/main/java/com/aienglish/call/MainActivity.java`

```java
private void handleIncomingRoute(Intent intent) {
    String route = intent.getStringExtra("route");
    if (route != null && route.equals("/call")) {
        // WebView가 준비된 후 라우팅
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            String js = "localStorage.setItem('navigateToCall', 'true'); " +
                        "window.location.href = '/call';";
            getBridge().getWebView().evaluateJavascript(js, null);
        }, 500);
    }
}
```

---

### 7. Firebase Push Notifications

**설정 파일:**
- `android/app/google-services.json` - Firebase 프로젝트 설정
- `android/build.gradle` - `com.google.gms:google-services:4.4.4`
- `android/app/build.gradle` - google-services 플러그인 적용

**notificationService.js 활성화:**

```javascript
// 푸시 알림 권한 요청 및 등록
await this.requestPushNotificationPermission();

// 리스너 등록 (푸시 + 로컬 알림)
this.registerListeners();
```

---

### 8. 동기부여 메시지 알림 (10분 전)

**파일:** `src/services/notificationService.js`

```javascript
// 동기부여 메시지 목록 (15가지)
const MOTIVATION_MESSAGES = [
  "오늘도 한 걸음 더 성장하는 당신, 멋져요! 💪",
  "꾸준함이 실력이 됩니다. 화이팅! 🔥",
  "영어 실력이 쑥쑥 자라고 있어요! 🌱",
  "오늘의 대화가 내일의 자신감이 됩니다 ✨",
  "작은 노력이 큰 변화를 만들어요! 🚀",
  // ... 10개 더
];

// 동기부여 알림 예약 (전화 10분 전)
async scheduleMotivationReminder(schedule) {
  const reminderDate = new Date();
  reminderDate.setHours(hours, minutes, 0, 0);
  reminderDate.setMinutes(reminderDate.getMinutes() - 10); // 10분 전

  await LocalNotifications.schedule({
    notifications: [{
      id: notificationId,
      title: `🔔 10분 후 ${tutorName}와 통화 예정!`,
      body: this.getRandomMotivationMessage(),
      schedule: { at: reminderDate, repeats: true, allowWhileIdle: true },
      channelId: CHANNEL_MOTIVATION,
    }],
  });
}
```

---

### 9. 일정 설정 통합 (ScheduleSettings.jsx)

**파일:** `src/pages/ScheduleSettings.jsx`

```javascript
import { scheduleCall, cancelCall, ensurePermissions, isAndroid } from '../utils/callScheduler'

// 네이티브 전화 예약 동기화
const syncNativeCallSchedules = async (allSchedules) => {
  if (!isAndroid()) return

  const tutorName = getFromStorage('tutorName', 'AI Tutor')

  for (const [dayId, daySchedules] of Object.entries(allSchedules)) {
    for (const schedule of daySchedules) {
      // 다음 발생 시간 계산
      const nextOccurrence = calculateNextOccurrence(dayId, schedule.time)

      // 네이티브 알람 등록
      await scheduleCall(nextOccurrence, tutorName, requestCode)
    }
  }
}

const handleSave = async () => {
  // Android 권한 확인
  if (isAndroid()) {
    const hasPermissions = await ensurePermissions()
    if (!hasPermissions) {
      alert('전화 예약을 위해 필요한 권한을 허용해주세요.')
      return
    }
  }

  // 저장 및 동기화
  setToStorage('callSchedules', newSchedules)
  await syncNativeCallSchedules(newSchedules)
  await notificationService.syncReminders()
}
```

---

### 10. 상태바 수정

**파일:** `android/app/src/main/res/values/colors.xml` (신규)

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#4338ca</color>
    <color name="colorPrimaryDark">#3730a3</color>
    <color name="colorAccent">#6366f1</color>
    <color name="statusBarColor">#ffffff</color>
</resources>
```

**파일:** `android/app/src/main/res/values/styles.xml` (수정)

```xml
<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="windowActionBar">false</item>
    <item name="windowNoTitle">true</item>
    <item name="android:background">@null</item>
    <item name="android:statusBarColor">@color/statusBarColor</item>
    <item name="android:windowLightStatusBar">true</item>
</style>
```

---

## AndroidManifest.xml 권한

```xml
<!-- 기본 권한 -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- 전화 스타일 알림 권한 -->
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- 정확한 알람 권한 -->
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />

<!-- Foreground Service 권한 -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />

<!-- 배터리 최적화 무시 -->
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

---

## File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `IncomingCallActivity.java` | New | 네이티브 전화 수신 화면 |
| `CallSchedulerPlugin.java` | New | Capacitor 브릿지 플러그인 |
| `CallSchedulerService.java` | New | Foreground Service |
| `CallAlarmReceiver.java` | New | 알람 수신 BroadcastReceiver |
| `CallDeclineReceiver.java` | New | 전화 거절 처리 |
| `BootReceiver.java` | New | 부팅 후 알람 복구 |
| `MainActivity.java` | Modified | /call 라우팅 처리 |
| `activity_incoming_call.xml` | New | 전화 수신 화면 레이아웃 |
| `circle_*.xml`, `ic_*.xml` | New | Drawable 리소스 |
| `colors.xml` | New | 상태바 색상 |
| `styles.xml` | Modified | 상태바 스타일 |
| `AndroidManifest.xml` | Modified | 권한 및 컴포넌트 등록 |
| `google-services.json` | New | Firebase 설정 |
| `callScheduler.js` | New | JS 브릿지 유틸리티 |
| `notificationService.js` | Modified | 동기부여 메시지 추가 |
| `ScheduleSettings.jsx` | Modified | 네이티브 예약 통합 |
| `App.jsx` | Modified | localStorage 네비게이션 체크 |

---

## 알림 흐름 다이어그램

```
사용자가 일정 설정 (예: 금요일 20:00)
        │
        ▼
┌─────────────────────────────────┐
│ ScheduleSettings.jsx            │
│ - syncNativeCallSchedules()     │
│ - notificationService.sync()    │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ CallSchedulerPlugin.java        │
│ - AlarmManager.setAlarmClock()  │
│ - 정확한 시간에 알람 등록        │
└─────────────────────────────────┘
        │
        │ (금요일 19:50)
        ▼
┌─────────────────────────────────┐
│ LocalNotifications              │
│ 🔔 "10분 후 AI Tutor와 통화 예정!"│
│ "오늘도 한 걸음 더 성장하는 당신!" │
└─────────────────────────────────┘
        │
        │ (금요일 20:00)
        ▼
┌─────────────────────────────────┐
│ CallAlarmReceiver.java          │
│ - Full-Screen Intent 발동       │
│ - 화면 켜기 + 잠금 해제         │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ IncomingCallActivity.java       │
│ - 벨소리 + 진동                 │
│ - 튜터 아바타 + 받기/거절 버튼   │
└─────────────────────────────────┘
        │
        │ (사용자가 "받기" 클릭)
        ▼
┌─────────────────────────────────┐
│ MainActivity.java               │
│ - localStorage.navigateToCall   │
│ - window.location.href = '/call'│
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ Call.jsx (React)                │
│ - AI 튜터와 영어 대화 시작       │
└─────────────────────────────────┘
```

---

## Testing Checklist

- [x] 일정 설정 → 시간 예약 → 알람 등록 확인
- [x] 화면 켜진 상태에서 전화 수신 화면 표시
- [x] 화면 꺼진 상태에서 전화 수신 화면 표시 (Full-Screen Intent)
- [x] 벨소리 + 진동 작동
- [x] "받기" 버튼 → /call 페이지로 이동
- [x] "거절" 버튼 → 화면 닫힘
- [x] 10분 전 동기부여 메시지 알림
- [x] Firebase 푸시 알림 권한 요청
- [x] 상태바 흰색 배경 + 어두운 아이콘

---

## Known Issues & Solutions

### 1. 화면 꺼진 상태에서 Activity 시작 불가
- **문제:** Android 10+ 백그라운드에서 Activity 직접 시작 제한
- **해결:** Full-Screen Intent Notification 사용

### 2. "받기" 버튼이 메인 페이지로 이동
- **문제:** `window.location.hash` 사용 시 BrowserRouter와 충돌
- **해결:** `window.location.href = '/call'` + localStorage 플래그

### 3. 알람이 정확한 시간에 오지 않음
- **문제:** setExact()도 Android 배터리 최적화에 영향받음
- **해결:** AlarmManager.setAlarmClock() 사용 (알람 앱 수준 정확도)

### 4. 상태바가 안 보임
- **문제:** 상태바 배경색이 앱 배경과 동일
- **해결:** colors.xml에 흰색 상태바 배경 설정

---

## APK Versions

| Version | File | Description |
|---------|------|-------------|
| v7 | ringgle-v7.apk | 초기 네이티브 전화 구현 |
| v8 | ringgle-v8-firebase.apk | Firebase 푸시 알림 추가 |
| v9 | ringgle-v9-motivation.apk | 동기부여 메시지 알림 추가 |
| v10 | ringgle-v10-statusbar.apk | 상태바 색상 수정 |

---

## Next Steps

- Phase 12: iOS 전화 예약 구현 (CallKit 연동)
- Phase 13: 통화 후 자동 재예약 (다음 주 같은 시간)
- Phase 14: 부재중 전화 알림 기능
- Phase 15: Play Store 배포 준비

---

## References

- [Android AlarmManager Documentation](https://developer.android.com/reference/android/app/AlarmManager)
- [Full-Screen Intent Notifications](https://developer.android.com/develop/ui/views/notifications/time-sensitive)
- [Capacitor Plugin Development](https://capacitorjs.com/docs/plugins/creating-plugins)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Phase 10: Call Tab UI Refinement](PHASE-10-call-tab-ui-refinement.md)
