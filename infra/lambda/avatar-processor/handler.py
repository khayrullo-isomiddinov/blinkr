import json
import os
import hashlib
import datetime
import urllib.parse

import boto3

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

TABLE_NAME = os.environ['AVATARS_TABLE_NAME']
PROCESSED_PREFIX = 'processed/'
UPLOAD_PREFIX = 'uploads/'

VALID_MAGIC_BYTES = {
    b'\xff\xd8\xff': 'image/jpeg',
    b'\x89PNG\r\n\x1a\n': 'image/png',
    b'GIF87a': 'image/gif',
    b'GIF89a': 'image/gif',
}


def detect_image_type(body):
    for magic, content_type in VALID_MAGIC_BYTES.items():
        if body.startswith(magic):
            return content_type
    return None


def extract_user_uuid(key):
    # expects uploads/<user_uuid>/<filename>
    parts = key.split('/')
    if len(parts) >= 3:
        return parts[1]
    return 'unknown'


def handler(event, context):
    table = dynamodb.Table(TABLE_NAME)

    for record in event.get('Records', []):
        bucket = record['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(record['s3']['object']['key'])

        if not key.startswith(UPLOAD_PREFIX):
            continue

        obj = s3.get_object(Bucket=bucket, Key=key)
        body = obj['Body'].read()

        content_type = detect_image_type(body)
        user_uuid = extract_user_uuid(key)
        filename = key.split('/')[-1]
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if not content_type:
            table.put_item(Item={
                'user_uuid': user_uuid,
                'uploaded_at': now,
                'original_key': key,
                'status': 'rejected',
                'reason': 'unrecognized image format',
            })
            continue

        checksum = hashlib.sha256(body).hexdigest()
        processed_key = f'{PROCESSED_PREFIX}{user_uuid}/{filename}'

        s3.put_object(
            Bucket=bucket,
            Key=processed_key,
            Body=body,
            ContentType=content_type,
        )

        table.put_item(Item={
            'user_uuid': user_uuid,
            'uploaded_at': now,
            'original_key': key,
            'processed_key': processed_key,
            'content_type': content_type,
            'size_bytes': len(body),
            'checksum_sha256': checksum,
            'status': 'processed',
        })

    return {'statusCode': 200, 'body': json.dumps({'message': 'ok'})}
