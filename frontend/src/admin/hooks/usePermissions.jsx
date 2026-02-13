/**
 * RBAC Permission hooks and context.
 *
 * usePermissions() — fetches the admin's role + permissions from /admin/permissions/
 * useHasPermission(perm) — returns boolean
 * PermissionGate — renders children only if user has the required permission
 */
import { createContext, useContext, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { systemApi } from '../api/adminApi'

// ── Context ─────────────────────────────────────
const PermissionContext = createContext({ role: 'admin', permissions: [] })

export function PermissionProvider({ children }) {
    const { data } = useQuery({
        queryKey: ['admin', 'permissions'],
        queryFn: systemApi.getPermissions,
        staleTime: 5 * 60 * 1000, // 5 min cache
        refetchOnWindowFocus: false,
    })

    const value = useMemo(() => ({
        role: data?.role || 'admin',
        permissions: new Set(data?.permissions || []),
    }), [data])

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    )
}

// ── Hooks ───────────────────────────────────────

/** Get the full permission context */
export function usePermissions() {
    return useContext(PermissionContext)
}

/** Check a single permission */
export function useHasPermission(permission) {
    const { permissions } = useContext(PermissionContext)
    return permissions.has(permission)
}

/** Check multiple permissions (AND logic) */
export function useHasAllPermissions(...perms) {
    const { permissions } = useContext(PermissionContext)
    return perms.every(p => permissions.has(p))
}

/** Check at least one permission (OR logic) */
export function useHasAnyPermission(...perms) {
    const { permissions } = useContext(PermissionContext)
    return perms.some(p => permissions.has(p))
}

// ── Gate Component ──────────────────────────────

/**
 * Conditional render based on permission.
 *
 * Usage:
 *   <PermissionGate permission="orders.export">
 *       <ExportButton />
 *   </PermissionGate>
 *
 *   <PermissionGate permission="settings.update" fallback={<span>Read only</span>}>
 *       <SettingsForm />
 *   </PermissionGate>
 */
export function PermissionGate({ permission, permissions, any = false, fallback = null, children }) {
    const ctx = useContext(PermissionContext)

    let allowed = false

    if (permission) {
        // Single permission check
        allowed = ctx.permissions.has(permission)
    } else if (permissions && permissions.length > 0) {
        // Multiple permissions — AND or OR based on `any` prop
        allowed = any
            ? permissions.some(p => ctx.permissions.has(p))
            : permissions.every(p => ctx.permissions.has(p))
    } else {
        allowed = true
    }

    return allowed ? children : fallback
}
