import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log("URL from env:", url);

const supabase = createClient(url, key);

async function testConnection() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    
    if (error) {
      console.log("Connection successful, but auth failed (expected):", error.message);
    } else {
      console.log("Connection and auth successful!");
    }
  } catch (err) {
    console.error("Failed to connect to Supabase:");
    console.error(err);
  }
}

testConnection();
