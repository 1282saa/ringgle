#!/bin/bash
# DynamoDB 테이블 생성 스크립트
# 실행: chmod +x setup_dynamodb.sh && ./setup_dynamodb.sh

set -e

REGION="us-east-1"
TABLE_NAME="eng-learning-conversations"

echo "=== DynamoDB 테이블 생성 시작 ==="

# 1. 테이블 생성
echo "[1/3] 테이블 생성 중..."
aws dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[{
      "IndexName": "GSI1",
      "KeySchema": [
        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
        {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION

echo "[2/3] 테이블 활성화 대기 중..."
aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION

# 2. TTL 활성화
echo "[3/3] TTL 활성화 중..."
aws dynamodb update-time-to-live \
  --table-name $TABLE_NAME \
  --time-to-live-specification Enabled=true,AttributeName=ttl \
  --region $REGION

echo "=== DynamoDB 테이블 생성 완료 ==="
echo "테이블명: $TABLE_NAME"
echo "리전: $REGION"
