import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Chaves fornecidas pelo usuário
const supabaseUrl = 'https://yqycttppjitfvpocmcpj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeWN0dHBwaml0ZnZwb2NtY3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NzMwMTksImV4cCI6MjA4MzA0OTAxOX0.5Qnd3Ho3C4BYdRiXZyo3WVEPwz4Z-T6w1LjcLmIuxo0';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
