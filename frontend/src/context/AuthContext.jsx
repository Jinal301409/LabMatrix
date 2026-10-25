import { createContext, useContext, useState } from 'react'
import { api, storage } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storage.user)

  const login = async (email, password) => {
    const data = await api.login(email, password) // { token, user }
    storage.set(data.user, data.token)
    setUser(data.user)
  }

  const logout = () => {
    storage.clear()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
