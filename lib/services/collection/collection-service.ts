import { CollectionExecution, CollectionExecutionInsert } from '@/lib/models/collection/execution'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { EventBridgeClient, PutRuleCommand, PutTargetsCommand, DeleteRuleCommand, RemoveTargetsCommand } from '@aws-sdk/client-eventbridge'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

// Initialize AWS Clients
const eventBridgeClient = new EventBridgeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
})

const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
})

export class CollectionService {
    /**
     * Start an immediate execution by triggering the Lambda worker
     */
    static async startImmediateExecution(executionId: string) {
        try {
            const command = new InvokeCommand({
                FunctionName: process.env.LAMBDA_EMAIL_WORKER_ARN,
                InvocationType: 'Event', // Asynchronous invocation
                Payload: JSON.stringify({
                    execution_id: executionId,
                    action: 'start_execution'
                })
            })

            await lambdaClient.send(command)
            return { success: true }
        } catch (error) {
            console.error('Error starting immediate execution:', error)
            throw new Error('Failed to trigger execution worker')
        }
    }

    /**
     * Schedule an execution using EventBridge
     */
    static async scheduleExecution(executionId: string, scheduledDate: Date) {
        const ruleName = `collection-exec-${executionId}`

        // Convert date to cron expression (UTC)
        // Cron format: Minutes Hours Day-of-month Month Day-of-week Year
        const minutes = scheduledDate.getUTCMinutes()
        const hours = scheduledDate.getUTCHours()
        const dayOfMonth = scheduledDate.getUTCDate()
        const month = scheduledDate.getUTCMonth() + 1 // 1-12
        const year = scheduledDate.getUTCFullYear()

        const cronExpression = `cron(${minutes} ${hours} ${dayOfMonth} ${month} ? ${year})`

        try {
            // 1. Create Rule
            const putRuleCommand = new PutRuleCommand({
                Name: ruleName,
                ScheduleExpression: cronExpression,
                State: 'ENABLED',
                Description: `Scheduled collection execution for ID: ${executionId}`
            })

            await eventBridgeClient.send(putRuleCommand)

            // 2. Add Target (Lambda)
            const putTargetsCommand = new PutTargetsCommand({
                Rule: ruleName,
                Targets: [
                    {
                        Id: '1',
                        Arn: process.env.LAMBDA_EMAIL_WORKER_ARN,
                        Input: JSON.stringify({
                            execution_id: executionId,
                            action: 'start_execution'
                        })
                    }
                ]
            })

            await eventBridgeClient.send(putTargetsCommand)

            return { ruleName }
        } catch (error) {
            console.error('Error scheduling execution:', error)
            // Rollback rule creation if target fails?
            // For now just throw
            throw new Error('Failed to schedule execution')
        }
    }

    /**
     * Cancel a scheduled execution
     */
    static async cancelScheduledExecution(ruleName: string) {
        if (!ruleName) return

        try {
            // 1. Remove Targets
            await eventBridgeClient.send(new RemoveTargetsCommand({
                Rule: ruleName,
                Ids: ['1']
            }))

            // 2. Delete Rule
            await eventBridgeClient.send(new DeleteRuleCommand({
                Name: ruleName
            }))
        } catch (error) {
            console.error('Error cancelling scheduled execution:', error)
            // Log but don't block if rule possibly already deleted
        }
    }
}
