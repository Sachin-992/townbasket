import { useAuth } from '../context/AuthContext'

export default function CustomerDashboard() {
    const { user, logout } = useAuth()

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-blue-600">TownBasket</h1>
                    <button
                        onClick={logout}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="text-6xl mb-4">🛒</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Welcome, Customer!
                    </h2>
                    <p className="text-gray-600">
                        Your dashboard is coming soon. You'll be able to browse shops, place orders, and track deliveries here.
                    </p>
                </div>
            </main>
        </div>
    )
}
