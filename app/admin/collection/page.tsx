'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CollectionPage() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to dashboard (where Collection stats now live)
        router.replace('/admin/dashboard')
    }, [router])

    return (
        <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Redirigiendo al tablero...</p>
        </div>
    )
}