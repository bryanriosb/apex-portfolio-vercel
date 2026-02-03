import { snsClient } from './config'
import { PublishCommand } from '@aws-sdk/client-sns'

export async function publishToTopic(topicArn: string, message: any, subject?: string) {
    const command = new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(message),
        Subject: subject,
    })
    return snsClient.send(command)
}

export async function sendSMS(phoneNumber: string, message: string) {
    const command = new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: message,
    })
    return snsClient.send(command)
}
