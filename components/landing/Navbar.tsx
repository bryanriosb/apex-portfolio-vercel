'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { LogIn, Moon, Sun } from 'lucide-react'

export function Navbar() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Beluvio" width={140} height={40} priority />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Funcionalidades
          </Link>
          <Link href="#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Servicios
          </Link>
          <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Nosotros
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Cambiar tema</span>
          </Button>
          <Link href="/auth/sign-in">
            <Button size="sm" className="gap-2">
              <LogIn className="h-4 w-4" />
              Ingresar
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
