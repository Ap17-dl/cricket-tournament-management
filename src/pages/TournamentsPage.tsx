import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Tournament, MatchFormat, MatchTheme } from '@/lib/types'
import { Trophy, Plus, ChevronRight, Calendar, MapPin, Zap, Edit, Trash2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const FORMAT_OPTIONS: MatchFormat[] = ['T20', 'T10', 'ODI', 'Test Match', 'Custom']

const formatDefaultOvers: Record<MatchFormat, number> = {
  T20: 20,
  T10: 10,
  ODI: 50,
  'Test Match': 0,
  Custom: 20,
}

export function TournamentsListPage() {
  const { profile } = useAuthStore()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTournaments()

    // Realtime subscription so deletions/updates propagate to all viewers
    const channel = supabase
      .channel('tournaments-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => {
        fetchTournaments()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchTournaments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) {
      // Fetch organizer names separately
      const organizerIds = [...new Set(data.map((t: any) => t.organizer_id))]
      const { data: organizers } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', organizerIds)
      const orgMap: Record<string, string> = {}
      if (organizers) organizers.forEach((o: any) => { orgMap[o.id] = o.name })
      const enriched = data.map((t: any) => ({ ...t, organizer: { name: orgMap[t.organizer_id] || 'Unknown' } }))
      setTournaments(enriched as Tournament[])
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    try {
      // Must delete in correct order due to FK constraints:
      // innings.batting_team_id/bowling_team_id -> teams (no CASCADE)
      // So we delete matches first (cascades to innings -> ball_events, playing_xi)
      // Then delete player_stats, then the tournament itself (cascades to teams -> players)

      // 1. Delete all matches for this tournament (cascades to innings, ball_events, playing_xi)
      await supabase.from('matches').delete().eq('tournament_id', id)

      // 2. Delete player_stats for this tournament
      await supabase.from('player_stats').delete().eq('tournament_id', id)

      // 3. Now delete the tournament (cascades to teams -> players)
      const { error } = await supabase.from('tournaments').delete().eq('id', id).eq('organizer_id', profile?.id || '')
      if (!error) {
        setTournaments((prev) => prev.filter((t) => t.id !== id))
      } else {
        console.error('Failed to delete tournament:', error.message)
      }
    } catch (err) {
      console.error('Failed to delete tournament:', err)
    }
  }

  const statusColors: Record<string, string> = {
    upcoming: 'bg-muted text-muted-foreground',
    active: 'bg-primary/10 text-primary',
    completed: 'bg-secondary text-secondary-foreground',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse and manage cricket tournaments</p>
        </div>
        {profile?.role === 'organizer' && (
          <Link to="/tournaments/new">
            <Button className="gap-1.5">
              <Plus className="size-4" />
              New Tournament
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-8" />
            </Card>
          ))}
        </div>
      ) : tournaments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <Card
              key={t.id}
              className={cn(
                'hover:shadow-md transition-shadow',
                t.format === 'Test Match' ? 'border-l-4 border-l-cricket-red' : 'border-l-4 border-l-cricket-green'
              )}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{t.name}</h3>
                  </div>
                  <Badge className={cn('shrink-0 text-xs capitalize', statusColors[t.status])}>
                    {t.status}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground mb-4">
                  {t.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3" />
                      <span className="truncate">{t.venue}</span>
                    </div>
                  )}
                  {t.start_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3" />
                      <span>
                        {new Date(t.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {t.end_date && ` — ${new Date(t.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Trophy className="size-3" />
                    <span>{t.format}{t.overs ? ` · ${t.overs} overs` : ''}</span>
                  </div>
                </div>

                {/* Organizer name */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <User className="size-3" />
                  <span className="truncate">by {(t as any).organizer?.name || 'Unknown'}</span>
                </div>

                <div className="flex gap-2">
                  <Link to={`/tournaments/${t.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full gap-1">
                      View <ChevronRight className="size-3" />
                    </Button>
                  </Link>
                  {profile?.role === 'organizer' && profile.id === t.organizer_id && (
                    <div className="flex gap-1">
                      <Link to={`/tournaments/${t.id}/edit`}>
                        <Button variant="outline" size="icon" className="size-8">
                          <Edit className="size-3.5" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="size-8 text-destructive hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete tournament?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{t.name}" and all associated data. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-white hover:bg-destructive/90"
                              onClick={() => handleDelete(t.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="size-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold mb-1">No tournaments yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {profile?.role === 'organizer' ? 'Create your first tournament to get started.' : 'No tournaments have been created yet.'}
            </p>
            {profile?.role === 'organizer' && (
              <Link to="/tournaments/new">
                <Button className="gap-1.5">
                  <Zap className="size-4" />
                  Create Tournament
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface TournamentFormData {
  name: string
  venue: string
  start_date: string
  end_date: string
  format: MatchFormat
  overs: string
  prize_pool: string
  rules: string
}

export function CreateTournamentPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [form, setForm] = useState<TournamentFormData>({
    name: '',
    venue: '',
    start_date: '',
    end_date: '',
    format: 'T20',
    overs: '20',
    prize_pool: '',
    rules: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const theme: MatchTheme = form.format === 'Test Match' ? 'test' : 'default'

  const handleFormatChange = (fmt: MatchFormat) => {
    setForm((prev) => ({
      ...prev,
      format: fmt,
      overs: fmt === 'Test Match' ? '' : String(formatDefaultOvers[fmt]),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setError('')
    setLoading(true)

    const { data, error: err } = await supabase.from('tournaments').insert({
      organizer_id: profile.id,
      name: form.name,
      venue: form.venue || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      format: form.format,
      overs: form.overs ? parseInt(form.overs) : null,
      theme,
      prize_pool: form.prize_pool || null,
      rules: form.rules || null,
    }).select().single()

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      navigate(`/tournaments/${data.id}`)
    }
  }

  if (profile?.role !== 'organizer') {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Only organizers can create tournaments.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Tournament</h1>
        <p className="text-muted-foreground text-sm mt-1">Set up a new cricket tournament</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tournament Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament name *</Label>
              <Input
                id="name"
                placeholder="e.g. Premier T20 League 2025"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                placeholder="e.g. Municipal Cricket Ground"
                value={form.venue}
                onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match Format</CardTitle>
            <CardDescription>
              Selecting "Test Match" applies the classic dark green + red theme.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {FORMAT_OPTIONS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleFormatChange(fmt)}
                  className={cn(
                    'rounded-lg border p-3 text-sm font-medium transition-all text-center',
                    form.format === fmt
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  )}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {form.format !== 'Test Match' && (
              <div className="space-y-2">
                <Label htmlFor="overs">Overs per innings</Label>
                <Input
                  id="overs"
                  type="number"
                  min="1"
                  max="100"
                  value={form.overs}
                  onChange={(e) => setForm((p) => ({ ...p, overs: e.target.value }))}
                />
              </div>
            )}

            {theme === 'test' && (
              <div className="rounded-lg bg-cricket-red/10 border border-cricket-red/20 p-3">
                <p className="text-xs text-cricket-red font-medium">
                  Test Match theme active — Deep Green + Red + White palette will be applied to this tournament.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prize_pool">Prize pool</Label>
              <Input
                id="prize_pool"
                placeholder="e.g. ₹50,000"
                value={form.prize_pool}
                onChange={(e) => setForm((p) => ({ ...p, prize_pool: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rules">Tournament rules</Label>
              <Textarea
                id="rules"
                placeholder="Enter tournament rules and regulations..."
                value={form.rules}
                onChange={(e) => setForm((p) => ({ ...p, rules: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="gap-1.5">
            <Plus className="size-4" />
            {loading ? 'Creating...' : 'Create Tournament'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/tournaments')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
