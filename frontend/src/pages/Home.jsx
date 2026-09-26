import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { get } from '../lib/api.js'
import { Spinner, useLoad } from '../lib/ui.jsx'
import { useAuth } from '../lib/auth.jsx'
import TripMap from '../components/TripMap.jsx'
import { TripCard } from '../components/Parts.jsx'

export function PlacesSelect({ lieux, value, onChange, label, id, placeholder }) {
  const groups = useMemo(() => { const g = {}; (lieux || []).forEach((l) => { (g[l.ville] ||= []).push(l) }); return g }, [lieux])
  return (
    <div><label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder || 'Peu importe'}</option>
        {Object.entries(groups).map(([v, list]) => <optgroup key={v} label={v}>{list.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}</optgroup>)}
      </select></div>
  )
}

export default function Home() {
  const nav = useNavigate()
  const { user } = useAuth()
  const lieux = useLoad(() => get('lieux'), [])
  const next = useLoad(() => get('trajets'), [])
  const [f, setF] = useState({ depart: '', arrivee: '', date: '', places: '1' })
  const go = (e) => { e.preventDefault(); const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v)); nav(`/trajets?${q}`) }
  const today = new Date().toISOString().slice(0, 10)
  const pts = (lieux.data || []).map((l) => ({ lat: l.lat, lng: l.lng, label: l.nom }))

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-amber-700 to-slate-900 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-12 md:pt-16">
          <p className="mb-4 inline-flex rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold tracking-wide">🚗 Cotonou · Porto-Novo · Abomey-Calavi · Ouidah</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">Partagez la route, <span className="text-brand-500">partagez les frais.</span></h1>
          <p className="mt-5 max-w-2xl text-lg text-white/85">Trouvez une place dans une voiture pour vos trajets quotidiens, ou proposez les vôtres. Moins de frais de transport, plus de convivialité.</p>
          <form onSubmit={go} className="mt-8 grid gap-3 rounded-2xl bg-white p-4 text-slate-800 shadow-2xl shadow-black/30 md:grid-cols-[1fr_1fr_170px_110px_auto] md:items-end" role="search">
            <PlacesSelect lieux={lieux.data} value={f.depart} onChange={(v) => setF({ ...f, depart: v })} label="Départ" id="dep" />
            <PlacesSelect lieux={lieux.data} value={f.arrivee} onChange={(v) => setF({ ...f, arrivee: v })} label="Arrivée" id="arr" />
            <div><label className="label" htmlFor="date">Date</label><input id="date" type="date" min={today} className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div><label className="label" htmlFor="pl">Places</label><select id="pl" className="input" value={f.places} onChange={(e) => setF({ ...f, places: e.target.value })}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></div>
            <button className="btn-primary !py-3 px-6 text-base">Rechercher</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between"><h2 className="text-2xl font-extrabold text-slate-900">Prochains départs</h2><Link to="/trajets" className="text-sm font-bold text-brand-700 hover:underline">Tous les trajets →</Link></div>
        {next.loading ? <Spinner /> : <div className="mt-5 grid gap-4">{next.data?.slice(0, 5).map((t) => <TripCard key={t.id} t={t} />)}</div>}
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Un réseau de points de départ</h2>
            <p className="mt-2 text-slate-600">Quartiers de Cotonou, campus de l’UAC, Calavi, Porto-Novo, Ouidah, Sèmè-Podji… Choisissez le lieu qui vous arrange et voyez les trajets sur la carte.</p>
            <ul className="mt-5 grid gap-3 text-sm">
              {[['💸', 'Économisez', 'Vous partagez les frais : de 500 à 1 500 FCFA la place.'], ['🛡️', 'Confiance', 'Notes et avis réciproques après chaque trajet.'], ['📱', 'Mobile Money', 'Paiement simulé MTN MoMo et Moov Money.']].map(([i, t, d]) => <li key={t} className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-lg">{i}</span><span><b className="block text-slate-900">{t}</b><span className="text-slate-600">{d}</span></span></li>)}
            </ul>
          </div>
          <TripMap points={pts} height={360} zoom={10} />
        </div>
      </section>

      {!user && (
        <section className="mx-auto max-w-4xl px-4 py-14">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-7"><p className="text-3xl">🧍</p><h3 className="mt-2 text-xl font-extrabold text-slate-900">Vous cherchez une place ?</h3><p className="mt-1 text-sm text-slate-600">Réservez en quelques clics et échangez avec le conducteur.</p><Link to="/inscription?role=passager" className="btn-primary mt-4">Je suis passager</Link></div>
            <div className="card p-7"><p className="text-3xl">🚘</p><h3 className="mt-2 text-xl font-extrabold text-slate-900">Vous avez une voiture ?</h3><p className="mt-1 text-sm text-slate-600">Publiez vos trajets, même récurrents, et réduisez vos frais.</p><Link to="/inscription?role=conducteur" className="btn-ghost mt-4">Je suis conducteur</Link></div>
          </div>
        </section>
      )}
    </>
  )
}
