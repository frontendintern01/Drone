function createSvgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function droneIcon(intruder: boolean) {
  const rotor = intruder ? '#f43f5e' : '#38bdf8'
  const fill = intruder ? '#881337' : '#0369a1'
  const arms = intruder ? '#f87171' : '#94a3b8'
  return createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
    ${[[14, 14], [50, 14], [14, 50], [50, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" stroke="${rotor}" stroke-width="2.5" fill="${fill}" fill-opacity="${intruder ? '0.4' : '0.3'}"/>`).join('')}
    ${[[14, 14], [50, 14], [14, 50], [50, 50]].map(([x, y]) => `<line x1="${x}" y1="${y}" x2="32" y2="32" stroke="${arms}" stroke-width="4" stroke-linecap="round"/>`).join('')}
    <rect x="25" y="22" width="14" height="20" rx="4" fill="${intruder ? '#1e1b4b' : '#0f172a'}" stroke="${rotor}" stroke-width="2.5"/>
    <polygon points="${intruder ? '32,14 38,23 26,23' : '32,15 37,23 27,23'}" fill="${intruder ? '#fbbf24' : '#ef4444'}"/>
    <circle cx="32" cy="32" r="3" fill="${rotor}"/>
  </svg>`)
}

export const DRONE_ICON_SVG = droneIcon(false)
export const INTRUDER_DRONE_ICON_SVG = droneIcon(true)

export const GREEN_HOME_PIN_SVG = createSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="58" viewBox="0 0 48 58" fill="none">
  <path d="M24 2 C12.95 2 4 10.95 4 22 C4 35.5 24 56 24 56 C24 56 44 35.5 44 22 C44 10.95 35.05 2 24 2 Z" fill="#10b981" stroke="#047857" stroke-width="2.5"/>
  <circle cx="24" cy="22" r="13" fill="#ffffff"/>
  <path d="M24 13 L31 19 L29 19 L29 28 L26 28 L26 23 L22 23 L22 28 L19 28 L19 19 L17 19 Z" fill="#047857"/>
</svg>
`)
