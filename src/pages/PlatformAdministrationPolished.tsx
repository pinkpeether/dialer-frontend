import { useEffect, useRef } from 'react'
import PlatformAdministrationV2 from './PlatformAdministrationV2'

const palette = [
  { bg: 'rgba(251,11,140,.08)', border: 'rgba(251,11,140,.42)', accent: '#fb0b8c' },
  { bg: 'rgba(128,87,215,.09)', border: 'rgba(128,87,215,.38)', accent: '#8057d7' },
  { bg: 'rgba(0,167,71,.08)', border: 'rgba(0,167,71,.34)', accent: '#00a747' },
  { bg: 'rgba(240,185,11,.10)', border: 'rgba(240,185,11,.36)', accent: '#f0b90b' },
]

export default function PlatformAdministrationPolished() {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const apply = () => {
      const root = wrapRef.current
      if (!root) return
      const accountButtons = Array.from(root.querySelectorAll('button.glass')) as HTMLButtonElement[]
      let selectedIndex = accountButtons.findIndex(button => button.style.borderColor.includes('251'))
      if (selectedIndex < 0) selectedIndex = 0
      accountButtons.forEach((button, index) => {
        const theme = palette[index % palette.length]
        button.style.position = 'relative'
        button.style.paddingLeft = '58px'
        const selected = index === selectedIndex
        if (selected) {
          button.style.background = theme.bg
          button.style.borderColor = theme.border
        }
        let serial = button.querySelector('.ptdt-account-serial') as HTMLSpanElement | null
        if (!serial) {
          serial = document.createElement('span')
          serial.className = 'ptdt-account-serial mono'
          button.prepend(serial)
        }
        serial.textContent = String(index + 1).padStart(2, '0')
        serial.style.position = 'absolute'
        serial.style.left = '18px'
        serial.style.top = '18px'
        serial.style.color = theme.accent
        serial.style.fontWeight = '950'
      })
      const h2 = Array.from(root.querySelectorAll('h2')).find(item => item.textContent && item.textContent !== 'Select account')
      const panel = h2?.closest('.glass') as HTMLElement | null
      const selectedTheme = palette[selectedIndex % palette.length]
      if (panel) {
        panel.style.borderColor = selectedTheme.border
        panel.style.background = selectedTheme.bg
      }
      const chip = Array.from(root.querySelectorAll('.ptdt-chip')).find(item => item.textContent?.includes('members')) as HTMLElement | null
      if (chip) {
        chip.style.color = selectedTheme.accent
        chip.style.borderColor = selectedTheme.border
      }
    }
    apply()
    const observer = new MutationObserver(apply)
    if (wrapRef.current) observer.observe(wrapRef.current, { childList: true, subtree: true, attributes: true })
    return () => observer.disconnect()
  }, [])

  return <div ref={wrapRef}><PlatformAdministrationV2 /></div>
}
