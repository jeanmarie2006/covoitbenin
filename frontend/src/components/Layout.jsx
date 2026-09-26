import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useAuth } from '../lib/auth.jsx'
import { InstallButton } from '../lib/pwa.jsx'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const link = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`
  const espace = user ? (user.role === 'conducteur' ? '/conducteur' : '/passager') : '/connexion'
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[500] border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Logo />
          <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            <NavLink to="/" end className={link}>Accueil</NavLink>
            <NavLink to="/trajets" className={link}>Trouver un trajet</NavLink>
            {user?.role === 'conducteur' && <NavLink to="/conducteur/publier" className={link}>Publier un trajet</NavLink>}
            {user && <NavLink to={espace} end className={link}>Mon espace</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <InstallButton className="btn-ghost hidden lg:inline-flex !py-2" label="⬇ Installer" />
            {user ? (
              <><span className="hidden text-sm font-semibold text-slate-600 sm:inline">{user.name} <span className="badge bg-brand-100 text-brand-700">{user.role}</span></span>
                <button className="btn-ghost !py-2" onClick={async () => { await logout(); nav('/') }}>Quitter</button></>
            ) : (
              <><Link to="/connexion" className="btn-ghost !py-2">Connexion</Link><Link to="/inscription" className="btn-primary !py-2 hidden sm:inline-flex">S’inscrire</Link></>
            )}
            <button className="btn-ghost !px-3 !py-2 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">☰</button>
          </div>
        </div>
        {open && (
          <nav className="grid gap-1 border-t border-slate-100 bg-white px-4 py-3 md:hidden" onClick={() => setOpen(false)}>
            <NavLink to="/" end className={link}>Accueil</NavLink><NavLink to="/trajets" className={link}>Trouver un trajet</NavLink>
            {user?.role === 'conducteur' && <NavLink to="/conducteur/publier" className={link}>Publier un trajet</NavLink>}
            {user && <NavLink to={espace} end className={link}>Mon espace</NavLink>}
            <NavLink to="/installer" className={link}>⬇ Installer l’application</NavLink>
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <p><Link to="/installer" className="font-semibold text-brand-700 hover:underline">Installer l’application</Link> · Projet de démonstration : conducteurs, trajets et paiements Mobile Money fictifs.</p>
        <p className="mt-1">Cartes © OpenStreetMap · Réalisé par <a className="font-semibold text-brand-700 hover:underline" href="https://sedjame-vianney.vercel.app" target="_blank" rel="noopener">Sedjame Vianney</a></p>
      </footer>
    </div>
  )
}
