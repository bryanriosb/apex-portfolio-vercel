import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
    value: number // 0-100
    label?: string
    showPercentage?: boolean
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function ProgressIndicator({
    value,
    label,
    showPercentage = true,
    size = 'md',
    className,
}: ProgressIndicatorProps) {
    const heightClasses = {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4',
    }

    return (
        <div className={cn('space-y-2', className)}>
            {(label || showPercentage) && (
                <div className="flex items-center justify-between text-sm">
                    {label && <span className="font-medium">{label}</span>}
                    {showPercentage && (
                        <span className="text-muted-foreground">{value}%</span>
                    )}
                </div>
            )}
            <Progress value={value} className={heightClasses[size]} />
        </div>
    )
}
