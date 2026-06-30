'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Crosshair, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Loading from '@/components/ui/loading'
import Link from 'next/link'

interface NavItem {
  label: string
  index?: number
  dropdown?: { label: string; href: string }[]
}

interface LandingHeaderProps {
  navItems?: NavItem[]
  activeSection?: number
  onNavClick?: (index: number) => void
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  navItems = [],
  activeSection = 0,
  onNavClick,
}) => {
  const router = useRouter()
  const [isDemoLoading, setIsDemoLoading] = React.useState(false)
  const [isLoginLoading, setIsLoginLoading] = React.useState(false)

  const goSignIn = (event: React.MouseEvent) => {
    event.preventDefault()
    setIsLoginLoading(true)
    router.push('/auth/sign-in')
  }

  return (
    <nav className="fixed top-0 w-full z-50 px-4 sm:px-6 md:px-12 py-4 sm:py-6 flex items-center justify-between border-b-2 border-gray-900 bg-white/90 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-3 sm:gap-4 text-left">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary flex items-center justify-center shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] border-2 border-gray-900">
          <Crosshair className="text-white w-5 h-5 sm:w-7 sm:h-7" />
        </div>
        <div className="flex flex-col">
          <span className="text-gray-900 font-black text-lg sm:text-xl tracking-tighter leading-none uppercase">
            APEX
          </span>
          <span className="text-[8px] sm:text-[10px] text-gray-500 font-mono tracking-tighter uppercase font-bold hidden sm:block">
            Agentic AI Planning & Execution Platform
          </span>
        </div>
      </Link>
      {navItems.length > 0 && (
        <div className="hidden lg:flex gap-10 items-center">
          {navItems.map((item) =>
            item.dropdown ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`text-xs font-black transition-all duration-300 uppercase tracking-widest relative group flex items-center gap-1 cursor-pointer ${
                      (item.index !== undefined &&
                        (item.index === 1
                          ? [1, 2, 3].includes(activeSection)
                          : activeSection === item.index))
                        ? 'text-primary'
                        : 'text-gray-900 hover:text-primary'
                    }`}
                  >
                    {item.label}
                    <ChevronDown className="w-3 h-3" />
                    <span
                      className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ${
                        (item.index !== undefined &&
                          (item.index === 1
                            ? [1, 2, 3].includes(activeSection)
                            : activeSection === item.index))
                          ? 'w-full'
                          : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="rounded-none border-2 border-gray-900 shadow-[4px_4px_0px_#000] bg-white min-w-[200px]"
                >
                  {item.dropdown.map((sub) => (
                    <DropdownMenuItem key={sub.href} asChild>
                      <Link
                        href={sub.href}
                        className="font-black text-xs uppercase tracking-widest text-gray-900 hover:text-primary cursor-pointer rounded-none px-4 py-3 hover:bg-gray-50"
                      >
                        {sub.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                key={item.label}
                onClick={() => item.index !== undefined && onNavClick?.(item.index)}
                className={`text-xs font-black transition-all duration-300 uppercase tracking-widest relative group ${
                  (item.index !== undefined &&
                    (item.index === 1
                      ? [1, 2, 3].includes(activeSection)
                      : activeSection === item.index))
                    ? 'text-primary'
                    : 'text-gray-900 hover:text-primary'
                }`}
              >
                {item.label}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ${
                    (item.index !== undefined &&
                      (item.index === 1
                        ? [1, 2, 3].includes(activeSection)
                        : activeSection === item.index))
                      ? 'w-full'
                      : 'w-0 group-hover:w-full'
                  }`}
                />
              </button>
            )
          )}
        </div>
      )}
      <div className="flex gap-4">
        <div className="flex gap-4 h-8">
          <Link
            href="https://wa.me/573245134148?text=Hola%21%20Requiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20APEX"
            target="_blank"
            className="flex items-center justify-center bg-primary hover:text-white font-black tracking-widest rounded-none px-4 sm:px-8 py-4 sm:py-6 border-2 border-gray-900 shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
          >
            <img
              src="/whatsapp.png"
              alt="whatsapp-icon"
              className="w-6 h-6 sm:w-8 sm:h-8"
            />
          </Link>
          <Link
            href="https://borls.com/contact"
            target="_blank"
            className="flex items-center justify-center bg-primary hover:text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-none px-4 sm:px-8 py-4 sm:py-6 border-2 border-gray-900 shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
          >
            <span className="hidden sm:inline">Agendar Demo</span>
            <span className="sm:hidden">Demo</span>
            {isDemoLoading && <Loading className="w-4 h-4 ml-2 text-white" />}
          </Link>
        </div>
        <Button
          onClick={goSignIn}
          className="text-gray-900 hover:text-white bg-transparent hover:bg-primary hover:text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-none px-4 sm:px-8 py-4 sm:py-6 border-2 border-gray-900 shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          <span className="hidden sm:inline">Iniciar Sesión</span>
          <span className="sm:hidden">Sesión</span>
          {isLoginLoading && <Loading className="w-4 h-4 ml-2 text-white" />}
        </Button>
      </div>
    </nav>
  )
}
