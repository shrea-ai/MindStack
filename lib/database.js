// Database connection module - Supabase version
// This module provides compatibility with existing code that imports from database.js

import { supabase, supabaseAdmin, connectToDatabase } from './supabase'

// Re-export all Supabase utilities for compatibility
export { supabase, supabaseAdmin, connectToDatabase }

// Default export for NextAuth adapter compatibility
// Note: The old MongoDB clientPromise is no longer needed with Supabase
export default supabaseAdmin
