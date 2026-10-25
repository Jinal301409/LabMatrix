import { useEffect, useRef, useState } from 'react'
import './loaders.css'

const MIN_MS = 1400 // the intro is on screen for at least this long
const MAX_MS = 4000 // ...and never waits for the server longer than this
const EXIT_MS = 450
const LETTERS = 'LabMatrix'.split('')

// The logo mark: a 3 x 3 matrix of tiles. The diagonal lights up in the brand colour.
const TILES = Array.from({ length: 9 }, (_, i) => ({ i, x: (i % 3) * 20, y: Math.floor(i / 3) * 20, on: i % 4 === 0 }))

export default function SplashScreen({ onDone }) {
  const [leaving, setLeaving] = useState(false)
  const ready = useRef(false)
  const skipped = useRef(false)
  const doneRef = useRef(onDone)
  useEffect(() => { doneRef.current = onDone }, [onDone])

  // Wait for the server (but not for long), so the app is ready when the intro fades away.
  useEffect(() => {
    const ctl = new AbortController()
    const abort = setTimeout(() => ctl.abort(), MAX_MS)
    fetch('/api/health', { signal: ctl.signal })
      .catch(() => {})
      .finally(() => { clearTimeout(abort); ready.current = true })
    return () => { clearTimeout(abort); ctl.abort() }
  }, [])

  // Leave as soon as the minimum time has passed and the server answered (or Skip was pressed).
  useEffect(() => {
    const start = performance.now()
    const id = setInterval(() => {
      const el = performance.now() - start
      if (skipped.current || (ready.current && el >= MIN_MS) || el >= MAX_MS) {
        clearInterval(id)
        setLeaving(true)
      }
    }, 80)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!leaving) return undefined
    const t = setTimeout(() => doneRef.current(), EXIT_MS)
    return () => clearTimeout(t)
  }, [leaving])

  // no page scrolling underneath the intro
  useEffect(() => {
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = before }
  }, [])

  return (
    <div className={`splash ${leaving ? 'leaving' : ''}`} role="status" aria-live="polite" aria-label="Loading LabMatrix">
      <div className="splash-stage">
        <svg className="mark" viewBox="0 0 52 52" aria-hidden="true">
          {TILES.map((t) => (
            <rect key={t.i} className={`tile ${t.on ? 'on' : ''}`} x={t.x} y={t.y} width="12" height="12" rx="3.5"
              style={{ '--i': t.i, transformOrigin: `${t.x + 6}px ${t.y + 6}px` }} />
          ))}
        </svg>

        <div className="splash-title" aria-hidden="true">
          {LETTERS.map((ch, i) => <span key={i} className={`ch ${i >= 3 ? 'accent' : ''}`} style={{ '--i': i }}>{ch}</span>)}
        </div>
        <div className="splash-tag">Smart lab management</div>

        <div className="splash-bar"><i /></div>
      </div>

      <button className="skip" onClick={() => { skipped.current = true }}>Skip</button>
    </div>
  )
}
