import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')!
    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // 1. Who's calling?
    const { data: { user }, error: authErr } = await caller.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
    }

    // 2. Are they a superadmin?
    const { data: profile } = await caller
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Only Superadmin can add users' }),
        { status: 403, headers: cors })
    }

    // 3. Create the user with the admin client
    const { email, password, full_name, gender, role } = await req.json()
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Missing fields' }),
        { status: 400, headers: cors })
    }

    const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,              // ✅ auto-injected
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // ✅ auto-injected
)

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,                  // skip email confirmation
      user_metadata: {
        full_name,
        gender: gender || 'male',
        role:   role   || 'user',
      },
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }),
        { status: 400, headers: cors })
    }

    return new Response(JSON.stringify({ user: data.user }),
      { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: cors })
  }
})