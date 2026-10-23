import { useEffect, useRef, useState } from 'react'
import './loaders.css'

const MIN_MS = 3400 // the intro plays for at least this long, so the animation is seen in full
const BOOT = [
  'Starting LabMatrix engine',
  'Connecting to the database',
  'Syncing labs and computers',
  'Checking software licences',
  'Preparing your dashboard',
]
const LETTERS = 'LabMatrix'.split('')
const FLASK = 'M45 9 H75 V48 L106 110 Q112 126 96 126 H24 Q8 126 14 110 L45 48 Z'
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Little icons that orbit the logo: computers, bookings, licences, repairs.
const CHIPS = [
  { a: '0deg', d: '0s', icon: <><rect x="3" y="4" width="14" height="9" rx="1.5" /><path d="M7 17h6M10 13v4" /></> },
  { a: '90deg', d: '.15s', icon: <><rect x="3" y="5" width="14" height="12" rx="2" /><path d="M3 9h14M7 3v4M13 3v4" /></> },
  { a: '180deg', d: '.3s', icon: <path d="M10 2l7 3v5c0 4-3 6.5-7 8-4-1.5-7-4-7-8V5z" /> },
  { a: '270deg', d: '.45s', icon: <path d="M14.5 3.5a3.5 3.5 0 0 0-4.4 4.6L3.6 14.5a1.6 1.6 0 0 0 2.3 2.3l6.4-6.5a3.5 3.5 0 0 0 4.5-4.5l-2.2 2.2-1.8-.5-.5-1.8z" /> },
]

// Drifting nodes joined by lines, with data packets travelling along the links:
// a picture of computers on a lab network.
function Network() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0, raf, nodes = []
    const packets = []
    const mouse = { x: -999, y: -999 }

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(95, (w * h) / 15000))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: 1.2 + Math.random() * 1.6,
      }))
    }
    const move = (e) => { mouse.x = e.clientX; mouse.y = e.clientY }
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', move)

    const LINK = 150
    const frame = () => {
      ctx.clearRect(0, 0, w, h)
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
        const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy)
        if (d < 110) { n.x += (dx / d) * 1.4; n.y += (dy / d) * 1.4 } // nodes shy away from the pointer
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
          if (d < LINK) {
            ctx.strokeStyle = `rgba(94,234,212,${(1 - d / LINK) * .33})`
            ctx.lineWidth = 1
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke()
            if (packets.length < 14 && Math.random() < .0016) packets.push({ a: nodes[i], b: nodes[j], t: 0 })
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = 'rgba(94,234,212,.85)'
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill()
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i]
        p.t += .018
        if (p.t >= 1) { packets.splice(i, 1); continue }
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t
        ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 12; ctx.fillStyle = '#e0fffb'
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', move)
    }
  }, [])
  return <canvas ref={ref} className="splash-canvas" />
}

export default function SplashScreen({ onDone }) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('run') // run -> exit
  const [calm] = useState(reducedMotion) // people who asked for less motion get a short, still version
  const minMs = calm ? 900 : MIN_MS
  const backendReady = useRef(false)
  const skipped = useRef(false)

  // Really wait for the server (at most 6 seconds), so the dashboard is ready when the curtain opens.
  useEffect(() => {
    let alive = true
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 6000)
    fetch('/api/health', { signal: ctl.signal })
      .catch(() => {})
      .finally(() => { clearTimeout(t); if (alive) backendReady.current = true })
    return () => { alive = false; clearTimeout(t); ctl.abort() }
  }, [])

  // Progress climbs smoothly to 92%, then finishes once the minimum time has passed AND the server answered.
  useEffect(() => {
    let raf, p = 0
    const start = performance.now()
    const tick = (now) => {
      const el = now - start
      const done = skipped.current || (backendReady.current && el >= minMs)
      const target = done ? 100 : (1 - Math.pow(1 - Math.min(el / minMs, 1), 2.2)) * 92
      p += (target - p) * (done ? .22 : .1)
      if (p > 99.4) p = 100
      setProgress(Math.round(p))
      if (p >= 100) { setTimeout(() => setPhase('exit'), 420); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [minMs])

  useEffect(() => {
    if (phase !== 'exit') return undefined
    const t = setTimeout(onDone, 950)
    return () => clearTimeout(t)
  }, [phase, onDone])

  // no page scrolling underneath the intro
  useEffect(() => {
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = before }
  }, [])

  const activeIndex = BOOT.findIndex((_, i) => progress < ((i + 1) / BOOT.length) * 92)

  return (
    <div className={`splash ${phase === 'exit' ? 'exit' : ''}`} role="status" aria-live="polite" aria-label="Loading LabMatrix">
      <div className="splash-aurora"><i /><i /><i /></div>
      <div className="splash-grid" />
      {!calm && <Network />}
      {!calm && <div className="splash-scan" />}

      <div className="splash-stage">
        <div className="logo-wrap">
          <div className="orbit">
            {CHIPS.map((c) => (
              <div key={c.a} className="chip" style={{ '--a': c.a, '--d': c.d }}>
                <div className="chip-in">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
                </div>
              </div>
            ))}
          </div>
          <div className="orbit-2" />

          <svg className="flask" viewBox="0 0 120 140" aria-hidden="true">
            <defs>
              <clipPath id="flaskClip"><path d={FLASK} /></clipPath>
              <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7df3e1" /><stop offset=".55" stopColor="#22d3ee" /><stop offset="1" stopColor="#0d9488" />
              </linearGradient>
            </defs>
            <path className="flask-glass" d={FLASK} />
            <g clipPath="url(#flaskClip)">
              <g className="liquid">
                <path className="wave-b" fill="url(#liquid)" d="M-60 0 Q-45 -9 -30 0 T0 0 T30 0 T60 0 T90 0 T120 0 T150 0 T180 0 V140 H-60 Z" />
                <path className="wave-a" fill="url(#liquid)" d="M-60 2 Q-45 -7 -30 2 T0 2 T30 2 T60 2 T90 2 T120 2 T150 2 T180 2 V140 H-60 Z" />
                <circle className="bubble" cx="48" cy="112" r="2.6" />
                <circle className="bubble" cx="66" cy="118" r="1.8" />
                <circle className="bubble" cx="80" cy="110" r="3" />
                <circle className="bubble" cx="58" cy="122" r="1.5" />
              </g>
            </g>
            <path className="flask-outline" d={FLASK} pathLength="1" />
            <rect className="flask-outline" x="41" y="3" width="38" height="6" rx="3" pathLength="1" />
            <path className="flask-outline" d="M88 86h10M92 98h10" pathLength="1" />
          </svg>
        </div>

        <div className="splash-title" aria-hidden="true">
          {LETTERS.map((ch, i) => <span key={i} className={`ch ${i >= 3 ? 'accent' : ''}`} style={{ '--i': i }}>{ch}</span>)}
        </div>
        <div className="splash-tag">Smart lab management</div>

        <div className="boot">
          {BOOT.map((line, i) => {
            const state = progress >= ((i + 1) / BOOT.length) * 92 || progress >= 100 ? 'done' : i === activeIndex ? 'active' : ''
            return (
              <div key={line} className={`boot-line ${state}`}>
                <span>{state === 'done' ? '✓' : '›'} {line}</span>
                <span className="boot-state">{state === 'done' ? 'OK' : state === 'active' ? <i className="spin" /> : ''}</span>
              </div>
            )
          })}
          <div className="meter">
            <div className="bar"><div className="bar-fill" style={{ '--p': `${progress}%` }} /></div>
            <span className="pct">{progress}%</span>
          </div>
        </div>
      </div>

      <button className="skip" onClick={() => { skipped.current = true }}>Skip</button>
    </div>
  )
}
