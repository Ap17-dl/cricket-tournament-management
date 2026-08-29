import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Award, Plus, ChevronRight, Calendar, MapPin, Trash2, Users, User } from 'lucide-react'
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
import type { TTTournament } from '@/lib/types'

export function TTTournamentsPage() {
  const { profile } = useAuthStore()
  const [tournaments, setTournaments] = useState<TTTournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTournaments()

    const channel = supabase
      .channel('tt-tournaments-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tt_tournaments' }, () => {
        fetchTournaments()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchTournaments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tt_tournaments')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setTournaments(data as TTTournament[])
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tt_tournaments')
        .delete()
        .eq('id', id)
        .eq('created_by', profile?.id || '')

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
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Award className="size-6 text-primary" /> Tournaments
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage Table Tennis tournaments and league schedules</p>
        </div>
        {profile?.role === 'organizer' && (
          <Link to="/table-tennis/tournaments/new">
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
              <CardContent className="py-12" />
            </Card>
          ))}
        </div>
      ) : tournaments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate text-base">{t.name}</h3>
                  </div>
                  <Badge className={cn('shrink-0 text-xs capitalize', statusColors[t.status])}>
                    {t.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                  {t.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3" />
                      <span className="truncate">{t.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3" />
                    <span>
                      {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {t.match_type === 'doubles' ? <Users className="size-3" /> : <User className="size-3" />}
                    <span className="capitalize">{t.match_type} · Best of {t.best_of} · {t.format} pts</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link to={`/table-tennis/tournaments/${t.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full gap-1">
                      View details <ChevronRight className="size-3" />
                    </Button>
                  </Link>

                  {profile?.role === 'organizer' && profile.id === t.created_by && (
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
                            This will permanently delete "{t.name}" and all associated matches. This action cannot be undone.
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
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Award className="size-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold mb-1">No tournaments yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {profile?.role === 'organizer'
                ? 'Create a Table Tennis tournament and generate automatic round-robin fixtures.'
                : 'No Table Tennis tournaments have been created yet.'}
            </p>
            {profile?.role === 'organizer' && (
              <Link to="/table-tennis/tournaments/new">
                <Button className="gap-1.5">
                  <Plus className="size-4" />
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
