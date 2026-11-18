import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'play'
  | 'stop'
  | 'plus'
  | 'pencil'
  | 'trash'
  | 'download'
  | 'upload'
  | 'sun'
  | 'moon'
  | 'chevronLeft'
  | 'chevronRight'
  | 'clock'
  | 'calendar'
  | 'list'
  | 'close'
  | 'check'
  | 'alert'
  | 'arrowLeft'

const PATHS: Record<IconName, ReactNode> = {
  play: (
    <path
      d="M8.6 5.4a1 1 0 0 1 1.53-.85l9.1 6.6a1 1 0 0 1 0 1.7l-9.1 6.6a1 1 0 0 1-1.53-.85z"
      fill="currentColor"
      stroke="none"
    />
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2.6" fill="currentColor" stroke="none" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: (
    <>
      <path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0-3-3L5 17z" />
      <path d="M13.5 6.5l3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.8h5V7M6.4 7l.9 12.2h9.4L17.6 7" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  download: <path d="M12 4v10.5M8 10.5l4 4 4-4M5 19.5h14" />,
  upload: <path d="M12 15.5V5M8 8.5l4-4 4 4M5 19.5h14" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.4A8.3 8.3 0 0 1 9.6 4 8.5 8.5 0 1 0 20 14.4z" />,
  chevronLeft: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.6V12l3 1.9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  list: <path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />,
  alert: (
    <>
      <path d="M12 4.5 20.8 19.5H3.2z" />
      <path d="M12 10v4M12 16.6h.01" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M10.5 6.5 5 12l5.5 5.5" />,
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 18, strokeWidth = 1.75, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
