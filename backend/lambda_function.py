import json
import boto3
import re
import base64
import time
import urllib.request
from datetime import datetime, timedelta

# AWS 클라이언트
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
polly = boto3.client('polly', region_name='us-east-1')
transcribe = boto3.client('transcribe', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# 상수
S3_BUCKET = 'eng-learning-audio'
DYNAMODB_TABLE = 'eng-learning-conversations'
TTL_DAYS = 90

# CORS 헤더 (전역)
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}


# ============================================
# 공통 헬퍼 함수
# ============================================

def get_table():
    """DynamoDB 테이블 객체 반환"""
    return dynamodb.Table(DYNAMODB_TABLE)


def get_ttl():
    """TTL 타임스탬프 계산 (90일 후)"""
    return int((datetime.utcnow() + timedelta(days=TTL_DAYS)).timestamp())


def get_now():
    """현재 UTC 시간을 ISO 포맷으로 반환"""
    return datetime.utcnow().isoformat() + 'Z'


def make_response(status_code, body):
    """표준 API 응답 생성"""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body)
    }


def success_response(data):
    """성공 응답 (200)"""
    return make_response(200, data)


def error_response(message, status_code=400):
    """에러 응답"""
    return make_response(status_code, {'error': message})


def validate_required(body, *fields):
    """필수 필드 검증. 누락된 필드가 있으면 에러 응답 반환, 없으면 None"""
    missing = [f for f in fields if not body.get(f)]
    if missing:
        return error_response(f'{", ".join(missing)} {"is" if len(missing) == 1 else "are"} required')
    return None


# 모델 설정
CLAUDE_MODEL = 'anthropic.claude-3-haiku-20240307-v1:0'

# 시스템 프롬프트
SYSTEM_PROMPT = """You are Emma, a friendly AI English tutor making a phone call to help the student practice English conversation.

Guidelines:
- Accent: {accent}
- Difficulty Level: {level}
- Topic: {topic}
- Keep responses natural and conversational (2-3 sentences max)
- Ask follow-up questions to keep the conversation flowing
- Gently correct major grammar errors when appropriate
- Be encouraging and supportive
- Respond in English only

If this is the first message, greet the student warmly and ask them a simple opening question related to the topic."""

# 분석용 프롬프트
ANALYSIS_PROMPT = """Analyze the following English conversation between a student and an AI tutor.
Provide a detailed analysis in JSON format.

Conversation:
{conversation}

Analyze ONLY the student's messages (role: user) and return a JSON object with:

{{
  "cafp_scores": {{
    "complexity": <0-100, vocabulary diversity and sentence structure complexity>,
    "accuracy": <0-100, grammatical correctness>,
    "fluency": <0-100, natural flow and coherence>,
    "pronunciation": <0-100, estimate based on word choice indicating possible pronunciation difficulties>
  }},
  "fillers": {{
    "count": <number of filler words used>,
    "words": [<list of filler words found: um, uh, like, you know, basically, actually, literally, I mean, so, well, etc.>],
    "percentage": <percentage of words that are fillers>
  }},
  "grammar_corrections": [
    {{
      "original": "<original sentence with error>",
      "corrected": "<corrected sentence>",
      "explanation": "<brief explanation in Korean>"
    }}
  ],
  "vocabulary": {{
    "total_words": <total words spoken by student>,
    "unique_words": <unique words count>,
    "advanced_words": [<list of advanced vocabulary used>],
    "suggested_words": [<3-5 advanced words they could have used>]
  }},
  "overall_feedback": "<2-3 sentences of encouraging feedback in Korean>",
  "improvement_tips": [<3 specific tips for improvement in Korean>]
}}

Return ONLY valid JSON, no other text."""


# 액션 → 핸들러 매핑 (딕셔너리 디스패치)
ACTION_HANDLERS = {
    'chat': 'handle_chat',
    'tts': 'handle_tts',
    'stt': 'handle_stt',
    'analyze': 'handle_analyze',
    'save_settings': 'handle_save_settings',
    'get_settings': 'handle_get_settings',
    'start_session': 'handle_start_session',
    'end_session': 'handle_end_session',
    'save_message': 'handle_save_message',
    'get_sessions': 'handle_get_sessions',
    'get_session_detail': 'handle_get_session_detail',
    'delete_session': 'handle_delete_session',
}


def lambda_handler(event, context):
    """Main Lambda handler - 딕셔너리 디스패치 패턴"""
    if event.get('httpMethod') == 'OPTIONS':
        return make_response(200, '')

    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'chat')

        handler_name = ACTION_HANDLERS.get(action)
        if handler_name:
            return globals()[handler_name](body)

        return error_response('Invalid action')

    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(str(e), 500)


# ============================================
# 대화/분석 핸들러
# ============================================

def handle_chat(body):
    """AI 대화 처리 (Bedrock Claude Haiku)"""
    messages = body.get('messages', [])
    settings = body.get('settings', {})

    accent_map = {'us': 'American English', 'uk': 'British English', 'au': 'Australian English', 'in': 'Indian English'}
    level_map = {'beginner': 'Beginner (use simple words and short sentences)', 'intermediate': 'Intermediate (normal conversation level)', 'advanced': 'Advanced (use complex vocabulary and idioms)'}
    topic_map = {'business': 'Business and workplace situations', 'daily': 'Daily life and casual conversation', 'travel': 'Travel and tourism', 'interview': 'Job interviews and professional settings'}

    system = SYSTEM_PROMPT.format(
        accent=accent_map.get(settings.get('accent', 'us'), 'American English'),
        level=level_map.get(settings.get('level', 'intermediate'), 'Intermediate'),
        topic=topic_map.get(settings.get('topic', 'business'), 'Business')
    )

    claude_messages = [{'role': m.get('role', 'user'), 'content': m.get('content', '')} for m in messages]
    if not claude_messages:
        claude_messages = [{'role': 'user', 'content': "Hello, let's start our English practice session."}]

    response = bedrock.invoke_model(
        modelId=CLAUDE_MODEL,
        contentType='application/json',
        accept='application/json',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 300,
            'system': system,
            'messages': claude_messages
        })
    )

    result = json.loads(response['body'].read())
    return success_response({'message': result['content'][0]['text'], 'role': 'assistant'})


def handle_stt(body):
    """음성→텍스트 변환 (AWS Transcribe)"""
    audio_base64 = body.get('audio', '')
    language = body.get('language', 'en-US')

    if not audio_base64:
        return error_response('No audio data provided')

    try:
        audio_data = base64.b64decode(audio_base64)
        job_name = f"stt-{int(time.time() * 1000)}"
        s3_key = f"audio/{job_name}.webm"

        s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=audio_data, ContentType='audio/webm')

        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': f's3://{S3_BUCKET}/{s3_key}'},
            MediaFormat='webm',
            LanguageCode=language,
            Settings={'ShowSpeakerLabels': False, 'ChannelIdentification': False}
        )

        for _ in range(30):
            status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            job_status = status['TranscriptionJob']['TranscriptionJobStatus']

            if job_status == 'COMPLETED':
                transcript_uri = status['TranscriptionJob']['Transcript']['TranscriptFileUri']
                with urllib.request.urlopen(transcript_uri) as response:
                    transcript_data = json.loads(response.read().decode())

                transcript_text = transcript_data['results']['transcripts'][0]['transcript']
                s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
                transcribe.delete_transcription_job(TranscriptionJobName=job_name)

                return success_response({'transcript': transcript_text, 'success': True})
            elif job_status == 'FAILED':
                raise Exception('Transcription failed')

            time.sleep(1)

        raise Exception('Transcription timeout')

    except Exception as e:
        print(f"STT error: {str(e)}")
        return error_response(str(e), 500)


def handle_tts(body):
    """텍스트→음성 변환 (Amazon Polly)"""
    text = body.get('text', '')
    settings = body.get('settings', {})
    accent = settings.get('accent', 'us')
    gender = settings.get('gender', 'female')

    voice_map = {
        ('us', 'female'): ('Joanna', 'neural'), ('us', 'male'): ('Matthew', 'neural'),
        ('uk', 'female'): ('Amy', 'neural'), ('uk', 'male'): ('Brian', 'neural'),
        ('au', 'female'): ('Nicole', 'standard'), ('au', 'male'): ('Russell', 'standard'),
        ('in', 'female'): ('Aditi', 'standard'), ('in', 'male'): ('Aditi', 'standard'),
    }
    voice_id, engine = voice_map.get((accent, gender), ('Joanna', 'neural'))

    try:
        response = polly.synthesize_speech(Text=text, OutputFormat='mp3', VoiceId=voice_id, Engine=engine)
        audio_base64 = base64.b64encode(response['AudioStream'].read()).decode('utf-8')
        return success_response({'audio': audio_base64, 'contentType': 'audio/mpeg', 'voice': voice_id, 'engine': engine})
    except Exception as e:
        print(f"TTS error: {str(e)}")
        return error_response(str(e), 500)


def handle_analyze(body):
    """대화 분석 (AI 기반 CAFP 점수, 문법, 필러 분석)"""
    messages = body.get('messages', [])

    if not messages:
        return error_response('No messages to analyze')

    conversation_text = '\n'.join(
        f"{m.get('role', m.get('speaker', 'user'))}: {m.get('content', m.get('en', ''))}"
        for m in messages if m.get('role', m.get('speaker')) in ['user', 'assistant']
    )

    user_text = ' '.join(
        m.get('content', m.get('en', '')) for m in messages if m.get('role', m.get('speaker')) == 'user'
    ).lower()

    filler_words = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'i mean', 'so', 'well', 'kind of', 'sort of']
    found_fillers = [f for filler in filler_words for f in [filler] * len(re.findall(r'\b' + filler + r'\b', user_text))]

    try:
        response = bedrock.invoke_model(
            modelId=CLAUDE_MODEL,
            contentType='application/json',
            accept='application/json',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 1500,
                'messages': [{'role': 'user', 'content': ANALYSIS_PROMPT.format(conversation=conversation_text)}]
            })
        )

        result = json.loads(response['body'].read())
        json_match = re.search(r'\{[\s\S]*\}', result['content'][0]['text'])
        if json_match:
            return success_response({'analysis': json.loads(json_match.group()), 'success': True})
        raise ValueError("No JSON found in response")

    except Exception as e:
        print(f"Analysis error: {str(e)}")
        word_count = len(user_text.split())
        return success_response({
            'analysis': {
                'cafp_scores': {'complexity': 70, 'accuracy': 75, 'fluency': 72, 'pronunciation': 78},
                'fillers': {'count': len(found_fillers), 'words': found_fillers, 'percentage': round(len(found_fillers) / max(word_count, 1) * 100, 1)},
                'grammar_corrections': [],
                'vocabulary': {'total_words': word_count, 'unique_words': len(set(user_text.split())), 'advanced_words': [], 'suggested_words': []},
                'overall_feedback': '대화를 잘 하셨습니다! 계속 연습하시면 더 좋아질 거예요.',
                'improvement_tips': ['더 다양한 어휘를 사용해보세요', '문장을 조금 더 길게 만들어보세요', '필러 단어 사용을 줄여보세요']
            },
            'success': True,
            'fallback': True
        })


# ============================================
# 사용자 설정 핸들러
# ============================================

def handle_save_settings(body):
    """사용자 맞춤설정 저장"""
    validation_error = validate_required(body, 'deviceId')
    if validation_error:
        return validation_error

    device_id = body.get('deviceId')
    settings = body.get('settings', {})

    try:
        now = get_now()
        get_table().put_item(Item={
            'PK': f'DEVICE#{device_id}',
            'SK': 'SETTINGS',
            'type': 'USER_SETTINGS',
            'deviceId': device_id,
            'settings': settings,
            'updatedAt': now,
            'createdAt': now,
            'ttl': get_ttl()
        })
        return success_response({'success': True, 'settings': settings, 'updatedAt': now})
    except Exception as e:
        print(f"Save settings error: {str(e)}")
        return error_response(str(e), 500)


def handle_get_settings(body):
    """사용자 맞춤설정 조회"""
    validation_error = validate_required(body, 'deviceId')
    if validation_error:
        return validation_error

    device_id = body.get('deviceId')

    try:
        response = get_table().get_item(Key={'PK': f'DEVICE#{device_id}', 'SK': 'SETTINGS'})
        item = response.get('Item')

        if item:
            return success_response({'success': True, 'settings': item.get('settings', {}), 'updatedAt': item.get('updatedAt')})
        return success_response({'success': True, 'settings': None, 'message': 'No settings found for this device'})
    except Exception as e:
        print(f"Get settings error: {str(e)}")
        return error_response(str(e), 500)


# ============================================
# 세션 관리 핸들러
# ============================================

def handle_start_session(body):
    """새 대화 세션 시작"""
    validation_error = validate_required(body, 'deviceId', 'sessionId')
    if validation_error:
        return validation_error

    device_id, session_id = body.get('deviceId'), body.get('sessionId')
    settings = body.get('settings', {})
    tutor_name = body.get('tutorName', 'Gwen')

    try:
        now = get_now()
        get_table().put_item(Item={
            'PK': f'DEVICE#{device_id}',
            'SK': f'SESSION#{now}#{session_id}#META',
            'GSI1PK': f'SESSION#{session_id}',
            'GSI1SK': 'META',
            'type': 'SESSION_META',
            'deviceId': device_id,
            'sessionId': session_id,
            'tutorName': tutor_name,
            'topic': settings.get('topic', 'daily'),
            'accent': settings.get('accent', 'us'),
            'level': settings.get('level', 'intermediate'),
            'gender': settings.get('gender', 'female'),
            'settings': settings,
            'startedAt': now,
            'endedAt': None,
            'duration': 0,
            'turnCount': 0,
            'wordCount': 0,
            'status': 'active',
            'createdAt': now,
            'ttl': get_ttl()
        })
        return success_response({'success': True, 'sessionId': session_id, 'startedAt': now})
    except Exception as e:
        print(f"Start session error: {str(e)}")
        return error_response(str(e), 500)


def handle_end_session(body):
    """세션 종료 및 통계 업데이트 (GSI1로 세션 조회)"""
    validation_error = validate_required(body, 'deviceId', 'sessionId')
    if validation_error:
        return validation_error

    device_id, session_id = body.get('deviceId'), body.get('sessionId')

    try:
        table = get_table()
        now = get_now()

        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk AND GSI1SK = :sk',
            ExpressionAttributeValues={':pk': f'SESSION#{session_id}', ':sk': 'META'}
        )

        items = response.get('Items', [])
        if not items:
            return error_response('Session not found', 404)

        session_item = items[0]
        if session_item.get('deviceId') != device_id:
            return error_response('Access denied', 403)

        table.update_item(
            Key={'PK': session_item['PK'], 'SK': session_item['SK']},
            UpdateExpression='SET endedAt = :endedAt, #dur = :duration, turnCount = :turnCount, wordCount = :wordCount, #st = :status',
            ExpressionAttributeNames={'#dur': 'duration', '#st': 'status'},
            ExpressionAttributeValues={
                ':endedAt': now,
                ':duration': body.get('duration', 0),
                ':turnCount': body.get('turnCount', 0),
                ':wordCount': body.get('wordCount', 0),
                ':status': 'completed'
            }
        )
        return success_response({'success': True, 'endedAt': now})
    except Exception as e:
        print(f"End session error: {str(e)}")
        return error_response(str(e), 500)


def handle_save_message(body):
    """대화 메시지 저장"""
    validation_error = validate_required(body, 'deviceId', 'sessionId', 'message')
    if validation_error:
        return validation_error

    device_id, session_id = body.get('deviceId'), body.get('sessionId')
    message = body.get('message', {})

    try:
        now = get_now()
        message_id = f'MSG#{now}'

        get_table().put_item(Item={
            'PK': f'DEVICE#{device_id}',
            'SK': f'SESSION#{session_id}#{message_id}',
            'GSI1PK': f'SESSION#{session_id}',
            'GSI1SK': message_id,
            'type': 'MESSAGE',
            'deviceId': device_id,
            'sessionId': session_id,
            'role': message.get('role', 'user'),
            'content': message.get('content', ''),
            'translation': message.get('translation'),
            'turnNumber': message.get('turnNumber', 0),
            'timestamp': now,
            'createdAt': now,
            'ttl': get_ttl()
        })
        return success_response({'success': True, 'messageId': message_id})
    except Exception as e:
        print(f"Save message error: {str(e)}")
        return error_response(str(e), 500)


def handle_get_sessions(body):
    """사용자의 세션 목록 조회 (날짜순 정렬, 페이지네이션 지원)"""
    validation_error = validate_required(body, 'deviceId')
    if validation_error:
        return validation_error

    device_id = body.get('deviceId')
    limit = body.get('limit', 10)
    last_key = body.get('lastKey')

    try:
        query_params = {
            'KeyConditionExpression': 'PK = :pk AND begins_with(SK, :sk_prefix)',
            'FilterExpression': '#type = :type_meta',
            'ExpressionAttributeNames': {'#type': 'type'},
            'ExpressionAttributeValues': {
                ':pk': f'DEVICE#{device_id}',
                ':sk_prefix': 'SESSION#',
                ':type_meta': 'SESSION_META'
            },
            'Limit': limit * 2,
            'ScanIndexForward': False
        }

        if last_key:
            query_params['ExclusiveStartKey'] = last_key

        response = get_table().query(**query_params)

        sessions = []
        for item in response.get('Items', []):
            if item.get('type') == 'SESSION_META':
                sessions.append({
                    'sessionId': item.get('sessionId'),
                    'tutorName': item.get('tutorName'),
                    'topic': item.get('topic', 'daily'),
                    'accent': item.get('accent', 'us'),
                    'level': item.get('level', 'intermediate'),
                    'startedAt': item.get('startedAt'),
                    'endedAt': item.get('endedAt'),
                    'duration': int(item.get('duration', 0)),
                    'turnCount': int(item.get('turnCount', 0)),
                    'wordCount': int(item.get('wordCount', 0)),
                    'status': item.get('status')
                })
                if len(sessions) >= limit:
                    break

        next_key = response.get('LastEvaluatedKey')
        return success_response({'sessions': sessions, 'lastKey': next_key, 'hasMore': next_key is not None})
    except Exception as e:
        print(f"Get sessions error: {str(e)}")
        return error_response(str(e), 500)


def handle_get_session_detail(body):
    """특정 세션의 상세 정보 조회"""
    validation_error = validate_required(body, 'deviceId', 'sessionId')
    if validation_error:
        return validation_error

    session_id = body.get('sessionId')

    try:
        response = get_table().query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk',
            ExpressionAttributeValues={':pk': f'SESSION#{session_id}'},
            ScanIndexForward=True
        )

        session_meta, messages = None, []
        for item in response.get('Items', []):
            if item.get('type') == 'SESSION_META':
                session_meta = {
                    'sessionId': item.get('sessionId'),
                    'tutorName': item.get('tutorName'),
                    'startedAt': item.get('startedAt'),
                    'endedAt': item.get('endedAt'),
                    'duration': int(item.get('duration', 0)),
                    'turnCount': int(item.get('turnCount', 0)),
                    'wordCount': int(item.get('wordCount', 0)),
                    'status': item.get('status')
                }
            elif item.get('type') == 'MESSAGE':
                messages.append({
                    'role': item.get('role'),
                    'content': item.get('content'),
                    'translation': item.get('translation'),
                    'timestamp': item.get('timestamp'),
                    'turnNumber': int(item.get('turnNumber', 0))
                })

        messages.sort(key=lambda x: x.get('turnNumber', 0))
        return success_response({'session': session_meta, 'messages': messages})
    except Exception as e:
        print(f"Get session detail error: {str(e)}")
        return error_response(str(e), 500)


def handle_delete_session(body):
    """세션 삭제 (GSI1으로 조회 + deviceId 검증)"""
    validation_error = validate_required(body, 'deviceId', 'sessionId')
    if validation_error:
        return validation_error

    device_id, session_id = body.get('deviceId'), body.get('sessionId')

    try:
        table = get_table()

        # GSI1으로 해당 세션의 모든 아이템 조회 (META + MESSAGEs)
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk',
            ExpressionAttributeValues={':pk': f'SESSION#{session_id}'}
        )

        items = response.get('Items', [])
        if not items:
            return error_response('Session not found', 404)

        # deviceId 검증 (다른 사용자 세션 삭제 방지)
        meta_item = next((item for item in items if item.get('type') == 'SESSION_META'), None)
        if meta_item and meta_item.get('deviceId') != device_id:
            return error_response('Access denied', 403)

        # 모든 관련 아이템 삭제
        with table.batch_writer() as batch:
            for item in items:
                batch.delete_item(Key={'PK': item['PK'], 'SK': item['SK']})

        return success_response({'success': True, 'deletedCount': len(items)})
    except Exception as e:
        print(f"Delete session error: {str(e)}")
        return error_response(str(e), 500)
