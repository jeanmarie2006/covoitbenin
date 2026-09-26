import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ApiError, get, post } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Empty, Field, Modal, Spinner, Stars, money, useLoad, useToast } from '../lib/ui.jsx'
import Chat from '../components/Chat.jsx'
import { StatutBadge, heure, jour } from '../components/Parts.jsx'

export default function Passager() {
  const { user, ready } = useAuth()
  const toast = useToast()
  const r = useLoad(() => (user?.role === 'passager' ? get('mes-reservations') : Promise.resolve([])), [user?.id])
  const [tab, setTab] = useState('avenir')
  const [chat, setChat] = useState(null)
  const [pay, setPay] = useState(null)
  const [rate, setRate] = useState(null)
  const [busy, setBusy] = useState(false)
  if (!ready) return <Spinner />
  if (!user) return <Navigate to="/connexion" replace />
  if (user.role !== 'passager') return <Navigate to="/conducteur" replace />

  const list = r.data || []
  const avenir = list.filter((x) => x.trajet.statut === 'ouvert' && ['en_attente', 'confirmee'].includes(x.statut))
  const histo = list.filter((x) => !(x.trajet.statut === 'ouvert' && ['en_attente', 'confirmee'].includes(x.statut)))

  const annuler = async (x) => {
    if (!confirm('Annuler cette réservation ?')) return
    try { await post(`reservations/${x.id}/annuler`); toast('Réservation annulée.'); r.reload() } catch (e) { toast(e.message, 'err') }
  }
  const payer = async () => {
    setBusy(true)
    try { await post(`reservations/${pay.r.id}/payer`, { mode: pay.mode, numero: pay.numero }); toast('Paiement effectué (simulation).'); setPay(null); r.reload() }
    catch (e) { toast(e instanceof ApiError ? e.all() : e.message, 'err') } finally { setBusy(false) }
  }
  const noter = async () => {
    setBusy(true)
    try { await post(`reservations/${rate.r.id}/avis`, { note: rate.note, commentaire: rate.commentaire }); toast('Merci pour votre avis !'); setRate(null); r.reload() }
    catch (e) { toast(e instanceof ApiError ? e.all() : e.message, 'err') } finally { setBusy(false) }
  }

  const Card = ({ x, hist }) => (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold capitalize text-brand-700">{jour(x.trajet.depart_at, true)} · {heure(x.trajet.depart_at)}</p>
          <Link to={`/trajet/${x.trajet.id}`} className="text-lg font-extrabold text-slate-900 hover:text-brand-700">{x.trajet.depart.nom} → {x.trajet.arrivee.nom}</Link>
          <p className="text-sm text-slate-500">Conducteur : <Link className="font-semibold hover:underline" to={`/membre/${x.trajet.conducteur.id}`}>{x.trajet.conducteur.name}</Link>{x.trajet.conducteur.telephone && <> · ☎ {x.trajet.conducteur.telephone}</>}</p>
        </div>
        <div className="text-right"><StatutBadge s={x.statut} /><p className="mt-1 text-lg font-extrabold">{money(x.total)}</p><p className="text-xs text-slate-500">{x.places} place{x.places > 1 ? 's' : ''}</p></div>
      </div>
      {x.paiement_statut === 'paye' && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">✓ Payé par {x.paiement_mode === 'momo' ? 'MTN MoMo' : 'Moov Money'} · réf. {x.paiement_ref}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {['confirmee', 'en_attente'].includes(x.statut) && <button className="btn-ghost !py-1.5 text-xs" onClick={() => setChat(x)}>💬 Messages</button>}
        {!hist && x.statut === 'confirmee' && x.paiement_statut !== 'paye' && <button className="btn-primary !py-1.5 text-xs" onClick={() => setPay({ r: x, mode: 'momo', numero: user.telephone || '' })}>💳 Payer par Mobile Money</button>}
        {!hist && <button className="btn-ghost !py-1.5 text-xs text-rose-600" onClick={() => annuler(x)}>Annuler</button>}
        {hist && x.statut === 'confirmee' && x.trajet.statut === 'termine' && (x.a_note
          ? <span className="text-xs font-semibold text-slate-400">Déjà noté ✓</span>
          : <button className="btn-primary !py-1.5 text-xs" onClick={() => setRate({ r: x, note: 5, commentaire: '' })}>★ Noter le conducteur</button>)}
      </div>
    </article>
  )

  const shown = tab === 'avenir' ? avenir : histo
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Mes réservations</h1><p className="text-sm text-slate-500">Bonjour {user.name.split(' ')[0]} 👋</p></div>
        <Link to="/trajets" className="btn-primary">Trouver un trajet</Link>
      </div>
      <div className="mt-5 flex gap-2">
        {[['avenir', `À venir (${avenir.length})`], ['histo', `Historique (${histo.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === k ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{l}</button>
        ))}
      </div>
      <div className="mt-5 grid gap-4">
        {r.loading && !r.data ? <Spinner /> : shown.length === 0
          ? <Empty icon="🧳" title={tab === 'avenir' ? 'Aucune réservation à venir' : 'Aucun trajet dans l’historique'}><Link to="/trajets" className="btn-primary mt-3">Chercher un trajet</Link></Empty>
          : shown.map((x) => <Card key={x.id} x={x} hist={tab === 'histo'} />)}
      </div>

      {chat && <Chat reservationId={chat.id} titre={`${chat.trajet.depart.nom} → ${chat.trajet.arrivee.nom}`} onClose={() => setChat(null)} />}
      {pay && (
        <Modal title="Paiement Mobile Money" onClose={() => setPay(null)}>
          <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Simulation : aucun argent réel n’est débité.</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {[['momo', 'MTN MoMo', '#facc15'], ['moov', 'Moov Money', '#2563eb']].map(([v, l, c]) => (
              <button key={v} type="button" onClick={() => setPay({ ...pay, mode: v })} aria-pressed={pay.mode === v} className={`rounded-xl border-2 p-3 text-sm font-bold ${pay.mode === v ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}><span className="mr-1.5 inline-block h-3 w-3 rounded-full" style={{ background: c }} />{l}</button>
            ))}
          </div>
          <Field label="Numéro Mobile Money"><input className="input" value={pay.numero} onChange={(e) => setPay({ ...pay, numero: e.target.value })} placeholder="+229 01 …" inputMode="tel" autoFocus /></Field>
          <div className="mt-4 flex justify-between text-sm"><span className="text-slate-500">Montant</span><b className="text-lg">{money(pay.r.total)}</b></div>
          <div className="mt-4 flex gap-2"><button className="btn-ghost flex-1" onClick={() => setPay(null)}>Annuler</button><button className="btn-primary flex-1" disabled={busy || pay.numero.length < 8} onClick={payer}>Payer {money(pay.r.total)}</button></div>
        </Modal>
      )}
      {rate && (
        <Modal title="Noter le conducteur" onClose={() => setRate(null)}>
          <p className="mb-2 text-sm text-slate-600">Comment s’est passé le trajet avec {rate.r.trajet.conducteur.name} ?</p>
          <div className="mb-3"><Stars value={rate.note} onChange={(n) => setRate({ ...rate, note: n })} size="text-4xl" /></div>
          <Field label="Commentaire (facultatif)"><textarea className="input min-h-24" maxLength={300} value={rate.commentaire} onChange={(e) => setRate({ ...rate, commentaire: e.target.value })} /></Field>
          <div className="mt-4 flex gap-2"><button className="btn-ghost flex-1" onClick={() => setRate(null)}>Annuler</button><button className="btn-primary flex-1" disabled={busy} onClick={noter}>Publier mon avis</button></div>
        </Modal>
      )}
    </div>
  )
}
