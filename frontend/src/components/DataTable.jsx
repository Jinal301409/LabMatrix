import StatusBadge from './StatusBadge'
import { label } from '../config/entities'

function formatCell(key, value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (value === null || value === undefined) return ''
  if (/(date|_at)/.test(key)) return String(value).slice(0, 16).replace('T', ' ').replace(/ 00:00$/, '')
  return <StatusBadge value={value} />
}

// columns: array of keys. renderActions(row) is optional.
export default function DataTable({ rows, columns, renderActions }) {
  if (!rows.length) {
    return <div className="py-10 text-center text-slate-500">Nothing here yet.</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">{label(c)}</th>
            ))}
            {renderActions && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c} className="px-3 py-2">{formatCell(c, r[c])}</td>
              ))}
              {renderActions && <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">{renderActions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
