import type { Department } from '../../types'

const DEPARTMENTS: Department[] = ['1部', '2部']

export function DepartmentToggle({ value, onChange }: { value: Department; onChange: (dept: Department) => void }) {
  return (
    <div className="flex gap-1 rounded-md border border-white/10 bg-[var(--surface-3)] p-1">
      {DEPARTMENTS.map((dept) => (
        <button
          key={dept}
          type="button"
          onClick={() => onChange(dept)}
          className={`rounded px-3 py-1.5 text-sm font-medium ${
            value === dept ? 'bg-amber-500 text-black' : 'text-[var(--text-secondary)] hover:bg-white/5'
          }`}
        >
          {dept}
        </button>
      ))}
    </div>
  )
}
