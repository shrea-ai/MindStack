'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, TrendingUp, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SignUpPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const signupSchema = z.object({
    name: z.string()
      .min(2, t('validation.nameMinLength'))
      .max(50, t('validation.nameMaxLength'))
      .regex(/^[a-zA-Z\s]+$/, t('validation.nameInvalidChars')),
    email: z.string().email(t('validation.emailInvalid')).toLowerCase(),
    password: z.string()
      .min(8, t('validation.passwordMinLength'))
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, t('validation.passwordComplexity')),
    confirmPassword: z.string(),
    acceptPrivacyPolicy: z.boolean().refine(val => val === true, {
      message: 'You must accept the Privacy Policy to continue'
    })
  }).refine(data => data.password === data.confirmPassword, {
    message: t('validation.passwordsNoMatch'),
    path: ['confirmPassword']
  })

  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptPrivacyPolicy: false
    }
  })

  const onSignupSubmit = async (data) => {
    setIsLoading(true)
    try {
      // Directly register the user - no OTP needed
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Account created successfully! Redirecting to sign in...', { duration: 3000 })
        // Redirect to signin page with email pre-filled
        router.push(`/auth/signin?email=${encodeURIComponent(data.email)}&message=registration-complete`)
      } else {
        toast.error(result.message || 'Failed to create account. Please try again.')
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800">
            Wealth<span className="text-emerald-600">Wise</span>
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {t('auth.signup.title')}
            </h1>
            <p className="text-slate-600">
              {t('auth.signup.subtitle')}
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('auth.signup.fullName')}
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('auth.signup.fullNamePlaceholder')}
                  autoComplete="name"
                  disabled={isLoading}
                  {...signupForm.register('name')}
                  className="h-11"
                />
                {signupForm.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{signupForm.formState.errors.name.message}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('auth.signup.email')}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.signup.emailPlaceholder')}
                  autoComplete="email"
                  disabled={isLoading}
                  {...signupForm.register('email')}
                  className="h-11"
                />
                {signupForm.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">{signupForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('auth.signup.password')}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.signup.passwordPlaceholder')}
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...signupForm.register('password')}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="text-sm text-red-600 mt-1">{signupForm.formState.errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('auth.signup.confirmPassword')}
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('auth.signup.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...signupForm.register('confirmPassword')}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">{signupForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Privacy Policy */}
              <div className="flex items-start gap-2">
                <input
                  id="acceptPrivacyPolicy"
                  type="checkbox"
                  disabled={isLoading}
                  {...signupForm.register('acceptPrivacyPolicy')}
                  className="mt-1 h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="acceptPrivacyPolicy" className="text-sm text-slate-600">
                  I agree to the{' '}
                  <Link href="/privacy-policy" target="_blank" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {signupForm.formState.errors.acceptPrivacyPolicy && (
                <p className="text-sm text-red-600">{signupForm.formState.errors.acceptPrivacyPolicy.message}</p>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoading || !signupForm.watch('acceptPrivacyPolicy')}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {t('auth.signup.createAccount')}
                  </div>
                )}
              </Button>
            </form>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-sm text-slate-600 mt-6">
            {t('auth.signup.alreadyHaveAccount')}{' '}
            <Link href="/auth/signin" className="font-medium text-emerald-600 hover:text-emerald-700">
              {t('auth.signup.signIn')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
