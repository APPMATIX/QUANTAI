import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key';

console.log('Connecting to Supabase at:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
