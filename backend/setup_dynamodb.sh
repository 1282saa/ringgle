#!/bin/bash
# DynamoDB 테이블 생성 스크립트
# eng-learning-conversations 테이블 생성

TABLE_NAME="eng-learning-conversations"
REGION="us-east-1"

echo "Creating DynamoDB table: $TABLE_NAME"

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
        "[
            {
                \"IndexName\": \"GSI1\",
                \"KeySchema\": [
                    {\"AttributeName\": \"GSI1PK\", \"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"GSI1SK\", \"KeyType\": \"RANGE\"}
                ],
                \"Projection\": {\"ProjectionType\": \"ALL\"},
                \"ProvisionedThroughput\": {
                    \"ReadCapacityUnits\": 5,
                    \"WriteCapacityUnits\": 5
                }
            }
        ]" \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region $REGION

echo "Waiting for table to be created..."
aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION

echo "Enabling TTL on 'ttl' attribute..."
aws dynamodb update-time-to-live \
    --table-name $TABLE_NAME \
    --time-to-live-specification "Enabled=true, AttributeName=ttl" \
    --region $REGION

echo "Done! Table $TABLE_NAME created successfully."
echo ""
echo "Table Schema:"
echo "  PK: DEVICE#{deviceId}"
echo "  SK: SESSION#{sessionId}, MESSAGE#{timestamp}, SETTINGS, ANALYSIS"
echo "  GSI1: For session listing (sorted by date)"
echo "  TTL: 90 days auto-delete"
