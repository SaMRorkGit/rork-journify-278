import 'expo-sqlite/localStorage/install';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgiiyaalqfpchoekgptl.supabase.co';
const supabasePublishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnaWl5YWFscWZwY2hvZWtncHRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMjU4ODgsImV4cCI6MjA4MDkwMTg4OH0.0Lh6NtYe5nP8E5yV6j4FJmjYuZUAyAazn9Fq846g0Zw';

const storage = (globalThis?.localStorage ?? undefined) as SupportedStorage | undefined;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
