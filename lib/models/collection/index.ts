// Collection Models - Centralized Exports
export * from './execution'
export * from './client'
export * from './template'
export * from './attachment'
export * from './event'
export * from './config'
export * from './email-reputation'
export * from './delivery-strategy'
export * from './execution-batch'
export * from './batch-queue-message'
export * from './daily-sending-limit'
export * from './warmup-progression-rule'
export * from './notification-threshold'
export * from './attachment-rule'

// Re-export commonly used types
export type {
    CollectionExecution,
    CollectionExecutionInsert,
    CollectionExecutionUpdate,
    ExecutionStatus,
} from './execution'

export type {
    CollectionClient,
    CollectionClientInsert,
    CollectionClientUpdate,
    ClientStatus,
    BounceType,
    FallbackType,
} from './client'

export type {
    CollectionTemplate,
    CollectionTemplateInsert,
    CollectionTemplateUpdate,
    TemplateType,
} from './template'

export type {
    CollectionAttachment,
    CollectionAttachmentInsert,
    CollectionAttachmentUpdate,
} from './attachment'

export type {
    CollectionEvent,
    CollectionEventInsert,
    EventType,
    EventStatus,
} from './event'

export type {
    CollectionConfig,
    CollectionConfigInsert,
    CollectionConfigUpdate,
} from './config'

export type {
    EmailReputationProfile,
    EmailReputationProfileInsert,
    EmailReputationProfileUpdate,
} from './email-reputation'

export type {
    DeliveryStrategy,
    DeliveryStrategyInsert,
    DeliveryStrategyUpdate,
    StrategyType,
} from './delivery-strategy'

export type {
    ExecutionBatch,
    ExecutionBatchInsert,
    ExecutionBatchUpdate,
    BatchStatus,
} from './execution-batch'

export type {
    BatchQueueMessage,
    BatchQueueMessageInsert,
    BatchQueueMessageUpdate,
    QueueMessageStatus,
} from './batch-queue-message'

export type {
    DailySendingLimit,
    DailySendingLimitInsert,
    DailySendingLimitUpdate,
} from './daily-sending-limit'

export type {
    WarmupProgressionRule,
    WarmupProgressionRuleInsert,
} from './warmup-progression-rule'

export type {
    NotificationThreshold,
    NotificationThresholdInsert,
    NotificationThresholdUpdate,
} from './notification-threshold'

export type {
    AttachmentRule,
    AttachmentRuleInsert,
    AttachmentRuleType,
    ResolvedAttachment,
} from './attachment-rule'
