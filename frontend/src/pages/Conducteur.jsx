import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiError, get, post } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Empty, Field, Modal, Spinner, Stars, money, useLoad, useToast } from '../lib/ui.jsx'
import Chat from '../components/Chat.jsx'
import { NoteBadge, StatutBadge, heure, jour } from '../components/Parts.jsx'
import { PlacesSelect } from './Home.jsx'

function useGuard() {
  const { user, ready } = useAuth()
  if (!ready) return <Spinner />
  if (!user) return <Navigate to="/connexion" replace />
  if (user.role !== 'conducteur') return <Navigate to="/passager" replace />
  return null
}

export default function Conducteur() {
  const guard = useGuard()
  const { user } = useAuth()
  const toast = useToast()
  const tr = useLoad(() => (user?.role === 'conducteur' ? get('mes-trajets') : Promise.resolve([])), [user?.id])
  const [tab, setTab] = useState('avenir')
  const [chat, setChat] = useState(null)
  const [rate, setRate] = useState(null)
  if (guard) return guard

  const list = tr.data || []
  const avenir = list.filter((t) => t.statut === 'ouvert').sort((a, b) => a.depart_at.localeCompare(b.depart_at))
  const histo = list.filter((t) => t.statut !== 'ouvert')
  const demandes = avenir.flatMap((t) => t.reservations.filter((r) => r.statut === 'en_attente').map((r) => ({ ...r, trajet: t })))

  const act = async (fn, ok) => { try { await fn(); toast(ok); tr.reload() } catch (e) { toast(e instanceof ApiError ? e.all() : e.message, 'err') } }
  const decider = (r, action) => act(() => post(`reservations/${r.id}/decision`, { action }), action === 'confirmer' ? 'Réservation confirmée.' : 'Demande refusée.')
  const terminer = (t) => act(() => post(`trajets/${t.id}/terminer`), 'Trajet marqué comme effectué.')
  const annuler = (t) => confirm('Annuler ce trajet ? Les passagers seront prévenus.') && act(() => post(`trajets/${t.id}/annuler`), 'Trajet annulé.')

  const Trip = ({ t }) => (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-bold capitalize text-brand-700">{jour(t.depart_at, true)} · {heure(t.depart_at)} {t.serie && <span className="badge bg-sky-50 text-sky-700">🔁 régulier</span>}</p>
          <Link to={`/trajet/${t.id}`} className="text-lg font-extrabold text-slate-900 hover:text-brand-700">{t.depart.nom} → {t.arrivee.nom}</Link>
          <p className="text-sm text-slate-500">{money(t.prix)} / place · {t.places_dispo} place(s) libre(s) sur {t.places}</p></div>
        {t.statut !== 'ouvert' && <span className={`badge ${t.statut === 'termine' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{t.statut === 'termine' ? 'Effectué' : 'Annulé'}</span>}
      </div>
      {t.reservations.filter((r) => r.statut !== 'annulee').length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {t.reservations.filter((r) => r.statut !== 'annulee').map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <b className="flex-1"><Link to={`/membre/${r.passager.id}`} className="hover:underline">{r.passager.name}</Link> <span className="font-normal text-slate-500">· {r.places} place{r.places > 1 ? 's' : ''}{r.passager.telephone ? ` · ☎ ${r.passager.telephone}` : ''}</span></b>
              <StatutBadge s={r.statut} />{r.paiement_statut === 'paye' && <span className="badge bg-emerald-50 text-emerald-700">payé</span>}
              {t.statut === 'ouvert' && r.statut === 'en_attente' && <><button className="btn-primary !py-1 !px-2.5 text-xs" onClick={() => decider(r, 'confirmer')}>✓ Confirmer</button><button className="btn-ghost !py-1 !px-2.5 text-xs text-rose-600" onClick={() => decider(r, 'refuser')}>Refuser</button></>}
              {['confirmee', 'en_attente'].includes(r.statut) && <button className="btn-ghost !py-1 !px-2.5 text-xs" onClick={() => setChat({ id: r.id, titre: `${r.passager.name} · ${t.depart.nom} → ${t.arrivee.nom}` })}>💬</button>}
              {t.statut === 'termine' && r.statut === 'confirmee' && <button className="btn-ghost !py-1 !px-2.5 text-xs" onClick={() => setRate({ id: r.id, nom: r.passager.name, note: 5, commentaire: '' })}>★ Noter</button>}
            </li>
          ))}
        </ul>
      )}
      {t.statut === 'ouvert' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {new Date(t.depart_at) < new Date() && <button className="btn-primary !py-1.5 text-xs" onClick={() => terminer(t)}>✓ Marquer effectué</button>}
          <button className="btn-ghost !py-1.5 text-xs text-rose-600" onClick={() => annuler(t)}>Annuler le trajet</button>
        </div>
      )}
    </article>
  )

  const noter = async () => act(() => post(`reservations/${rate.id}/avis`, { note: rate.note, commentaire: rate.commentaire }).then(() => setRate(null)), 'Avis enregistré.')
  const shown = tab === 'avenir' ? avenir : histo

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Mes trajets</h1><div className="flex items-center gap-2 text-sm text-slate-500">Bonjour {user.name.split(' ')[0]} 👋</div></div>
        <Link to="/conducteur/publier" className="btn-primary">＋ Publier un trajet</Link>
      </div>
      {demandes.length > 0 && (
        <section className="card mt-5 border-amber-300 bg-amber-50 p-5" aria-labelledby="dm-t">
          <h2 id="dm-t" className="font-extrabold text-amber-900">🔔 {demandes.length} demande{demandes.length > 1 ? 's' : ''} à traiter</h2>
          <ul className="mt-3 space-y-2">{demandes.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm shadow-sm">
              <span className="flex-1"><b>{r.passager.name}</b> veut {r.places} place{r.places > 1 ? 's' : ''} · {r.trajet.depart.nom} → {r.trajet.arrivee.nom} <span className="capitalize text-slate-500">({jour(r.trajet.depart_at)} {heure(r.trajet.depart_at)})</span></span>
              <button className="btn-primary !py-1.5 text-xs" onClick={() => decider(r, 'confirmer')}>✓ Confirmer</button><button className="btn-ghost !py-1.5 text-xs text-rose-600" onClick={() => decider(r, 'refuser')}>Refuser</button>
            </li>))}</ul>
        </section>
      )}
      <div className="mt-5 flex gap-2">{[['avenir', `À venir (${avenir.length})`], ['histo', `Historique (${histo.length})`]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === k ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{l}</button>)}</div>
      <div className="mt-5 grid gap-4">
        {tr.loading && !tr.data ? <Spinner /> : shown.length === 0 ? <Empty icon="🚘" title="Aucun trajet ici"><Link to="/conducteur/publier" className="btn-primary mt-3">Publier mon premier trajet</Link></Empty> : shown.map((t) => <Trip key={t.id} t={t} />)}
      </div>
      {chat && <Chat reservationId={chat.id} titre={chat.titre} onClose={() => setChat(null)} />}
      {rate && (
        <Modal title={`Noter ${rate.nom}`} onClose={() => setRate(null)}>
          <div className="mb-3"><Stars value={rate.note} onChange={(n) => setRate({ ...rate, note: n })} size="text-4xl" /></div>
          <Field label="Commentaire (facultatif)"><textarea className="input min-h-24" maxLength={300} value={rate.commentaire} onChange={(e) => setRate({ ...rate, commentaire: e.target.value })} /></Field>
          <div className="mt-4 flex gap-2"><button className="btn-ghost flex-1" onClick={() => setRate(null)}>Annuler</button><button className="btn-primary flex-1" onClick={noter}>Publier</button></div>
        </Modal>
      )}
    </div>
  )
}

export function Publier() {
  const guard = useGuard()
  const toast = useToast()
  const nav = useNavigate()
  const lieux = useLoad(() => get('lieux'), [])
  const demain = new Date(Date.now() + 86400000)
  const [f, setF] = useState({ depart_id: '', arrivee_id: '', jour: demain.toISOString().slice(0, 10), heure: '07:30', places: 3, prix: 800, vehicule: '', description: '', recurrent: false, semaines: 2 })
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  if (guard) return guard
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr({}); setBusy(true)
    try {
      const r = await post('trajets', { depart_id: f.depart_id, arrivee_id: f.arrivee_id, depart_at: `${f.jour} ${f.heure}:00`, places: Number(f.places), prix: Number(f.prix), vehicule: f.vehicule || null, description: f.description || null, recurrent: f.recurrent, semaines: f.recurrent ? Number(f.semaines) : null })
      toast(r.created > 1 ? `${r.created} trajets publiés (tous les jours ouvrés).` : 'Trajet publié !')
      nav('/conducteur')
    } catch (x) { if (x instanceof ApiError) setErr(Object.fromEntries(Object.entries(x.errors).map(([k, v]) => [k, v[0]]))); toast(x.message, 'err') } finally { setBusy(false) }
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/conducteur" className="text-sm font-semibold text-slate-500 hover:text-brand-700">← Mes trajets</Link>
      <h1 className="mb-5 mt-2 text-2xl font-extrabold text-slate-900">Publier un trajet</h1>
      <form onSubmit={submit} className="card grid gap-4 p-6 sm:grid-cols-2" noValidate>
        <div><PlacesSelect lieux={lieux.data} value={f.depart_id} onChange={(v) => setF({ ...f, depart_id: v })} label="Lieu de départ" id="pd" placeholder="Choisir…" />{err.depart_id && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{err.depart_id}</p>}</div>
        <div><PlacesSelect lieux={lieux.data} value={f.arrivee_id} onChange={(v) => setF({ ...f, arrivee_id: v })} label="Lieu d’arrivée" id="pa" placeholder="Choisir…" />{err.arrivee_id && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{err.arrivee_id}</p>}</div>
        <Field label="Date" error={err.depart_at}><input type="date" className="input" value={f.jour} min={new Date().toISOString().slice(0, 10)} onChange={set('jour')} /></Field>
        <Field label="Heure de départ"><input type="time" className="input" value={f.heure} onChange={set('heure')} /></Field>
        <Field label="Places disponibles" error={err.places}><select className="input" value={f.places} onChange={set('places')}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select></Field>
        <Field label="Prix par place (FCFA)" error={err.prix}><input type="number" className="input" min="100" step="100" value={f.prix} onChange={set('prix')} /></Field>
        <Field label="Véhicule (facultatif)" error={err.vehicule}><input className="input" value={f.vehicule} onChange={set('vehicule')} placeholder="Ex. Toyota Corolla blanche" /></Field>
        <Field label="Précisions (facultatif)" error={err.description}><input className="input" value={f.description} onChange={set('description')} maxLength={240} placeholder="Point de rendez-vous, bagages…" /></Field>
        <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
          <label className="flex items-center gap-3 font-semibold text-slate-800"><input type="checkbox" className="h-5 w-5 accent-amber-700" checked={f.recurrent} onChange={set('recurrent')} /> 🔁 Trajet régulier : tous les jours ouvrés</label>
          {f.recurrent && <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">Pendant <select className="input !w-24" value={f.semaines} onChange={set('semaines')} aria-label="Semaines">{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select> semaine(s), à partir de la date choisie (lundi au vendredi).</div>}
        </div>
        <div className="sm:col-span-2"><button className="btn-primary !py-3 px-8 text-base" disabled={busy}>{busy ? 'Publication…' : 'Publier'}</button></div>
      </form>
    </div>
  )
}

export function Membre() {
  const { id } = useParams()
  const p = useLoad(() => get(`membres/${id}`), [id])
  if (p.loading && !p.data) return <Spinner />
  if (p.error) return <div className="mx-auto max-w-xl px-4 py-16"><Empty icon="😕" title="Membre introuvable" /></div>
  const d = p.data
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="card p-6">
        <h1 className="text-2xl font-extrabold text-slate-900">{d.name}</h1>
        <p className="text-sm capitalize text-slate-500">{d.role} · {d.trajets_effectues} trajet(s) effectué(s)</p>
        <div className="mt-2"><NoteBadge note={d.note} /></div>
        {d.bio && <p className="mt-3 text-slate-600">« {d.bio} »</p>}
      </div>
      <h2 className="mb-3 mt-6 font-extrabold text-slate-900">Avis reçus</h2>
      {d.avis.length === 0 ? <Empty icon="💬" title="Pas encore d’avis" /> : <ul className="space-y-3">{d.avis.map((a) => <li key={a.id} className="card p-4 text-sm"><Stars value={a.note} size="text-sm" /> <b className="ml-1">{a.auteur.name}</b><p className="mt-1 text-slate-600">{a.commentaire}</p></li>)}</ul>}
    </div>
  )
}
