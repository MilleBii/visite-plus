import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérifier que l'appelant est authentifié et a le rôle requis
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return erreur('Non autorisé', 401)

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) return erreur('Non autorisé', 401)

    const { data: appelant, error: profileError } = await supabaseUser
      .from('user_profiles')
      .select('role, client_id')
      .eq('user_id', user.id)
      .eq('actif', true)
      .single()

    if (profileError || !appelant) return erreur('Profil introuvable', 403)
    if (!['super_admin', 'editeur_1visible', 'admin_client'].includes(appelant.role)) {
      return erreur('Droits insuffisants', 403)
    }

    const body = await req.json()
    const { email, role, client_id, prenom, nom, redirect_to, resend, user_id } = body

    // ── Cas renvoi d'invitation ──────────────────────────────────────────────
    if (resend && user_id) {
      if (!['super_admin', 'editeur_1visible', 'admin_client'].includes(appelant.role)) {
        return erreur('Droits insuffisants', 403)
      }
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const { data: targetUser, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(user_id)
      if (targetErr || !targetUser?.user?.email) return erreur('Utilisateur introuvable', 404)

      const redirectTo = redirect_to ?? 'http://localhost:5173/bo/invite'
      const { error: resendErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        targetUser.user.email,
        { redirectTo }
      )
      if (resendErr) return erreur(resendErr.message, 500)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!email || !role) return erreur('email et role sont requis', 400)

    // Vérifier que l'appelant peut créer ce rôle
    const ROLES_GLOBAUX = ['super_admin', 'editeur_1visible']
    const ROLES_CLIENT  = ['admin_client', 'editeur_client']

    if (ROLES_GLOBAUX.includes(role) && appelant.role !== 'super_admin') {
      return erreur('Seul un super_admin peut créer des rôles globaux', 403)
    }
    if (ROLES_CLIENT.includes(role)) {
      const clientCible = client_id ?? appelant.client_id
      if (!clientCible) return erreur('client_id requis pour ce rôle', 400)
      // admin_client ne peut inviter que dans son propre client
      if (appelant.role === 'admin_client' && clientCible !== appelant.client_id) {
        return erreur('Vous ne pouvez inviter que dans votre organisation', 403)
      }
    }

    // Utiliser le service role pour l'invitation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const redirectTo = redirect_to ?? 'http://localhost:5173/bo/invite'

    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo }
    )

    if (inviteError) {
      // "User already registered" → utilisateur existant
      if (inviteError.message?.includes('already registered')) {
        return erreur('Un compte existe déjà pour cet email', 409)
      }
      return erreur(inviteError.message, 500)
    }

    // Créer le profil avec le rôle et le client
    const clientFinal = ROLES_CLIENT.includes(role)
      ? (client_id ?? appelant.client_id)
      : null

    const { error: insertError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id:      invited.user.id,
        role,
        client_id:    clientFinal,
        prenom:       prenom ?? null,
        nom:          nom ?? null,
        actif:        false,
        cgu_accepte:  false,
      })

    if (insertError) {
      // Rollback : supprimer l'utilisateur créé
      await supabaseAdmin.auth.admin.deleteUser(invited.user.id)
      return erreur('Erreur création profil : ' + insertError.message, 500)
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: invited.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (e) {
    return erreur('Erreur serveur : ' + e.message, 500)
  }
})

function erreur(message: string, status: number) {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  )
}
