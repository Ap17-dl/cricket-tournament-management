import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Calendar, Radio, Trophy, BookOpen, ChevronRight, Award } from 'lucide-react'

const actions = [
  {
    to: '/table-tennis/tournaments',
    icon: Award,
    title: 'Tournaments',
    description: 'Manage tournaments and generate league fixtures',
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    to: '/table-tennis/quick-match',
    icon: Zap,
    title: 'Quick Match',
    description: 'Start and manage an instant Table Tennis match',
    color: 'bg-primary/10 text-primary',
  },
  {
    to: '/table-tennis/fixtures',
    icon: Calendar,
    title: 'Fixtures',
    description: 'View upcoming and scheduled matches',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    to: '/table-tennis/live',
    icon: Radio,
    title: 'Live Matches',
    description: 'View currently active matches and scores',
    color: 'bg-red-500/10 text-red-600',
  },
  {
    to: '/table-tennis/results',
    icon: Trophy,
    title: 'Results',
    description: 'View completed matches and match scores',
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    to: '/table-tennis/rules',
    icon: BookOpen,
    title: 'Rules',
    description: 'Table Tennis scoring and serving rules',
    color: 'bg-emerald-500/10 text-emerald-600',
  },
]

export function TTHomePage() {
  const [stats, setStats] = useState({ total: 0, live: 0, completed: 0 })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const [totalRes, liveRes, completedRes] = await Promise.all([
      supabase.from('tt_matches').select('id', { count: 'exact', head: true }),
      supabase.from('tt_matches').select('id', { count: 'exact', head: true }).eq('status', 'live'),
      supabase.from('tt_matches').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    ])
    setStats({
      total: totalRes.count ?? 0,
      live: liveRes.count ?? 0,
      completed: completedRes.count ?? 0,
    })
  }

  return (
    <div className="space-y-8">
      {}
      <div className="rounded-2xl bg-primary p-8 text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-3">
            Table Tennis Module
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Table Tennis
          </h1>
          <p className="text-primary-foreground/80 text-sm max-w-md">
            Quick Match Management — Start instant matches, track scores point-by-point, and view results.
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 size-40 rounded-full border-8 border-primary-foreground/10 opacity-50" />
        <div className="absolute -right-4 -bottom-4 size-24 rounded-full border-4 border-primary-foreground/10 opacity-30" />
      </div>

      {}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Matches', value: stats.total },
          { label: 'Live Now', value: stats.live },
          { label: 'Completed', value: stats.completed },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {}
      <section>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map(({ to, icon: Icon, title, description, color }) => (
            <Link key={to} to={to}>
              <Card className="hover:shadow-md transition-all hover:border-primary/30 h-full">
                <CardContent className="pt-5 pb-5 flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shrink-0 ${color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{title}</h3>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
