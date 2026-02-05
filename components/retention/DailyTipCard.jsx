'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  X,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Award,
  ArrowRight,
  Share2
} from 'lucide-react'

const categoryStyles = {
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-700'
  },
  insight: {
    icon: Lightbulb,
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconColor: 'text-purple-500',
    titleColor: 'text-purple-700'
  },
  achievement: {
    icon: Award,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-500',
    titleColor: 'text-emerald-700'
  },
  wisdom: {
    icon: Lightbulb,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-700'
  },
  general: {
    icon: Lightbulb,
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconColor: 'text-slate-500',
    titleColor: 'text-slate-700'
  }
}

export default function DailyTipCard({ className = '' }) {
  const [tip, setTip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(false)

  useEffect(() => {
    fetchDailyTip()
  }, [])

  const fetchDailyTip = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/retention/daily-tip')
      const data = await response.json()

      if (data.success && data.tip) {
        setTip(data.tip)
        setDismissed(false)
        setFeedbackGiven(false)
      } else if (data.disabled) {
        setDismissed(true)
      }
    } catch (error) {
      console.error('Failed to fetch daily tip:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (feedback) => {
    if (!tip?.id || feedbackGiven) return

    try {
      await fetch('/api/retention/daily-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feedback',
          tipId: tip.id,
          feedback
        })
      })
      setFeedbackGiven(true)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const handleDismiss = async () => {
    try {
      await fetch('/api/retention/daily-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' })
      })
      setDismissed(true)
    } catch (error) {
      console.error('Failed to dismiss tip:', error)
    }
  }

  // Show minimal state if dismissed or no tip (don't leave gap)
  if (dismissed || (!loading && !tip)) {
    return (
      <Card className={`overflow-hidden border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white">
                <Lightbulb className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Daily insights help you save smarter</p>
                <p className="text-xs text-slate-500">Check back tomorrow for personalized tips</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDailyTip}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded w-24" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const style = categoryStyles[tip.category] || categoryStyles.general
  const IconComponent = style.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`overflow-hidden group ${className}`}>
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              {/* Left Side - Illustration/Image */}
              <div className="relative sm:w-1/3 min-h-[140px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center p-6">
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md shadow-sm border border-white/20 flex items-center justify-center transform rotate-3 transition-transform group-hover:rotate-6 duration-500">
                  <span className="text-3xl">{tip.icon}</span>
                </div>

                {/* Abstract Background Shapes */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                  <div className="absolute top-[-20%] left-[-20%] w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl opacity-60" />
                  <div className="absolute bottom-[-10%] right-[-10%] w-24 h-24 bg-purple-500/20 rounded-full blur-2xl opacity-60" />
                </div>
              </div>

              {/* Right Side - Content */}
              <div className="flex-1 p-5 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {tip.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Daily Tip</span>
                    <button
                      onClick={handleDismiss}
                      className="p-1 rounded-full hover:bg-secondary transition-colors"
                      aria-label="Dismiss tip"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">
                  {tip.title}
                </h3>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {tip.content}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleFeedback('helpful')} // Placeholder action
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20"
                    >
                      {tip.actionLabel || 'Learn More'}
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>

                    <button
                      onClick={handleDismiss} // Placeholder share
                      className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleFeedback('helpful')}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFeedback('not_relevant')}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
