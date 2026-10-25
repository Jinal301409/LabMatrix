const COLORS = {
  green: ['Working', 'Approved', 'Present', 'Completed', 'Resolved', 'Closed'],
  amber: ['Under Maintenance', 'Pending', 'Open', 'Late', 'Assigned', 'In Progress', 'Medium'],
  red: ['Retired', 'Rejected', 'Cancelled', 'Absent', 'High'],
}
const STYLE = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
}

export default function StatusBadge({ value }) {
  const key = Object.keys(COLORS).find((c) => COLORS[c].includes(value))
  if (!key) return <>{String(value)}</>
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[key]}`}>{value}</span>
}
