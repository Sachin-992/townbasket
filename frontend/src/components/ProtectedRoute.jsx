import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles = [] }) {
    const { user, userProfile, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />
    }

    // Logged in but no role selected yet
    if (!userProfile?.role && allowedRoles.length > 0) {
        return <Navigate to="/select-role" replace />
    }

    // Role-based access check
    if (allowedRoles.length > 0 && !allowedRoles.includes(userProfile?.role)) {
        return <Navigate to="/" replace />
    }

    return children
}
