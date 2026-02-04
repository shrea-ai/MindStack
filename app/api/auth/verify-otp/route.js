import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { otpService } from "@/lib/otpService"
import { verifyOtpSchema } from "@/lib/validations"
import { AppError, asyncHandler } from "@/lib/errors"
import { randomUUID } from 'crypto'

async function verifyOtpHandler(req) {
  const body = await req.json()
  const validatedData = verifyOtpSchema.parse(body)

  const { email, otp, type } = validatedData

  // Find the latest OTP for this email and type
  const { data: storedOtp, error: findError } = await supabaseAdmin
    .from('otps')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('type', type)
    .eq('verified', false)
    .neq('invalidated', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (findError || !storedOtp) {
    throw new AppError('No valid OTP found. Please request a new one.', 404, 'OTP_NOT_FOUND')
  }

  // Validate OTP attempt - convert Supabase format to expected format
  const otpForValidation = {
    ...storedOtp,
    otpHash: storedOtp.otp_hash,
    expiresAt: new Date(storedOtp.expires_at),
    createdAt: new Date(storedOtp.created_at)
  }

  const validation = await otpService.validateOTPAttempt(otpForValidation, otp)

  // Update attempts count
  await supabaseAdmin
    .from('otps')
    .update({ attempts: (storedOtp.attempts || 0) + 1 })
    .eq('id', storedOtp.id)

  if (!validation.success) {
    // Return different messages based on error type
    const statusCodes = {
      'OTP_EXPIRED': 410,
      'OTP_ALREADY_USED': 410,
      'TOO_MANY_ATTEMPTS': 429,
      'INVALID_OTP': 400
    }

    const response = {
      success: false,
      message: validation.error,
      code: validation.code
    }

    if (validation.attemptsRemaining !== undefined) {
      response.attemptsRemaining = validation.attemptsRemaining
    }

    return NextResponse.json(response, {
      status: statusCodes[validation.code] || 400
    })
  }

  // Mark OTP as verified
  await supabaseAdmin
    .from('otps')
    .update({
      verified: true,
      verified_at: new Date().toISOString()
    })
    .eq('id', storedOtp.id)

  // Return success with appropriate message for each type
  const successMessages = {
    registration: 'Email verified successfully. You can now complete your registration.',
    login: 'OTP verified successfully. Logging you in...',
    password_reset: 'OTP verified successfully. You can now reset your password.'
  }

  return NextResponse.json({
    success: true,
    message: successMessages[type] || 'OTP verified successfully.',
    data: {
      email,
      type,
      verifiedAt: new Date(),
      // Include a verification token for subsequent requests
      verificationToken: storedOtp.id
    }
  })
}

export const POST = asyncHandler(verifyOtpHandler)
