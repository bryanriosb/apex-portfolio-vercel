'use server'

import {
    getRecordById,
    insertRecord,
    updateRecord,
    deleteRecord,
    getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
    CollectionTemplate,
    CollectionTemplateInsert,
    CollectionTemplateUpdate,
} from '@/lib/models/collection'

export interface TemplateListResponse {
    data: CollectionTemplate[]
    total: number
    total_pages: number
}

/**
 * Fetch templates for a business account
 */
export async function fetchTemplatesAction(params: {
    business_account_id: string
    page?: number
    page_size?: number
    template_type?: 'email' | 'sms' | 'whatsapp' | string[]
    is_active?: boolean
    search?: string
}): Promise<TemplateListResponse> {
    try {
        const supabase = await getSupabaseAdminClient()

        let query = supabase
            .from('collection_templates')
            .select('*', { count: 'exact' })
            .eq('business_account_id', params.business_account_id)
            .order('created_at', { ascending: false })

        // Filter by type
        if (params.template_type) {
            if (Array.isArray(params.template_type)) {
                query = query.in('template_type', params.template_type)
            } else {
                query = query.eq('template_type', params.template_type)
            }
        }

        // Filter by active status
        if (params.is_active !== undefined) {
            query = query.eq('is_active', params.is_active)
        }

        // Search
        if (params.search) {
            const searchTerm = `%${params.search}%`
            query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
        }

        // Pagination
        const page = params.page || 1
        const pageSize = params.page_size || 20
        const start = (page - 1) * pageSize
        const end = start + pageSize - 1

        query = query.range(start, end)

        const { data, error, count } = await query

        if (error) throw error

        return {
            data: data || [],
            total: count || 0,
            total_pages: Math.ceil((count || 0) / pageSize),
        }
    } catch (error) {
        console.error('Error fetching templates:', error)
        return { data: [], total: 0, total_pages: 0 }
    }
}

/**
 * Get template by ID
 */
export async function getTemplateByIdAction(
    id: string
): Promise<CollectionTemplate | null> {
    try {
        return await getRecordById<CollectionTemplate>('collection_templates', id)
    } catch (error) {
        console.error('Error fetching template:', error)
        return null
    }
}

/**
 * Sanitize template HTML to fix colspan="0" issues
 */
function sanitizeTemplateHtml(html: string): string {
    if (!html) return html;
    
    let sanitized = html;
    
    // Fix colspan="0" by consolidating consecutive cells
    // Pattern: multiple <td colspan="0"...> in a row
    const colspanZeroPattern = /<td[^>]*colspan=["']0["'][^>]*>[\s\S]*?<\/td>/gi;
    
    // Count occurrences in each row (using [\s\S] instead of dot with s flag)
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    sanitized = sanitized.replace(rowPattern, (match, rowContent) => {
        const matches = rowContent.match(colspanZeroPattern);
        if (matches && matches.length >= 5) {
            // Check if row contains Handlebars helpers
            const helperPattern = /\{\{[/#!]?\s*\w+[^}]*\}\}/;
            if (helperPattern.test(rowContent)) {
                // Find all cells with helpers
                const cellWithHelperPattern = /<td[^>]*colspan=["']0["'][^>]*>[\s\S]*?(\{\{[/#!]?\s*\w+[^}]*\}\})[\s\S]*?<\/td>/gi;
                const helpers: string[] = [];
                let cellMatch;
                while ((cellMatch = cellWithHelperPattern.exec(rowContent)) !== null) {
                    helpers.push(cellMatch[1]);
                }
                
                if (helpers.length > 0) {
                    // Build new row with proper colspan="5"
                    const newCells = helpers.map(helper => 
                        `<td colspan="5" style="padding: 8px; border: 1px solid rgb(229, 231, 235);"><p>${helper}</p></td>`
                    ).join('');
                    
                    return `<tr>${newCells}</tr>`;
                }
            }
        }
        return match;
    });
    
    return sanitized;
}

/**
 * Create template
 */
export async function createTemplateAction(
    data: CollectionTemplateInsert
): Promise<{ success: boolean; data?: CollectionTemplate; error?: string }> {
    try {
        // Sanitize HTML content before saving
        const sanitizedData = {
            ...data,
            content_html: sanitizeTemplateHtml(data.content_html || ''),
            is_active: data.is_active !== undefined ? data.is_active : true,
        };
        
        const template = await insertRecord<CollectionTemplate>(
            'collection_templates',
            sanitizedData
        )

        if (!template) {
            return { success: false, error: 'Error al crear la plantilla' }
        }

        return { success: true, data: template }
    } catch (error: any) {
        console.error('Error creating template:', error)
        return { success: false, error: error.message || 'Error desconocido' }
    }
}

/**
 * Update template
 */
export async function updateTemplateAction(
    id: string,
    data: CollectionTemplateUpdate
): Promise<{ success: boolean; data?: CollectionTemplate; error?: string }> {
    try {
        // Sanitize HTML content before saving if content_html is being updated
        const sanitizedData: CollectionTemplateUpdate = {
            ...data,
        }
        
        if (data.content_html !== undefined && data.content_html !== null) {
            sanitizedData.content_html = sanitizeTemplateHtml(data.content_html)
        }
        
        const template = await updateRecord<CollectionTemplate>(
            'collection_templates',
            id,
            sanitizedData
        )

        if (!template) {
            return { success: false, error: 'Error al actualizar la plantilla' }
        }

        return { success: true, data: template }
    } catch (error: any) {
        console.error('Error updating template:', error)
        return { success: false, error: error.message || 'Error desconocido' }
    }
}

/**
 * Delete template
 */
export async function deleteTemplateAction(
    id: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteRecord('collection_templates', id)
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting template:', error)
        return { success: false, error: error.message || 'Error desconocido' }
    }
}

/**
 * Get active templates by type
 */
export async function getActiveTemplatesByTypeAction(
    businessAccountId: string,
    templateType: 'email' | 'sms' | 'whatsapp'
): Promise<CollectionTemplate[]> {
    try {
        const supabase = await getSupabaseAdminClient()

        const { data, error } = await supabase
            .from('collection_templates')
            .select('*')
            .eq('business_account_id', businessAccountId)
            .eq('template_type', templateType)
            .eq('is_active', true)
            .order('name', { ascending: true })

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('Error fetching active templates:', error)
        return []
    }
}
