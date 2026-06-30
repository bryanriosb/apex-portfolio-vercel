import { cn } from "@/lib/utils";

export default function PingPulse({ color = 'primary' }: { color?: string }) {
    return (
        <span className="relative flex items-center justify-center size-3">
            <span className={cn(`absolute inline-flex h-full w-full animate-ping rounded-full bg-${color}-500 opacity-75`, {
                'bg-primary': color === 'primary'
            })}></span>
            <span className={cn(`relative inline-flex size-2 rounded-full bg-${color}-500`, {
                'bg-primary': color === 'primary'
            })}></span>
        </span>
    )
}