import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Match } from '@/lib/types'
import { Calendar, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = ['all', 'live', 'scheduled', 'completed'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

export function MatchesListPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    fetchMatches()

    const channel = supabase
      .channel('matches-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchMatches)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchMatches = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        team_a:teams!matches_team_a_id_fkey(*),
        team_b:teams!matches_team_b_id_fkey(*),
        tournament:tournaments(name, format),
        innings(total_runs, wickets, overs_completed, batting_team_id, is_complete)
      `)
      .order('created_at', { ascending: false })
    if (data) setMatches(data as Match[])
    setLoading(false)
  }

  const filtered = filter === 'all' ? matches : matches.filter((m) => m.status === filter)

  const statusColors: Record<string, string> = {
    scheduled: 'bg-muted text-muted-foreground',
    live: 'bg-primary/10 text-primary',
    completed: 'bg-secondary text-secondary-foreground',
    abandoned: 'bg-destructive/10 text-destructive',
  }

  const grouped: Record<string, Match[]> = {}
  filtered.forEach((m) => {
    const key = (m as any).tournament?.name || 'Unknown Tournament'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <p className="text-muted-foreground text-sm mt-1">Live scores and match history</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 capitalize',
              filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {s === 'all' ? 'All' : s}
            {s === 'live' && matches.filter((m) => m.status === 'live').length > 0 && (
              <span className="ml-1.5 size-1.5 rounded-full bg-current inline-block align-middle live-indicator" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="py-6" /></Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([tourName, tourMatches]) => (
            <div key={tourName}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{tourName}</h3>
              <div className="space-y-2">
                {tourMatches.map((match) => {
                  const teamA = (match as any).team_a
                  const teamB = (match as any).team_b
                  const inns = match.innings || []
                  const activeInns = inns.find((i) => !i.is_complete)

                  return (
                    <Link key={match.id} to={`/matches/${match.id}`}>
                      <Card className="hover:shadow-sm transition-shadow">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Badge className={cn('text-xs', statusColors[match.status])}>
                                  {match.status === 'live' && (
                                    <span className="mr-1 size-1.5 rounded-full bg-current inline-block live-indicator" />
                                  )}
                                  {match.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{match.format} · {match.overs}ov</span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className={cn(
                                    'text-sm font-semibold',
                                    activeInns?.batting_team_id === teamA?.id ? 'text-foreground' : 'text-muted-foreground'
                                  )}>
                                    {teamA?.team_name}
                                  </span>
                                  <span className="text-sm font-bold tabular-nums">
                                    {inns.find((i) => i.batting_team_id === teamA?.id)
                                      ? (() => { const i = inns.find((x) => x.batting_team_id === teamA?.id)!; return `${i.total_runs}/${i.wickets} (${Number(i.overs_completed).toFixed(1)})` })()
                                      : '-'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={cn(
                                    'text-sm font-semibold',
                                    activeInns?.batting_team_id === teamB?.id ? 'text-foreground' : 'text-muted-foreground'
                                  )}>
                                    {teamB?.team_name}
                                  </span>
                                  <span className="text-sm font-bold tabular-nums">
                                    {inns.find((i) => i.batting_team_id === teamB?.id)
                                      ? (() => { const i = inns.find((x) => x.batting_team_id === teamB?.id)!; return `${i.total_runs}/${i.wickets} (${Number(i.overs_completed).toFixed(1)})` })()
                                      : '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-2" />
                          </div>
                          {match.result_summary && (
                            <p className="text-xs text-primary mt-1.5 font-medium">{match.result_summary}</p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No matches found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
