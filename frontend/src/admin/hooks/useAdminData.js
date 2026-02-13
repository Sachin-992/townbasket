/**
 * TanStack Query hooks for admin data fetching.
 * Provides caching, background refetch, and loading/error states.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { overviewApi, systemApi, adminShopsApi, adminOrdersApi, adminUsersApi, adminComplaintsApi, adminCategoriesApi, adminSettingsApi, analyticsApi, fraudApi, bulkApi } from '../api/adminApi'

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

export function useAuditAdmins() {
    return useQuery({
        queryKey: ['admin', 'audit-admins'],
        queryFn: () => systemApi.getAuditAdmins(),
        staleTime: 300_000,
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
export function useUsers() {
    return useQuery({
        queryKey: ['admin', 'users', 'all'],
        queryFn: adminUsersApi.getAll,
        staleTime: 30_000,
    })
}

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

// ── Advanced Analytics ──────────────────────────
export function useTopProducts(days = 30) {
    return useQuery({
        queryKey: ['admin', 'top-products', days],
        queryFn: () => analyticsApi.getTopProducts(days),
        staleTime: 120_000,
    })
}

export function useTopShops(days = 30) {
    return useQuery({
        queryKey: ['admin', 'top-shops', days],
        queryFn: () => analyticsApi.getTopShops(days),
        staleTime: 120_000,
    })
}

export function usePeakHours(days = 30) {
    return useQuery({
        queryKey: ['admin', 'peak-hours', days],
        queryFn: () => analyticsApi.getPeakHours(days),
        staleTime: 120_000,
    })
}

export function useConversionFunnel(days = 30) {
    return useQuery({
        queryKey: ['admin', 'conversion-funnel', days],
        queryFn: () => analyticsApi.getConversionFunnel(days),
        staleTime: 120_000,
    })
}

export function useCustomerLifetimeValue(limit = 20) {
    return useQuery({
        queryKey: ['admin', 'clv', limit],
        queryFn: () => analyticsApi.getCustomerLifetimeValue(limit),
        staleTime: 120_000,
    })
}

export function useDeliveryEfficiency(days = 30) {
    return useQuery({
        queryKey: ['admin', 'delivery-efficiency', days],
        queryFn: () => analyticsApi.getDeliveryEfficiency(days),
        staleTime: 120_000,
    })
}

// ── Fraud Detection ─────────────────────────────
export function useFraudAlerts(params = {}) {
    return useQuery({
        queryKey: ['admin', 'fraud-alerts', params],
        queryFn: () => fraudApi.getAlerts(params),
        refetchInterval: 30_000,
        staleTime: 15_000,
    })
}

export function useHighRiskUsers(minOrders = 3) {
    return useQuery({
        queryKey: ['admin', 'high-risk-users', minOrders],
        queryFn: () => fraudApi.getHighRiskUsers(minOrders),
        staleTime: 120_000,
    })
}

export function useDismissAlert() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, note }) => fraudApi.dismissAlert(id, note),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'fraud-alerts'] }),
    })
}

export function useInvestigateAlert() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, note }) => fraudApi.investigateAlert(id, note),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'fraud-alerts'] }),
    })
}

export function useFraudScan() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => fraudApi.triggerScan(),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'fraud-alerts'] }),
    })
}

export function useConfirmAlert() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, note }) => fraudApi.confirmAlert(id, note),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'fraud-alerts'] }),
    })
}

export function useFraudSummary() {
    return useQuery({
        queryKey: ['admin', 'fraud-summary'],
        queryFn: () => fraudApi.getSummary(),
        staleTime: 30_000,
    })
}

// ── Bulk Actions ────────────────────────────────
export function useBulkShops() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ action, ids }) => bulkApi.bulkShops(action, ids),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'shops'] })
            qc.invalidateQueries({ queryKey: ['admin', 'overview'] })
        },
    })
}

export function useBulkUsers() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ action, ids }) => bulkApi.bulkUsers(action, ids),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
            qc.invalidateQueries({ queryKey: ['admin', 'overview'] })
        },
    })
}
