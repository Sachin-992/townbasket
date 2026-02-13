import { useState, useMemo, useCallback, memo } from 'react'
import ICON_MAP from '../utils/iconMap'
import { TableSkeleton } from './SkeletonLoader'

const { ArrowUpDown, ArrowUp, ArrowDown, Download, Search, ChevronLeft, ChevronRight } = ICON_MAP

/**
 * Sortable, filterable, exportable data table.
 * @param {Object} props
 * @param {Array<{key:string, label:string, sortable?:boolean, render?:Function}>} props.columns
 * @param {Array<Object>} props.data
 * @param {boolean} [props.loading]
 * @param {string} [props.emptyMessage]
 * @param {boolean} [props.exportable]
 * @param {string} [props.exportFilename]
 * @param {number} [props.pageSize]
 */
function DataTable({ columns, data = [], loading, emptyMessage = 'No data found', exportable = false, exportFilename = 'export', pageSize = 10 }) {
    const [sortKey, setSortKey] = useState(null)
    const [sortDir, setSortDir] = useState('asc')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)

    const handleSort = useCallback((key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }, [sortKey])

    const filtered = useMemo(() => {
        if (!search.trim()) return data
        const q = search.toLowerCase()
        return data.filter(row =>
            columns.some(col => {
                const val = row[col.key]
                return val != null && String(val).toLowerCase().includes(q)
            })
        )
    }, [data, search, columns])

    const sorted = useMemo(() => {
        if (!sortKey) return filtered
        return [...filtered].sort((a, b) => {
            const aVal = a[sortKey] ?? ''
            const bVal = b[sortKey] ?? ''
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal
            }
            const cmp = String(aVal).localeCompare(String(bVal))
            return sortDir === 'asc' ? cmp : -cmp
        })
    }, [filtered, sortKey, sortDir])

    const totalPages = Math.ceil(sorted.length / pageSize)
    const paged = useMemo(() => sorted.slice(page * pageSize, (page + 1) * pageSize), [sorted, page, pageSize])

    const exportCSV = useCallback(() => {
        const header = columns.map(c => c.label).join(',')
        const rows = sorted.map(row => columns.map(c => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
        const csv = [header, ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportFilename}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [sorted, columns, exportFilename])

    if (loading) return <TableSkeleton rows={pageSize} />

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0) }}
                        inputMode="search"
                        aria-label="Search table"
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                    />
                </div>
                {exportable && (
                    <button
                        onClick={exportCSV}
                        aria-label="Export table data as CSV"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                        <Download size={14} />
                        Export
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-white' : ''}`}
                                    onClick={() => col.sortable !== false && handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {col.sortable !== false && (
                                            sortKey === col.key
                                                ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
                                                : <ArrowUpDown size={12} className="opacity-30" />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {paged.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paged.map((row, i) => (
                                <tr key={row.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    {columns.map(col => (
                                        <td key={col.key} className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {sorted.length} results · page {page + 1} of {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            aria-label="Previous page"
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            aria-label="Next page"
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(DataTable)
