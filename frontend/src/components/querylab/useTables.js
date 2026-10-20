import { useEffect, useState } from 'react'
import { api } from '../../api/client'

// Loads the list of tables and their columns once. Every dropdown is built from it.
export default function useTables() {
  const [tables, setTables] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    api.ql.tables().then(setTables).catch((e) => setError(e.message))
  }, [])
  return { tables, error }
}
