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
    <div className="min-h-svh bg-background flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
