'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react'
import Loading from '@/components/ui/loading'
import type {
  BusinessGoal,
  BusinessGoalWithContributions,
  SpecialistContribution,
} from '@/lib/models/business/business-goal'
import {
  GOAL_TYPE_LABELS,
  formatGoalValue,
} from '@/lib/models/business/business-goal'
import BusinessGoalService from '@/lib/services/business/business-goal-service'

interface ContributionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: BusinessGoal | null
}

const RankIcon = ({ rank }: { rank: number }) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />
    default:
      return (
        <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">
          {rank}
        </span>
      )
  }
}

function ContributionCard({
  contribution,
  rank,
  goalType,
}: {
  contribution: SpecialistContribution
  rank: number
  goalType: BusinessGoal['goal_type']
}) {
  const initials = contribution.specialist_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const isTopThree = rank <= 3

  return (
    <div
      className={`p-4 rounded-lg border ${
        isTopThree ? 'bg-gradient-to-r from-primary/5 to-transparent border-primary/20' : 'bg-muted/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <RankIcon rank={rank} />
          <Avatar className="h-10 w-10">
            <AvatarImage src={contribution.profile_picture_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium truncate">{contribution.specialist_name}</h4>
              {contribution.specialty && (
                <p className="text-xs text-muted-foreground">{contribution.specialty}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">
                {formatGoalValue(contribution.contribution_value, goalType)}
              </p>
              <p className="text-xs text-muted-foreground">
                {contribution.contribution_percentage}% del total
              </p>
            </div>
          </div>

          <Progress
            value={contribution.contribution_percentage}
            className="h-1.5 mt-2"
            indicatorClassName={isTopThree ? 'bg-primary' : 'bg-muted-foreground/50'}
          />

          {contribution.services_count !== undefined && (
            <p className="text-xs text-muted-foreground mt-2">
              {contribution.services_count} servicios realizados
            </p>
          )}

          {contribution.top_services && contribution.top_services.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Servicios destacados:
              </p>
              <div className="flex flex-wrap gap-1">
                {contribution.top_services.map((service, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {service.name} ({service.count})
                    {goalType === 'revenue' && service.revenue_cents > 0 && (
                      <span className="ml-1 text-green-600">
                        ${(service.revenue_cents / 100).toLocaleString('es-CO')}
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ContributionsModal({
  open,
  onOpenChange,
  goal,
}: ContributionsModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [goalWithContributions, setGoalWithContributions] =
    useState<BusinessGoalWithContributions | null>(null)

  useEffect(() => {
    if (!goal || !open) {
      setGoalWithContributions(null)
      return
    }

    const fetchContributions = async () => {
      setIsLoading(true)
      try {
        const service = new BusinessGoalService()
        const result = await service.getWithContributions(goal.id)
        if (result.success && result.data) {
          setGoalWithContributions(result.data)
        }
      } catch (error) {
        console.error('Error fetching contributions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContributions()
  }, [goal, open])

  if (!goal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Contribuciones del Equipo
          </DialogTitle>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline">{GOAL_TYPE_LABELS[goal.goal_type]}</Badge>
            <span className="text-sm text-muted-foreground">
              Meta: {formatGoalValue(goal.target_value, goal.goal_type)}
            </span>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loading className="w-8 h-8" />
          </div>
        ) : goalWithContributions?.contributions &&
          goalWithContributions.contributions.length > 0 ? (
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-3">
              {goalWithContributions.contributions.map((contribution, index) => (
                <ContributionCard
                  key={contribution.specialist_id}
                  contribution={contribution}
                  rank={index + 1}
                  goalType={goal.goal_type}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No hay contribuciones registradas aún</p>
            <p className="text-sm mt-1">
              Las contribuciones aparecerán cuando los especialistas completen servicios
            </p>
          </div>
        )}

        {goalWithContributions && goalWithContributions.contributions.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total del equipo:</span>
              <span className="font-bold">
                {formatGoalValue(goalWithContributions.current_value, goal.goal_type)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Especialistas activos:</span>
              <span className="font-medium">{goalWithContributions.total_specialists}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
