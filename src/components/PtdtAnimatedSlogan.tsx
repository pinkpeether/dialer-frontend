import { useEffect, useMemo, useState, type CSSProperties } from 'react'

type SegmentClass = 'light' | 'brackets' | 'code' | 'gray' | 'cult' | 'exclamation'

type Segment = {
  text: string
  cls: SegmentClass
}

type SloganChar = {
  char: string
  cls: SegmentClass
  index: number
}

const sloganPart1: Segment[] = [
  { text: 'Trust the ', cls: 'light' },
  { text: '{', cls: 'brackets' },
  { text: ' ', cls: 'light' },
  { text: 'Code', cls: 'code' },
  { text: ' ', cls: 'light' },
  { text: '}', cls: 'brackets' },
  { text: ',', cls: 'light' },
]

const sloganPart2: Segment[] = [
  { text: ' ', cls: 'light' },
  { text: '// Not the ', cls: 'gray' },
  { text: 'Cult', cls: 'cult' },
  { text: '!', cls: 'exclamation' },
]

const classStyles: Record<SegmentClass, CSSProperties> = {
  light: { color: 'var(--text-2)', fontWeight: 500 },
  brackets: { color: 'var(--green-2)', fontFamily: 'var(--font-mono)', fontWeight: 900 },
  code: { color: 'var(--pink)', fontFamily: 'var(--font-mono)', fontWeight: 950 },
  gray: { color: 'var(--text-3)', fontWeight: 650 },
  cult: { color: '#002fff', fontWeight: 950, position: 'relative' },
  exclamation: { color: '#ff2f00', fontWeight: 950 },
}

function flattenSegments(segments: Segment[], startIndex = 0) {
  const chars: SloganChar[] = []
  segments.forEach(segment => {
    segment.text.split('').forEach(char => {
      chars.push({ char, cls: segment.cls, index: startIndex + chars.length })
    })
  })
  return chars
}

function SloganText({
  chars,
  visibleCount,
  finished,
}: {
  chars: SloganChar[]
  visibleCount: number
  finished: boolean
}) {
  return (
    <>
      {chars.map(item => (
        <span
          key={`${item.index}-${item.char}`}
          style={{
            ...classStyles[item.cls],
            display: item.index < visibleCount ? 'inline' : 'none',
          }}
        >
          {item.cls === 'cult' && finished ? (
            <span className="ptdt-animated-slogan-cult">{item.char}</span>
          ) : item.char}
        </span>
      ))}
    </>
  )
}

export default function PtdtAnimatedSlogan({
  compact = false,
  style,
}: {
  compact?: boolean
  style?: CSSProperties
}) {
  const part1 = useMemo(() => flattenSegments(sloganPart1), [])
  const part2 = useMemo(() => flattenSegments(sloganPart2, part1.length), [part1.length])
  const allChars = useMemo(() => [...part1, ...part2], [part1, part2])
  const [visibleCount, setVisibleCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [cursorMid, setCursorMid] = useState(false)

  useEffect(() => {
    const timeouts: number[] = []
    let delay = 500

    allChars.forEach((item, index) => {
      timeouts.push(window.setTimeout(() => setVisibleCount(index + 1), delay))
      delay += item.char === ' ' ? 70 : 100
    })

    timeouts.push(window.setTimeout(() => setFinished(true), delay + 800))
    timeouts.push(window.setTimeout(() => setCursorMid(true), delay + 2800))

    return () => timeouts.forEach(window.clearTimeout)
  }, [allChars])

  const cursor = <span className="ptdt-animated-slogan-cursor" aria-hidden="true" />

  return (
    <span
      className={`ptdt-animated-slogan ${compact ? 'is-compact' : ''} ${finished ? 'is-finished' : ''}`}
      aria-label="Trust the Code, Not the Cult!"
      style={style}
    >
      <span className="ptdt-animated-slogan-line">
        <SloganText chars={part1} visibleCount={visibleCount} finished={finished} />
        {cursorMid && cursor}
      </span>
      {compact ? <br /> : null}
      <span className="ptdt-animated-slogan-line">
        <SloganText chars={part2} visibleCount={visibleCount} finished={finished} />
        {!cursorMid && cursor}
      </span>
    </span>
  )
}
