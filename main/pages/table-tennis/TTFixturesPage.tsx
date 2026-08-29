import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Loader2 } from 'lucide-react'
import type { TTMatch, TTMatchPlayer } from '@/lib/types'

interface FixtureMatch extends TTMatch {
  players: TTMatchPlayer[]
}

export function TTFixturesPage() {
  const [matches, setMatches] = useState<FixtureMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFixtures()
  }, [])

  const fetchFixtures = async () => {
    const { data } = await supabase
      .from('tt_matches')
      .select('*, players:tt_match_players(*)')
      .in('status', ['scheduled', 'live'])
      .order('scheduled_at', { ascending: true })

    setMatches((data || []) as FixtureMatch[])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500/10 text-blue-600',
    live: 'bg-red-500/10 text-red-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="size-5" /> Fixtures
          </h1>
          <p className="text-sm text-muted-foreground">Upcoming and scheduled matches</p>
        </div>
        <Link to="/table-tennis/quick-match">
          <Button size="sm">+ New Match</Button>
        </Link>
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No upcoming fixtures</p>
            <Link to="/table-tennis/quick-match" className="mt-3 inline-block">
              <Button size="sm">Start a Quick Match</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map(match => {
            const playersA = (match.players || []).filter(p => p.side === 'A').sort((a, b) => a.player_order - b.player_order)
            const playersB = (match.players || []).filter(p => p.side === 'B').sort((a, b) => a.player_order - b.player_order)
            const sideAName = playersA.map(p => p.player_name).join(' + ')
            const sideBName = playersB.map(p => p.player_name).join(' + ')
            const dateStr = match.scheduled_at
              ? new Date(match.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : ''

            return (
              <Link key={match.id} to={match.status === 'live' ? `/table-tennis/live/${match.id}` : '#'}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={statusColors[match.status] || ''}>
                        {match.status === 'live' && <span className="size-1.5 rounded-full bg-red-500 inline-block mr-1 animate-pulse" />}
                        {match.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{sideAName}</p>
                        <p className="text-xs text-muted-foreground">vs</p>
                        <p className="font-semibold text-sm">{sideBName}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p className="capitalize">{match.match_type}</p>
                        <p>First to {match.format}</p>
                        {match.best_of > 1 && <p>Best of {match.best_of}</p>}
                      </div>
                    </div>
                    {match.status === 'live' && (
                      <Button size="sm" className="w-full mt-3">View Score</Button>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
