import { useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { ENTITIES } from '../../config/entities'
import './loaders.css'

const NAMES = { '/': 'Dashboard', '/attendance': 'Attendance', '/reports': 'Reports', '/query-lab': 'Query Lab' }
const nameFor = (path) => {
  const m = path.match(/^\/e\/([^/]+)/)
  return (m && ENTITIES[m[1]]?.title) || NAMES[path] || 'page'
}

// Drop-in replacement for <Outlet />.
// The new page appears at once (navigation is never delayed). While it settles, a slim progress
// line runs across the top and a small "Loading ..." pill shows for about 0.7 s, then both fade away.
// It is pure CSS: changing the key restarts the animation, and it never blocks clicks.
export default function PageTransition() {
  const outlet = useOutlet()
  const { pathname } = useLocation()
  const [first] = useState(pathname) // no loader on the very first page (the intro already covers it)

  return (
    <>
      {pathname !== first && (
        <div key={pathname} className="pl" aria-hidden="true">
          <div className="pl-bar" />
          <div className="pl-pill"><i className="pl-ring" /><span>Loading <b>{nameFor(pathname)}</b></span></div>
        </div>
      )}
      <div key={pathname} className="page-enter">{outlet}</div>
    </>
  )
}
