import { createClient } from '@supabase/supabase-js';

const env = (import.meta as unknown as {
	env: Record<string, string>;
}).env;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
