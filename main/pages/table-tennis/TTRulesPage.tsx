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
            <h2 className="text-lg font-bold mb-3">🏓 Scoring</h2>
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
            <h2 className="text-lg font-bold mb-3">🎯 Serving</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Service changes <strong className="text-foreground">every 2 points</strong> during normal play.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>At <strong className="text-foreground">10–10 (deuce)</strong> and beyond, service changes <strong className="text-foreground">every single point</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                <span>The server is tracked automatically — no manual changes needed.</span>
              </li>
            </ul>
            <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm font-mono space-y-0.5">
              <p>Points 1–2: <span className="text-foreground">Player A serves</span></p>
              <p>Points 3–4: <span className="text-foreground">Player B serves</span></p>
              <p>Points 5–6: <span className="text-foreground">Player A serves</span></p>
              <p>...and so on</p>
              <p className="mt-1 text-amber-600">At deuce: service alternates every point</p>
            </div>
          </section>

          <Separator />

          {/* Singles */}
          <section>
            <h2 className="text-lg font-bold mb-3">👤 Singles</h2>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">1 player vs 1 player.</strong> Each player serves for 2 points in alternation. The winner is the first to reach the target score with a 2-point advantage.
            </p>
          </section>

          <Separator />

          {/* Doubles */}
          <section>
            <h2 className="text-lg font-bold mb-3">👥 Doubles</h2>
            <p className="text-sm text-muted-foreground mb-3">
              <strong className="text-foreground">2 players vs 2 players.</strong> In doubles, the serving and receiving order follows a rotation.
            </p>
            <h3 className="text-sm font-semibold mb-2">Doubles Rotation</h3>
            <div className="rounded-lg bg-muted/50 p-3 text-sm font-mono space-y-0.5">
              <p>Serve 1: <span className="text-foreground">A1 serves → B1 receives</span></p>
              <p>Serve 2: <span className="text-foreground">B1 serves → A2 receives</span></p>
              <p>Serve 3: <span className="text-foreground">A2 serves → B2 receives</span></p>
              <p>Serve 4: <span className="text-foreground">B2 serves → A1 receives</span></p>
              <p className="text-muted-foreground mt-1">Then the cycle repeats.</p>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              At deuce, the same rotation applies but service changes every single point instead of every 2.
            </p>
          </section>

          <Separator />

          {/* Match structure */}
          <section>
            <h2 className="text-lg font-bold mb-3">🎮 Match Structure</h2>
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
