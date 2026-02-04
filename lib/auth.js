// lib/auth.js - Supabase Version (JWT-only, no adapter for simpler setup)
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { supabaseAdmin } from "./supabase"
import { encryptionService } from "./encryption"
import { loginSchema } from "./validations"

// Validate required environment variables at startup
const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '))
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`❌ CRITICAL: Missing required environment variables: ${missingVars.join(', ')}`)
  }
}

const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL
console.log('✅ Auth configuration loaded')
console.log('📍 Auth URL:', authUrl)
console.log('📍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING')

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Using JWT strategy without adapter for simpler Supabase integration
  basePath: '/api/auth',
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const validatedData = loginSchema.parse(credentials)

          // Query user from Supabase
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', validatedData.email.toLowerCase())
            .single()

          if (error || !user) {
            console.log('User not found:', validatedData.email)
            return null
          }

          // For users who signed up with OAuth, they won't have a password
          if (!user.password) {
            console.log('User has no password (OAuth user)')
            return null
          }

          const isValidPassword = await encryptionService.verifyPassword(
            validatedData.password,
            user.password
          )

          if (!isValidPassword) {
            return null
          }

          // Update last login
          await supabaseAdmin
            .from('users')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', user.id)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            isEmailVerified: !!user.email_verified,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      }
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      },
      profile(profile) {
        console.log('🔐 Google OAuth profile received:', { email: profile.email, name: profile.name })
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          isEmailVerified: profile.email_verified || false
        }
      },
      allowDangerousEmailAccountLinking: true,
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.isEmailVerified = user.isEmailVerified
      }

      if (account?.provider === "google") {
        try {
          console.log('🔍 JWT Callback: Processing Google OAuth for', token.email)

          // Check if user exists in Supabase
          const { data: existingUser, error: findError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', token.email)
            .single()

          if (findError && findError.code !== 'PGRST116') {
            console.error('Error finding user:', findError)
          }

          if (!existingUser) {
            // Create new user
            const { data: newUser, error: insertError } = await supabaseAdmin
              .from('users')
              .insert({
                email: token.email,
                name: token.name,
                image: token.picture,
                email_verified: new Date().toISOString(),
              })
              .select()
              .single()

            if (!insertError && newUser) {
              console.log('✅ JWT Callback: User created with ID:', newUser.id)
              token.id = newUser.id
            } else {
              console.error('Error creating user:', insertError)
            }
          } else {
            token.id = existingUser.id
            token.isEmailVerified = !!existingUser.email_verified

            // Update last login
            await supabaseAdmin
              .from('users')
              .update({
                updated_at: new Date().toISOString(),
                image: token.picture
              })
              .eq('id', existingUser.id)
          }
        } catch (error) {
          console.error('❌ JWT Callback Error:', error)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.isEmailVerified = token.isEmailVerified ?? false
      }
      return session
    },

    async signIn({ user, account }) {
      try {
        if (account?.provider === "google") {
          if (!user.email) {
            console.error('No email provided by Google')
            return false
          }
          return true
        }
        return user !== null
      } catch (error) {
        console.error('Sign in error:', error)
        return false
      }
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/onboarding"
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`User signed in: ${user.email}`)
    },
    async signOut({ token }) {
      console.log(`User signed out: ${token?.email || 'unknown'}`)
    }
  },
  debug: process.env.NODE_ENV === 'development',
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  },
  logger: {
    error(code, ...message) {
      console.error('❌ NextAuth Error:', code, message)
    },
    warn(code) {
      console.warn('⚠️ NextAuth Warning:', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 NextAuth Debug:', code)
      }
    }
  }
})

// Re-export connectToDatabase for compatibility with other modules
export { supabaseAdmin as connectToDatabase } from './supabase'