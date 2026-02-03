'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Pencil, Trash2, Users, RefreshCw, TrendingUp } from 'lucide-react'
import type { BusinessGoal } from '@/lib/models/business/business-goal'
import {
  GOAL_TYPE_LABELS,
  GOAL_PERIOD_LABELS,
  calculateGoalProgress,
  formatGoalValue,
} from '@/lib/models/business/business-goal'

interface BusinessGoalCardProps {
  goal: BusinessGoal
  onEdit?: (goal: BusinessGoal) => void
  onDelete?: (goalId: string) => void
  onViewContributions?: (goal: BusinessGoal) => void
  onRecalculate?: (goalId: string) => void
  isRecalculating?: boolean
}

export function BusinessGoalCard({
  goal,
  onEdit,
  onDelete,
  onViewContributions,
  onRecalculate,
  isRecalculating,
}: BusinessGoalCardProps) {
  const progress = calculateGoalProgress(goal)

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 80) return 'bg-emerald-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-primary'
  }

  const remaining = goal.target_value - goal.current_value

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Meta del Equipo</CardTitle>
              <p className="text-xs text-muted-foreground">
                {GOAL_PERIOD_LABELS[goal.period_type]}
              </p>
            </div>
          </div>

          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRecalculate && (
                  <DropdownMenuItem
                    onClick={() => onRecalculate(goal.id)}
                    disabled={isRecalculating}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
                    Recalcular
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(goal)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(goal.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm">
            {GOAL_TYPE_LABELS[goal.goal_type]}
          </Badge>
          <span className="text-2xl font-bold">{progress}%</span>
        </div>

        <Progress
          value={progress}
          className="h-3"
          indicatorClassName={getProgressColor(progress)}
        />

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Actual: </span>
            <span className="font-semibold">
              {formatGoalValue(goal.current_value, goal.goal_type)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Meta: </span>
            <span className="font-semibold">
              {formatGoalValue(goal.target_value, goal.goal_type)}
            </span>
          </div>
        </div>

        {remaining > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Faltan <span className="font-medium text-foreground">
              {formatGoalValue(remaining, goal.goal_type)}
            </span> para alcanzar la meta
          </div>
        )}

        {progress >= 100 && (
          <div className="text-center text-sm text-green-600 font-medium flex items-center justify-center gap-1">
            <TrendingUp className="h-4 w-4" />
            ¡Meta alcanzada!
          </div>
        )}

        {onViewContributions && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => onViewContributions(goal)}
          >
            <Users className="h-4 w-4 mr-2" />
            Ver contribuciones del equipo
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
