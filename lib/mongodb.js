// MongoDB compatibility layer - now redirects to Supabase
// This file is kept for backwards compatibility with any imports

import { supabase, supabaseAdmin, connectToDatabase } from './supabase'

// Re-export Supabase utilities
export { connectToDatabase }

// Default export for compatibility
export default supabaseAdmin
