import { useId } from 'react'

interface BrandMarkProps {
  size?: number
  className?: string
}

/** Shared Worklog logo: a blue squircle wrapping a timer dial. */
export function BrandMark({ size = 34, className }: BrandMarkProps) {
  const gradientId = useId()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="5"
          y1="3"
          x2="35"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4db3ff" />
          <stop offset="1" stopColor="#0060c8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${gradientId})`} />
      <circle
        cx="20"
        cy="20"
        r="10.4"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.94"
        strokeWidth="2.2"
      />
      <path
        d="M20 13.6V20l4.3 2.7"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="1.7" fill="#ffffff" />
    </svg>
  )
}
