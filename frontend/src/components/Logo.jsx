import { Link } from 'react-router-dom'

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 font-extrabold tracking-tight text-slate-900" aria-label="CovoitBénin — accueil">
      <img src="icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
      <span className="text-lg">Covoit<span className="text-brand-700">Bénin</span></span>
    </Link>
  )
}
