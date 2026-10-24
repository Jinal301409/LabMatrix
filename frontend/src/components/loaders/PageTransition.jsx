import { useLocation, useOutlet } from 'react-router-dom'
import './loaders.css'

// Drop-in replacement for <Outlet />.
// The new page appears immediately and eases in with a short fade + tiny rise (about 200 ms).
// Nothing blocks navigation and only opacity/transform are animated, so it stays smooth on any device.
export default function PageTransition() {
  const outlet = useOutlet()
  const { pathname } = useLocation()
  return <div key={pathname} className="page-enter">{outlet}</div>
}
