import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const C = {
  primaire: '#1B4332',
  bg: '#F5F5F4',
  bordure: '#E7E5E4',
  erreur: '#DC2626',
  erreurBg: '#FEF2F2',
  vert: '#059669',
  vertBg: '#D1FAE5',
}

export default function Invite() {
  const [mdp, setMdp]               = useState('')
  const [mdpConfirm, setMdpConfirm] = useState('')
  const [cgu, setCgu]               = useState(false)
  const [erreur, setErreur]         = useState(null)
  const [chargement, setChargement] = useState(false)
  const [tokenValide, setTokenValide] = useState(null)
  const navigate = useNavigate()

  // Supabase place le token dans le hash de l'URL à la réception du lien d'invitation
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('type=invite') && !hash.includes('type=recovery')) {
      setTokenValide(false)
    } else {
      setTokenValide(true)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur(null)

    if (mdp.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (mdp !== mdpConfirm) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }
    if (!cgu) {
      setErreur('Vous devez accepter les conditions générales d\'utilisation.')
      return
    }

    setChargement(true)

    const { error: updateError } = await supabase.auth.updateUser({ password: mdp })
    if (updateError) {
      setErreur('Erreur lors de la définition du mot de passe : ' + updateError.message)
      setChargement(false)
      return
    }

    // Activer le compte + accepter les CGU
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ actif: true, cgu_accepte: true })
        .eq('user_id', user.id)
    }

    setChargement(false)
    navigate('/bo', { replace: true })
  }

  if (tokenValide === false) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Lien invalide ou expiré</div>
          <div style={{ color: '#78716C', fontSize: 14 }}>
            Ce lien d'invitation a expiré (7 jours) ou est incorrect.<br />
            Contactez votre administrateur pour recevoir un nouvel email.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 40,
        width: '100%', maxWidth: 420,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✝</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: C.primaire, letterSpacing: 1 }}>VISITE+</div>
          <div style={{ fontSize: 14, color: '#374151', marginTop: 8, fontWeight: 500 }}>
            Bienvenue — Définissez votre mot de passe
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={mdp}
              onChange={e => setMdp(e.target.value)}
              required
              autoFocus
              placeholder="8 caractères minimum"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${C.bordure}`, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={mdpConfirm}
              onChange={e => setMdpConfirm(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${C.bordure}`, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={cgu}
              onChange={e => setCgu(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span style={{ color: '#374151' }}>
              J'accepte les{' '}
              <a href="/cgu" target="_blank" style={{ color: C.primaire }}>
                conditions générales d'utilisation
              </a>
              {' '}de Visite+.
            </span>
          </label>

          {erreur && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: C.erreurBg, color: C.erreur,
              fontSize: 13, border: '1px solid #FECACA',
            }}>
              {erreur}
            </div>
          )}

          <button
            type="submit"
            disabled={chargement}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 8,
              background: chargement ? '#9CA3AF' : C.primaire,
              color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: chargement ? 'wait' : 'pointer',
              marginTop: 4,
            }}
          >
            {chargement ? 'Enregistrement…' : 'Accéder au Back Office'}
          </button>
        </form>
      </div>
    </div>
  )
}
