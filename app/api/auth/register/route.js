import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { encryptionService } from "@/lib/encryption"
import { registerSchema } from "@/lib/validations"
import { AppError, asyncHandler } from "@/lib/errors"

async function registerHandler(req) {
  const body = await req.json()

  // Validate input data
  const validatedData = registerSchema.parse(body)

  // Check if user already exists
  const { data: existingUser, error: findError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', validatedData.email.toLowerCase())
    .single()

  if (existingUser) {
    throw new AppError('User with this email already exists', 409, 'DUPLICATE_EMAIL')
  }

  // Hash password securely
  const hashedPassword = await encryptionService.hashPassword(validatedData.password)

  // Create user object for Supabase
  const newUser = {
    email: validatedData.email.toLowerCase(),
    password: hashedPassword,
    name: validatedData.name,
    image: null,
    email_verified: new Date().toISOString(), // Mark as verified since no OTP
    preferences: {
      currency: 'INR',
      language: 'en',
      timezone: 'Asia/Kolkata',
      notifications: {
        email: true,
        push: true,
        budgetAlerts: true,
        goalReminders: true
      }
    }
  }

  // Insert user into Supabase
  const { data: insertedUser, error: insertError } = await supabaseAdmin
    .from('users')
    .insert(newUser)
    .select('id, email, name, email_verified, created_at')
    .single()

  if (insertError) {
    console.error('Failed to create user:', insertError)
    throw new AppError('Failed to create account. Please try again.', 500, 'USER_CREATE_FAILED')
  }

  console.log('✅ User created successfully:', insertedUser.email)

  // Return success response
  return NextResponse.json({
    success: true,
    message: "Account created successfully! You can now sign in.",
    data: {
      user: {
        id: insertedUser.id,
        email: insertedUser.email,
        name: insertedUser.name,
        isEmailVerified: true,
        createdAt: insertedUser.created_at
      }
    }
  }, { status: 201 })
}

export const POST = asyncHandler(registerHandler)
