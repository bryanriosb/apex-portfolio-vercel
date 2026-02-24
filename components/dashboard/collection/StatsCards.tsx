'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
    Mail,
    Target,
    CheckCircle,
    AlertCircle,
    Activity,
    Zap,
    Clock,
    Shield,
} from 'lucide-react'
import { DashboardStats } from '@/lib/models/collection/dashboard'

interface StatsCardsProps {
    stats: DashboardStats | null
    statsLoading: boolean
    reputationLoading: boolean
    reputationCount: number
    warmedCount: number
    formatDate: (date: string | null | undefined) => string
}

export const StatsCards: React.FC<StatsCardsProps> = ({
    stats,
    statsLoading,
    reputationLoading,
    reputationCount,
    warmedCount,
    formatDate,
}) => {
    return (
        <div className="space-y-6">
            {/* Main Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-none border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Enviados</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {(stats?.total_emails_sent || 0).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-muted-foreground">
                                        Hoy: {(stats?.today_emails_sent || 0).toLocaleString()}
                                    </p>
                                    {stats && stats.today_emails_sent > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                            {(
                                                (stats.today_emails_sent /
                                                    Math.max(stats.total_emails_sent, 1)) *
                                                100
                                            ).toFixed(0)}
                                            %
                                        </Badge>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-none border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tasa de Apertura</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats?.avg_open_rate || 0}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {(stats?.total_emails_opened || 0).toLocaleString()} abiertos
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-none border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tasa de Entrega</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats?.avg_delivery_rate || 0}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {(stats?.total_emails_delivered || 0).toLocaleString()} de{' '}
                                    {(stats?.total_emails_sent || 0).toLocaleString()}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-none border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tasa de Rebote</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div
                                    className={`text-2xl font-bold ${(stats?.avg_bounce_rate || 0) > 5
                                        ? 'text-red-600'
                                        : (stats?.avg_bounce_rate || 0) > 2
                                            ? 'text-yellow-600'
                                            : 'text-primary'
                                        }`}
                                >
                                    {stats?.avg_bounce_rate || 0}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {(stats?.total_emails_bounced || 0).toLocaleString()} rebotados
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-none border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ejecuciones Totales</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats?.total_executions || 0}</div>
                                <div className="flex gap-2 text-xs mt-1">
                                    <Badge variant="outline" className="text-xs">
                                        {stats?.completed_executions || 0} completadas
                                    </Badge>
                                    {stats?.failed_executions ? (
                                        <Badge variant="destructive" className="text-xs">
                                            {stats.failed_executions} fallidas
                                        </Badge>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-none border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats?.processing_executions || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    {stats?.pending_executions || 0} pendientes
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-none border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Última Ejecución</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <>
                                <div className="text-sm font-bold">
                                    {formatDate(stats?.last_execution_date)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {stats?.total_executions
                                        ? `${stats.total_executions} ejecuciones`
                                        : 'Sin ejecuciones'}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-none border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dominios Activos</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {reputationLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{reputationCount}</div>
                                <p className="text-xs text-muted-foreground">
                                    {warmedCount} activos, {reputationCount - warmedCount} en warm-up
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
