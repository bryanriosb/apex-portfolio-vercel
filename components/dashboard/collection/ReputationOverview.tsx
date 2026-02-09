'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { EmailReputationProfile } from '@/lib/models/collection/email-reputation'

interface ReputationOverviewProps {
    profiles: EmailReputationProfile[]
    loading: boolean
}

export const ReputationOverview: React.FC<ReputationOverviewProps> = ({
    profiles,
    loading,
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Reputación de Dominios
                </h2>
                <Link href="/admin/settings/email-delivery">
                    <Button variant="outline" size="sm">Gestionar</Button>
                </Link>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="rounded-none border shadow-none">
                            <CardHeader className="pb-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-4 w-full" />
                                <div className="grid grid-cols-3 gap-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : profiles.length === 0 ? (
                <Card className="rounded-none border border-dashed py-12">
                    <div className="text-center">
                        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">Sin dominios configurados</h3>
                        <p className="text-muted-foreground">Configura tus dominios para empezar el warm-up</p>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {profiles.map((profile) => (
                        <Card key={profile.id} className="rounded-none border shadow-none">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base truncate mr-2">
                                        {profile.domain}
                                    </CardTitle>
                                    <Badge variant={profile.is_warmed_up ? 'default' : 'outline'}>
                                        {profile.is_warmed_up ? 'Activo' : 'Warm-up'}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {profile.provider?.toUpperCase() || 'BREVO'}
                                    {profile.sending_ip ? ` (${profile.sending_ip})` : ''}
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Reputación</span>
                                    <div className="flex items-center gap-1 font-bold">
                                        <div className={`h-2.5 w-2.5 rounded-full ${(profile.delivery_rate || 0) > 90 ? 'bg-green-500' :
                                            (profile.delivery_rate || 0) > 70 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`} />
                                        {(profile.delivery_rate || 0).toFixed(0)}%
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                                    <div className="bg-muted p-2 rounded">
                                        <Mail className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                                        <span>{profile.total_emails_sent}</span>
                                    </div>
                                    <div className="bg-muted p-2 rounded">
                                        <CheckCircle className="h-3 w-3 mx-auto mb-1 text-green-600" />
                                        <span>{profile.total_emails_delivered}</span>
                                    </div>
                                    <div className="bg-muted p-2 rounded">
                                        <AlertCircle className="h-3 w-3 mx-auto mb-1 text-red-600" />
                                        <span>{profile.total_emails_bounced}</span>
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
