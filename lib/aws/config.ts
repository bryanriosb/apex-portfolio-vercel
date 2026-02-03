import { SESClient } from '@aws-sdk/client-ses'
import { SQSClient } from '@aws-sdk/client-sqs'
import { SNSClient } from '@aws-sdk/client-sns'

const REGION = process.env.AWS_REGION || 'us-east-1'

const config = {
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
}

export const sesClient = new SESClient(config)
export const sqsClient = new SQSClient(config)
export const snsClient = new SNSClient(config)
