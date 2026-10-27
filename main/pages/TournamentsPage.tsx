import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Tournament, MatchFormat, MatchTheme } from '@/lib/types'
import { Trophy, Plus, ChevronRight, Calendar, MapPin, Edit, Trash2, User } from 'lucide-react'
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
      
      
      
      

      
      await supabase.from('matches').delete().eq('tournament_id', id)

      
      await supabase.from('player_stats').delete().eq('tournament_id', id)

      
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
    upcoming: 'bg-white/[0.04] text-stone-300 border-white/[0.1]',
    active: 'bg-white/[0.04] text-emerald-400 border-emerald-700/40',
    completed: 'bg-white/[0.04] text-[#C5A059] border-[#C5A059]/30',
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-stone-100">
            Cricket <span className="font-editorial italic text-[#C5A059]">Tournaments</span>
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1">Browse active championships, knockout series, and league brackets</p>
        </div>
        {profile?.role === 'organizer' && (
          <Link to="/tournaments/new">
            <Button className="gap-2 club-gold-gradient hover:brightness-105 text-[#142318] font-bold text-xs rounded-full shadow-sm border-0 h-10 px-5">
              <Plus className="size-4 text-[#142318]" />
              New Tournament
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 rounded-3xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : tournaments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="rounded-3xl club-card border border-white/[0.08] hover:border-[#C5A059]/40 club-card-hover p-6 flex flex-col justify-between transition-all duration-300 space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg text-stone-100 truncate">{t.name}</h3>
                  <Badge className={cn('shrink-0 text-[10px] font-medium capitalize border rounded-full px-2.5 py-0.5', statusColors[t.status])}>
                    {t.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs text-stone-400">
                  {t.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-[#C5A059] shrink-0" />
                      <span className="truncate">{t.venue}</span>
                    </div>
                  )}
                  {t.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-emerald-400 shrink-0" />
                      <span>
                        {new Date(t.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {t.end_date && ` — ${new Date(t.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Trophy className="size-3.5 text-[#C5A059] shrink-0" />
                    <span className="font-medium text-stone-300">{t.format}{t.overs ? ` · ${t.overs} overs` : ''}</span>
                  </div>
                </div>

                {/* Organizer name */}
                <div className="flex items-center gap-2 text-xs text-stone-400 pt-1">
                  <User className="size-3.5 text-stone-500" />
                  <span className="truncate">Hosted by <strong className="text-stone-300 font-medium">{(t as any).organizer?.name || 'Organizer'}</strong></span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                <Link to={`/tournaments/${t.id}`} className="flex-1">
                  <Button size="sm" className="w-full gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-stone-100 border border-white/[0.08] font-medium text-xs rounded-full h-10 transition-all">
                    Open Tournament <ChevronRight className="size-3.5" />
                  </Button>
                </Link>
                {profile?.role === 'organizer' && profile.id === t.organizer_id && (
                  <div className="flex gap-1.5">
                    <Link to={`/tournaments/${t.id}/edit`}>
                      <Button variant="outline" size="icon" className="size-10 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-slate-300">
                        <Edit className="size-3.5" />
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="size-10 rounded-xl border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#0F172A] border-white/10 text-white rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete tournament?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            This will permanently delete &quot;{t.name}&quot; and all associated data. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/10 border-white/10 text-white hover:bg-white/15 rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
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
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl sports-glass-card border border-white/10 p-12 text-center space-y-3">
          <Trophy className="size-10 text-slate-500 mx-auto" />
          <p className="text-slate-400 text-sm font-medium">No tournaments created yet.</p>
        </div>
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

export function EditTournamentPage() {
  const { id } = useParams<{ id: string }>()
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
  const [status, setStatus] = useState<'upcoming' | 'active' | 'completed'>('upcoming')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTournament()
  }, [id])

  const fetchTournament = async () => {
    if (!id) return
    const { data } = await supabase.from('tournaments').select('*').eq('id', id).single()
    if (data) {
      setForm({
        name: data.name || '',
        venue: data.venue || '',
        start_date: data.start_date ? data.start_date.split('T')[0] : '',
        end_date: data.end_date ? data.end_date.split('T')[0] : '',
        format: data.format,
        overs: data.overs?.toString() || '',
        prize_pool: data.prize_pool || '',
        rules: data.rules || '',
      })
      setStatus(data.status)
    }
    setFetching(false)
  }

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
    if (!profile || !id) return
    setError('')
    setLoading(true)

    const { error: err } = await supabase.from('tournaments').update({
      name: form.name,
      venue: form.venue || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      format: form.format,
      overs: form.overs ? parseInt(form.overs) : null,
      theme,
      prize_pool: form.prize_pool || null,
      rules: form.rules || null,
      status,
    }).eq('id', id).eq('organizer_id', profile.id)

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      navigate(`/tournaments/${id}`)
    }
  }

  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 rounded bg-muted w-48" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    )
  }

  if (profile?.role !== 'organizer') {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Only organizers can edit tournaments.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Tournament</h1>
        <p className="text-muted-foreground text-sm mt-1">Update tournament settings and rules</p>
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
            <CardTitle className="text-base">Tournament Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(['upcoming', 'active', 'completed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'rounded-lg border p-3 text-sm font-medium transition-all text-center capitalize',
                    status === s
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
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
            <Edit className="size-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/tournaments/${id}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
