'use client'

import { SessionProvider as NextSessionProvider } from 'next-auth/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export const SessionProvider = ({ children }: Props) => {
  return (
    <NextSessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </NextThemesProvider>
    </NextSessionProvider>
  )
}
