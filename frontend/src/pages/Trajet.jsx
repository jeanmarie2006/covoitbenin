import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, get, post } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Empty, Spinner, Stars, dateFr, money, useLoad, useToast } from '../lib/ui.jsx'
import TripMap from '../components/TripMap.jsx'
import { Avatar, NoteBadge, heure, jour } from '../components/Parts.jsx'

export default function Trajet() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const t = useLoad(() => get(`trajets/${id}`), [id])
  const mesRes = useLoad(() => (user?.role === 'passager' ? get('mes-reservations') : Promise.resolve([])), [user?.id])
  const [places, setPlaces] = useState(1)
  const [busy, setBusy] = useState(false)

  if (t.loading && !t.data) return <Spinner />
  if (t.error) return <div className="mx-auto max-w-xl px-4 py-16"><Empty icon="😕" title="Trajet introuvable"><Link to="/trajets" className="btn-primary mt-4">Voir les trajets</Link></Empty></div>
  const d = t.data
  const mine = (mesRes.data || []).find((r) => r.trajet.id === d.id && ['en_attente', 'confirmee'].includes(r.statut))
  const total = places * d.prix

  const reserver = async () => {
    if (!user) return nav('/connexion')
    setBusy(true)
    try { await post(`trajets/${d.id}/reservations`, { places }); toast('Demande envoyée ! Le conducteur va la confirmer.'); nav('/passager') }
    catch (x) { toast(x instanceof ApiError ? x.all() : x.message, 'err') } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/trajets" className="text-sm font-semibold text-slate-500 hover:text-brand-700">← Tous les trajets</Link>
      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-6">
            <p className="text-sm font-bold capitalize text-brand-700">{jour(d.depart_at, true)} · {heure(d.depart_at)}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">{d.depart.nom} <span className="text-slate-300">→</span> {d.arrivee.nom}</h1>
            <p className="text-sm text-slate-500">{d.depart.ville} → {d.arrivee.ville}{d.vehicule ? ` · ${d.vehicule}` : ''}{d.serie ? ' · 🔁 trajet régulier' : ''}</p>
            {d.description && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{d.description}</p>}
          </section>
          <TripMap line points={[{ lat: d.depart.lat, lng: d.depart.lng, label: d.depart.nom, big: true }, { lat: d.arrivee.lat, lng: d.arrivee.lng, label: d.arrivee.nom, big: true }]} height={340} />
          <section className="card p-6" aria-labelledby="cd-t">
            <h2 id="cd-t" className="mb-3 font-extrabold text-slate-900">Votre conducteur</h2>
            <div className="flex items-center gap-4"><Avatar name={d.conducteur.name} size={56} />
              <div><Link to={`/membre/${d.conducteur.id}`} className="text-lg font-extrabold text-slate-900 hover:text-brand-700">{d.conducteur.name}</Link><div><NoteBadge note={d.conducteur.note} /></div><p className="text-xs text-slate-500">{d.trajets_effectues} trajet(s) effectué(s) · membre depuis {dateFr(d.membre_depuis, { month: 'long', year: 'numeric' })}</p></div></div>
            {d.conducteur.bio && <p className="mt-3 text-sm text-slate-600">« {d.conducteur.bio} »</p>}
            {d.avis_conducteur.length > 0 && <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">{d.avis_conducteur.map((a) => <li key={a.id} className="text-sm"><Stars value={a.note} size="text-sm" /> <b className="ml-1">{a.auteur.name}</b><p className="text-slate-600">{a.commentaire}</p></li>)}</ul>}
          </section>
        </div>

        <aside>
          <div className="card sticky top-24 space-y-4 p-6">
            <div className="flex items-baseline justify-between"><p className="text-3xl font-extrabold text-brand-700">{money(d.prix)}</p><span className="text-sm text-slate-500">par place</span></div>
            <p className={`text-sm font-bold ${d.places_dispo === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{d.places_dispo === 0 ? 'Trajet complet' : `${d.places_dispo} place${d.places_dispo > 1 ? 's' : ''} disponible${d.places_dispo > 1 ? 's' : ''} sur ${d.places}`}</p>
            {d.statut !== 'ouvert' ? <p className="rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-600">Ce trajet n’est plus disponible.</p>
              : user?.role === 'conducteur' ? <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Connectez-vous avec un compte passager pour réserver.</p>
              : mine ? <div className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">✓ Vous avez déjà une réservation ({mine.statut === 'confirmee' ? 'confirmée' : 'en attente'}). <Link to="/passager" className="underline">Voir mon espace</Link></div>
              : d.places_dispo === 0 ? null : (
                <>
                  <div><label className="label" htmlFor="np">Nombre de places</label><select id="np" className="input" value={places} onChange={(e) => setPlaces(Number(e.target.value))}>{Array.from({ length: Math.min(4, d.places_dispo) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
                  <div className="flex justify-between border-t border-slate-100 pt-3 text-sm"><span className="text-slate-500">Total à payer</span><b className="text-lg">{money(total)}</b></div>
                  <button className="btn-primary w-full !py-3 text-base" onClick={reserver} disabled={busy}>{user ? 'Demander une place' : 'Se connecter pour réserver'}</button>
                  <p className="text-center text-xs text-slate-400">Le conducteur confirme votre demande, puis vous payez par Mobile Money (simulé).</p>
                </>
              )}
          </div>
        </aside>
      </div>
    </div>
  )
}
