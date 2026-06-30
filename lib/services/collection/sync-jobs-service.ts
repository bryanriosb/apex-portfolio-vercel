import {
  listSyncJobsAction,
  createImmediateSyncAction,
  createScheduledSyncAction,
  getSyncProgressAction,
  cancelSyncJobAction
} from '@/lib/actions/collection/sync-jobs-actions'
import type {
  CollectionSyncPayload,
  EnqueueJobRequest,
  SyncEnqueueResponse,
  SyncProgressResponse,
  JobRecord
} from '@/lib/models/collection/sync-jobs'

export class SyncJobsService {
  private accessToken: string
  private businessId: string
  private businessAccountId: string

  constructor(accessToken: string, businessId: string, businessAccountId: string) {
    this.accessToken = accessToken
    this.businessId = businessId
    this.businessAccountId = businessAccountId
  }

  async listJobs(): Promise<JobRecord[]> {
    return listSyncJobsAction(this.businessId, this.accessToken)
  }

  async createImmediateSync(payload: CollectionSyncPayload, connectorId?: string): Promise<SyncEnqueueResponse> {
    return createImmediateSyncAction(payload, this.accessToken, connectorId || this.businessAccountId)
  }

  async createScheduledSync(payload: EnqueueJobRequest): Promise<SyncEnqueueResponse> {
    // The EnqueueJobRequest requires business_id which we inject if not provided
    const requestPayload: EnqueueJobRequest = {
      ...payload,
      business_id: payload.business_id || this.businessId
    }
    return createScheduledSyncAction(requestPayload, this.accessToken)
  }

  async getSyncProgress(jobId: string): Promise<SyncProgressResponse> {
    return getSyncProgressAction(jobId, this.accessToken)
  }

  async cancelSyncJob(jobId: string): Promise<void> {
    return cancelSyncJobAction(jobId, this.accessToken)
  }

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    const { updateJobStatusAction } = await import('@/lib/actions/collection/sync-jobs-actions')
    return updateJobStatusAction(jobId, status, this.accessToken)
  }
}
