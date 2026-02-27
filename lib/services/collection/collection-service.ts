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
        const lambdaArn = process.env.LAMBDA_EMAIL_WORKER_ARN
        if (!lambdaArn) throw new Error('LAMBDA_EMAIL_WORKER_ARN not set')

        try {
            const command = new InvokeCommand({
                FunctionName: lambdaArn,
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
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        })

        const parts = formatter.formatToParts(localDate)
        const getPart = (type: string) => parts.find(p => p.type === type)?.value

        const year = parseInt(getPart('year') || '0')
        const month = parseInt(getPart('month') || '0')
        const day = parseInt(getPart('day') || '0')
        const hour = parseInt(getPart('hour') || '0')
        const minute = parseInt(getPart('minute') || '0')

        return `cron(${minute} ${hour} ${day} ${month} ? ${year})`
    }

    /**
     * Schedule a system wake-up using EventBridge Scheduler
     * @param executionId - The execution ID to schedule
     * @param scheduledDate - The date/time in local timezone (e.g., America/Bogota)
     * @param timezone - The timezone to use for scheduling (default: America/Bogota)
     */
    static async scheduleExecution(executionId: string, scheduledDate: Date, timezone: string = 'America/Bogota') {
        const scheduleName = `collection-email-${executionId}` // Unique name per execution

        const lambdaArn = process.env.LAMBDA_EMAIL_WORKER_ARN
        const schedulerRoleArn = process.env.EVENTBRIDGE_SCHEDULER_ROLE_ARN

        if (!lambdaArn || !schedulerRoleArn) {
            throw new Error('AWS environment variables (LAMBDA_EMAIL_WORKER_ARN, EVENTBRIDGE_SCHEDULER_ROLE_ARN) are not set')
        }

        const cronExpression = this.convertToCronExpression(scheduledDate, timezone)

        try {
            const createScheduleCommand = new CreateScheduleCommand({
                Name: scheduleName,
                ScheduleExpression: cronExpression,
                ScheduleExpressionTimezone: timezone,
                State: 'ENABLED',
                Description: `Scheduled wake-up for email worker`,
                Target: {
                    Arn: lambdaArn,
                    RoleArn: schedulerRoleArn,
                    Input: JSON.stringify({
                        source: 'eventbridge_scheduler',
                        execution_id: executionId,
                        action: 'wake_up'
                    })
                },
                FlexibleTimeWindow: {
                    Mode: FlexibleTimeWindowMode.OFF
                },
                GroupName: 'default',
                ActionAfterCompletion: 'DELETE'
            })

            // Note: If schedule already exists, this might need an update command instead of create.
            // But with DELETE after completion, we can usually just create it.
            // However, starting a new campaign might need to update an existing schedule if the new one is EARLIER.
            // For now, let's keep it simple.
            await getSchedulerClient().send(createScheduleCommand)

            return { ruleName: scheduleName }
        } catch (error: any) {
            if (error.name === 'ConflictException') {
                // Should handle update here if needed
                console.warn('[scheduleExecution] Schedule already exists. We should update it if the new time is earlier.')
            }
            console.error('[scheduleExecution] Error scheduling:', error)
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