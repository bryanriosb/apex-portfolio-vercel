'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTutorial } from '@/hooks/use-tutorial'
import { TUTORIALS, Tutorial } from '@/const/tutorials'

interface TutorialDropdownProps {
  className?: string
}

export function TutorialDropdown({ className }: TutorialDropdownProps) {
  const { restartTutorial, isLoading } = useTutorial()

  const [isOpen, setIsOpen] = useState(false)

  const handleStartTutorial = (tutorialId: string) => {
    console.log('🎓 Starting tutorial:', tutorialId)
    // Siempre permitir reiniciar tutoriales
    restartTutorial(tutorialId)
    setIsOpen(false)
  }

  // Mostrar siempre el dropdown, incluso si está cargando
  // if (isLoading) {
  //   return null
  // }

  // Mostrar TODOS los tutoriales disponibles sin filtrar
  const allTutorials = Object.values(TUTORIALS)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          title="Tutoriales disponibles"
        >
          <HelpCircle className="!h-5 !w-5" />
          <span className="sr-only">Tutoriales</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-sm font-medium text-gray-700 border-b">
          Tutoriales Disponibles
        </div>

        {/* Mostrar TODOS los tutoriales disponibles sin separar */}
        {allTutorials.length > 0 ? (
          <>
            {allTutorials.map((tutorial: Tutorial) => (
              <DropdownMenuItem
                key={tutorial.id}
                onClick={() => handleStartTutorial(tutorial.id)}
                className="cursor-pointer"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{tutorial.name}</span>
                  <span className="text-xs text-gray-500">
                    {tutorial.description}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <div className="px-2 py-4 text-sm text-gray-500 text-center">
            No hay tutoriales disponibles
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
