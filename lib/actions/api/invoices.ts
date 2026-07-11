'use server'

import type { AxiosError } from 'axios'
import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import type {
  Invoice,
  InvoiceListParams,
  InvoiceCreatePayload,
  InvoiceUpdatePayload,
  InvoicesPaginatedResponse,
} from '@/lib/models/invoice/types'

function extractApiError(error: unknown): string {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>
  if (axiosError.response?.data) {
    const data = axiosError.response.data
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
  }
  if (error instanceof Error) return error.message
  return 'Error inesperado en la operación'
}

async function handleApiCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    throw new Error(extractApiError(error))
  }
}

export async function listInvoicesAction(
  params?: InvoiceListParams
): Promise<InvoicesPaginatedResponse> {
  return handleApiCall(async () => {
    const queryParams: Record<string, string> = {}
    if (params?.page) queryParams.page = String(params.page)
    if (params?.per_page) queryParams.per_page = String(params.per_page)
    if (params?.status) queryParams.status = params.status
    if (params?.client_id) queryParams.client_id = params.client_id
    if (params?.from_date) queryParams.from_date = params.from_date
    if (params?.to_date) queryParams.to_date = params.to_date
    if (params?.search) queryParams.search = params.search
    if (params?.sort_by) queryParams.sort_by = params.sort_by
    if (params?.sort_order) queryParams.sort_order = params.sort_order

    const response = await apiApexAiAuth.get('/ontology/invoices', {
      params: queryParams,
    })
    return response.data
  })
}

export async function getInvoiceAction(id: string): Promise<Invoice> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get(`/ontology/invoices/${id}`)
    return response.data
  })
}

export async function createInvoiceAction(
  data: InvoiceCreatePayload
): Promise<Invoice> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.post('/ontology/invoices', data)
    return response.data
  })
}

export async function updateInvoiceAction(
  id: string,
  data: InvoiceUpdatePayload
): Promise<Invoice> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.patch(
      `/ontology/invoices/${id}`,
      data
    )
    return response.data
  })
}

export async function deleteInvoiceAction(id: string): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.delete(`/ontology/invoices/${id}`)
  })
}
