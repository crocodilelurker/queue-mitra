export function Icon({ name, size = 20, className = '', color = 'currentColor', ...props }) {
  const iconProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: `icon-svg ${className}`.trim(),
    'aria-hidden': 'true',
    ...props,
  }

  switch (name) {
    case 'stethoscope':
    case 'med':
      return (
        <svg {...iconProps}>
          <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
          <path d="M6 3h-3" />
          <path d="M15 3h-3" />
          <path d="M9 12.5a5.5 5.5 0 0 0 5.5 5.5h1.5a3 3 0 1 0 0-6h-1.5" />
          <circle cx="19" cy="15" r="2" fill={color} />
        </svg>
      )

    case 'ticket':
    case 'queue':
      return (
        <svg {...iconProps}>
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <path d="M13 5v2" />
          <path d="M13 11v2" />
          <path d="M13 17v2" />
        </svg>
      )

    case 'map':
    case 'navigation':
      return (
        <svg {...iconProps}>
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      )

    case 'map-pin':
      return (
        <svg {...iconProps}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )

    case 'emergency':
    case 'alert':
    case 'warning':
      return (
        <svg {...iconProps}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )

    case 'cross':
    case 'hospital':
      return (
        <svg {...iconProps}>
          <path d="M12 4v16" strokeWidth={2.5} />
          <path d="M4 12h16" strokeWidth={2.5} />
        </svg>
      )

    case 'hospital-building':
      return (
        <svg {...iconProps}>
          <path d="M12 6v4" />
          <path d="M10 8h4" />
          <rect width="16" height="20" x="4" y="2" rx="2" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
          <path d="M16 18h.01" />
        </svg>
      )

    case 'search':
      return (
        <svg {...iconProps}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )

    case 'mic':
      return (
        <svg {...iconProps}>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )

    case 'mic-stop':
      return (
        <svg {...iconProps}>
          <rect x="6" y="6" width="12" height="12" rx="2" fill={color} />
        </svg>
      )

    case 'camera':
      return (
        <svg {...iconProps}>
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      )

    case 'phone':
      return (
        <svg {...iconProps}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      )

    case 'ambulance':
      return (
        <svg {...iconProps}>
          <path d="M10 10h4" />
          <path d="M12 8v4" />
          <rect width="19" height="11" x="2" y="6" rx="2" />
          <path d="M19 17h2a1 1 0 0 0 1-1v-4a2 2 0 0 0-1.4-1.9l-2.6-1.1H16" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      )

    case 'arrow-right':
    case 'chevron-right':
      return (
        <svg {...iconProps}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      )

    case 'arrow-left':
    case 'chevron-left':
      return (
        <svg {...iconProps}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      )

    case 'check':
      return (
        <svg {...iconProps}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )

    case 'clock':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )

    case 'user':
      return (
        <svg {...iconProps}>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )

    case 'users':
      return (
        <svg {...iconProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )

    case 'sparkles':
      return (
        <svg {...iconProps}>
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
        </svg>
      )

    case 'volume':
    case 'speaker':
      return (
        <svg {...iconProps}>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )

    case 'close':
    case 'x':
      return (
        <svg {...iconProps}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )

    case 'print':
      return (
        <svg {...iconProps}>
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect width="12" height="8" x="6" y="14" />
        </svg>
      )

    case 'compass':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      )

    case 'child':
    case 'chd':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3" />
          <path d="M9 18l3-2 3 2" />
        </svg>
      )

    case 'woman':
    case 'wom':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="7" r="4" />
          <path d="M7 21l3-7h4l3 7" />
          <path d="M10 14v7" />
          <path d="M14 14v7" />
        </svg>
      )

    case 'bone':
    case 'ort':
      return (
        <svg {...iconProps}>
          <path d="M17 10c.7-.7 1.6-1 2.5-.7 1.5.5 2 2.3 1 3.5-.4.5-.4 1.1 0 1.6 1 1.2.5 3-1 3.5-.9.3-1.8 0-2.5-.7L7 7c-.7-.7-1-1.6-.7-2.5.5-1.5 2.3-2 3.5-1 .5.4 1.1.4 1.6 0 1.2-1 3-.5 3.5 1 .3.9 0 1.8-.7 2.5z" />
        </svg>
      )

    case 'ear':
    case 'ent':
      return (
        <svg {...iconProps}>
          <path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" />
          <path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 0 4 0" />
        </svg>
      )

    case 'eye':
      return (
        <svg {...iconProps}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )

    case 'skin':
    case 'skn':
      return (
        <svg {...iconProps}>
          <path d="M12 2a5 5 0 0 0-5 5c0 3 5 9 5 9s5-6 5-9a5 5 0 0 0-5-5Z" />
          <path d="M8 18a4 4 0 0 0 8 0" />
        </svg>
      )

    case 'chart':
    case 'analytics':
      return (
        <svg {...iconProps}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )

    case 'tv':
    case 'board':
      return (
        <svg {...iconProps}>
          <rect width="20" height="15" x="2" y="7" rx="2" />
          <polyline points="17 2 12 7 7 2" />
        </svg>
      )

    case 'doctor':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21v-2a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v2" />
          <path d="M12 11v4" />
          <path d="M10 13h4" />
        </svg>
      )

    case 'activity':
    case 'pulse':
      return (
        <svg {...iconProps}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )

    case 'qr':
      return (
        <svg {...iconProps}>
          <rect width="5" height="5" x="3" y="3" rx="1" />
          <rect width="5" height="5" x="16" y="3" rx="1" />
          <rect width="5" height="5" x="3" y="16" rx="1" />
          <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
          <path d="M21 21v.01" />
          <path d="M12 7v3a2 2 0 0 1-2 2H7" />
          <path d="M3 12h.01" />
          <path d="M12 3h.01" />
          <path d="M12 16v.01" />
          <path d="M16 12h1" />
          <path d="M21 12v.01" />
          <path d="M12 21v-1" />
        </svg>
      )

    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
  }
}
