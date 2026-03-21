import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import GlobalHeader from '@/components/GlobalHeader'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import { AssistantProvider } from "@/contexts/AssistantContext";
import FloatingAssistant from "@/components/FloatingAssistant";
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
})

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
    <html lang="en" className={`${spaceGrotesk.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <body className="font-[var(--font-body)] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var d=t? t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark', d);}catch(e){}})();",
          }}
        />
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/10"></div>
          <div className="absolute top-32 -left-20 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl dark:bg-blue-600/10"></div>
          <div className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-500/10"></div>
        </div>
        <AuthProvider>
          <GlobalHeader />
           <AssistantProvider>  
          {children}
          <FloatingAssistant />
           </AssistantProvider>  
        </AuthProvider>
      </body>
    </html>
  )
}

