import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Trajets from './pages/Trajets.jsx'
import Trajet from './pages/Trajet.jsx'
import AuthPage from './pages/AuthPage.jsx'
import Passager from './pages/Passager.jsx'
import Conducteur, { Membre, Publier } from './pages/Conducteur.jsx'
import Installer from './pages/Installer.jsx'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/installer" element={<Installer />} />
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/trajets" element={<Trajets />} />
              <Route path="/trajet/:id" element={<Trajet />} />
              <Route path="/connexion" element={<AuthPage mode="login" />} />
              <Route path="/inscription" element={<AuthPage mode="register" />} />
              <Route path="/passager" element={<Passager />} />
              <Route path="/conducteur" element={<Conducteur />} />
              <Route path="/conducteur/publier" element={<Publier />} />
              <Route path="/membre/:id" element={<Membre />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </>
  )
}
