/// Supabase Configuration for Admin Dashboard
///
/// This file contains Supabase connection settings.
/// DO NOT commit sensitive keys to version control.
library;

class SupabaseConfig {
  // Supabase Project URL
  static const String supabaseUrl = 'https://byqwsmdgyojzgyhbladx.supabase.co';

  // Supabase Anon/Public Key (safe to use in client apps)
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5cXdzbWRneW9qemd5aGJsYWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDQ4NzIsImV4cCI6MjA5NTQyMDg3Mn0.5N_PeOd7TtMDqOQYcTBAFOFha3nE383wp5R27tJ0WPM';

  // App Configuration
  static const String appName = 'UniMove Admin';
  static const String appVersion = '1.0.0';
}
