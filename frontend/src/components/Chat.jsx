import { useEffect, useRef, useState } from 'react'
import { get, post } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Modal, useToast } from '../lib/ui.jsx'
import { heure } from './Parts.jsx'

/** Messagerie entre conducteur et passager (rafraîchie toutes les 5 secondes). */
export default function Chat({ reservationId, titre, onClose }) {
  const { user } = useAuth()
  const toast = useToast()
  const [msgs, setMsgs] = useState([])
  const [txt, setTxt] = useState('')
  const end = useRef(null)
  const load = () => get(`reservations/${reservationId}/messages`).then(setMsgs).catch(() => {})
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t) }, [reservationId])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])
  const send = async (e) => {
    e.preventDefault()
    if (!txt.trim()) return
    try { await post(`reservations/${reservationId}/messages`, { contenu: txt }); setTxt(''); load() } catch (x) { toast(x.message, 'err') }
  }
  return (
    <Modal title={titre || 'Messages'} onClose={onClose}>
      <div className="mb-3 h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3" aria-live="polite">
        {msgs.length === 0 && <p className="grid h-full place-items-center text-sm text-slate-400">Aucun message. Dites bonjour 👋</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.user_id === user.id ? 'justify-end' : ''}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.user_id === user.id ? 'rounded-br-md bg-brand-700 text-white' : 'rounded-bl-md bg-white text-slate-800 shadow-sm'}`}>
              {m.user_id !== user.id && <b className="block text-xs text-brand-700">{m.auteur}</b>}{m.contenu}<span className={`ml-2 text-[10px] ${m.user_id === user.id ? 'text-white/70' : 'text-slate-400'}`}>{heure(m.created_at)}</span>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="flex gap-2"><input className="input" value={txt} onChange={(e) => setTxt(e.target.value)} maxLength={500} placeholder="Votre message…" aria-label="Message" autoFocus /><button className="btn-primary">Envoyer</button></form>
    </Modal>
  )
}
