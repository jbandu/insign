/**
 * Password strength utilities
 */

export type PasswordStrength = {
  score: number // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong'
  suggestions: string[]
  color: string
}

export function checkPasswordStrength(password: string): PasswordStrength {
  let score = 0
  const suggestions: string[] = []

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  else suggestions.push('Use at least 12 characters for better security')

  // Character variety checks
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[@$!%*?&#^()_+=\-[\]{}|\\:;"'<>,.\/]/.test(password)

  if (hasLowercase && hasUppercase) score++
  else if (!hasLowercase) suggestions.push('Add lowercase letters')
  else if (!hasUppercase) suggestions.push('Add uppercase letters')

  if (hasNumbers) score++
  else suggestions.push('Add numbers')

  if (hasSpecialChars) score++
  else suggestions.push('Add special characters (@, $, !, etc.)')

  // Common patterns check (reduce score if found)
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /111111/,
    /000000/,
    /admin/i,
    /letmein/i,
  ]

  if (commonPatterns.some((pattern) => pattern.test(password))) {
    score = Math.max(0, score - 2)
    suggestions.push('Avoid common patterns and words')
  }

  // Repeated characters check
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1)
    suggestions.push('Avoid repeated characters')
  }

  // Sequential characters check
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    score = Math.max(0, score - 1)
    suggestions.push('Avoid sequential characters')
  }

  // Determine label and color based on score
  let label: PasswordStrength['label']
  let color: string

  switch (score) {
    case 0:
    case 1:
      label = 'Very Weak'
      color = 'destructive'
      break
    case 2:
      label = 'Weak'
      color = 'orange'
      break
    case 3:
      label = 'Fair'
      color = 'yellow'
      break
    case 4:
      label = 'Good'
      color = 'blue'
      break
    case 5:
      label = 'Strong'
      color = 'green'
      break
    default:
      label = 'Very Weak'
      color = 'destructive'
  }

  return {
    score,
    label,
    suggestions,
    color,
  }
}

export function getPasswordStrengthPercentage(score: number): number {
  return (score / 5) * 100
}

export function getPasswordStrengthColor(score: number): string {
  if (score <= 1) return 'bg-destructive'
  if (score === 2) return 'bg-orange-500'
  if (score === 3) return 'bg-yellow-500'
  if (score === 4) return 'bg-blue-500'
  return 'bg-green-500'
}
