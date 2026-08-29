import { Link } from 'react-router-dom'
import {
  Trophy,
  Calendar,
  BarChart3,
  Home,
  Briefcase,
  Zap,
  BookOpen,
  Award,
  Radio,
  Mail,
  LayoutGrid,
} from 'lucide-react'

const cricketLinks = [
  { to: '/cricket', label: 'Cricket Hub', icon: Home },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/tournaments/new', label: 'Create Tournament', icon: Zap },
  { to: '/matches', label: 'Matches', icon: Calendar },
  { to: '/stats', label: 'Player Stats', icon: BarChart3 },
]

const ttLinks = [
  { to: '/table-tennis', label: 'Table Tennis Hub', icon: Home },
  { to: '/table-tennis/tournaments', label: 'TT Tournaments', icon: Award },
  { to: '/table-tennis/quick-match', label: 'Quick Match', icon: Zap },
  { to: '/table-tennis/fixtures', label: 'Fixtures', icon: Calendar },
  { to: '/table-tennis/live', label: 'Live Matches', icon: Radio },
  { to: '/table-tennis/results', label: 'Results', icon: Trophy },
  { to: '/table-tennis/rules', label: 'Rules Guide', icon: BookOpen },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand column */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="Local Tournament Logo"
                className="size-9 object-contain transition-transform group-hover:scale-105"
              />
              <span className="font-bold text-xl tracking-tight text-foreground">
                Local Tournament
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The modern multi-sport management platform. Auto-generate round-robin fixtures, track ball-by-ball and point-by-point live scores, and view career statistics.
            </p>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-2">
                <LayoutGrid className="size-3.5 text-primary shrink-0" />
                <Link to="/" className="hover:text-foreground transition-colors font-medium">
                  Switch Sport (Sports Hub)
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-primary shrink-0" />
                <a href="mailto:ankush170306@gmail.com" className="hover:text-foreground transition-colors">
                  ankush170306@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Cricket Module Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 inline-block" />
              Cricket
            </h3>
            <ul className="space-y-2.5">
              {cricketLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <Icon className="size-3.5 text-muted-foreground/60 group-hover:text-emerald-500 transition-colors" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Table Tennis Module Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500 inline-block" />
              Table Tennis
            </h3>
            <ul className="space-y-2.5">
              {ttLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <Icon className="size-3.5 text-muted-foreground/60 group-hover:text-blue-500 transition-colors" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Careers & Opportunities */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary inline-block" />
              Careers
            </h3>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  We're Hiring
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">Frontend Developer</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Join us in building the next generation sports management tools.
              </p>
              <Link
                to="/careers"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors pt-1"
              >
                Apply Now →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            © {currentYear} Local Tournament. All-in-One Multi-Sport Management Platform.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">
              Sports Hub
            </Link>
            <span>·</span>
            <Link to="/cricket" className="hover:text-foreground transition-colors">
              Cricket
            </Link>
            <span>·</span>
            <Link to="/table-tennis" className="hover:text-foreground transition-colors">
              Table Tennis
            </Link>
            <span>·</span>
            <Link to="/careers" className="hover:text-foreground transition-colors">
              Careers
            </Link>
            <span>·</span>
            <a href="mailto:ankush170306@gmail.com" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
