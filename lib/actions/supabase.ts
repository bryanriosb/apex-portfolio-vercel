'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

// Define a generic database type
type Database = any

// Singleton instance for regular client (anon key)
let supabaseClient: ReturnType<typeof createSupabaseClient<Database>> | null =
  null

// Singleton instance for admin client (service role key)
let supabaseAdminClient: ReturnType<
  typeof createSupabaseClient<Database>
> | null = null

/**
 * Gets or creates a singleton Supabase client with anon key
 * Use this for operations that respect Row Level Security (RLS)
 */
export async function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient<Database>(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  }
  return supabaseClient
}

/**
 * Gets or creates a singleton Supabase admin client with service role key
 * Use with caution - this bypasses Row Level Security (RLS)
 * Only use for privileged operations like user management, admin queries, etc.
 */
export async function getSupabaseAdminClient() {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseClient<Database>(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          fetch: (url, options) => {
            return fetch(url, { ...options, cache: 'no-store' })
          },
        },
      }
    )
  }
  return supabaseAdminClient
}

/**
 * Generic query function for fetching data from Supabase
 */
export async function queryTable<T = any>(
  tableName: string,
  options?: {
    select?: string
    filters?: Record<string, any>
    order?: { column: string; ascending?: boolean }
    limit?: number
    offset?: number
    single?: boolean
  }
): Promise<T | T[] | null> {
  try {
    const client = await getSupabaseAdminClient()
    let query = client.from(tableName).select(options?.select || '*')

    // Apply filters
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    // Apply ordering
    if (options?.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending ?? true,
      })
    }

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    // Apply offset
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      )
    }

    // Execute query
    const { data, error } = options?.single ? await query.single() : await query

    if (error) {
      console.error(`Error querying ${tableName}:`, error)
      throw error
    }

    return data as T | T[]
  } catch (error) {
    console.error(`Error in queryTable for ${tableName}:`, error)
    throw error
  }
}

/**
 * Insert a new record into a table
 */
export async function insertRecord<T = any>(
  tableName: string,
  data: Record<string, any>
): Promise<T | null> {
  try {
    const client = await getSupabaseAdminClient()
    const { data: result, error } = await client
      .from(tableName)
      .insert(data as any)
      .select()
      .single()

    if (error) {
      console.error(`Error inserting into ${tableName}:`, error)
      throw error
    }

    return result as T
  } catch (error) {
    console.error(`Error in insertRecord for ${tableName}:`, error)
    throw error
  }
}

/**
 * Update a record in a table
 */
export async function updateRecord<T = any>(
  tableName: string,
  id: string,
  data: Record<string, any>
): Promise<T | null> {
  try {
    const client = await getSupabaseAdminClient()
    const { data: result, error } = await client
      .from(tableName)
      .update(data as any)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating ${tableName}:`, error)
      throw error
    }

    return result as T
  } catch (error) {
    console.error(`Error in updateRecord for ${tableName}:`, error)
    throw error
  }
}

/**
 * Delete a record from a table
 */
export async function deleteRecord(
  tableName: string,
  id: string
): Promise<void> {
  try {
    const client = await getSupabaseAdminClient()
    const { error } = await client.from(tableName).delete().eq('id', id)

    if (error) {
      console.error(`Error deleting from ${tableName}:`, error)
      throw error
    }
  } catch (error) {
    console.error(`Error in deleteRecord for ${tableName}:`, error)
    throw error
  }
}

/**
 * Delete multiple records from a table by IDs
 */
export async function deleteRecords(
  tableName: string,
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  if (!ids.length) {
    return { success: true, deletedCount: 0 }
  }

  try {
    const client = await getSupabaseAdminClient()
    const { error } = await client.from(tableName).delete().in('id', ids)

    if (error) {
      console.error(`Error batch deleting from ${tableName}:`, error)
      throw error
    }

    return { success: true, deletedCount: ids.length }
  } catch (error: any) {
    console.error(`Error in deleteRecords for ${tableName}:`, error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}

/**
 * Get a single record by ID
 */
export async function getRecordById<T = any>(
  tableName: string,
  id: string,
  select?: string
): Promise<T | null> {
  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from(tableName)
      .select(select || '*')
      .eq('id', id)
      .single()

    if (error) {
      console.error(`Error getting record from ${tableName}:`, error)
      throw error
    }

    return data as T
  } catch (error) {
    console.error(`Error in getRecordById for ${tableName}:`, error)
    throw error
  }
}

/**
 * Get all records from a table with optional filters
 */
export async function getAllRecords<T = any>(
  tableName: string,
  options?: {
    select?: string
    filters?: Record<string, any>
    order?: { column: string; ascending?: boolean }
  }
): Promise<T[]> {
  try {
    const client = await getSupabaseAdminClient()
    let query = client.from(tableName).select(options?.select || '*')

    // Apply filters
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    // Apply ordering
    if (options?.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending ?? true,
      })
    }

    const { data, error } = await query

    if (error) {
      console.error(`Error getting all records from ${tableName}:`, error)
      throw error
    }

    return (data as T[]) || []
  } catch (error) {
    console.error(`Error in getAllRecords for ${tableName}:`, error)
    throw error
  }
}
