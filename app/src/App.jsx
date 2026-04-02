import { useState } from 'react'
import ScanArrivee from './screens/ScanArrivee'
import Carte from './screens/Carte'
import Accueil from './screens/Accueil'
import Comprendre from './screens/Comprendre'
import Plan from './screens/Plan'
import Programme from './screens/Programme'
import TableauDeBord from './bo/TableauDeBord'
import EditeurEglise from './bo/EditeurEglise'

export default function App() {
  const [ecran, setEcran] = useState('bo_dashboard')
  const [boEgliseId, setBoEgliseId] = useState(null)

  const naviguer = (destination) => setEcran(destination)
  const retourAccueil = () => setEcran('accueil')
  const retourCarte = () => setEcran('carte')

  function ouvrirEditeur(id = null) {
    setBoEgliseId(id)
    setEcran('bo_editeur')
  }

  return (
    <>
      {ecran === 'scan' && <ScanArrivee onScan={() => setEcran('accueil')} onVoirCarte={() => setEcran('carte')} onBO={() => setEcran('bo_dashboard')} />}
      {ecran === 'carte' && <Carte onSelectEglise={(_e) => setEcran('accueil')} />}
      {ecran === 'accueil' && <Accueil onNavigate={naviguer} onBack={retourCarte} />}
      {ecran === 'comprendre' && <Comprendre onBack={retourAccueil} />}
      {ecran === 'plan' && <Plan onBack={retourAccueil} />}
      {ecran === 'programme' && <Programme onBack={retourAccueil} />}
      {ecran === 'bo_dashboard' && (
        <TableauDeBord
          onEditer={id => ouvrirEditeur(id)}
          onAjouter={() => ouvrirEditeur(null)}
        />
      )}
      {ecran === 'bo_editeur' && (
        <EditeurEglise
          egliseId={boEgliseId}
          onRetour={() => setEcran('bo_dashboard')}
        />
      )}
    </>
  )
}
