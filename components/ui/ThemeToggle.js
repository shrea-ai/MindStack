'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            className={`
        relative p-2 rounded-full transition-all duration-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        ${className}
      `}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            <div className="relative w-6 h-6">
                {/* Sun icon - visible in light mode */}
                <Sun
                    className={`
            absolute inset-0 w-6 h-6 text-amber-500
            transition-all duration-300 transform
            ${theme === 'light'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 rotate-90 scale-50'
                        }
          `}
                />
                {/* Moon icon - visible in dark mode */}
                <Moon
                    className={`
            absolute inset-0 w-6 h-6 text-blue-400
            transition-all duration-300 transform
            ${theme === 'dark'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 -rotate-90 scale-50'
                        }
          `}
                />
            </div>
        </button>
    )
}
