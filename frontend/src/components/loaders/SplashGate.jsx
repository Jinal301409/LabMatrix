import { useState } from 'react'
import SplashScreen from './SplashScreen'

// true  = play the intro every time the website is opened or refreshed
// false = play it once per browser tab (it stays away on refresh)
const SHOW_EVERY_TIME = true
const KEY = 'labmatrix_splash_seen'

// Wraps the whole app: the app starts loading underneath while the intro plays on top.
export default function SplashGate({ children }) {
  const [show, setShow] = useState(() => SHOW_EVERY_TIME || !sessionStorage.getItem(KEY))

  const finish = () => {
    sessionStorage.setItem(KEY, '1')
    setShow(false)
  }

  return (
    <>
      {children}
      {show && <SplashScreen onDone={finish} />}
    </>
  )
}
