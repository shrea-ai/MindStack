'use client'

import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/components/providers/LanguageProvider'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import ToastProvider from '@/components/providers/ToastProvider'
import AgentInitializer from '@/components/AgentInitializer'

export default function ClientProviders({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ProfileProvider>
            <NotificationProvider>
              <AgentInitializer />
              {children}
              <ToastProvider />
            </NotificationProvider>
          </ProfileProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
