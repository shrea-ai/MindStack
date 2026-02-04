import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { otpService } from "@/lib/otpService"
import { emailService } from "@/lib/emailService"
import { sendOtpSchema } from "@/lib/validations"
import { AppError, asyncHandler } from "@/lib/errors"

async function sendOtpHandler(req) {
  const body = await req.json()
  const validatedData = sendOtpSchema.parse(body)

  const { email, type, name } = validatedData

  // Check if user exists based on type
  const { data: existingUser, error: findError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (findError && findError.code !== 'PGRST116') {
    console.error('Error finding user:', findError)
  }

  if (type === 'registration' && existingUser) {
    throw new AppError('User with this email already exists', 409, 'USER_EXISTS')
  }

  if ((type === 'login' || type === 'password_reset') && !existingUser) {
    throw new AppError('User with this email does not exist', 404, 'USER_NOT_FOUND')
  }

  // Get OTP history for rate limiting (OTPs from last 15 minutes)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data: recentOtps } = await supabaseAdmin
    .from('otps')
    .select('*')
    .eq('email', email.toLowerCase())
    .gte('created_at', fifteenMinutesAgo)

  const rateLimitCheck = otpService.checkRateLimit(recentOtps || [])

  if (!rateLimitCheck.allowed) {
    throw new AppError(rateLimitCheck.message, 429, 'RATE_LIMITED')
  }

  // Check resend cooldown
  const { data: lastOtp } = await supabaseAdmin
    .from('otps')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const cooldownCheck = otpService.checkResendCooldown(lastOtp?.created_at)
  if (!cooldownCheck.allowed) {
    throw new AppError(cooldownCheck.message, 429, 'COOLDOWN_ACTIVE')
  }

  // Generate new OTP
  const { otp, otpData } = await otpService.createOTPData(email, type)

  // Invalidate previous OTPs of same type
  await supabaseAdmin
    .from('otps')
    .update({ verified: true, invalidated: true })
    .eq('email', email.toLowerCase())
    .eq('type', type)

  // Insert new OTP - convert for Supabase format
  const { error: insertError } = await supabaseAdmin
    .from('otps')
    .insert({
      email: otpData.email,
      otp_hash: otpData.otpHash,
      type: otpData.type,
      expires_at: otpData.expiresAt,
      verified: false,
      invalidated: false,
      attempts: 0
    })

  if (insertError) {
    console.error('Failed to store OTP:', insertError)
    throw new AppError('Failed to generate OTP. Please try again.', 500, 'OTP_STORE_FAILED')
  }

  // Send OTP via email
  try {
    const userName = name || existingUser?.name || 'there'

    const emailContent = otpService.generateEmailContent(
      otp,
      type,
      userName
    )

    await emailService.sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html
    })
  } catch (emailError) {
    console.error('Failed to send OTP email:', emailError)
    throw new AppError('Failed to send OTP. Please try again.', 500, 'EMAIL_SEND_FAILED')
  }

  return NextResponse.json({
    success: true,
    message: `OTP sent to ${email}. Please check your inbox.`,
    data: {
      email,
      type,
      expiresIn: 600, // 10 minutes in seconds
      canResendAfter: 60 // 1 minute in seconds
    }
  })
}

export const POST = asyncHandler(sendOtpHandler)
