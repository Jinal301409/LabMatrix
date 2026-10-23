import { useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { ENTITIES } from '../../config/entities'
import './loaders.css'

// Timeline of one page switch (milliseconds). It matches the CSS in loaders.css.
const COVER_MS = 480 // the blinds close over the old page
const HOLD_MS = 60 //   the new page is swapped in while hidden
const REVEAL_MS = 470 // the blinds open on the new page

const NAMES = { '/': 'Dashboard', '/attendance': 'Attendance', '/reports': 'Reports', '/query-lab': 'Query Lab' }
const nameFor = (path) => {
  const m = path.match(/^\/e\/([^/]+)/)
  return (m && ENTITIES[m[1]]?.title) || NAMES[path] || 'page'
}
const BARS = Array.from({ length: 8 }, (_, i) => i)

// Drop-in replacement for <Outlet />. On every page switch the old page stays on screen
// until the blinds have closed over it, then the new page is put in place and the blinds open.
export default function PageTransition() {
  const outlet = useOutlet()
  const { pathname } = useLocation()
  const [shown, setShown] = useState({ outlet, path: pathname }) // the page currently on screen
  const [phase, setPhase] = useState('idle') // idle | cover | reveal
  const [label, setLabel] = useState('')
  const [calm] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (pathname === shown.path) { setPhase('idle'); return undefined } // back to the same page mid-switch
    if (calm) { setShown({ outlet, path: pathname }); return undefined } // reduced motion: switch instantly
    setLabel(nameFor(pathname))
    setPhase('cover')
    const swap = setTimeout(() => { setShown({ outlet, path: pathname }); setPhase('reveal') }, COVER_MS + HOLD_MS)
    const end = setTimeout(() => setPhase('idle'), COVER_MS + HOLD_MS + REVEAL_MS)
    return () => { clearTimeout(swap); clearTimeout(end) }
  }, [pathname]) // eslint-disable-line

  return (
    <>
      <div key={shown.path} className="page-enter">{shown.outlet}</div>

      <div className={`pt pt-${phase}`} aria-hidden="true">
        <div className="pt-progress" />
        <div className="pt-bars">{BARS.map((i) => <span key={i} className="pt-bar" style={{ '--i': i }} />)}</div>
        <div className="pt-center">
          <svg className="atom" viewBox="-50 -50 100 100">
            <g className="atom-spin">
              {[0, 60, 120].map((a) => (
                <g key={a} transform={`rotate(${a})`}>
                  <ellipse rx="42" ry="16" />
                  <circle className="electron" r="3.4">
                    <animateMotion dur="1.5s" repeatCount="indefinite" path="M42 0 A42 16 0 1 1 -42 0 A42 16 0 1 1 42 0" />
                  </circle>
                </g>
              ))}
            </g>
            <circle className="nucleus" r="6.5" />
          </svg>
          <div className="pt-label">Opening <b>{label}</b></div>
        </div>
      </div>
    </>
  )
}
