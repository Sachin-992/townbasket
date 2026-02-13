/**
 * Role-based permission utilities for the admin module.
 */

export const ROLES = {
    ADMIN: 'admin',
    SELLER: 'seller',
    DELIVERY: 'delivery',
    CUSTOMER: 'customer',
}

/** Check if user has admin role */
export function isAdmin(user) {
    return user?.role === ROLES.ADMIN
}

/** Navigation items available per role */
export const ADMIN_NAV = [
    { path: '/admin', label: 'Overview', icon: 'LayoutDashboard', exact: true },
    { path: '/admin/sellers', label: 'Sellers', icon: 'Store' },
    { path: '/admin/users', label: 'Users', icon: 'Users' },
    { path: '/admin/orders', label: 'Orders', icon: 'Package' },
    { path: '/admin/delivery', label: 'Delivery', icon: 'Truck' },
    { path: '/admin/analytics', label: 'Analytics', icon: 'BarChart3' },
    { path: '/admin/fraud', label: 'Fraud Detection', icon: 'ShieldAlert' },
    { path: '/admin/system-health', label: 'System Health', icon: 'Activity' },
    { path: '/admin/complaints', label: 'Complaints', icon: 'MessageSquareWarning' },
    { path: '/admin/categories', label: 'Categories', icon: 'LayoutGrid' },
    { path: '/admin/audit-log', label: 'Audit Log', icon: 'ScrollText' },
    { path: '/admin/notifications', label: 'Notifications', icon: 'Bell' },
    { path: '/admin/settings', label: 'Settings', icon: 'Settings' },
]
