import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BookOpen } from 'lucide-react'

export function TTRulesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="size-5" /> Table Tennis Rules
        </h1>
        <p className="text-sm text-muted-foreground">Scoring and serving rules used by this application</p>
      </div>

      <Card>
        <CardContent className="pt-6 pb-6 space-y-6">
          {/* Scoring */}
          <section>
            <h2 className="text-lg font-bold mb-3">Scoring</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>The standard game target is <strong className="text-foreground">11 points</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>A player/team must <strong className="text-foreground">win by 2 points</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>At <strong className="text-foreground">10–10 (deuce)</strong>, play continues until one side leads by 2 points.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>This application also provides a configurable <strong className="text-foreground">21-point</strong> Quick Match format. The same 2-point winning rule applies at 20–20.</span>
              </li>
            </ul>
            <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm font-mono space-y-0.5">
              <p>11 – 8  → <span className="text-primary font-semibold">WIN</span></p>
              <p>11 – 9  → <span className="text-primary font-semibold">WIN</span></p>
              <p>11 – 10 → <span className="text-amber-600 font-semibold">NOT WIN</span> (need 2-point lead)</p>
              <p>10 – 10 → <span className="text-amber-600 font-semibold">DEUCE</span></p>
              <p>12 – 10 → <span className="text-primary font-semibold">WIN</span></p>
              <p>14 – 12 → <span className="text-primary font-semibold">WIN</span></p>
            </div>
          </section>

          <Separator />

          {/* Serving */}
          <section>
            <h2 className="text-lg font-bold mb-3">Serving</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>In <strong className="text-foreground">11-point format</strong>, service changes <strong className="text-foreground">every 2 points</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>In <strong className="text-foreground">21-point format</strong>, service changes <strong className="text-foreground">every 5 points</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>At <strong className="text-foreground">deuce (10–10 or 20–20)</strong> and beyond, service alternates <strong className="text-foreground">every single point</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>The server is tracked and highlighted automatically on the scoreboard.</span>
              </li>
            </ul>
            <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm font-mono space-y-0.5">
              <p className="text-xs text-muted-foreground font-sans font-semibold mb-1">11-Point Games:</p>
              <p>Points 1–2: <span className="text-foreground">Player A serves (2 pts)</span></p>
              <p>Points 3–4: <span className="text-foreground">Player B serves (2 pts)</span></p>
              <p className="text-xs text-muted-foreground font-sans font-semibold mt-2 mb-1">21-Point Games:</p>
              <p>Points 1–5: <span className="text-foreground">Player A serves (5 pts)</span></p>
              <p>Points 6–10: <span className="text-foreground">Player B serves (5 pts)</span></p>
              <p className="mt-2 text-amber-600 font-sans text-xs">At deuce: service alternates every 1 point</p>
            </div>
          </section>

          <Separator />

          {/* Singles */}
          <section>
            <h2 className="text-lg font-bold mb-3">Singles</h2>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">1 player vs 1 player.</strong> Each player serves for 2 points in alternation. The winner is the first to reach the target score with a 2-point advantage.
            </p>
          </section>

          <Separator />

          {/* Doubles */}
          <section>
            <h2 className="text-lg font-bold mb-3">2v2 Doubles Rules</h2>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">5 Serves Per Player (21-Point Format):</strong> Each server serves 5 consecutive points before service passes to the next player in the fixed rotation.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Fixed Rotation:</strong> Player A1 → B1 → A2 → B2 → A1, with 5 serves each.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Deuce (20–20 or 10–10):</strong> Service alternates every 1 point following the rotation order until a 2-point lead is achieved.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Deciding Game Side Change:</strong> In the deciding game, teams change sides when one side reaches <strong className="text-foreground">10 points</strong> (for 21-pt) or <strong className="text-foreground">5 points</strong> (for 11-pt).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Fixed Order on Side Change:</strong> The serving and receiving order remains strictly fixed when changing sides.</span>
              </li>
            </ul>

            <h3 className="text-sm font-semibold mb-2">Doubles Rotation Sequence</h3>
            <div className="rounded-lg bg-muted/50 p-3 text-sm font-mono space-y-1">
              <p>Rotation 1: <span className="text-foreground font-semibold">A1 serves (5 pts)</span> → B1 receives</p>
              <p>Rotation 2: <span className="text-foreground font-semibold">B1 serves (5 pts)</span> → A2 receives</p>
              <p>Rotation 3: <span className="text-foreground font-semibold">A2 serves (5 pts)</span> → B2 receives</p>
              <p>Rotation 4: <span className="text-foreground font-semibold">B2 serves (5 pts)</span> → A1 receives</p>
              <p className="text-muted-foreground mt-2">Cycle repeats (A1 → B1 → A2 → B2 → A1).</p>
            </div>
          </section>

          <Separator />

          {/* Match structure */}
          <section>
            <h2 className="text-lg font-bold mb-3">Match Structure</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Single Game:</strong> One game to the target score.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Best of 3:</strong> First to win 2 games.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong className="text-foreground">Best of 5:</strong> First to win 3 games.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>In multi-game matches, the receiver of the previous game becomes the server of the next game.</span>
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
