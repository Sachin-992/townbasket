import { useState, memo } from 'react'
import { Calendar } from 'lucide-react'
import { format, subDays, startOfWeek, startOfMonth, subMonths } from 'date-fns'

const PRESETS = [
    { label: 'Today', getValue: () => ({ start: new Date(), end: new Date() }) },
    { label: '7 days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
    { label: '30 days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
    { label: 'This week', getValue: () => ({ start: startOfWeek(new Date()), end: new Date() }) },
    { label: 'This month', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
    { label: '3 months', getValue: () => ({ start: subMonths(new Date(), 3), end: new Date() }) },
]

/**
 * @param {Object} props
 * @param {Function} props.onChange - Called with { start: Date, end: Date, label: string }
 * @param {string} [props.activeLabel] - Currently selected label
 */
function DateRangePicker({ onChange, activeLabel = '30 days' }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <Calendar size={14} />
                {activeLabel}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 min-w-[160px]">
                        {PRESETS.map(preset => (
                            <button
                                key={preset.label}
                                onClick={() => {
                                    const range = preset.getValue()
                                    onChange({ ...range, label: preset.label })
                                    setOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${activeLabel === preset.label
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-semibold'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default memo(DateRangePicker)
