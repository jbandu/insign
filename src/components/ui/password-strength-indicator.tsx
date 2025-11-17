'use client'

import { checkPasswordStrength, getPasswordStrengthPercentage, getPasswordStrengthColor } from '@/lib/utils/password'
import { useMemo } from 'react'

interface PasswordStrengthIndicatorProps {
  password: string
  showSuggestions?: boolean
}

export function PasswordStrengthIndicator({ password, showSuggestions = true }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return null
    return checkPasswordStrength(password)
  }, [password])

  if (!strength || !password) {
    return null
  }

  const percentage = getPasswordStrengthPercentage(strength.score)
  const colorClass = getPasswordStrengthColor(strength.score)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password strength:</span>
        <span className={`font-medium ${
          strength.score <= 1 ? 'text-destructive' :
          strength.score === 2 ? 'text-orange-500' :
          strength.score === 3 ? 'text-yellow-500' :
          strength.score === 4 ? 'text-blue-500' :
          'text-green-500'
        }`}>
          {strength.label}
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showSuggestions && strength.suggestions.length > 0 && strength.score < 4 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {strength.suggestions.slice(0, 3).map((suggestion, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-1">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
