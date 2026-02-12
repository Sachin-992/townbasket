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

async function adminFetch(endpoint, options = {}) {
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
    getActivityFeed: (page = 1) =>
        adminFetch(`/admin/activity-feed/?page=${page}`),
    getAuditLogs: (page = 1, filters = {}) => {
        const params = new URLSearchParams({ page: String(page), ...filters })
        return adminFetch(`/admin/audit-logs/?${params}`)
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
}

// ── Users (admin) ────────────────────────────────
export const adminUsersApi = {
    getByRole: (role) => adminFetch(`/users/role/${role}/`),
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
