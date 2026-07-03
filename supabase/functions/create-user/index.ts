import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user calling this function is an admin or super_admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check caller's role
    const { data: callerData } = await supabaseClient
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (!callerData || !['admin', 'super_admin'].includes(callerData.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { 
      email, 
      name, 
      role, 
      company_id, 
      username, 
      department, 
      designation,
      password
    } = body;

    // Security check: Admins can only create users for their own company
    if (callerData.role === 'admin' && company_id !== callerData.company_id) {
      return new Response(JSON.stringify({ error: 'Cannot create user for another company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let authData, authError;

    // 1. Create or Invite user via Auth
    if (password) {
      const result = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      authData = result.data;
      authError = result.error;
    } else {
      const result = await supabaseClient.auth.admin.inviteUserByEmail(email);
      authData = result.data;
      authError = result.error;
    }

    if (authError) throw authError;

    // 2. Insert the user into public.users
    const { error: dbError } = await supabaseClient.from('users').insert({
      id: authData.user.id,
      name,
      email,
      role,
      company_id,
      username,
      department,
      designation,
      force_password_reset: !!password // Force reset if admin sets initial password
    });

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ user: authData.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
