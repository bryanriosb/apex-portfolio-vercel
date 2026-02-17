'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PauseCircle, RefreshCw, Lock, Unlock, Activity, Wifi, WifiOff } from 'lucide-react'
import { useRealtimeControlTower } from '@/hooks/collection/use-realtime-control-tower'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'

function StatsCards({ stats }: { stats: { enqueued: number, processing: number, completed: number, failed: number, deferred: number, dlq: number } }) {
    const items = [
        { label: 'Enqueued', value: stats.enqueued, color: 'text-blue-500' },
        { label: 'Processing', value: stats.processing + stats.completed, color: 'text-yellow-500' },
        { label: 'Deferred', value: stats.deferred, color: 'text-purple-500' },
        { label: 'Failed', value: stats.failed, color: 'text-red-500' },
        { label: 'DLQ', value: stats.dlq, color: 'text-red-700 font-bold' },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {items.map((item) => (
                <Card key={item.label}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function LockStatusCard({ lock }: { lock: { is_locked: boolean, locked_by: string | null, locked_at: string | null, expires_at: string | null, time_remaining_seconds: number | null } }) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {lock.is_locked ? (
                        <Lock className="h-5 w-5 text-yellow-500" />
                    ) : (
                        <Unlock className="h-5 w-5 text-green-500" />
                    )}
                    Scheduler Lock
                </CardTitle>
                <CardDescription>
                    Distributed lock for worker coordination
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <span className={`text-sm font-medium ${lock.is_locked ? 'text-yellow-600' : 'text-green-600'}`}>
                            {lock.is_locked ? 'Locked' : 'Unlocked'}
                        </span>
                    </div>
                    
                    {lock.is_locked && lock.locked_by && (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Locked By</span>
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded truncate max-w-[200px]">
                                    {lock.locked_by.substring(0, 8)}...
                                </span>
                            </div>
                            
                            {lock.locked_at && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Locked At</span>
                                    <span className="text-sm">
                                        {new Date(lock.locked_at).toLocaleTimeString()}
                                    </span>
                                </div>
                            )}
                            
                            {lock.time_remaining_seconds !== null && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Expires In</span>
                                    <span className="text-sm font-medium">
                                        {Math.floor(lock.time_remaining_seconds / 60)}m {lock.time_remaining_seconds % 60}s
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                    
                    <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                            Prevents multiple workers from scheduling EventBridge simultaneously
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ActivityLog({ logs }: { logs: Array<{ id: string, event: string, batch_id?: string, worker_id?: string, details?: any, created_at: string }> }) {
    const getEventColor = (event: string) => {
        switch (event) {
            case 'ENQUEUED': return 'text-blue-500'
            case 'PICKED_UP': return 'text-yellow-500'
            case 'PROCESSING': return 'text-orange-500'
            case 'COMPLETED': return 'text-green-500'
            case 'FAILED': return 'text-red-500'
            case 'DEFERRED': return 'text-purple-500'
            case 'DLQ_SENT': return 'text-red-700'
            default: return 'text-gray-500'
        }
    }

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Recent Activity Log</CardTitle>
                <CardDescription>
                    Real-time events from the execution pipeline
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recent activity. Waiting for events...</p>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                <Activity className={`h-4 w-4 mt-0.5 ${getEventColor(log.event)}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${getEventColor(log.event)}`}>
                                            {log.event}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(log.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    {log.batch_id && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Batch: {log.batch_id.substring(0, 8)}...
                                        </p>
                                    )}
                                    {log.worker_id && (
                                        <p className="text-xs text-muted-foreground">
                                            Worker: {log.worker_id.substring(0, 8)}...
                                        </p>
                                    )}
                                    {log.details && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {JSON.stringify(log.details).substring(0, 100)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function ControlTowerPage() {
    const { activeBusiness } = useActiveBusinessStore()
    const businessId = activeBusiness?.business_account_id || ''
    
    const { stats, lock, recentLogs, isConnected } = useRealtimeControlTower(businessId)

    const handleRefresh = () => {
        window.location.reload()
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight">Control Tower</h2>
                    {isConnected ? (
                        <div title="Realtime connected">
                            <Wifi className="h-5 w-5 text-green-500" />
                        </div>
                    ) : (
                        <div title="Realtime disconnected">
                            <WifiOff className="h-5 w-5 text-gray-400" />
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="destructive">
                        <PauseCircle className="mr-2 h-4 w-4" />
                        Emergency Pause
                    </Button>
                    <Button variant="outline" onClick={handleRefresh}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            <StatsCards stats={stats} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <ActivityLog logs={recentLogs} />
                <LockStatusCard lock={lock} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Infrastructure Health</CardTitle>
                        <CardDescription>
                            AWS CloudWatch Status
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                                <span className="text-sm font-medium">Lambda Worker: Healthy</span>
                            </div>
                            <div className="flex items-center">
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                                <span className="text-sm font-medium">SQS Queue Depth: Normal</span>
                            </div>
                            <div className="flex items-center">
                                <div className="h-2 w-2 rounded-full bg-gray-300 mr-2"></div>
                                <span className="text-sm font-medium text-muted-foreground">DLQ: Empty</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
