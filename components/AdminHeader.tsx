'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { SidebarTrigger } from './ui/sidebar'
import { Moon, Sun, LifeBuoy } from 'lucide-react'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import NotificationPanel from './notifications/NotificationPanel'
import { useCurrentUser } from '@/hooks/use-current-user'
import { FeedbackDialog } from './feedback/FeedbackDialog'

export default function AdminHeader() {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { businessId, user } = useCurrentUser()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <>
      <header className="flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <SidebarTrigger />
        </div>
        <div className="flex gap-2 items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={() => setFeedbackOpen(true)}
                className="flex items-center gap-2"
              >
                <LifeBuoy className="!h-4.5 !w-4.5" />
                <span className="hidden sm:inline">Reportar Novedad</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reportar problemas o enviar sugerencias</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                <Sun className="!h-5 !w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute !h-5 !w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Cambiar tema</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cambiar tema</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <NotificationPanel />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notificaciones</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {businessId && user && (
        <FeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          businessId={businessId}
          userId={user.id}
        />
      )}
    </>
  )
}
