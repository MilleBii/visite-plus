import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined) // undefined = chargement en cours
  const [profile, setProfile]   = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) chargerProfil(session.user.id)
      else setSession(null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) chargerProfil(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function chargerProfil(userId) {
    const { data } = await supabase
      .from('user_profiles')
      .select('role, client_id, prenom, nom, actif, cgu_accepte')
      .eq('user_id', userId)
      .single()
    setProfile(data)
  }

  const value = {
    session,
    user:     session?.user ?? null,
    role:     profile?.role ?? null,
    clientId: profile?.client_id ?? null,
    profile,
    loading:  session === undefined,
    signOut:  () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
