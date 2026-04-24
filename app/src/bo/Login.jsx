import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const C = {
  primaire: '#1B4332',
  bg: '#F5F5F4',
  bordure: '#E7E5E4',
  erreur: '#DC2626',
  erreurBg: '#FEF2F2',
}

export default function Login() {
  const [email, setEmail]           = useState('')
  const [mdp, setMdp]               = useState('')
  const [erreur, setErreur]         = useState(null)
  const [chargement, setChargement] = useState(false)
  const [resetEnvoi, setResetEnvoi] = useState(false)
  const [resetOk, setResetOk]       = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur(null)
    setChargement(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password: mdp })

    setChargement(false)
    if (error) {
      setErreur('Email ou mot de passe incorrect.')
      return
    }
    navigate('/bo', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 40,
        width: '100%', maxWidth: 400,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✝</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: C.primaire, letterSpacing: 1 }}>VISITE+</div>
          <div style={{ fontSize: 13, color: '#78716C', marginTop: 4 }}>Back Office</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="vous@exemple.fr"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${C.bordure}`, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={mdp}
              onChange={e => setMdp(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${C.bordure}`, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {erreur && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: C.erreurBg, color: C.erreur,
              fontSize: 13, border: `1px solid #FECACA`,
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
            {chargement ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          {resetOk ? (
            <p style={{ fontSize: 13, color: C.erreurBg === '#FEF2F2' ? '#059669' : '#059669', margin: 0 }}>
              Email envoyé — vérifiez votre boîte mail.
            </p>
          ) : (
            <button
              onClick={async () => {
                if (!email) { setErreur('Saisissez votre email ci-dessus.'); return }
                setResetEnvoi(true)
                await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/bo/invite`,
                })
                setResetEnvoi(false)
                setResetOk(true)
              }}
              disabled={resetEnvoi}
              style={{
                background: 'none', border: 'none',
                color: '#78716C', fontSize: 13, cursor: resetEnvoi ? 'wait' : 'pointer',
                textDecoration: 'underline',
              }}
            >
              {resetEnvoi ? 'Envoi…' : 'Mot de passe oublié ?'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
