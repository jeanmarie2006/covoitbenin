import { useSearchParams } from 'react-router-dom'
import { get } from '../lib/api.js'
import { Empty, Spinner, useLoad } from '../lib/ui.jsx'
import TripMap from '../components/TripMap.jsx'
import { TripCard } from '../components/Parts.jsx'
import { PlacesSelect } from './Home.jsx'

export default function Trajets() {
  const [sp, setSp] = useSearchParams()
  const q = Object.fromEntries(sp)
  const lieux = useLoad(() => get('lieux'), [])
  const res = useLoad(() => get('trajets', q), [sp.toString()])
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n) }
  const pts = []
  const seen = new Set()
  ;(res.data || []).forEach((t) => [t.depart, t.arrivee].forEach((l) => { if (!seen.has(l.id)) { seen.add(l.id); pts.push({ lat: l.lat, lng: l.lng, label: l.nom }) } }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-extrabold text-slate-900">Trouver un trajet</h1>
      <div className="card mt-5 grid gap-3 p-4 md:grid-cols-5 md:items-end" role="search">
        <PlacesSelect lieux={lieux.data} value={q.depart || ''} onChange={(v) => set('depart', v)} label="Départ" id="d" />
        <PlacesSelect lieux={lieux.data} value={q.arrivee || ''} onChange={(v) => set('arrivee', v)} label="Arrivée" id="a" />
        <div><label className="label" htmlFor="dt">Date</label><input id="dt" type="date" className="input" value={q.date || ''} onChange={(e) => set('date', e.target.value)} /></div>
        <div><label className="label" htmlFor="pl">Places min.</label><select id="pl" className="input" value={q.places || ''} onChange={(e) => set('places', e.target.value)}><option value="">Toutes</option>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></div>
        <div><label className="label" htmlFor="tri">Trier par</label><select id="tri" className="input" value={q.tri || 'heure'} onChange={(e) => set('tri', e.target.value)}><option value="heure">Heure de départ</option><option value="prix">Prix</option></select></div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="mb-3 text-sm text-slate-500" aria-live="polite">{res.data ? `${res.data.length} trajet${res.data.length > 1 ? 's' : ''} trouvé${res.data.length > 1 ? 's' : ''}` : ' '}</p>
          {res.loading && !res.data ? <Spinner /> : res.data?.length === 0 ? <Empty icon="🚗" title="Aucun trajet pour ces critères">Modifiez la date ou le lieu, ou publiez vous-même un trajet.</Empty> : <div className="grid gap-4">{res.data?.map((t) => <TripCard key={t.id} t={t} />)}</div>}
        </div>
        <aside className="hidden lg:block"><div className="sticky top-24"><TripMap points={pts} height={420} zoom={10} /></div></aside>
      </div>
    </div>
  )
}
