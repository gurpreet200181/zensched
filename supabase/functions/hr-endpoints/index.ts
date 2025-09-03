import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TeamHealthData {
  user_id: string;
  display_name: string;
  avg7_score: number;
  trend_delta: number;
  avg_meetings: number;
  avg_after_hours_min: number;
  consent: boolean;
}

async function requireOrgRole(supabase: any, roles = ['hr', 'admin']) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('unauthorized')

  // Load profile + membership
  const { data: prof, error: profError } = await supabase
    .from('profiles')
    .select('user_id, org_id, role')
    .eq('user_id', user.id)
    .single()

  if (profError || !prof?.org_id) {
    console.error('Profile error:', profError)
    throw new Error('no_org')
  }

  const { data: mem } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', prof.org_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const effective = mem?.role || prof?.role || 'user'
  console.log('User role check:', { userId: user.id, orgId: prof.org_id, effective, required: roles })
  
  if (!roles.includes(effective)) {
    throw new Error('forbidden')
  }
  
  return { userId: user.id, orgId: prof.org_id, role: effective }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname

    // Support supabase.functions.invoke (POST) with JSON routing
    if (req.method === 'POST') {
      let payload: any = {}
      try {
        payload = await req.json()
      } catch (_) {
        payload = {}
      }

      const route = payload?.route

      if (route === 'team-health') {
        const { orgId } = await requireOrgRole(supabase, ['hr', 'admin'])
        console.log('Fetching team health for org (POST):', orgId)
        const { data, error } = await supabase.rpc('hr_team_health', { org_in: orgId })
        if (error) {
          console.error('Team health error:', error)
          throw error
        }
        return new Response(
          JSON.stringify({ team: data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (route === 'user-health') {
        await requireOrgRole(supabase, ['hr', 'admin'])
        const userId: string | undefined = payload?.userId
        if (!userId) throw new Error('missing_user_id')

        console.log('Fetching user health (POST) for:', userId)
        const fourteenDaysAgo = new Date()
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
        const { data, error } = await supabase
          .from('daily_analytics')
          .select('day, busyness_score, meeting_count, after_hours_min, largest_free_min, user_id')
          .eq('user_id', userId)
          .gte('day', fourteenDaysAgo.toISOString().slice(0, 10))
          .order('day', { ascending: true })

        if (error) {
          console.error('User health error:', error)
          throw error
        }

        return new Response(
          JSON.stringify({ days: data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Also support direct GET calls for debugging
    // GET /hr-endpoints/team-health
    if (path === '/hr-endpoints/team-health' && req.method === 'GET') {
      const { orgId } = await requireOrgRole(supabase, ['hr', 'admin'])
      
      console.log('Fetching team health for org:', orgId)
      
      const { data, error } = await supabase.rpc('hr_team_health', { org_in: orgId })
      
      if (error) {
        console.error('Team health error:', error)
        throw error
      }

      return new Response(
        JSON.stringify({ team: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /hr-endpoints/user-health/:userId
    if (path.startsWith('/hr-endpoints/user-health/') && req.method === 'GET') {
      await requireOrgRole(supabase, ['hr', 'admin'])
      
      const userId = path.split('/').pop()
      if (!userId) throw new Error('missing_user_id')

      console.log('Fetching user health for:', userId)

      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      
      const { data, error } = await supabase
        .from('daily_analytics')
        .select('day, busyness_score, meeting_count, after_hours_min, largest_free_min, user_id')
        .eq('user_id', userId)
        .gte('day', fourteenDaysAgo.toISOString().slice(0, 10))
        .order('day', { ascending: true })

      if (error) {
        console.error('User health error:', error)
        throw error
      }

      return new Response(
        JSON.stringify({ days: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('HR endpoint error:', error)
    
    const status = error.message === 'unauthorized' ? 401 :
                  error.message === 'no_org' ? 403 :
                  error.message === 'forbidden' ? 403 : 500

    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})