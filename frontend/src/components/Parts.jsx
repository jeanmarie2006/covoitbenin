import { Link } from 'react-router-dom'
import { Stars, money } from '../lib/ui.jsx'

const HUES = ['#a16207', '#0d9488', '#7c3aed', '#db2777', '#2563eb', '#ea580c', '#059669']
export const hue = (s) => HUES[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]
export const Avatar = ({ name, size = 44 }) => (
  <span className="grid shrink-0 place-items-center rounded-full font-extrabold text-white" style={{ width: size, height: size, background: hue(name), fontSize: size * 0.4 }} aria-hidden="true">{name?.[0]}</span>
)

export const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
export const jour = (iso, long = false) => new Date(iso).toLocaleDateString('fr-FR', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' })

export function NoteBadge({ note }) {
  if (!note) return <span className="text-xs text-slate-400">Nouveau</span>
  return <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700"><span className="text-amber-400">★</span>{String(note.moyenne).replace('.', ',')} <span className="font-normal text-slate-400">({note.total})</span></span>
}

export function TripCard({ t }) {
  const full = t.places_dispo === 0
  return (
    <Link to={`/trajet/${t.id}`} className={`card flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center ${full ? 'opacity-60' : ''}`}>
      <div className="w-24 shrink-0"><p className="text-2xl font-extrabold text-slate-900">{heure(t.depart_at)}</p><p className="text-xs font-semibold capitalize text-slate-500">{jour(t.depart_at)}</p></div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-bold text-slate-900"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-600" />{t.depart.nom}<span className="text-xs font-semibold text-slate-400">{t.depart.ville}</span></p>
        <p className="ml-[4px] h-3 border-l-2 border-dashed border-slate-300" />
        <p className="flex items-center gap-2 font-bold text-slate-900"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />{t.arrivee.nom}<span className="text-xs font-semibold text-slate-400">{t.arrivee.ville}</span></p>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Avatar name={t.conducteur.name} size={24} />{t.conducteur.name} <NoteBadge note={t.conducteur.note} />{t.serie && <span className="badge bg-sky-50 text-sky-700" title="Trajet régulier">🔁 régulier</span>}</p>
      </div>
      <div className="text-right"><p className="text-2xl font-extrabold text-brand-700">{money(t.prix)}</p><p className={`text-xs font-bold ${full ? 'text-rose-600' : t.places_dispo <= 1 ? 'text-amber-600' : 'text-emerald-600'}`}>{full ? 'Complet' : `${t.places_dispo} place${t.places_dispo > 1 ? 's' : ''} libre${t.places_dispo > 1 ? 's' : ''}`}</p></div>
    </Link>
  )
}

export const STATUTS = {
  en_attente: ['bg-amber-100 text-amber-800', 'En attente du conducteur'], confirmee: ['bg-emerald-100 text-emerald-800', 'Confirmée'],
  refusee: ['bg-rose-100 text-rose-700', 'Refusée'], annulee: ['bg-slate-200 text-slate-600', 'Annulée'],
}
export const StatutBadge = ({ s }) => <span className={`badge ${STATUTS[s][0]}`}>{STATUTS[s][1]}</span>
export { Stars }
