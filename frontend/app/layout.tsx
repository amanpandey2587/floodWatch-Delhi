import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FloodWatch Delhi',
  description: 'Real-time flood prediction and visualization for Delhi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

