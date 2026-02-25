import { CollectionExecution, CollectionExecutionInsert } from '@/lib/models/collection/execution'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand, FlexibleTimeWindowMode } from '@aws-sdk/client-scheduler'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

// Lazy initialization of AWS Clients to prevent blocking during module load
let schedulerClient: SchedulerClient | null = null
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

const getSchedulerClient = () => {
    if (!schedulerClient) {
        console.log('[AWS Config] Initializing Scheduler client...')
        schedulerClient = new SchedulerClient(getAWSConfig())
    }
    return schedulerClient
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
     * Convert a local date/time to a cron expression for EventBridge Scheduler
     * EventBridge Scheduler supports timezone, so we can use local time directly
     * 
     * @param localDate - The date/time in local timezone
     * @param timezone - The timezone identifier (e.g., 'America/Bogota')
     * @returns EventBridge cron expression in local time
     */
    private static convertToCronExpression(localDate: Date, timezone: string): string {
        // Convert the UTC date to the target timezone to extract local components
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        })
        
        const parts = formatter.formatToParts(localDate)
        const getPart = (type: string) => parts.find(p => p.type === type)?.value
        
        const year = parseInt(getPart('year') || '0')
        const month = parseInt(getPart('month') || '0')
        const day = parseInt(getPart('day') || '0')
        const hour = parseInt(getPart('hour') || '0')
        const minute = parseInt(getPart('minute') || '0')
        
        // Format: cron(minutes hours day-of-month month day-of-week year)
        // Using '?' for day-of-week as per AWS EventBridge requirements
        const cronExpression = `cron(${minute} ${hour} ${day} ${month} ? ${year})`

        console.log(`[scheduleExecution] Timezone: ${timezone}`)
        console.log(`[scheduleExecution] Local time (${timezone}): ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
        console.log(`[scheduleExecution] Cron expression: ${cronExpression}`)

        return cronExpression
    }

    /**
     * Schedule an execution using EventBridge Scheduler with timezone support
     * @param executionId - The execution ID to schedule
     * @param scheduledDate - The date/time in local timezone (e.g., America/Bogota)
     * @param timezone - The timezone to use for scheduling (default: America/Bogota)
     */
    static async scheduleExecution(executionId: string, scheduledDate: Date, timezone: string = 'America/Bogota') {
        const scheduleName = `collection-exec-${executionId}`
        
        // Validate required env vars
        const lambdaArn = process.env.LAMBDA_EMAIL_WORKER_ARN
        const schedulerRoleArn = process.env.EVENTBRIDGE_SCHEDULER_ROLE_ARN
        
        if (!lambdaArn) {
            throw new Error('LAMBDA_EMAIL_WORKER_ARN environment variable is not set')
        }
        
        if (!schedulerRoleArn) {
            throw new Error('EVENTBRIDGE_SCHEDULER_ROLE_ARN environment variable is not set. This IAM role is required for EventBridge Scheduler to invoke Lambda.')
        }

        console.log(`[scheduleExecution] Starting scheduling for execution ${executionId}`)
        console.log(`[scheduleExecution] Lambda ARN: ${lambdaArn}`)
        console.log(`[scheduleExecution] Scheduler Role ARN: ${schedulerRoleArn}`)
        console.log(`[scheduleExecution] Scheduled date (input): ${scheduledDate.toISOString()}`)
        console.log(`[scheduleExecution] Timezone: ${timezone}`)

        // Convert date to cron expression (in local timezone, not UTC)
        // EventBridge Scheduler will handle the timezone conversion internally
        const cronExpression = this.convertToCronExpression(scheduledDate, timezone)
        
        console.log(`[scheduleExecution] Final cron expression: ${cronExpression}`)

        try {
            // Create Schedule using EventBridge Scheduler
            console.log(`[scheduleExecution] Creating EventBridge Schedule: ${scheduleName}`)
            
            const createScheduleCommand = new CreateScheduleCommand({
                Name: scheduleName,
                ScheduleExpression: cronExpression,
                ScheduleExpressionTimezone: timezone, // This is the key - AWS handles timezone conversion
                State: 'ENABLED',
                Description: `Scheduled collection execution for ID: ${executionId}`,
                Target: {
                    Arn: lambdaArn,
                    RoleArn: schedulerRoleArn,
                    Input: JSON.stringify({
                        execution_id: executionId,
                        action: 'start_execution'
                    })
                },
                // Optional: configure flexible time window
                FlexibleTimeWindow: {
                    Mode: FlexibleTimeWindowMode.OFF
                },
                // Group name for organizing schedules (uses 'default' group which always exists)
                GroupName: 'default'
            })

            const scheduleResult = await getSchedulerClient().send(createScheduleCommand)
            console.log(`[scheduleExecution] Schedule created successfully:`, scheduleResult)

            console.log(`[scheduleExecution] Successfully scheduled execution ${executionId} with schedule ${scheduleName}`)
            return { ruleName: scheduleName }
        } catch (error: any) {
            console.error('[scheduleExecution] Error scheduling execution:', error)
            console.error('[scheduleExecution] Error details:', {
                message: error.message,
                name: error.name,
                code: error.Code || error.code,
                requestId: error.$metadata?.requestId
            })
            throw new Error(`Failed to schedule execution: ${error.message}`)
        }
    }

    /**
     * Cancel a scheduled execution
     */
    static async cancelScheduledExecution(scheduleName: string) {
        if (!scheduleName) return

        try {
            // Delete Schedule using EventBridge Scheduler
            await getSchedulerClient().send(new DeleteScheduleCommand({
                Name: scheduleName,
                GroupName: 'default'
            }))
            console.log(`[cancelScheduledExecution] Successfully deleted schedule: ${scheduleName}`)
        } catch (error: any) {
            // Log but don't block if schedule possibly already deleted
            if (error.name === 'ResourceNotFoundException') {
                console.log(`[cancelScheduledExecution] Schedule ${scheduleName} already deleted or does not exist`)
            } else {
                console.error('[cancelScheduledExecution] Error cancelling scheduled execution:', error)
            }
        }
    }
}