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
    <footer className="border-t border-stone-200/80 bg-white/80 backdrop-blur-xl mt-auto text-stone-600 font-sans">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="Tournova Logo"
                className="size-8.5 object-contain drop-shadow-xs transition-transform group-hover:scale-105"
              />
              <span className="font-semibold text-xl tracking-tight text-stone-900">
                Tournova
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-stone-500 leading-relaxed max-w-xs">
              The premier sporting tournament platform. Engineered for seamless tournament management, real-time ball-by-ball scoring, and athlete analytics.
            </p>
            <div className="flex flex-col gap-2.5 text-xs text-stone-500 pt-2">
              <div className="flex items-center gap-2">
                <LayoutGrid className="size-3.5 text-[#8C6D2D] shrink-0" />
                <Link to="/hub" className="hover:text-stone-900 transition-colors font-medium text-stone-700">
                  Switch Sport (Sports Hub)
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-stone-400 shrink-0" />
                <a href="mailto:ankush170306@gmail.com" className="hover:text-stone-900 transition-colors">
                  ankush170306@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Cricket Links */}
          <div>
            <h3 className="text-[11px] font-semibold text-stone-800 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#8C6D2D] inline-block" />
              Cricket Arena
            </h3>
            <ul className="space-y-2.5">
              {cricketLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-900 transition-colors group"
                  >
                    <Icon className="size-3 text-stone-400 group-hover:text-stone-800 transition-colors" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Table Tennis Links */}
          <div>
            <h3 className="text-[11px] font-semibold text-stone-800 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#C5A059] inline-block" />
              Table Tennis
            </h3>
            <ul className="space-y-2.5">
              {ttLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-900 transition-colors group"
                  >
                    <Icon className="size-3 text-stone-400 group-hover:text-[#8C6D2D] transition-colors" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Careers & Opportunities */}
          <div>
            <h3 className="text-[11px] font-semibold text-stone-800 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-600 inline-block" />
              Opportunities
            </h3>
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-600" />
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-widest">
                  Active Openings
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="size-3.5 text-stone-500 shrink-0" />
                <span className="text-xs font-medium text-stone-800">Platform Engineer</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Build the future of digital sporting events and competition infrastructure.
              </p>
              <Link
                to="/careers"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C6D2D] hover:text-[#A6823E] transition-colors pt-1"
              >
                Explore Roles →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-stone-200/80 bg-stone-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>
            © {currentYear} Tournova. Private Tournament Management Platform.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link to="/" className="hover:text-stone-900 transition-colors">
              Home
            </Link>
            <span className="text-stone-300">·</span>
            <Link to="/hub" className="hover:text-stone-900 transition-colors">
              Sports Hub
            </Link>
            <span className="text-stone-300">·</span>
            <Link to="/cricket" className="hover:text-stone-900 transition-colors">
              Cricket
            </Link>
            <span className="text-stone-300">·</span>
            <Link to="/table-tennis" className="hover:text-stone-900 transition-colors">
              Table Tennis
            </Link>
            <span className="text-stone-300">·</span>
            <Link to="/careers" className="hover:text-stone-900 transition-colors">
              Careers
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
