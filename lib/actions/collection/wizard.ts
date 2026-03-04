'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { BusinessCustomer } from '@/lib/models/customer/business-customer'

export interface CustomerBatchResponse {
    success: boolean
    data: Map<string, BusinessCustomer>
    notFound: string[]
    error?: string
}

export async function fetchCustomersByNitsAction(
    businessId: string,
    nits: string[]
): Promise<CustomerBatchResponse> {
    try {
        const supabase = await getSupabaseAdminClient()

        console.log(`[fetchCustomersByNitsAction] Init for businessId: ${businessId}, count: ${nits.length}`)

        // Sanitize NITs: trim, ensuring string
        const uniqueNits = [...new Set(
            nits.map(n => String(n).trim()).filter(Boolean)
        )]

        console.log(`[fetchCustomersByNitsAction] Unique sanitized Nits:`, uniqueNits)

        if (uniqueNits.length === 0) {
            return {
                success: true,
                data: new Map(),
                notFound: []
            }
        }

        // Fetch customers in batch
        // We use chunking to avoid potential URL length limits or query complexity issues if nits array is huge
        // though for typical use cases (hundreds) it should be fine.
        const BATCH_SIZE = 500
        const allCustomers: BusinessCustomer[] = []

        for (let i = 0; i < uniqueNits.length; i += BATCH_SIZE) {
            const batch = uniqueNits.slice(i, i + BATCH_SIZE)
            console.log(`[fetchCustomersByNitsAction] Querying batch:`, batch)

            const { data, error } = await supabase
                .from('business_customers')
                .select('*')
                .eq('business_id', businessId)
                .eq('status', 'active')
                .in('nit', batch)

            if (error) {
                console.error('[fetchCustomersByNitsAction] Supabase error:', error)
                throw error
            }

            console.log(`[fetchCustomersByNitsAction] Found in batch:`, data?.length)
            if (data) allCustomers.push(...data)
        }

        // Map existing customers by NIT for O(1) lookup
        const customerMap = new Map<string, BusinessCustomer>()
        allCustomers.forEach(customer => {
            if (customer.nit) {
                customerMap.set(customer.nit.trim(), customer)
            }
        })

        console.log(`[fetchCustomersByNitsAction] Total customers found map size:`, customerMap.size)

        // Identify missing NITs
        const notFound = uniqueNits.filter(nit => !customerMap.has(nit))

        if (notFound.length > 0) {
            console.log(`[fetchCustomersByNitsAction] Missing NITs:`, notFound)
        }

        return {
            success: true,
            data: customerMap,
            notFound
        }

    } catch (error: any) {
        console.error('Error fetching customers by batch:', error)
        return {
            success: false,
            data: new Map(),
            notFound: [],
            error: error.message
        }
    }
}
