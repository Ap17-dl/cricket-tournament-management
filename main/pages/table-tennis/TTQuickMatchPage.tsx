import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useTTStore } from '@/store/tt'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Users, User, ArrowLeft, Zap, Loader2 } from 'lucide-react'
import type { TTMatchType, TTMatchFormat, TTBestOf, TTSide } from '@/lib/types'

export function TTQuickMatchPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { startMatch } = useTTStore()

  const [step, setStep] = useState(1)
  const [matchType, setMatchType] = useState<TTMatchType>('singles')
  const [format, setFormat] = useState<TTMatchFormat>(11)
  const [bestOf, setBestOf] = useState<TTBestOf>(1)
  const [firstServer, setFirstServer] = useState<TTSide>('A')

  // Players
  const [playerA1, setPlayerA1] = useState('')
  const [playerA2, setPlayerA2] = useState('')
  const [playerB1, setPlayerB1] = useState('')
  const [playerB2, setPlayerB2] = useState('')

  // Metadata
  const [matchTitle, setMatchTitle] = useState('Quick Match')
  const [venue, setVenue] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleStart = async () => {
    if (!user) return

    // Validate players
    const allNames: string[] = []
    if (!playerA1.trim() || !playerB1.trim()) {
      setError('All players must have names.')
      return
    }
    allNames.push(playerA1.trim().toLowerCase(), playerB1.trim().toLowerCase())

    if (matchType === 'doubles') {
      if (!playerA2.trim() || !playerB2.trim()) {
        setError('All 4 players must have names for doubles.')
        return
      }
      allNames.push(playerA2.trim().toLowerCase(), playerB2.trim().toLowerCase())
    }

    // Check duplicates
    const unique = new Set(allNames)
    if (unique.size !== allNames.length) {
      setError('Each player must be unique. No duplicate names allowed.')
      return
    }

    setError('')
    setLoading(true)

    const playersA = [{ name: playerA1.trim() }]
    const playersB = [{ name: playerB1.trim() }]
    if (matchType === 'doubles') {
      playersA.push({ name: playerA2.trim() })
      playersB.push({ name: playerB2.trim() })
    }

    const matchId = await startMatch(
      {
        matchTitle: matchTitle.trim() || 'Quick Match',
        matchType,
        format,
        bestOf,
        venue: venue.trim() || undefined,
        tableNumber: tableNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        firstServerSide: firstServer,
        playersA,
        playersB,
      },
      user.id
    )

    setLoading(false)

    if (matchId) {
      navigate(`/table-tennis/live/${matchId}`)
    } else {
      setError('Failed to start match. Please try again.')
    }
  }

  const canProceedStep2 = matchType !== null
  const canProceedStep3 = true
  const canProceedStep4 = (() => {
    if (!playerA1.trim() || !playerB1.trim()) return false
    if (matchType === 'doubles' && (!playerA2.trim() || !playerB2.trim())) return false
    return true
  })()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/table-tennis')}>
          <ArrowLeft className="size-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="size-5" /> Quick Match
          </h1>
          <p className="text-sm text-muted-foreground">Set up a new table tennis match</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'size-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                s === step ? 'bg-primary text-primary-foreground' :
                s < step ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              )}
            >
              {s}
            </div>
            {s < 4 && <div className={cn('w-8 h-0.5', s < step ? 'bg-primary/40' : 'bg-muted')} />}
          </div>
        ))}
        <div className="ml-3 text-sm text-muted-foreground">
          {step === 1 && 'Match Type'}
          {step === 2 && 'Format'}
          {step === 3 && 'Players'}
          {step === 4 && 'Details'}
        </div>
      </div>

      {/* Step 1: Match Type */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Match Type</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                matchType === 'singles' && 'ring-2 ring-primary border-primary'
              )}
              onClick={() => setMatchType('singles')}
            >
              <CardContent className="pt-6 pb-6 text-center">
                <User className="size-10 mx-auto mb-3 text-primary" />
                <h3 className="font-bold text-lg">1 vs 1</h3>
                <p className="text-sm text-muted-foreground mt-1">Singles</p>
              </CardContent>
            </Card>
            <Card
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                matchType === 'doubles' && 'ring-2 ring-primary border-primary'
              )}
              onClick={() => setMatchType('doubles')}
            >
              <CardContent className="pt-6 pb-6 text-center">
                <Users className="size-10 mx-auto mb-3 text-primary" />
                <h3 className="font-bold text-lg">2 vs 2</h3>
                <p className="text-sm text-muted-foreground mt-1">Doubles</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!canProceedStep2}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Format */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Score Format</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  format === 11 && 'ring-2 ring-primary border-primary'
                )}
                onClick={() => setFormat(11)}
              >
                <CardContent className="pt-6 pb-6 text-center">
                  <p className="text-3xl font-bold text-primary">11</p>
                  <p className="text-sm text-muted-foreground mt-1">First to 11 points</p>
                  <Badge variant="secondary" className="mt-2">Standard</Badge>
                </CardContent>
              </Card>
              <Card
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  format === 21 && 'ring-2 ring-primary border-primary'
                )}
                onClick={() => setFormat(21)}
              >
                <CardContent className="pt-6 pb-6 text-center">
                  <p className="text-3xl font-bold text-primary">21</p>
                  <p className="text-sm text-muted-foreground mt-1">First to 21 points</p>
                  <Badge variant="secondary" className="mt-2">Extended</Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Best Of</h2>
            <div className="grid grid-cols-3 gap-3">
              {([1, 3, 5] as TTBestOf[]).map(n => (
                <Card
                  key={n}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    bestOf === n && 'ring-2 ring-primary border-primary'
                  )}
                  onClick={() => setBestOf(n)}
                >
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-2xl font-bold text-primary">{n}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {n === 1 ? 'Single Game' : `Best of ${n}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!canProceedStep3}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 3: Players */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">
            {matchType === 'singles' ? 'Select Players' : 'Select Teams'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Side A */}
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-primary">
                    {matchType === 'singles' ? 'Player A' : 'Team A'}
                  </h3>
                  <Badge>Side A</Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>{matchType === 'doubles' ? 'Player 1' : 'Name'}</Label>
                    <Input
                      value={playerA1}
                      onChange={e => setPlayerA1(e.target.value)}
                      placeholder="Enter player name"
                    />
                  </div>
                  {matchType === 'doubles' && (
                    <div>
                      <Label>Player 2</Label>
                      <Input
                        value={playerA2}
                        onChange={e => setPlayerA2(e.target.value)}
                        placeholder="Enter player name"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Side B */}
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-primary">
                    {matchType === 'singles' ? 'Player B' : 'Team B'}
                  </h3>
                  <Badge variant="secondary">Side B</Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>{matchType === 'doubles' ? 'Player 1' : 'Name'}</Label>
                    <Input
                      value={playerB1}
                      onChange={e => setPlayerB1(e.target.value)}
                      placeholder="Enter player name"
                    />
                  </div>
                  {matchType === 'doubles' && (
                    <div>
                      <Label>Player 2</Label>
                      <Input
                        value={playerB2}
                        onChange={e => setPlayerB2(e.target.value)}
                        placeholder="Enter player name"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* First Server */}
          <div className="space-y-3">
            <h3 className="font-semibold">Who serves first?</h3>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={cn(
                  'cursor-pointer transition-all',
                  firstServer === 'A' && 'ring-2 ring-primary border-primary'
                )}
                onClick={() => setFirstServer('A')}
              >
                <CardContent className="pt-3 pb-3 text-center">
                  <p className="font-semibold text-sm">
                    {playerA1 || 'Side A'} serves first
                  </p>
                </CardContent>
              </Card>
              <Card
                className={cn(
                  'cursor-pointer transition-all',
                  firstServer === 'B' && 'ring-2 ring-primary border-primary'
                )}
                onClick={() => setFirstServer('B')}
              >
                <CardContent className="pt-3 pb-3 text-center">
                  <p className="font-semibold text-sm">
                    {playerB1 || 'Side B'} serves first
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)} disabled={!canProceedStep4}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 4: Details & Start */}
      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Match Details</h2>

          <Card>
            <CardContent className="pt-5 space-y-4">
              <div>
                <Label>Match Title</Label>
                <Input
                  value={matchTitle}
                  onChange={e => setMatchTitle(e.target.value)}
                  placeholder="Quick Match"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Venue</Label>
                  <Input
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Table Number</Label>
                  <Input
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder="e.g., Table 1"
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-primary/30">
            <CardContent className="pt-5 space-y-2">
              <h3 className="font-semibold">Match Summary</h3>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Type:</span> {matchType === 'singles' ? 'Singles (1v1)' : 'Doubles (2v2)'}</p>
                <p><span className="text-muted-foreground">Format:</span> First to {format} points</p>
                <p><span className="text-muted-foreground">Games:</span> {bestOf === 1 ? 'Single Game' : `Best of ${bestOf}`}</p>
                <p><span className="text-muted-foreground">Side A:</span> {playerA1}{matchType === 'doubles' ? ` + ${playerA2}` : ''}</p>
                <p><span className="text-muted-foreground">Side B:</span> {playerB1}{matchType === 'doubles' ? ` + ${playerB2}` : ''}</p>
                <p><span className="text-muted-foreground">First Server:</span> {firstServer === 'A' ? playerA1 : playerB1}</p>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            <Button size="lg" onClick={handleStart} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {loading ? 'Starting...' : 'START MATCH'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
