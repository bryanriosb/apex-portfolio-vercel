import { CollectionExecution, CollectionExecutionInsert } from '@/lib/models/collection/execution'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { EventBridgeClient, PutRuleCommand, PutTargetsCommand, DeleteRuleCommand, RemoveTargetsCommand } from '@aws-sdk/client-eventbridge'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

// Lazy initialization of AWS Clients to prevent blocking during module load
let eventBridgeClient: EventBridgeClient | null = null
let lambdaClient: LambdaClient | null = null

const getAWSConfig = () => {
    const region = process.env.AWS_REGION || 'us-east-1'
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    
    if (!accessKeyId || !secretAccessKey) {
        console.error('[AWS Config] Missing AWS credentials!')
        throw new Error('AWS credentials not configured')
    }
    
    return {
        region,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    }
}

const getEventBridgeClient = () => {
    if (!eventBridgeClient) {
        console.log('[AWS Config] Initializing EventBridge client...')
        eventBridgeClient = new EventBridgeClient(getAWSConfig())
    }
    return eventBridgeClient
}

const getLambdaClient = () => {
    if (!lambdaClient) {
        console.log('[AWS Config] Initializing Lambda client...')
        lambdaClient = new LambdaClient(getAWSConfig())
    }
    return lambdaClient
}

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

            await getLambdaClient().send(command)
            return { success: true }
        } catch (error) {
            console.error('Error starting immediate execution:', error)
            throw new Error('Failed to trigger execution worker')
        }
    }

    /**
     * Convert a local date/time to a UTC cron expression for EventBridge
     * Handles timezone conversion properly for scheduling
     * 
     * @param localDate - The date/time in local timezone
     * @param timezone - The timezone identifier (e.g., 'America/Bogota')
     * @returns EventBridge cron expression in UTC
     */
    private static convertToCronExpression(localDate: Date, timezone: string): string {
        // The input date (localDate) is already in UTC format from new Date() parsing
        // We just need to extract the UTC components for the cron expression
        // EventBridge requires UTC times
        
        // Get UTC components directly - localDate is already in UTC
        const utcMinutes = localDate.getUTCMinutes()
        const utcHours = localDate.getUTCHours()
        const utcDayOfMonth = localDate.getUTCDate()
        const utcMonth = localDate.getUTCMonth() + 1
        const utcYear = localDate.getUTCFullYear()
        
        // For logging, show the local time in the specified timezone
        const localTimeStr = localDate.toLocaleString('es-CO', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })

        console.log(`[scheduleExecution] Input timezone: ${timezone}`)
        console.log(`[scheduleExecution] Local time (${timezone}): ${localTimeStr}`)
        console.log(`[scheduleExecution] UTC time: ${utcYear}-${String(utcMonth).padStart(2, '0')}-${String(utcDayOfMonth).padStart(2, '0')} ${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`)
        console.log(`[scheduleExecution] Cron expression: cron(${utcMinutes} ${utcHours} ${utcDayOfMonth} ${utcMonth} ? ${utcYear})`)

        return `cron(${utcMinutes} ${utcHours} ${utcDayOfMonth} ${utcMonth} ? ${utcYear})`
    }

    /**
     * Schedule an execution using EventBridge
     * @param executionId - The execution ID to schedule
     * @param scheduledDate - The date/time in local timezone (e.g., America/Bogota)
     * @param timezone - The timezone to use for scheduling (default: America/Bogota)
     */
    static async scheduleExecution(executionId: string, scheduledDate: Date, timezone: string = 'America/Bogota') {
        const ruleName = `collection-exec-${executionId}`
        
        // Validate required env vars
        const lambdaArn = process.env.LAMBDA_EMAIL_WORKER_ARN
        if (!lambdaArn) {
            throw new Error('LAMBDA_EMAIL_WORKER_ARN environment variable is not set')
        }

        console.log(`[scheduleExecution] Starting scheduling for execution ${executionId}`)
        console.log(`[scheduleExecution] Lambda ARN: ${lambdaArn}`)
        console.log(`[scheduleExecution] Scheduled date (input): ${scheduledDate.toISOString()}`)
        console.log(`[scheduleExecution] Timezone: ${timezone}`)

        // Convert local date/time to UTC for EventBridge cron expression
        // EventBridge requires UTC times in the cron expression
        const cronExpression = this.convertToCronExpression(scheduledDate, timezone)
        
        console.log(`[scheduleExecution] Final cron expression: ${cronExpression}`)

        try {
            // 1. Create Rule
            console.log(`[scheduleExecution] Creating EventBridge rule: ${ruleName}`)
            const putRuleCommand = new PutRuleCommand({
                Name: ruleName,
                ScheduleExpression: cronExpression,
                State: 'ENABLED',
                Description: `Scheduled collection execution for ID: ${executionId}`
            })

            const ruleResult = await getEventBridgeClient().send(putRuleCommand)
            console.log(`[scheduleExecution] Rule created successfully:`, ruleResult)

            // 2. Add Target (Lambda)
            console.log(`[scheduleExecution] Adding Lambda target to rule`)
            const putTargetsCommand = new PutTargetsCommand({
                Rule: ruleName,
                Targets: [
                    {
                        Id: '1',
                        Arn: lambdaArn,
                        Input: JSON.stringify({
                            execution_id: executionId,
                            action: 'start_execution'
                        })
                    }
                ]
            })

            const targetResult = await getEventBridgeClient().send(putTargetsCommand)
            console.log(`[scheduleExecution] Target added successfully:`, targetResult)

            console.log(`[scheduleExecution] Successfully scheduled execution ${executionId} with rule ${ruleName}`)
            return { ruleName }
        } catch (error: any) {
            console.error('[scheduleExecution] Error scheduling execution:', error)
            console.error('[scheduleExecution] Error details:', {
                message: error.message,
                name: error.name,
                code: error.Code || error.code,
                requestId: error.$metadata?.requestId
            })
            // Attempt to rollback rule creation if target fails
            try {
                console.log(`[scheduleExecution] Attempting to rollback rule ${ruleName}`)
                await this.cancelScheduledExecution(ruleName)
                console.log(`[scheduleExecution] Rollback successful`)
            } catch (rollbackError) {
                console.error('[scheduleExecution] Rollback failed:', rollbackError)
            }
            throw new Error(`Failed to schedule execution: ${error.message}`)
        }
    }

    /**
     * Cancel a scheduled execution
     */
    static async cancelScheduledExecution(ruleName: string) {
        if (!ruleName) return

        try {
            // 1. Remove Targets
            await getEventBridgeClient().send(new RemoveTargetsCommand({
                Rule: ruleName,
                Ids: ['1']
            }))

            // 2. Delete Rule
            await getEventBridgeClient().send(new DeleteRuleCommand({
                Name: ruleName
            }))
        } catch (error) {
            console.error('Error cancelling scheduled execution:', error)
            // Log but don't block if rule possibly already deleted
        }
    }
}
