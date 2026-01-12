"""
Ringle AI English Learning - Lambda Backend
============================================
AWS Lambda 기반 AI 영어 학습 백엔드

Features:
- AI 대화 (Claude Haiku via Bedrock) + 한국어 번역
- 텍스트 음성 변환 (Amazon Polly)
- 음성 텍스트 변환 (AWS Transcribe)
- 대화 분석 (CAFP 점수, 문법 교정)
- 대화 기록 저장/조회 (DynamoDB)

Author: AI-Assisted Development (Claude Code)
Last Updated: 2026-01-12
"""

import json
import boto3
import re
import base64
import time
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

# ============================================
# AWS 클라이언트 초기화
# ============================================

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
polly = boto3.client('polly', region_name='us-east-1')
transcribe = boto3.client('transcribe', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# ============================================
# 상수 정의
# ============================================

S3_BUCKET = 'eng-learning-audio'
DYNAMODB_TABLE = 'eng-learning-conversations'
CLAUDE_MODEL = 'anthropic.claude-3-haiku-20240307-v1:0'

# TTL: 90일 (초 단위)
TTL_DAYS = 90

# ============================================
# 시스템 프롬프트
# ============================================

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

TRANSLATION_PROMPT = """Translate the following English text to natural Korean.
Keep the tone friendly and conversational.
Return ONLY the Korean translation, nothing else.

English: {text}

Korean translation:"""

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


# ============================================
# 헬퍼 함수
# ============================================

def get_table():
    """DynamoDB 테이블 객체 반환"""
    return dynamodb.Table(DYNAMODB_TABLE)


def get_ttl():
    """TTL 타임스탬프 계산 (90일 후)"""
    return int((datetime.utcnow() + timedelta(days=TTL_DAYS)).timestamp())


def decimal_to_native(obj):
    """DynamoDB Decimal을 Python 네이티브 타입으로 변환"""
    if isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    else:
        return obj


def translate_text(text):
    """
    Claude를 사용하여 영어 텍스트를 한국어로 번역

    Args:
        text: 번역할 영어 텍스트

    Returns:
        한국어 번역 결과
    """
    try:
        prompt = TRANSLATION_PROMPT.format(text=text)

        response = bedrock.invoke_model(
            modelId=CLAUDE_MODEL,
            contentType='application/json',
            accept='application/json',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 500,
                'messages': [{'role': 'user', 'content': prompt}]
            })
        )

        result = json.loads(response['body'].read())
        translation = result['content'][0]['text'].strip()
        return translation

    except Exception as e:
        print(f"Translation error: {str(e)}")
        return None


# ============================================
# 메인 핸들러
# ============================================

def lambda_handler(event, context):
    """
    Lambda 진입점 - 액션별 라우팅
    """
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }

    # CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'chat')

        # 액션별 라우팅
        action_handlers = {
            'chat': handle_chat,
            'tts': handle_tts,
            'stt': handle_stt,
            'analyze': handle_analyze,
            'save_message': handle_save_message,
            'start_session': handle_start_session,
            'end_session': handle_end_session,
            'get_sessions': handle_get_sessions,
            'get_session_detail': handle_get_session_detail,
            'delete_session': handle_delete_session,
            'save_settings': handle_save_settings,
            'get_settings': handle_get_settings,
        }

        handler = action_handlers.get(action)
        if handler:
            return handler(body, headers)
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': f'Invalid action: {action}'})
            }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


# ============================================
# Chat 핸들러 (번역 기능 추가)
# ============================================

def handle_chat(body, headers):
    """
    AI 대화 처리 + 한국어 번역

    Request:
        messages: 대화 히스토리
        settings: 튜터 설정 (accent, level, topic)

    Response:
        message: AI 영어 응답
        translation: 한국어 번역
        role: 'assistant'
    """
    messages = body.get('messages', [])
    settings = body.get('settings', {})

    # 설정 매핑
    accent_map = {
        'us': 'American English',
        'uk': 'British English',
        'au': 'Australian English',
        'in': 'Indian English'
    }
    level_map = {
        'beginner': 'Beginner (use simple words and short sentences)',
        'intermediate': 'Intermediate (normal conversation level)',
        'advanced': 'Advanced (use complex vocabulary and idioms)'
    }
    topic_map = {
        'business': 'Business and workplace situations',
        'daily': 'Daily life and casual conversation',
        'travel': 'Travel and tourism',
        'interview': 'Job interviews and professional settings'
    }

    system = SYSTEM_PROMPT.format(
        accent=accent_map.get(settings.get('accent', 'us'), 'American English'),
        level=level_map.get(settings.get('level', 'intermediate'), 'Intermediate'),
        topic=topic_map.get(settings.get('topic', 'business'), 'Business')
    )

    # 메시지 포맷팅
    claude_messages = []
    for msg in messages:
        claude_messages.append({
            'role': msg.get('role', 'user'),
            'content': msg.get('content', '')
        })

    if not claude_messages:
        claude_messages = [{'role': 'user', 'content': "Hello, let's start our English practice session."}]

    # Claude 호출 (영어 응답)
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
    assistant_message = result['content'][0]['text']

    # 한국어 번역
    translation = translate_text(assistant_message)

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'message': assistant_message,
            'translation': translation,
            'role': 'assistant'
        })
    }


# ============================================
# TTS 핸들러
# ============================================

def handle_tts(body, headers):
    """
    텍스트 음성 변환 (Amazon Polly)
    """
    text = body.get('text', '')
    settings = body.get('settings', {})
    accent = settings.get('accent', 'us')
    gender = settings.get('gender', 'female')

    # 음성 매핑
    voice_map = {
        ('us', 'female'): ('Joanna', 'neural'),
        ('us', 'male'): ('Matthew', 'neural'),
        ('uk', 'female'): ('Amy', 'neural'),
        ('uk', 'male'): ('Brian', 'neural'),
        ('au', 'female'): ('Nicole', 'standard'),
        ('au', 'male'): ('Russell', 'standard'),
        ('in', 'female'): ('Aditi', 'standard'),
        ('in', 'male'): ('Aditi', 'standard'),
    }

    voice_id, engine = voice_map.get((accent, gender), ('Joanna', 'neural'))

    try:
        response = polly.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId=voice_id,
            Engine=engine
        )

        audio_data = response['AudioStream'].read()
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'audio': audio_base64,
                'contentType': 'audio/mpeg',
                'voice': voice_id,
                'engine': engine
            })
        }
    except Exception as e:
        print(f"TTS error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


# ============================================
# STT 핸들러
# ============================================

def handle_stt(body, headers):
    """
    음성 텍스트 변환 (AWS Transcribe)
    """
    audio_base64 = body.get('audio', '')
    language = body.get('language', 'en-US')

    if not audio_base64:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'No audio data provided'})
        }

    try:
        audio_data = base64.b64decode(audio_base64)
        job_name = f"stt-{int(time.time() * 1000)}"
        s3_key = f"audio/{job_name}.webm"

        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=audio_data,
            ContentType='audio/webm'
        )

        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': f's3://{S3_BUCKET}/{s3_key}'},
            MediaFormat='webm',
            LanguageCode=language,
            Settings={
                'ShowSpeakerLabels': False,
                'ChannelIdentification': False
            }
        )

        max_tries = 30
        for _ in range(max_tries):
            status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            job_status = status['TranscriptionJob']['TranscriptionJobStatus']

            if job_status == 'COMPLETED':
                transcript_uri = status['TranscriptionJob']['Transcript']['TranscriptFileUri']
                import urllib.request
                with urllib.request.urlopen(transcript_uri) as response:
                    transcript_data = json.loads(response.read().decode())

                transcript_text = transcript_data['results']['transcripts'][0]['transcript']

                s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
                transcribe.delete_transcription_job(TranscriptionJobName=job_name)

                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'transcript': transcript_text,
                        'success': True
                    })
                }
            elif job_status == 'FAILED':
                raise Exception('Transcription failed')

            time.sleep(1)

        raise Exception('Transcription timeout')

    except Exception as e:
        print(f"STT error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e), 'success': False})
        }


# ============================================
# 분석 핸들러 (저장 기능 추가)
# ============================================

def handle_analyze(body, headers):
    """
    대화 분석 + DynamoDB 저장
    """
    messages = body.get('messages', [])
    device_id = body.get('deviceId')
    session_id = body.get('sessionId')

    if not messages:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'No messages to analyze'})
        }

    # 대화 텍스트 구성
    conversation_text = ""
    for msg in messages:
        role = msg.get('role', msg.get('speaker', 'user'))
        content = msg.get('content', msg.get('en', ''))
        if role in ['user', 'assistant']:
            conversation_text += f"{role}: {content}\n"

    # 사용자 메시지 분석
    user_messages = [m.get('content', m.get('en', '')) for m in messages
                     if m.get('role', m.get('speaker')) == 'user']
    user_text = ' '.join(user_messages).lower()

    # 필러 단어 탐지
    filler_words = ['um', 'uh', 'like', 'you know', 'basically', 'actually',
                    'literally', 'i mean', 'so', 'well', 'kind of', 'sort of']
    found_fillers = []
    for filler in filler_words:
        count = len(re.findall(r'\b' + filler + r'\b', user_text))
        if count > 0:
            found_fillers.extend([filler] * count)

    try:
        prompt = ANALYSIS_PROMPT.format(conversation=conversation_text)

        response = bedrock.invoke_model(
            modelId=CLAUDE_MODEL,
            contentType='application/json',
            accept='application/json',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 1500,
                'messages': [{'role': 'user', 'content': prompt}]
            })
        )

        result = json.loads(response['body'].read())
        analysis_text = result['content'][0]['text']

        json_match = re.search(r'\{[\s\S]*\}', analysis_text)
        if json_match:
            analysis = json.loads(json_match.group())
        else:
            raise ValueError("No JSON found in response")

        # DynamoDB에 분석 결과 저장
        if device_id and session_id:
            try:
                save_analysis_to_db(device_id, session_id, analysis)
            except Exception as db_error:
                print(f"DB save error (non-critical): {str(db_error)}")

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'analysis': analysis,
                'success': True
            })
        }

    except Exception as e:
        print(f"Analysis error: {str(e)}")
        word_count = len(user_text.split())

        # Fallback 분석 결과
        fallback_analysis = {
            'cafp_scores': {
                'complexity': 70,
                'accuracy': 75,
                'fluency': 72,
                'pronunciation': 78
            },
            'fillers': {
                'count': len(found_fillers),
                'words': found_fillers,
                'percentage': round(len(found_fillers) / max(word_count, 1) * 100, 1)
            },
            'grammar_corrections': [],
            'vocabulary': {
                'total_words': word_count,
                'unique_words': len(set(user_text.split())),
                'advanced_words': [],
                'suggested_words': []
            },
            'overall_feedback': '대화를 잘 하셨습니다! 계속 연습하시면 더 좋아질 거예요.',
            'improvement_tips': [
                '더 다양한 어휘를 사용해보세요',
                '문장을 조금 더 길게 만들어보세요',
                '필러 단어 사용을 줄여보세요'
            ]
        }

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'analysis': fallback_analysis,
                'success': True,
                'fallback': True
            })
        }


def save_analysis_to_db(device_id, session_id, analysis):
    """분석 결과를 DynamoDB에 저장"""
    table = get_table()
    now = datetime.utcnow().isoformat() + 'Z'

    item = {
        'PK': f'DEVICE#{device_id}',
        'SK': f'SESSION#{session_id}#ANALYSIS',
        'GSI1PK': f'SESSION#{session_id}',
        'GSI1SK': 'ANALYSIS',
        'type': 'ANALYSIS',
        'deviceId': device_id,
        'sessionId': session_id,
        'cafpScores': analysis.get('cafp_scores', {}),
        'fillers': analysis.get('fillers', {}),
        'grammarCorrections': analysis.get('grammar_corrections', []),
        'vocabulary': analysis.get('vocabulary', {}),
        'overallFeedback': analysis.get('overall_feedback', ''),
        'improvementTips': analysis.get('improvement_tips', []),
        'createdAt': now,
        'ttl': get_ttl()
    }

    table.put_item(Item=item)


# ============================================
# 세션 관리 핸들러
# ============================================

def handle_start_session(body, headers):
    """
    새 대화 세션 시작

    Request:
        deviceId: 디바이스 UUID
        sessionId: 세션 UUID
        settings: 튜터 설정
        tutorName: 튜터 이름
    """
    device_id = body.get('deviceId')
    session_id = body.get('sessionId')
    settings = body.get('settings', {})
    tutor_name = body.get('tutorName', 'Gwen')

    if not device_id or not session_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'deviceId and sessionId are required'})
        }

    try:
        table = get_table()
        now = datetime.utcnow().isoformat() + 'Z'

        item = {
            'PK': f'DEVICE#{device_id}',
            'SK': f'SESSION#{session_id}#META',
            'GSI1PK': f'SESSION#{session_id}',
            'GSI1SK': 'META',
            'type': 'SESSION_META',
            'deviceId': device_id,
            'sessionId': session_id,
            'tutorName': tutor_name,
            'settings': settings,
            'startedAt': now,
            'endedAt': None,
            'duration': 0,
            'turnCount': 0,
            'wordCount': 0,
            'status': 'active',
            'createdAt': now,
            'ttl': get_ttl()
        }

        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'sessionId': session_id,
                'startedAt': now
            })
        }

    except Exception as e:
        print(f"Start session error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


def handle_end_session(body, headers):
    """
    세션 종료 및 최종 정보 업데이트

    Request:
        deviceId: 디바이스 UUID
        sessionId: 세션 UUID
        duration: 통화 시간 (초)
        turnCount: 대화 턴 수
        wordCount: 총 단어 수
    """
    device_id = body.get('deviceId')
    session_id = body.get('sessionId')
    duration = body.get('duration', 0)
    turn_count = body.get('turnCount', 0)
    word_count = body.get('wordCount', 0)

    if not device_id or not session_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'deviceId and sessionId are required'})
        }

    try:
        table = get_table()
        now = datetime.utcnow().isoformat() + 'Z'

        table.update_item(
            Key={
                'PK': f'DEVICE#{device_id}',
                'SK': f'SESSION#{session_id}#META'
            },
            UpdateExpression='SET endedAt = :endedAt, #dur = :duration, turnCount = :turnCount, wordCount = :wordCount, #st = :status',
            ExpressionAttributeNames={
                '#dur': 'duration',
                '#st': 'status'
            },
            ExpressionAttributeValues={
                ':endedAt': now,
                ':duration': duration,
                ':turnCount': turn_count,
                ':wordCount': word_count,
                ':status': 'completed'
            }
        )

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'endedAt': now
            })
        }

    except Exception as e:
        print(f"End session error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


def handle_save_message(body, headers):
    """
    대화 메시지 저장

    Request:
        deviceId: 디바이스 UUID
        sessionId: 세션 UUID
        message: 메시지 객체
            - role: 'user' | 'assistant'
            - content: 영어 내용
            - translation: 한국어 번역 (optional)
            - turnNumber: 턴 번호
    """
    device_id = body.get('deviceId')
    session_id = body.get('sessionId')
    message = body.get('message', {})

    if not device_id or not session_id or not message:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'deviceId, sessionId, and message are required'})
        }

    try:
        table = get_table()
        now = datetime.utcnow().isoformat() + 'Z'
        message_id = f'MSG#{now}'

        item = {
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
        }

        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'messageId': message_id
            })
        }

    except Exception as e:
        print(f"Save message error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


def handle_get_sessions(body, headers):
    """
    사용자의 세션 목록 조회

    Request:
        deviceId: 디바이스 UUID
        limit: 최대 개수 (기본 10)
        lastKey: 페이지네이션 키
    """
    device_id = body.get('deviceId')
    limit = body.get('limit', 10)
    last_key = body.get('lastKey')

    if not device_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'deviceId is required'})
        }

    try:
        table = get_table()

        query_params = {
            'KeyConditionExpression': 'PK = :pk AND begins_with(SK, :sk_prefix)',
            'ExpressionAttributeValues': {
                ':pk': f'DEVICE#{device_id}',
                ':sk_prefix': 'SESSION#'
            },
            'FilterExpression': '#type = :type',
            'ExpressionAttributeNames': {
                '#type': 'type'
            },
            'ExpressionAttributeValues': {
                ':pk': f'DEVICE#{device_id}',
                ':sk_prefix': 'SESSION#',
                ':type': 'SESSION_META'
            },
            'Limit': limit,
            'ScanIndexForward': False  # 최신순
        }

        if last_key:
            query_params['ExclusiveStartKey'] = json.loads(last_key)

        response = table.query(**query_params)

        sessions = []
        for item in response.get('Items', []):
            sessions.append({
                'sessionId': item.get('sessionId'),
                'tutorName': item.get('tutorName'),
                'startedAt': item.get('startedAt'),
                'endedAt': item.get('endedAt'),
                'duration': decimal_to_native(item.get('duration', 0)),
                'turnCount': decimal_to_native(item.get('turnCount', 0)),
                'wordCount': decimal_to_native(item.get('wordCount', 0)),
                'status': item.get('status'),
                'settings': decimal_to_native(item.get('settings', {}))
            })

        result = {
            'sessions': sessions,
            'hasMore': 'LastEvaluatedKey' in response
        }

        if 'LastEvaluatedKey' in response:
            result['lastKey'] = json.dumps(response['LastEvaluatedKey'])

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(result)
        }

    except Exception as e:
        print(f"Get sessions error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


def handle_get_session_detail(body, headers):
    """
    특정 세션의 상세 정보 조회 (메시지 + 분석 결과)

    Request:
        deviceId: 디바이스 UUID
        sessionId: 세션 UUID
    """
    device_id = body.get('deviceId')
    session_id = body.get('sessionId')

    if not device_id or not session_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'deviceId and sessionId are required'})
        }

    try:
        table = get_table()

        # GSI1을 사용하여 세션의 모든 아이템 조회
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :pk',
            ExpressionAttributeValues={
                ':pk': f'SESSION#{session_id}'
            },
            ScanIndexForward=True
        )

        items = response.get('Items', [])

        session_meta = None
        messages = []
        analysis = None

        for item in items:
            item_type = item.get('type')

            if item_type == 'SESSION_META':
                session_meta = {
                    'sessionId': item.get('sessionId'),
                    'tutorName': item.get('tutorName'),
                    'settings': decimal_to_native(item.get('settings', {})),
                    'startedAt': item.get('startedAt'),
                    'endedAt': item.get('endedAt'),
                    'duration': decimal_to_native(item.get('duration', 0)),
                    'turnCount': decimal_to_native(item.get('turnCount', 0)),
                    'wordCount': decimal_to_native(item.get('wordCount', 0)),
                    'status': item.get('status')
                }
            elif item_type == 'MESSAGE':
                messages.append({
                    'role': item.get('role'),
                    'content': item.get('content'),
                    'translation': item.get('translation'),
                    'timestamp': item.get('timestamp'),
                    'turnNumber': decimal_to_native(item.get('turnNumber', 0))
                })
            elif item_type == 'ANALYSIS':
                analysis = {
                    'cafpScores': decimal_to_native(item.get('cafpScores', {})),
                    'fillers': decimal_to_native(item.get('fillers', {})),
                    'grammarCorrections': decimal_to_native(item.get('grammarCorrections', [])),
                    'vocabulary': decimal_to_native(item.get('vocabulary', {})),
                    'overallFeedback': item.get('overallFeedback'),
                    'improvementTips': item.get('improvementTips', [])
                }

        # 메시지를 턴 번호로 정렬
        messages.sort(key=lambda x: x.get('turnNumber', 0))

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'session': session_meta,
                'messages': messages,
                'analysis': analysis
            })
        }

    except Exception as e:
        print(f"Get session detail error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


def handle_delete_session(body, headers):
    """
    세션 삭제 (모든 관련 아이템 삭제)

    Request:
        deviceId: 디바이스 UUID
        sessionId: 세션 UUID
    """
    device_id = body.get('deviceId')
    session_id = body.get('sessionId')

    if not device_id or not session_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'deviceId and sessionId are required'})
        }

    try:
        table = get_table()

        # 세션 관련 모든 아이템 조회
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk_prefix)',
            ExpressionAttributeValues={
                ':pk': f'DEVICE#{device_id}',
                ':sk_prefix': f'SESSION#{session_id}'
            }
        )

        items = response.get('Items', [])
        deleted_count = 0

        # 배치 삭제
        with table.batch_writer() as batch:
            for item in items:
                batch.delete_item(
                    Key={
                        'PK': item['PK'],
                        'SK': item['SK']
                    }
                )
                deleted_count += 1

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'deletedCount': deleted_count
            })
        }

    except Exception as e:
        print(f"Delete session error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


# ============================================
# 사용자 설정 핸들러
# ============================================

def handle_save_settings(body, headers):
    """
    사용자 맞춤설정 저장

    Request:
        deviceId: 디바이스 UUID
        settings: 튜터 설정 객체
            - accent: 'us' | 'uk' | 'au' | 'in'
            - gender: 'male' | 'female'
            - speed: 'slow' | 'normal' | 'fast'
            - level: 'beginner' | 'intermediate' | 'advanced'
            - topic: 'business' | 'daily' | 'travel' | 'interview'

    Response:
        success: boolean
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

    # 설정 유효성 검사
    valid_accents = ['us', 'uk', 'au', 'in']
    valid_genders = ['male', 'female']
    valid_speeds = ['slow', 'normal', 'fast']
    valid_levels = ['beginner', 'intermediate', 'advanced']
    valid_topics = ['business', 'daily', 'travel', 'interview']

    # 기본값 설정
    validated_settings = {
        'accent': settings.get('accent', 'us') if settings.get('accent') in valid_accents else 'us',
        'gender': settings.get('gender', 'female') if settings.get('gender') in valid_genders else 'female',
        'speed': settings.get('speed', 'normal') if settings.get('speed') in valid_speeds else 'normal',
        'level': settings.get('level', 'intermediate') if settings.get('level') in valid_levels else 'intermediate',
        'topic': settings.get('topic', 'business') if settings.get('topic') in valid_topics else 'business',
    }

    try:
        table = get_table()
        now = datetime.utcnow().isoformat() + 'Z'

        item = {
            'PK': f'DEVICE#{device_id}',
            'SK': 'SETTINGS',
            'type': 'USER_SETTINGS',
            'deviceId': device_id,
            'accent': validated_settings['accent'],
            'gender': validated_settings['gender'],
            'speed': validated_settings['speed'],
            'level': validated_settings['level'],
            'topic': validated_settings['topic'],
            'updatedAt': now,
            'createdAt': now,
            'ttl': get_ttl()
        }

        # upsert (있으면 업데이트, 없으면 생성)
        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'settings': validated_settings,
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


def handle_get_settings(body, headers):
    """
    사용자 맞춤설정 조회

    Request:
        deviceId: 디바이스 UUID

    Response:
        settings: 설정 객체 (없으면 기본값 반환)
        isDefault: boolean (저장된 설정이 없는 경우 true)
    """
    device_id = body.get('deviceId')

    if not device_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'deviceId is required'})
        }

    # 기본 설정값
    default_settings = {
        'accent': 'us',
        'gender': 'female',
        'speed': 'normal',
        'level': 'intermediate',
        'topic': 'business',
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
            settings = {
                'accent': item.get('accent', default_settings['accent']),
                'gender': item.get('gender', default_settings['gender']),
                'speed': item.get('speed', default_settings['speed']),
                'level': item.get('level', default_settings['level']),
                'topic': item.get('topic', default_settings['topic']),
            }
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'settings': settings,
                    'isDefault': False,
                    'updatedAt': item.get('updatedAt')
                })
            }
        else:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'settings': default_settings,
                    'isDefault': True
                })
            }

    except Exception as e:
        print(f"Get settings error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
