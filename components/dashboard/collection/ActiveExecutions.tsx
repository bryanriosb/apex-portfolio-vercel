'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Play } from 'lucide-react'
import { ActiveExecution } from '@/lib/models/collection/dashboard'

interface ActiveExecutionsProps {
    executions: ActiveExecution[]
    getStatusColor: (status: string) => string
}

export const ActiveExecutions: React.FC<ActiveExecutionsProps> = ({
    executions,
    getStatusColor,
}) => {
    if (executions.length === 0) return null

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <Play className="h-5 w-5 text-green-600 animate-pulse" />
                Ejecuciones en Progreso ({executions.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
                {executions.map((exec) => (
                    <Card key={exec.id} className="rounded-none border border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-base">{exec.name}</CardTitle>
                                    <CardDescription>
                                        {exec.strategy_type === 'immediate' ? 'Inmediata' : 'Programada'}
                                    </CardDescription>
                                </div>
                                <Badge className={getStatusColor(exec.status)}>{exec.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Progreso</span>
                                    <span className="font-medium">{exec.progress_percent}%</span>
                                </div>
                                <Progress value={exec.progress_percent} className="h-2" />
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <div className="bg-muted rounded p-1">
                                    <span className="text-muted-foreground block">Total</span>
                                    <p className="font-semibold">{exec.clientStats?.total || exec.total_clients}</p>
                                </div>
                                <div className="bg-muted rounded p-1">
                                    <span className="text-muted-foreground block">Enviados</span>
                                    <p className="font-semibold">{exec.clientStats?.sent || exec.emails_sent}</p>
                                </div>
                                <div className="bg-muted rounded p-1">
                                    <span className="text-muted-foreground block">Entregados</span>
                                    <p className="font-semibold">{exec.clientStats?.delivered || exec.emails_delivered}</p>
                                </div>
                                <div className="bg-muted rounded p-1">
                                    <span className="text-muted-foreground block">Abiertos</span>
                                    <p className="font-semibold">{exec.clientStats?.opened || exec.emails_opened}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
