'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity } from 'lucide-react'

interface RecentExecutionsProps {
    executions: any[]
    loading: boolean
    formatDate: (date: string | null | undefined) => string
    getStatusColor: (status: string) => string
}

export const RecentExecutions: React.FC<RecentExecutionsProps> = ({
    executions,
    loading,
    formatDate,
    getStatusColor,
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Ejecuciones Recientes</h2>
                <Link href="/admin/collection/executions">
                    <Button variant="outline" size="sm">Ver Todas</Button>
                </Link>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="rounded-none border">
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between animate-pulse">
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 w-1/4 rounded"></div>
                                        <div className="h-3 bg-gray-200 w-1/2 rounded"></div>
                                    </div>
                                    <div className="h-4 bg-gray-200 w-16 rounded"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : executions.length === 0 ? (
                <Card className="rounded-none border border-dashed">
                    <CardContent className="py-8 text-center">
                        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Sin ejecuciones aún</h3>
                        <p className="text-muted-foreground mb-4">Crea tu primera campaña de cobro</p>
                        <Link href="/admin/collection/campaing">
                            <Button>Crear Campaña</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {executions.map((exec) => (
                        <Card key={exec.id} className="rounded-none border">
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold truncate">{exec.name}</h3>
                                            <Badge className={`text-xs ${getStatusColor(exec.status)}`}>
                                                {exec.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {exec.total_clients} clientes • {exec.emails_sent} enviados •{' '}
                                            {exec.emails_opened || 0} abiertos
                                        </p>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        <p>{formatDate(exec.created_at)}</p>
                                        <p className="text-green-600 font-semibold">
                                            {exec.avg_open_rate?.toFixed(1) || 0}% Vistos
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
