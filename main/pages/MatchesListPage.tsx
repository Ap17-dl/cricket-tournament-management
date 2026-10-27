import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
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
    scheduled: 'bg-white/[0.04] text-stone-300 border-white/[0.1]',
    live: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50',
    completed: 'bg-white/[0.04] text-[#C5A059] border-[#C5A059]/30',
    abandoned: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
  }

  const grouped: Record<string, Match[]> = {}
  filtered.forEach((m) => {
    const key = (m as any).tournament?.name || 'Open Matches'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  })

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-stone-100">
            Cricket <span className="font-editorial italic text-[#C5A059]">Match Center</span>
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1">Real-time ball-by-ball scorecards, fixtures, and historical results</p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 capitalize cursor-pointer',
              filter === s
                ? 'club-gold-gradient text-[#142318] font-bold shadow-sm border-0'
                : 'bg-white/[0.03] border border-white/[0.08] text-stone-400 hover:text-white hover:bg-white/[0.06]'
            )}
          >
            {s === 'all' ? 'All Matches' : s}
            {s === 'live' && matches.filter((m) => m.status === 'live').length > 0 && (
              <span className="ml-2 size-1.5 rounded-full bg-emerald-400 inline-block align-middle animate-ping" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(grouped).map(([tourName, tourMatches]) => (
            <div key={tourName} className="space-y-3">
              <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#C5A059]" />
                {tourName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tourMatches.map((match) => {
                  const teamA = (match as any).team_a
                  const teamB = (match as any).team_b
                  const inns = match.innings || []
                  const activeInns = inns.find((i) => !i.is_complete)

                  return (
                    <Link key={match.id} to={`/matches/${match.id}`} className="group block">
                      <div className="rounded-3xl club-card border border-white/[0.08] hover:border-[#C5A059]/40 club-card-hover p-5 transition-all space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge className={cn('text-[10px] font-medium px-2.5 py-0.5 border rounded-full', statusColors[match.status])}>
                            {match.status === 'live' && (
                              <span className="mr-1.5 size-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                            )}
                            {match.status.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-stone-400 font-medium">{match.format} · {match.overs} Overs</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              'text-sm font-semibold',
                              activeInns?.batting_team_id === teamA?.id ? 'text-stone-100' : 'text-stone-300'
                            )}>
                              {teamA?.team_name || 'Team A'}
                            </span>
                            <span className="text-sm font-mono font-medium text-stone-100 tabular-nums">
                              {inns.find((i) => i.batting_team_id === teamA?.id)
                                ? (() => { const i = inns.find((x) => x.batting_team_id === teamA?.id)!; return `${i.total_runs}/${i.wickets} (${Number(i.overs_completed).toFixed(1)} ov)` })()
                                : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              'text-sm font-semibold',
                              activeInns?.batting_team_id === teamB?.id ? 'text-stone-100' : 'text-stone-300'
                            )}>
                              {teamB?.team_name || 'Team B'}
                            </span>
                            <span className="text-sm font-mono font-medium text-stone-100 tabular-nums">
                              {inns.find((i) => i.batting_team_id === teamB?.id)
                                ? (() => { const i = inns.find((x) => x.batting_team_id === teamB?.id)!; return `${i.total_runs}/${i.wickets} (${Number(i.overs_completed).toFixed(1)} ov)` })()
                                : '-'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-stone-400 border-t border-white/[0.06] pt-3">
                          <span className="text-[#C5A059] font-medium text-[11px] truncate">
                            {match.status === 'live' ? 'Live match in progress' : match.venue ? `📍 ${match.venue}` : 'Fixture scheduled'}
                          </span>
                          <span className="text-xs text-stone-400 group-hover:text-stone-100 transition-colors flex items-center gap-1 font-medium">
                            Scorecard <ChevronRight className="size-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl club-card border border-white/[0.08] p-12 text-center space-y-3">
          <Calendar className="size-10 text-stone-600 mx-auto" />
          <p className="text-stone-400 text-sm font-medium">No {filter !== 'all' ? filter : ''} matches found.</p>
        </div>
      )}
    </div>
  )
}

