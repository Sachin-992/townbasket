/**
 * Admin API service layer.
 * All admin-specific API calls with auth headers and error handling.
 */
import { supabase } from '../../lib/supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

export async function adminFetch(endpoint, options = {}) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers },
    })
    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || body.detail || `Request failed (${res.status})`)
    }
    return res.json()
}

// ── Overview & Analytics ────────────────────────
export const overviewApi = {
    getOverview: () => adminFetch('/admin/overview/'),
    getRevenueAnalytics: (period = 'daily') =>
        adminFetch(`/admin/revenue-analytics/?period=${period}`),
    getUserGrowth: () => adminFetch('/admin/user-growth/'),
}

// ── System ──────────────────────────────────────
export const systemApi = {
    getHealth: () => adminFetch('/admin/system-health/'),
    quickSearch: (q) => adminFetch(`/admin/search/?q=${encodeURIComponent(q)}`),
    getPermissions: () => adminFetch('/admin/permissions/'),
    getActivityFeed: (page = 1) =>
        adminFetch(`/admin/activity-feed/?page=${page}`),
    getAuditLogs: (page = 1, filters = {}) => {
        const params = new URLSearchParams({ page: String(page), ...filters })
        return adminFetch(`/admin/audit-logs/?${params}`)
    },
    getAuditAdmins: () => adminFetch('/admin/audit-logs/admins/'),
    exportAuditCSV: async (filters = {}) => {
        const params = new URLSearchParams(filters)
        const url = `${import.meta.env.VITE_API_URL}/admin/audit-logs/export/?${params}`
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Export failed')
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'audit-log.csv'
        a.click()
        URL.revokeObjectURL(a.href)
    },
}

// ── Shops (admin) ───────────────────────────────
export const adminShopsApi = {
    getAll: () => adminFetch('/shops/all/'),
    getPending: () => adminFetch('/shops/pending/'),
    approve: (id) => adminFetch(`/shops/${id}/approve/`, { method: 'PATCH' }),
    reject: (id) => adminFetch(`/shops/${id}/reject/`, { method: 'PATCH' }),
    toggleActive: (id) => adminFetch(`/shops/${id}/toggle-active/`, { method: 'PATCH' }),
    getStats: () => adminFetch('/shops/admin/stats/'),
}

// ── Orders (admin) ──────────────────────────────
export const adminOrdersApi = {
    getAll: () => adminFetch('/orders/all/'),
    downloadInvoice: (orderId) => adminFetch(`/orders/${orderId}/invoice/`),
    resendInvoice: (orderId) => adminFetch(`/orders/${orderId}/invoice/resend/`, { method: 'POST' }),
}

// ── Users (admin) ────────────────────────────────
export const adminUsersApi = {
    getAll: () => adminFetch('/users/list/?page_size=500').then(r => r.results || r),
    getByRole: (role) => adminFetch(`/users/list/?role=${role}&page_size=500`).then(r => r.results || r),
    toggleActive: (id) =>
        adminFetch(`/users/${id}/toggle-active/`, { method: 'PATCH' }),
}

// ── Complaints (admin) ──────────────────────────
export const adminComplaintsApi = {
    getAll: (status = 'pending') =>
        adminFetch(`/complaints/list/?status=${status}`),
    resolve: (id, data) =>
        adminFetch(`/complaints/${id}/resolve/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
}

// ── Categories ──────────────────────────────────
export const adminCategoriesApi = {
    getAll: () => adminFetch('/shops/categories/'),
}

// ── Settings ────────────────────────────────────
export const adminSettingsApi = {
    get: () => adminFetch('/core/settings/'),
    update: (data) =>
        adminFetch('/core/settings/update/', {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
}

// ── Advanced Analytics ──────────────────────────
export const analyticsApi = {
    getTopProducts: (days = 30) =>
        adminFetch(`/admin/analytics/top-products/?days=${days}`),
    getTopShops: (days = 30) =>
        adminFetch(`/admin/analytics/top-shops/?days=${days}`),
    getPeakHours: (days = 30) =>
        adminFetch(`/admin/analytics/peak-hours/?days=${days}`),
    getConversionFunnel: (days = 30) =>
        adminFetch(`/admin/analytics/conversion-funnel/?days=${days}`),
    getCustomerLifetimeValue: (limit = 20) =>
        adminFetch(`/admin/analytics/clv/?limit=${limit}`),
    getDeliveryEfficiency: (days = 30) =>
        adminFetch(`/admin/analytics/delivery-efficiency/?days=${days}`),
}

// ── Fraud Detection ─────────────────────────────
export const fraudApi = {
    getAlerts: (params = {}) => {
        const qs = new URLSearchParams(params)
        return adminFetch(`/admin/fraud/alerts/?${qs}`)
    },
    dismissAlert: (id, note = '') =>
        adminFetch(`/admin/fraud/alerts/${id}/dismiss/`, {
            method: 'POST',
            body: JSON.stringify({ note }),
        }),
    investigateAlert: (id, note = '') =>
        adminFetch(`/admin/fraud/alerts/${id}/investigate/`, {
            method: 'POST',
            body: JSON.stringify({ note }),
        }),
    confirmAlert: (id, note = '') =>
        adminFetch(`/admin/fraud/alerts/${id}/confirm/`, {
            method: 'POST',
            body: JSON.stringify({ note }),
        }),
    getHighRiskUsers: (minOrders = 3) =>
        adminFetch(`/admin/fraud/high-risk-users/?min_orders=${minOrders}`),
    getSummary: () =>
        adminFetch('/admin/fraud/summary/'),
    triggerScan: () =>
        adminFetch('/admin/fraud/scan/', { method: 'POST' }),
}

// ── Bulk Actions ────────────────────────────────
export const bulkApi = {
    bulkShops: (action, ids, verifyToken = '') =>
        adminFetch('/admin/bulk/shops/', {
            method: 'POST',
            body: JSON.stringify({ action, ids }),
            headers: verifyToken ? { 'X-Admin-Verify-Token': verifyToken } : {},
        }),
    bulkUsers: (action, ids, verifyToken = '') =>
        adminFetch('/admin/bulk/users/', {
            method: 'POST',
            body: JSON.stringify({ action, ids }),
            headers: verifyToken ? { 'X-Admin-Verify-Token': verifyToken } : {},
        }),
}

