import { createClient } from '@supabase/supabase-js';

// Supabase client initialization with provided credentials
// Make sure these match the values from your Supabase dashboard
const supabaseUrl = 'https://yjnmuxkcwwyinfvupzds.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqbm11eGtjd3d5aW5mdnVwemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MTAyNjIsImV4cCI6MjA2MDE4NjI2Mn0.iW39O_uz1oiTyPcM4ZwAhDwVnC4ofa5XYfMnV37ulvU';

// Create a Supabase client instance with minimal options
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// The words table schema is as follows:
// - id: uuid, primary key, auto-generated
// - user_id: text, the ID of the player/user
// - friend_name: text, the name of the friend who provided the words
// - friend_words: text[], array of 3 words the friend chose
// - created_at: timestamp, when the entry was submitted (default to now())

export default supabase; 