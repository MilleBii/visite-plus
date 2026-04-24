import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './bo/PrivateRoute'
import Login from './bo/Login'
import Invite from './bo/Invite'
import TableauDeBord from './bo/TableauDeBord'
import EditeurEglise from './bo/EditeurEglise'
import ScanArrivee from './screens/ScanArrivee'
import Carte from './screens/Carte'
import Accueil from './screens/Accueil'
import Comprendre from './screens/Comprendre'
import Plan from './screens/Plan'
import Programme from './screens/Programme'

function AppVisiteur() {
  const [ecran, setEcran] = useState('scan')
  const naviguer = (destination) => setEcran(destination)
  const retourAccueil = () => setEcran('accueil')
  const retourCarte = () => setEcran('carte')

  return (
    <>
      {ecran === 'scan'       && <ScanArrivee onScan={() => setEcran('accueil')} onVoirCarte={() => setEcran('carte')} onBO={() => window.location.href = '/bo'} />}
      {ecran === 'carte'      && <Carte onSelectEglise={() => setEcran('accueil')} />}
      {ecran === 'accueil'    && <Accueil onNavigate={naviguer} onBack={retourCarte} />}
      {ecran === 'comprendre' && <Comprendre onBack={retourAccueil} />}
      {ecran === 'plan'       && <Plan onBack={retourAccueil} />}
      {ecran === 'programme'  && <Programme onBack={retourAccueil} />}
    </>
  )
}

function BORouter() {
  const [boEgliseId, setBoEgliseId] = useState(null)
  const [ecranBO, setEcranBO]       = useState('dashboard')

  function ouvrirEditeur(id = null) {
    setBoEgliseId(id)
    setEcranBO('editeur')
  }

  return ecranBO === 'editeur' ? (
    <EditeurEglise
      egliseId={boEgliseId}
      onRetour={() => setEcranBO('dashboard')}
    />
  ) : (
    <TableauDeBord
      onEditer={id => ouvrirEditeur(id)}
      onAjouter={() => ouvrirEditeur(null)}
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Visiteur */}
          <Route path="/"    element={<AppVisiteur />} />
          <Route path="/app" element={<AppVisiteur />} />

          {/* Auth BO */}
          <Route path="/bo/login"  element={<Login />} />
          <Route path="/bo/invite" element={<Invite />} />

          {/* Back Office protégé */}
          <Route
            path="/bo/*"
            element={
              <PrivateRoute>
                <BORouter />
              </PrivateRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
