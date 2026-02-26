import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create mock send functions
const mockSesSend = vi.fn()
const mockSqsSend = vi.fn()
const mockSnsSend = vi.fn()

// Mock the config module to export mocked clients
vi.mock('@/lib/aws/config', () => ({
    sesClient: {
        send: mockSesSend,
    },
    sqsClient: {
        send: mockSqsSend,
    },
    snsClient: {
        send: mockSnsSend,
    },
}))

// Mock the AWS SDK commands
vi.mock('@aws-sdk/client-ses', () => ({
    SendEmailCommand: vi.fn().mockImplementation((params) => params),
    SendRawEmailCommand: vi.fn().mockImplementation((params) => params),
}))

vi.mock('@aws-sdk/client-sqs', () => ({
    SendMessageCommand: vi.fn().mockImplementation((params) => params),
    SendMessageBatchCommand: vi.fn().mockImplementation((params) => params),
}))

vi.mock('@aws-sdk/client-sns', () => ({
    PublishCommand: vi.fn().mockImplementation((params) => params),
}))

import { sendEmail, sendRawEmail } from '@/lib/aws/ses'
import { sendMessage, sendMessageBatch } from '@/lib/aws/sqs'
import { publishToTopic, sendSMS } from '@/lib/aws/sns'

describe('AWS Wrappers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSesSend.mockReset()
        mockSqsSend.mockReset()
        mockSnsSend.mockReset()
    })

    describe('SES - sendEmail', () => {
        it('should send an email with all parameters', async () => {
            const mockResponse = { MessageId: 'test-message-id-123' }
            mockSesSend.mockResolvedValueOnce(mockResponse)

            const result = await sendEmail({
                to: ['test@example.com'],
                from: 'sender@example.com',
                subject: 'Test Subject',
                html: '<p>Test HTML content</p>',
                text: 'Test plain text',
                replyTo: ['reply@example.com'],
                configurationSet: 'test-config-set',
            })

            expect(mockSesSend).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockResponse)
        })

        it('should handle send errors', async () => {
            const error = new Error('SES send failed')
            mockSesSend.mockRejectedValueOnce(error)

            await expect(
                sendEmail({
                    to: ['test@example.com'],
                    from: 'sender@example.com',
                    subject: 'Test',
                    html: '<p>Test</p>',
                })
            ).rejects.toThrow('SES send failed')
        })
    })

    describe('SES - sendRawEmail', () => {
        it('should send a raw email message', async () => {
            const mockResponse = { MessageId: 'raw-message-id-123' }
            mockSesSend.mockResolvedValueOnce(mockResponse)

            const rawMessage = new TextEncoder().encode('raw email content')
            const result = await sendRawEmail(rawMessage)

            expect(mockSesSend).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('SQS - sendMessage', () => {
        it('should send a single message to the queue', async () => {
            const mockResponse = { MessageId: 'sqs-message-id' }
            mockSqsSend.mockResolvedValueOnce(mockResponse)

            const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'
            const messageBody = { type: 'test', data: { foo: 'bar' } }

            const result = await sendMessage(queueUrl, messageBody)

            expect(mockSqsSend).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockResponse)
        })

        it('should stringify the message body', async () => {
            mockSqsSend.mockResolvedValueOnce({})

            const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'
            const messageBody = { complex: { nested: 'object' } }

            await sendMessage(queueUrl, messageBody)

            expect(mockSqsSend).toHaveBeenCalledTimes(1)
        })
    })

    describe('SQS - sendMessageBatch', () => {
        it('should send multiple messages in a batch', async () => {
            const mockResponse = {
                Successful: [{ Id: '0', MessageId: 'msg-1' }, { Id: '1', MessageId: 'msg-2' }],
                Failed: [],
            }
            mockSqsSend.mockResolvedValueOnce(mockResponse)

            const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'
            const entries = [
                { id: 'entry-1', body: { data: 'first' } },
                { id: 'entry-2', body: { data: 'second' } },
            ]

            const result = await sendMessageBatch(queueUrl, entries)

            expect(mockSqsSend).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockResponse)
        })

        it('should handle empty entries array', async () => {
            const mockResponse = { Successful: [], Failed: [] }
            mockSqsSend.mockResolvedValueOnce(mockResponse)

            const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'
            const result = await sendMessageBatch(queueUrl, [])

            expect(mockSqsSend).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('SNS - publishToTopic', () => {
        it('should publish a message to an SNS topic', async () => {
            const mockResponse = { MessageId: 'sns-message-id' }
            mockSnsSend.mockResolvedValueOnce(mockResponse)

            const topicArn = 'arn:aws:sns:us-east-1:123456789:test-topic'
            const message = { eventType: 'test', data: { key: 'value' } }

            const result = await publishToTopic(topicArn, message, 'Test Subject')

            expect(mockSnsSend).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockResponse)
        })

        it('should publish without a subject', async () => {
            const mockResponse = { MessageId: 'sns-message-id-2' }
            mockSnsSend.mockResolvedValueOnce(mockResponse)

            const topicArn = 'arn:aws:sns:us-east-1:123456789:test-topic'
            const message = { simple: 'message' }

            const result = await publishToTopic(topicArn, message)

            expect(mockSnsSend).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('SNS - sendSMS', () => {
        it('should send an SMS message', async () => {
            const mockResponse = { MessageId: 'sms-message-id' }
            mockSnsSend.mockResolvedValueOnce(mockResponse)

            const result = await sendSMS('+1234567890', 'Test SMS message')

            expect(mockSnsSend).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockResponse)
        })

        it('should handle international phone numbers', async () => {
            const mockResponse = { MessageId: 'sms-intl-id' }
            mockSnsSend.mockResolvedValueOnce(mockResponse)

            const result = await sendSMS('+573001234567', 'Mensaje de prueba')

            expect(mockSnsSend).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockResponse)
        })

        it('should handle send errors', async () => {
            const error = new Error('SMS delivery failed')
            mockSnsSend.mockRejectedValueOnce(error)

            await expect(sendSMS('+1234567890', 'Test')).rejects.toThrow('SMS delivery failed')
        })
    })
})
