/**
 * Admin icon registry — explicit named imports for tree-shaking.
 * Using `import * as icons from 'lucide-react'` pulls the entire library (~600KB).
 * This map imports only the icons actually used in the admin module.
 */
import {
    LayoutDashboard,
    Store,
    Package,
    Truck,
    MessageSquareWarning,
    LayoutGrid,
    ScrollText,
    Settings,
    Moon,
    Sun,
    LogOut,
    ChevronsLeft,
    ChevronsRight,
    Search,
    UserCheck,
    Circle,
    Activity,
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react'

/** Lookup map: PascalCase icon name → Lucide component */
const ICON_MAP = {
    LayoutDashboard,
    Store,
    Package,
    Truck,
    MessageSquareWarning,
    LayoutGrid,
    ScrollText,
    Settings,
    Moon,
    Sun,
    LogOut,
    ChevronsLeft,
    ChevronsRight,
    Search,
    UserCheck,
    Circle,
    Activity,
    TrendingUp,
    TrendingDown,
    Minus,
}

/**
 * Resolve a Lucide icon by PascalCase name.
 * Falls back to Circle if not found.
 */
export function getIcon(name) {
    return ICON_MAP[name] || Circle
}

export default ICON_MAP
