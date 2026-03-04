import { sqsClient } from './config'
import { SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs'

export async function sendMessage(queueUrl: string, body: any) {
    const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(body),
    })
    return sqsClient.send(command)
}

export async function sendMessageBatch(queueUrl: string, entries: any[]) {
    const command = new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: entries.map((entry, index) => ({
            Id: entry.id || `${Date.now()}-${index}`,
            MessageBody: JSON.stringify(entry.body),
        })),
    })
    return sqsClient.send(command)
}
