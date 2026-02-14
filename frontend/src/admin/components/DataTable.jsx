import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react'
import ICON_MAP from '../utils/iconMap'
import { TableSkeleton } from './SkeletonLoader'
import { useIsMobile } from '../hooks/useMediaQuery'

const { ArrowUpDown, ArrowUp, ArrowDown, Download, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } = ICON_MAP

/**
 * Debounce hook for search input
 */
function useDebouncedValue(value, delay = 300) {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debounced
}

/**
 * Mobile card skeleton
 */
function CardSkeleton({ count = 5 }) {
    return (
        <div className="space-y-3 p-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
            ))}
        </div>
    )
}

/**
 * Single mobile card for a data row
 */
function MobileCard({ row, columns, mobileColumns, expanded, onToggle }) {
    // Primary columns shown always
    const primaryCols = mobileColumns?.primary || columns.slice(0, 2)
    // Detail columns shown when expanded
    const detailCols = mobileColumns?.detail || columns.slice(2)
    // Action column (last column if it has no sortable key or has 'action' in key)
    const actionCol = columns.find(c => c.key === 'actions' || c.key === 'action') || null

    return (
        <div className="data-card tap-animate">
            {/* Primary info */}
            {primaryCols.map(col => (
                <div key={col.key} className="data-card-row">
                    <span className="data-card-label">{col.label}</span>
                    <span className="data-card-value">
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </span>
                </div>
            ))}

            {/* Expand toggle */}
            {detailCols.length > 0 && (
                <button
                    onClick={onToggle}
                    className="flex items-center justify-center gap-1 w-full py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Hide details' : 'Show details'}
                >
                    {expanded ? (
                        <>Less <ChevronUp size={14} /></>
                    ) : (
                        <>Details <ChevronDown size={14} /></>
                    )}
                </button>
            )}

            {/* Expanded details */}
            {expanded && detailCols.map(col => {
                if (col === actionCol) return null
                return (
                    <div key={col.key} className="data-card-row">
                        <span className="data-card-label">{col.label}</span>
                        <span className="data-card-value">
                            {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                        </span>
                    </div>
                )
            })}

            {/* Actions */}
            {actionCol && (
                <div className="data-card-actions">
                    {actionCol.render ? actionCol.render(row[actionCol.key], row) : null}
                </div>
            )}
        </div>
    )
}

/**
 * Sortable, filterable, exportable data table.
 * On mobile (<768px): renders card-based stacked layout.
 * On desktop: renders traditional table.
 *
 * @param {Object} props
 * @param {Array<{key:string, label:string, sortable?:boolean, render?:Function}>} props.columns
 * @param {Array<Object>} props.data
 * @param {boolean} [props.loading]
 * @param {string} [props.emptyMessage]
 * @param {boolean} [props.exportable]
 * @param {string} [props.exportFilename]
 * @param {number} [props.pageSize]
 * @param {{primary: Array, detail: Array}} [props.mobileColumns] - Column groups for mobile cards
 */
function DataTable({ columns, data = [], loading, emptyMessage = 'No data found', exportable = false, exportFilename = 'export', pageSize = 10, mobileColumns }) {
    const [sortKey, setSortKey] = useState(null)
    const [sortDir, setSortDir] = useState('asc')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)
    const [expandedRows, setExpandedRows] = useState(new Set())
    const isMobile = useIsMobile()

    const debouncedSearch = useDebouncedValue(search, 300)

    const handleSort = useCallback((key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }, [sortKey])

    const toggleRow = useCallback((id) => {
        setExpandedRows(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }, [])

    const filtered = useMemo(() => {
        if (!debouncedSearch.trim()) return data
        const q = debouncedSearch.toLowerCase()
        return data.filter(row =>
            columns.some(col => {
                const val = row[col.key]
                return val != null && String(val).toLowerCase().includes(q)
            })
        )
    }, [data, debouncedSearch, columns])

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

    if (loading) {
        return isMobile ? <CardSkeleton count={pageSize} /> : <TableSkeleton rows={pageSize} />
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 md:p-4 border-b border-gray-100 dark:border-gray-700">
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
                <div className="flex items-center gap-2">
                    {exportable && (
                        <button
                            onClick={exportCSV}
                            aria-label="Export table data as CSV"
                            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors tap-animate"
                        >
                            <Download size={14} />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    )}
                    {/* Result count badge */}
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {sorted.length} result{sorted.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Mobile: Card layout */}
            {isMobile ? (
                <div className="p-3 space-y-2.5">
                    {paged.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                            {emptyMessage}
                        </div>
                    ) : (
                        paged.map((row, i) => (
                            <MobileCard
                                key={row.id || i}
                                row={row}
                                columns={columns}
                                mobileColumns={mobileColumns}
                                expanded={expandedRows.has(row.id || i)}
                                onToggle={() => toggleRow(row.id || i)}
                            />
                        ))
                    )}
                </div>
            ) : (
                /* Desktop: Table layout */
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
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 md:px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Page {page + 1} of {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            aria-label="Previous page"
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors tap-animate"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            aria-label="Next page"
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors tap-animate"
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
