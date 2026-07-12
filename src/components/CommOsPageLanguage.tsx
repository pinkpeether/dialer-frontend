import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

type PageIdentity = {
  prefix: string
  accent: string
  eyebrow: string
  description?: string
}

const PAGE_IDENTITIES: Record<string, PageIdentity> = {
  '/ops': { prefix: "Today's", accent: 'Operations', eyebrow: 'Daily Operations', description: 'Campaign health, callback pressure, notifications, exports, and the operating signals that need attention today.' },
  '/reports': { prefix: 'Reports', accent: 'Overview', eyebrow: 'Reports & Outcomes', description: 'Review call, campaign, and agent results using customer, date, and operational filters.' },
  '/workforce-intelligence': { prefix: 'Team', accent: 'Performance', eyebrow: 'Performance & Coaching', description: 'Review team results, coaching opportunities, quality signals, productivity, and performance trends.' },
  '/workforce-operations': { prefix: 'Live', accent: 'Team', eyebrow: 'Live Team Operations', description: 'See current agent and supervisor status, active work, queues, campaigns, breaks, calls, and items needing attention.' },
  '/security-admin-pro': { prefix: 'Security', accent: 'Administration', eyebrow: 'Platform Security' },
  '/deployment-platform-pro': { prefix: 'Deployment', accent: 'Platform', eyebrow: 'Platform Deployment' },
  '/agent-management-pro': { prefix: 'Agent', accent: 'Management', eyebrow: 'Team Administration' },
}

const COPY_REPLACEMENTS: Array<[string, string]> = [
  ['Workforce Intelligence', 'Team Performance'],
  ['Workforce Operations', 'Live Team'],
  ['Loading Workforce Intelligence', 'Loading team performance'],
  ['workforce intelligence records', 'team performance records'],
  ['cached intelligence', 'cached performance data'],
  ['Attendance Integrity', 'Attendance Monitoring'],
  ['attendance integrity', 'attendance monitoring'],
  ['Integrity Score', 'Attendance Score'],
  ['Security Admin Pro', 'Security Administration'],
  ['Deployment Platform Pro', 'Deployment Platform'],
  ['Agent Management Pro', 'Agent Management'],
  ['UI/UX Pro', 'Appearance & Shortcuts'],
  ['Reports Analytics Pro', 'Detailed Reports Analytics'],
  ['Notifications Alerts Pro', 'Notifications & Alerts'],
  ['Recording Storage Pro', 'Recording Storage Management'],
  ['Contact Management Pro', 'Contact Tools Advanced'],
  ['Campaign Management Pro', 'Advanced Campaign Management'],
  ['Live Monitoring+', 'Live Calls'],
]

const setEyebrow = (element: Element, label: string) => {
  const icon = element.querySelector('svg')
  element.replaceChildren()
  if (icon) element.appendChild(icon)
  element.appendChild(document.createTextNode(icon ? ` ${label}` : label))
}

const setHeading = (element: HTMLHeadingElement, identity: PageIdentity) => {
  element.replaceChildren(document.createTextNode(`${identity.prefix} `))
  const accent = document.createElement('span')
  accent.className = 'gradient-brand-text'
  accent.textContent = identity.accent
  element.appendChild(accent)
}

const replaceVisibleCopy = (root: Element) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  nodes.forEach(node => {
    const parent = node.parentElement
    if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION'].includes(parent.tagName)) return
    let next = node.nodeValue || ''
    COPY_REPLACEMENTS.forEach(([from, to]) => { next = next.split(from).join(to) })
    if (next !== node.nodeValue) node.nodeValue = next
  })
}

export default function CommOsPageLanguage() {
  const location = useLocation()

  useLayoutEffect(() => {
    const root = document.querySelector('.ptdt-layout-main')
    if (!root) return undefined
    const identity = PAGE_IDENTITIES[location.pathname]

    const apply = () => {
      replaceVisibleCopy(root)
      if (!identity) return
      const heading = root.querySelector('h1') as HTMLHeadingElement | null
      const eyebrow = root.querySelector('.eyebrow')
      const description = root.querySelector('.ptdt-page-desc') as HTMLElement | null
      if (heading && heading.dataset.commosIdentity !== location.pathname) {
        setHeading(heading, identity)
        heading.dataset.commosIdentity = location.pathname
      }
      if (eyebrow && eyebrow.getAttribute('data-commos-eyebrow') !== location.pathname) {
        setEyebrow(eyebrow, identity.eyebrow)
        eyebrow.setAttribute('data-commos-eyebrow', location.pathname)
      }
      if (description && identity.description) description.textContent = identity.description
      document.title = `${identity.prefix} ${identity.accent} · PTDT CommOS`
    }

    apply()
    const observer = new MutationObserver(apply)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [location.pathname])

  return null
}
