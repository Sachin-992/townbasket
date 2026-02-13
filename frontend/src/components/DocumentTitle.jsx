import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Dynamic document title based on route.
 * Usage: Place <DocumentTitle /> inside BrowserRouter.
 */
const TITLE_MAP = {
    '/login': 'Login',
    '/signup': 'Sign Up',
    '/reset-password': 'Reset Password',
    '/select-role': 'Choose Your Role',
    '/customer': 'Home',
    '/customer/shops': 'Shops',
    '/customer/cart': 'Cart',
    '/customer/checkout': 'Checkout',
    '/customer/order-success': 'Order Placed!',
    '/customer/orders': 'My Orders',
    '/customer/profile': 'Profile',
    '/customer/addresses': 'Saved Addresses',
    '/customer/offers': 'Offers',
    '/customer/notifications': 'Notifications',
    '/customer/help': 'Help & Support',
    '/customer/about': 'About Us',
    '/customer/terms': 'Terms & Conditions',
    '/customer/privacy': 'Privacy Policy',
    '/customer/contact': 'Contact Us',
    '/seller': 'Seller Dashboard',
    '/delivery': 'Delivery Dashboard',
    '/admin': 'Admin Dashboard',
    '/admin/sellers': 'Admin — Sellers',
    '/admin/orders': 'Admin — Orders',
    '/admin/delivery': 'Admin — Delivery',
    '/admin/complaints': 'Admin — Complaints',
    '/admin/categories': 'Admin — Categories',
    '/admin/settings': 'Admin — Settings',
}

const BASE_TITLE = 'TownBasket'

export default function DocumentTitle() {
    const location = useLocation()

    useEffect(() => {
        const path = location.pathname
        const pageTitle = TITLE_MAP[path]

        if (pageTitle) {
            document.title = `${pageTitle} | ${BASE_TITLE}`
        } else if (path.startsWith('/customer/shop/')) {
            document.title = `Shop Details | ${BASE_TITLE}`
        } else {
            document.title = BASE_TITLE
        }
    }, [location.pathname])

    return null
}
