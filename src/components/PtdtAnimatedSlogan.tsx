import { useEffect, useMemo, useState, type CSSProperties } from 'react'

type SegmentClass = 'light' | 'brackets' | 'code' | 'gray' | 'cult' | 'exclamation'

type Segment = {
  text: string
  cls: SegmentClass
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

function segmentLength(segments: Segment[]) {
  return segments.reduce((total, segment) => total + segment.text.length, 0)
}

function SloganSegments({
  segments,
  offset,
  visibleCount,
  showCursorAtIndex,
}: {
  segments: Segment[]
  offset: number
  visibleCount: number
  showCursorAtIndex: number | null
}) {
  return (
    <>
      {segments.map((segment, segmentIndex) => {
        const start = offset + segments.slice(0, segmentIndex).reduce((total, item) => total + item.text.length, 0)
        const chars = segment.text.split('')

        return (
          <span key={`${segment.cls}-${segmentIndex}`} className={segment.cls}>
            {chars.map((char, charIndex) => {
              const absoluteIndex = start + charIndex
              const visible = absoluteIndex < visibleCount
              return (
                <span key={`${absoluteIndex}-${char}`} className={`char ${visible ? 'visible' : ''}`}>
                  {char}
                  {showCursorAtIndex === absoluteIndex + 1 ? <span className="cursor" aria-hidden="true" /> : null}
                </span>
              )
            })}
          </span>
        )
      })}
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
  const part1Length = useMemo(() => segmentLength(sloganPart1), [])
  const allSegments = useMemo(() => [...sloganPart1, ...sloganPart2], [])
  const [visibleCount, setVisibleCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [cursorMid, setCursorMid] = useState(false)

  useEffect(() => {
    const timeouts: number[] = []
    let currentDelay = 500
    let index = 0

    allSegments.forEach(segment => {
      segment.text.split('').forEach(char => {
        const nextIndex = index + 1
        timeouts.push(window.setTimeout(() => setVisibleCount(nextIndex), currentDelay))
        currentDelay += char === ' ' ? 70 : 100
        index = nextIndex
      })
    })

    const finalDelay = currentDelay
    timeouts.push(window.setTimeout(() => setFinished(true), finalDelay + 800))
    timeouts.push(window.setTimeout(() => setCursorMid(true), finalDelay + 2800))

    return () => timeouts.forEach(window.clearTimeout)
  }, [allSegments])

  const activeCursorIndex = cursorMid ? null : visibleCount

  return (
    <span
      className={`ptdt-animated-slogan slogan ${compact ? 'is-compact' : ''} ${finished ? 'finished' : ''}`}
      aria-label="Trust the Code, Not the Cult!"
      style={style}
    >
      <span>
        <SloganSegments
          segments={sloganPart1}
          offset={0}
          visibleCount={visibleCount}
          showCursorAtIndex={activeCursorIndex}
        />
      </span>
      {cursorMid ? <span className="cursor" aria-hidden="true" /> : null}
      <span>
        <SloganSegments
          segments={sloganPart2}
          offset={part1Length}
          visibleCount={visibleCount}
          showCursorAtIndex={activeCursorIndex}
        />
      </span>
    </span>
  )
}
