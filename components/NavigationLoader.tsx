'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Loading from './ui/loading'

export function NavigationLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    const newPath = pathname + searchParams.toString()

    if (currentPath && currentPath !== newPath) {
      setIsNavigating(false)
    }

    setCurrentPath(newPath)
  }, [pathname, searchParams, currentPath])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      if (link) {
        const href = link.getAttribute('href')

        if (href && href.startsWith('/') && !href.startsWith('//')) {
          const currentFullPath =
            pathname +
            (searchParams.toString() ? '?' + searchParams.toString() : '')

          if (href !== pathname && href !== currentFullPath) {
            setIsNavigating(true)
          }
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname, searchParams])

  return (
    <div className="relative min-h-[calc(100vh-200px)]">
      {isNavigating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <Loading className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
