import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useAuthStore } from '@/store/auth'
import { useAppStore } from '@/store/app'

export function Layout() {
  const { user, loading } = useAuthStore()
  const { theme } = useAppStore()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'test') {
      root.setAttribute('data-theme', 'test')
    } else {
      root.removeAttribute('data-theme')
    }
  }, [theme])

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="Loading..." className="size-10 object-contain animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-svh bg-[#FAF9F6] text-stone-900 flex flex-col relative selection:bg-[#C5A059]/25 selection:text-stone-900 font-sans">
      <div className="fixed inset-0 pointer-events-none sports-radial-bg z-0 opacity-70" />
      <div className="fixed inset-0 bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none z-0 opacity-60" />
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full min-h-[calc(100svh-4rem)] relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
