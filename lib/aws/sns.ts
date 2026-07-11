import { PublishCommand } from '@aws-sdk/client-sns'
import { snsClient } from './config'

export async function publishToTopic(
  topicArn: string,
  message: string,
  subject?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: message,
      Subject: subject,
    })

    const result = await snsClient.send(command)

    return {
      success: true,
      messageId: result.MessageId,
    }
  } catch (error) {
    console.error('Error publishing to SNS topic:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
    })

    const result = await snsClient.send(command)

    return {
      success: true,
      messageId: result.MessageId,
    }
  } catch (error) {
    console.error('Error sending SMS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
