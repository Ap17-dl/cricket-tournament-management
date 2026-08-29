import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useTTStore } from '@/store/tt'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowLeft, Award, Plus, Trash2, Loader2, User, Users } from 'lucide-react'
import type { TTMatchType, TTMatchFormat, TTBestOf } from '@/lib/types'

interface SinglesParticipant {
  name: string
}

interface DoublesParticipant {
  teamName: string
  player1: string
  player2: string
}

export function TTCreateTournamentPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { createOrGetPlayer } = useTTStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [name, setName] = useState('')
  const [venue, setVenue] = useState('')
  const [matchType, setMatchType] = useState<TTMatchType>('singles')
  const [format, setFormat] = useState<TTMatchFormat>(11)
  const [bestOf, setBestOf] = useState<TTBestOf>(1)

  // Participants Lists
  const [singlesPlayers, setSinglesPlayers] = useState<SinglesParticipant[]>([
    { name: '' },
    { name: '' },
  ])

  const [doublesTeams, setDoublesTeams] = useState<DoublesParticipant[]>([
    { teamName: '', player1: '', player2: '' },
    { teamName: '', player1: '', player2: '' },
  ])

  const addSinglesRow = () => {
    setSinglesPlayers([...singlesPlayers, { name: '' }])
  }

  const removeSinglesRow = (index: number) => {
    if (singlesPlayers.length <= 2) return
    setSinglesPlayers(singlesPlayers.filter((_, i) => i !== index))
  }

  const addDoublesRow = () => {
    setDoublesTeams([...doublesTeams, { teamName: '', player1: '', player2: '' }])
  }

  const removeDoublesRow = (index: number) => {
    if (doublesTeams.length <= 2) return
    setDoublesTeams(doublesTeams.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setError('')
    setLoading(true)

    try {
      // 1. Gather and validate names
      const namesToValidate: string[] = []

      if (matchType === 'singles') {
        const activePlayers = singlesPlayers.filter(p => p.name.trim() !== '')
        if (activePlayers.length < 2) {
          throw new Error('Please enter at least 2 player names.')
        }
        activePlayers.forEach(p => namesToValidate.push(p.name.trim().toLowerCase()))
      } else {
        const activeTeams = doublesTeams.filter(t => t.teamName.trim() !== '' && t.player1.trim() !== '' && t.player2.trim() !== '')
        if (activeTeams.length < 2) {
          throw new Error('Please enter details for at least 2 teams.')
        }
        activeTeams.forEach(t => {
          namesToValidate.push(t.player1.trim().toLowerCase())
          namesToValidate.push(t.player2.trim().toLowerCase())
        })
      }

      // Check duplicate players
      const uniqueNames = new Set(namesToValidate)
      if (uniqueNames.size !== namesToValidate.length) {
        throw new Error('Player names must be unique. No duplicate names allowed in the tournament.')
      }

      // 2. Create the tournament record
      const { data: tournament, error: tourError } = await supabase
        .from('tt_tournaments')
        .insert({
          name: name.trim() || 'Table Tennis Tournament',
          match_type: matchType,
          format,
          best_of: bestOf,
          venue: venue.trim() || null,
          created_by: profile.id,
        })
        .select()
        .single()

      if (tourError) throw tourError

      // 3. Resolve player IDs & setup participant blocks
      interface ParticipantBlock {
        displayName: string // Player A name or Team A name
        players: Array<{ name: string; id: string }>
      }

      const participantBlocks: ParticipantBlock[] = []

      if (matchType === 'singles') {
        const activePlayers = singlesPlayers.filter(p => p.name.trim() !== '')
        for (const p of activePlayers) {
          const playerId = await createOrGetPlayer(p.name.trim(), profile.id)
          participantBlocks.push({
            displayName: p.name.trim(),
            players: [{ name: p.name.trim(), id: playerId }],
          })
        }
      } else {
        const activeTeams = doublesTeams.filter(t => t.teamName.trim() !== '')
        for (const t of activeTeams) {
          const p1Id = await createOrGetPlayer(t.player1.trim(), profile.id)
          const p2Id = await createOrGetPlayer(t.player2.trim(), profile.id)
          participantBlocks.push({
            displayName: t.teamName.trim(),
            players: [
              { name: t.player1.trim(), id: p1Id },
              { name: t.player2.trim(), id: p2Id },
            ],
          })
        }
      }

      // 4. Generate Round-Robin matchups
      const pairings: Array<[ParticipantBlock, ParticipantBlock]> = []
      for (let i = 0; i < participantBlocks.length; i++) {
        for (let j = i + 1; j < participantBlocks.length; j++) {
          pairings.push([participantBlocks[i], participantBlocks[j]])
        }
      }

      // 5. Insert matches and match players
      for (let idx = 0; idx < pairings.length; idx++) {
        const [sideA, sideB] = pairings[idx]

        // Create scheduled match
        const { data: match, error: matchError } = await supabase
          .from('tt_matches')
          .insert({
            match_title: `${sideA.displayName} vs ${sideB.displayName}`,
            match_type: matchType,
            format,
            best_of: bestOf,
            status: 'scheduled',
            venue: venue.trim() || null,
            table_number: `Table ${(idx % 3) + 1}`,
            tournament_id: tournament.id,
            created_by: profile.id,
            first_server_side: 'A',
          })
          .select()
          .single()

        if (matchError) throw matchError

        // Add match players
        const matchPlayers = [
          ...sideA.players.map((p, i) => ({
            match_id: match.id,
            side: 'A',
            player_id: p.id,
            player_name: p.name,
            player_order: i + 1,
          })),
          ...sideB.players.map((p, i) => ({
            match_id: match.id,
            side: 'B',
            player_id: p.id,
            player_name: p.name,
            player_order: i + 1,
          })),
        ]

        const { error: mpError } = await supabase
          .from('tt_match_players')
          .insert(matchPlayers)

        if (mpError) throw mpError
      }

      setLoading(false)
      navigate(`/table-tennis/tournaments/${tournament.id}`)
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the tournament.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/table-tennis/tournaments')}>
          <ArrowLeft className="size-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="size-5" /> New Tournament
          </h1>
          <p className="text-sm text-muted-foreground">Setup a Table Tennis tournament and auto-generate matchups</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tournament Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tournament Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Summer Singles Cup"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue / Table Arena</Label>
              <Input
                id="venue"
                placeholder="e.g., Sports Club Hall 1"
                value={venue}
                onChange={e => setVenue(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Match Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={cn(
                    'cursor-pointer transition-all border p-3 flex items-center justify-center gap-2 text-sm font-semibold',
                    matchType === 'singles' ? 'ring-2 ring-primary border-primary bg-primary/5' : ''
                  )}
                  onClick={() => setMatchType('singles')}
                >
                  <User className="size-4 text-primary" />
                  Singles (1 vs 1)
                </Card>
                <Card
                  className={cn(
                    'cursor-pointer transition-all border p-3 flex items-center justify-center gap-2 text-sm font-semibold',
                    matchType === 'doubles' ? 'ring-2 ring-primary border-primary bg-primary/5' : ''
                  )}
                  onClick={() => setMatchType('doubles')}
                >
                  <Users className="size-4 text-primary" />
                  Doubles (2 vs 2)
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Game Format</Label>
                <div className="flex gap-2">
                  {[11, 21].map(f => (
                    <Button
                      key={f}
                      type="button"
                      variant={format === f ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setFormat(f as TTMatchFormat)}
                    >
                      {f} Points
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Match Format</Label>
                <div className="flex gap-1.5">
                  {([1, 3, 5] as TTBestOf[]).map(b => (
                    <Button
                      key={b}
                      type="button"
                      variant={bestOf === b ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setBestOf(b)}
                    >
                      {b === 1 ? 'Best of 1' : `Best of ${b}`}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tournament Participants</CardTitle>
            <CardDescription>
              Round-robin league fixtures will be generated to match every participant once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matchType === 'singles' ? (
              <div className="space-y-3">
                {singlesPlayers.map((player, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
                    <Input
                      placeholder={`Player Name`}
                      value={player.name}
                      onChange={e => {
                        const newPlayers = [...singlesPlayers]
                        newPlayers[idx].name = e.target.value
                        setSinglesPlayers(newPlayers)
                      }}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => removeSinglesRow(idx)}
                      disabled={singlesPlayers.length <= 2}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={addSinglesRow}>
                  <Plus className="size-3.5" /> Add Player
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {doublesTeams.map((team, idx) => (
                  <Card key={idx} className="border-border/60">
                    <CardContent className="pt-4 pb-4 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">Team #{idx + 1}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:bg-destructive/10 absolute right-2 top-2"
                          onClick={() => removeDoublesRow(idx)}
                          disabled={doublesTeams.length <= 2}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Team / Pair Name</Label>
                          <Input
                            placeholder="e.g. Dynamic Duo"
                            value={team.teamName}
                            onChange={e => {
                              const newTeams = [...doublesTeams]
                              newTeams[idx].teamName = e.target.value
                              setDoublesTeams(newTeams)
                            }}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Player 1 Name</Label>
                          <Input
                            placeholder="Player 1"
                            value={team.player1}
                            onChange={e => {
                              const newTeams = [...doublesTeams]
                              newTeams[idx].player1 = e.target.value
                              setDoublesTeams(newTeams)
                            }}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Player 2 Name</Label>
                          <Input
                            placeholder="Player 2"
                            value={team.player2}
                            onChange={e => {
                              const newTeams = [...doublesTeams]
                              newTeams[idx].player2 = e.target.value
                              setDoublesTeams(newTeams)
                            }}
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={addDoublesRow}>
                  <Plus className="size-3.5" /> Add Doubles Team
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Award className="size-4" />}
            {loading ? 'Generating...' : 'CREATE & GENERATE FIXTURES'}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate('/table-tennis/tournaments')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
