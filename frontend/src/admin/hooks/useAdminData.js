/**
 * TanStack Query hooks for admin data fetching.
 * Provides caching, background refetch, and loading/error states.
 */
import { useQuery } from '@tanstack/react-query'
import { overviewApi, systemApi, adminShopsApi, adminOrdersApi, adminUsersApi, adminComplaintsApi, adminCategoriesApi, adminSettingsApi } from '../api/adminApi'

// ── Overview ────────────────────────────────────
export function useOverview() {
    return useQuery({
        queryKey: ['admin', 'overview'],
        queryFn: overviewApi.getOverview,
        refetchInterval: 60_000, // auto-refresh every 60s
        staleTime: 30_000,
    })
}

export function useRevenueAnalytics(period = 'daily') {
    return useQuery({
        queryKey: ['admin', 'revenue', period],
        queryFn: () => overviewApi.getRevenueAnalytics(period),
        staleTime: 60_000,
    })
}

export function useUserGrowth() {
    return useQuery({
        queryKey: ['admin', 'user-growth'],
        queryFn: overviewApi.getUserGrowth,
        staleTime: 120_000,
    })
}

// ── System ──────────────────────────────────────
export function useSystemHealth() {
    return useQuery({
        queryKey: ['admin', 'system-health'],
        queryFn: systemApi.getHealth,
        refetchInterval: 30_000,
        staleTime: 15_000,
    })
}

export function useActivityFeed(page = 1) {
    return useQuery({
        queryKey: ['admin', 'activity-feed', page],
        queryFn: () => systemApi.getActivityFeed(page),
        staleTime: 30_000,
    })
}

export function useAuditLogs(page = 1, filters = {}) {
    return useQuery({
        queryKey: ['admin', 'audit-logs', page, filters],
        queryFn: () => systemApi.getAuditLogs(page, filters),
        staleTime: 30_000,
    })
}

// ── Shops ───────────────────────────────────────
export function useAllShops() {
    return useQuery({
        queryKey: ['admin', 'shops'],
        queryFn: adminShopsApi.getAll,
        staleTime: 30_000,
    })
}

export function usePendingShops() {
    return useQuery({
        queryKey: ['admin', 'shops', 'pending'],
        queryFn: adminShopsApi.getPending,
        staleTime: 15_000,
    })
}

// ── Orders ──────────────────────────────────────
export function useAllOrders() {
    return useQuery({
        queryKey: ['admin', 'orders'],
        queryFn: adminOrdersApi.getAll,
        staleTime: 15_000,
    })
}

// ── Users ───────────────────────────────────────
export function useUsersByRole(role) {
    return useQuery({
        queryKey: ['admin', 'users', role],
        queryFn: () => adminUsersApi.getByRole(role),
        staleTime: 30_000,
        enabled: !!role,
    })
}

// ── Complaints ──────────────────────────────────
export function useComplaints(status = 'pending') {
    return useQuery({
        queryKey: ['admin', 'complaints', status],
        queryFn: () => adminComplaintsApi.getAll(status),
        staleTime: 15_000,
    })
}

// ── Categories ──────────────────────────────────
export function useCategories() {
    return useQuery({
        queryKey: ['admin', 'categories'],
        queryFn: adminCategoriesApi.getAll,
        staleTime: 120_000,
    })
}

// ── Settings ────────────────────────────────────
export function useSettings() {
    return useQuery({
        queryKey: ['admin', 'settings'],
        queryFn: adminSettingsApi.get,
        staleTime: 60_000,
    })
}
