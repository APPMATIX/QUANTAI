import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setSuperAdmin() {
  const userId = '9a9735c6-573c-4a27-b1a1-f40093fe1ca2';
  const email = 'kevinparackal10@gmail.com';
  
  console.log(`Setting user ${email} (${userId}) to super_admin...`);
  
  // First check if the user profile exists
  const { data: userProfile, error: getError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (getError && getError.code !== 'PGRST116') { // PGRST116 is not found
    console.error('Error fetching user:', getError);
    return;
  }
  
  if (userProfile) {
    console.log('User profile found. Updating role...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'super_admin' })
      .eq('id', userId);
      
    if (updateError) {
      console.error('Error updating role:', updateError);
    } else {
      console.log('Role updated successfully!');
    }
  } else {
    console.log('User profile not found. Creating it...');
    const { error: insertError } = await supabase
      .from('users')
      .insert([
        { 
          id: userId, 
          email: email,
          name: 'Kevin Parackal',
          role: 'super_admin'
        }
      ]);
      
    if (insertError) {
      console.error('Error creating user profile:', insertError);
    } else {
      console.log('User profile created with super_admin role successfully!');
    }
  }
}

setSuperAdmin();
