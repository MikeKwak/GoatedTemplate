import type { Metadata } from 'next'
import './globals.css'
import { AmplifyProvider } from '@/components/AmplifyProvider'
import { AppShell } from '@/components/AppShell'
import { ToastContainer } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'AI SaaS Bootstrap',
  description: 'AI SaaS Bootstrap Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AmplifyProvider>
          <AppShell>{children}</AppShell>
          <ToastContainer />
        </AmplifyProvider>
      </body>
    </html>
  )
}

