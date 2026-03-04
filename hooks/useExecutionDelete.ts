'use client'

import { useState } from 'react'
import { Table } from '@tanstack/react-table'
import { CollectionExecution } from '@/lib/models/collection'

interface UseExecutionDeleteOptions {
    onSuccess?: () => void
    onError?: (error: string) => void
}

export function useExecutionDelete(options: UseExecutionDeleteOptions = {}) {
    const [isDeleting, setIsDeleting] = useState(false)

    const deleteExecution = async (id: string) => {
        setIsDeleting(true)
        try {
            const response = await fetch(`/api/collection/executions/${id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                options.onSuccess?.()
            } else {
                const errorData = await response.json()
                options.onError?.(errorData.error || 'Error al eliminar la ejecución')
            }
        } catch (error: any) {
            options.onError?.(error.message || 'Error de conexión')
        } finally {
            setIsDeleting(false)
        }
    }

    const deleteMultipleExecutions = async (ids: string[]) => {
        setIsDeleting(true)
        try {
            const response = await fetch('/api/collection/executions/bulk-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids }),
            })

            if (response.ok) {
                options.onSuccess?.()
            } else {
                const errorData = await response.json()
                options.onError?.(errorData.error || 'Error al eliminar las ejecuciones')
            }
        } catch (error: any) {
            options.onError?.(error.message || 'Error de conexión')
        } finally {
            setIsDeleting(false)
        }
    }

    return {
        deleteExecution,
        deleteMultipleExecutions,
        isDeleting,
    }
}