import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AggregateTab, DisplayTab, FilterTab, InsertTab, JoinTab, PresetTab, UpdateTab } from '../components/querylab/QueryTabs'

const TABS = [
  { id: 'display', label: 'Q1 Display', C: () => <DisplayTab /> },
  { id: 'insert', label: 'Q2 Insert', C: () => <InsertTab /> },
  { id: 'aggregate', label: 'Q3 Aggregate', C: () => <AggregateTab /> },
  { id: 'filter', label: 'Q4 Condition', C: () => <FilterTab /> },
  { id: 'join', label: 'Q5 Join', C: () => <JoinTab /> },
  { id: 'subquery', label: 'Q6 Subquery', C: () => <PresetTab kind="subquery" /> },
  { id: 'correlated', label: 'Q7 Correlated', C: () => <PresetTab kind="correlated" /> },
  { id: 'update', label: 'Q8 Update', C: () => <UpdateTab /> },
]

export default function QueryLab() {
  const { user } = useAuth()
  const [tab, setTab] = useState('display')

  if (user.role !== 'Admin') {
    return <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">The Query Lab is only for the Admin.</p>
  }
  const Active = TABS.find((t) => t.id === tab).C

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Query Lab</h1>
      <p className="mb-4 text-sm text-slate-500">Run the DBMS assignment queries on the live database. The SQL that ran is shown above every result.</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${t.id === tab ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white hover:bg-slate-50'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <Active key={tab} />
    </>
  )
}
