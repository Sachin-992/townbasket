/**
 * Formatting utilities for the admin module.
 */
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'

/** Format currency in INR */
export function formatCurrency(amount) {
    const num = Number(amount) || 0
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`
    return `₹${num.toFixed(0)}`
}

/** Full currency without abbreviation */
export function formatCurrencyFull(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0)
}

/** Short date: "12 Feb" or "Today" */
export function formatShortDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    if (isToday(d)) return 'Today'
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'd MMM')
}

/** Full date-time: "12 Feb 2026, 11:30 PM" */
export function formatDateTime(dateStr) {
    if (!dateStr) return '—'
    return format(new Date(dateStr), 'd MMM yyyy, h:mm a')
}

/** Relative time: "3 minutes ago" */
export function formatRelative(dateStr) {
    if (!dateStr) return '—'
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

/** Format percentage: "72.3%" */
export function formatPercent(value, decimals = 1) {
    return `${(Number(value) || 0).toFixed(decimals)}%`
}

/** Format large numbers: "12.3K" */
export function formatNumber(num) {
    const n = Number(num) || 0
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
}

/** Trend direction: 'up' | 'down' | 'flat' */
export function getTrend(current, previous) {
    if (!previous || previous === 0) return 'flat'
    const change = ((current - previous) / previous) * 100
    if (change > 1) return 'up'
    if (change < -1) return 'down'
    return 'flat'
}

/** Trend percentage */
export function getTrendPercent(current, previous) {
    if (!previous || previous === 0) return 0
    return ((current - previous) / previous) * 100
}
