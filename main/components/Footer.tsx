import { Link } from 'react-router-dom'
import { Trophy, Calendar, BarChart3, Home, Briefcase, Mail, MapPin } from 'lucide-react'

const footerNavLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/matches', label: 'Matches', icon: Calendar },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="LocalCricket Logo"
                className="size-9 object-contain transition-transform group-hover:scale-110"
              />
              <span className="font-bold text-xl tracking-tight text-foreground">
                LocalCricket
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
              Your go-to platform for managing local cricket tournaments. Live scoring, stats, and everything cricket.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span>Made for cricket lovers, everywhere</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {footerNavLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <Icon className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
              Platform
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/tournaments/new"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Trophy className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  Create Tournament
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Mail className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Mail className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Careers */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
              Careers
            </h3>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  We're Hiring
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="size-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">Frontend Developer</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Full-time · Remote
              </p>
              <Link
                to="/careers"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                View Opening
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {currentYear} LocalCricket. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/careers"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Careers
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <a
              href="mailto:ankush170306@gmail.com"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
