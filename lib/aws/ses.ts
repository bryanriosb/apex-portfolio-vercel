import { sesClient } from './config'
import { SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { createMimeMessage } from 'mimetext'

interface SendEmailParams {
    to: string[]
    from: string
    subject: string
    html: string
    text?: string
    replyTo?: string[]
    configurationSet?: string
}

export async function sendEmail({ to, from, subject, html, text, replyTo, configurationSet }: SendEmailParams) {
    const command = new SendEmailCommand({
        Destination: {
            ToAddresses: to,
        },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: html,
                },
                Text: {
                    Charset: 'UTF-8',
                    Data: text || html.replace(/<[^>]*>?/gm, ''),
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject,
            },
        },
        Source: from,
        ReplyToAddresses: replyTo,
        ConfigurationSetName: configurationSet,
    })
    return sesClient.send(command)
}

// TODO: Implement sendRawEmail for attachments using nodemailer or similar to build raw message
export async function sendRawEmail(rawMessage: Uint8Array) {
    const command = new SendRawEmailCommand({
        RawMessage: {
            Data: rawMessage,
        },
    })
    return sesClient.send(command)
}
