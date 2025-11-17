'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Loader2, Check } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateLanguagePreference, setLanguageCookie } from '@/app/actions/language'
import { locales, localeNames, type Locale } from '@/i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface LanguageSelectorProps {
  currentLanguage: Locale
  isAuthenticated?: boolean
  variant?: 'select' | 'dropdown'
  onLanguageChange?: (language: Locale) => void
}

export function LanguageSelector({
  currentLanguage,
  isAuthenticated = false,
  variant = 'select',
  onLanguageChange,
}: LanguageSelectorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>(currentLanguage)

  const handleLanguageChange = async (language: Locale) => {
    setSelectedLanguage(language)

    startTransition(async () => {
      try {
        const result = isAuthenticated
          ? await updateLanguagePreference(language)
          : await setLanguageCookie(language)

        if (result.success) {
          // Call optional callback
          onLanguageChange?.(language)

          // Refresh the page to apply new language
          router.refresh()
        } else {
          console.error('Failed to update language:', result.error)
          // Revert selection on error
          setSelectedLanguage(currentLanguage)
        }
      } catch (error) {
        console.error('Error updating language:', error)
        setSelectedLanguage(currentLanguage)
      }
    })
  }

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{localeNames[selectedLanguage]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {locales.map((locale) => (
            <DropdownMenuItem
              key={locale}
              onClick={() => handleLanguageChange(locale)}
              className="gap-2"
            >
              {selectedLanguage === locale && <Check className="h-4 w-4" />}
              <span className={selectedLanguage !== locale ? 'ml-6' : ''}>
                {localeNames[locale]}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Select
      value={selectedLanguage}
      onValueChange={(value) => handleLanguageChange(value as Locale)}
      disabled={isPending}
    >
      <SelectTrigger className="w-full sm:w-[200px]">
        {isPending ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating...</span>
          </div>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {localeNames[locale]}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
