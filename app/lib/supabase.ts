import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export default supabase;
