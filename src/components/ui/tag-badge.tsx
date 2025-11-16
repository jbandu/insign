import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagBadgeProps {
  name: string
  color: string
  onRemove?: () => void
  className?: string
  size?: 'sm' | 'md'
}

export function TagBadge({ name, color, onRemove, className, size = 'md' }: TagBadgeProps) {
  // Convert hex color to RGB for opacity effects
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 107, g: 114, b: 128 } // default gray
  }

  const rgb = hexToRgb(color)
  const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`
  const borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
  const textColor = color

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        color: textColor,
      }}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:opacity-70 transition-opacity"
          aria-label={`Remove ${name} tag`}
        >
          <X className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        </button>
      )}
    </span>
  )
}
