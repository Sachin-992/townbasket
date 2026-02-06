import { useState, useEffect } from 'react'
import { usersApi } from '../../lib/api'

export default function AdminDelivery() {
    const [partners, setPartners] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadPartners()
    }, [])

    const loadPartners = async () => {
        setLoading(true)
        try {
            const data = await usersApi.getUsersByRole('delivery')
            setPartners(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Error loading partners:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleActive = async (userId, currentStatus) => {
        const action = currentStatus ? 'Disable' : 'Enable'
        if (!window.confirm(`Are you sure you want to ${action} this delivery partner?`)) return

        try {
            await usersApi.toggleUserActive(userId)
            loadPartners()
        } catch (err) {
            console.error('Error toggling partner:', err)
            alert(`Failed to ${action} partner`)
        }
    }

    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Delivery Partners</h1>
                <p className="text-gray-500">Manage registered delivery personnel.</p>
            </header>

            {loading ? (
                <div className="py-20 text-center text-gray-400">
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                    Loading...
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {partners.length === 0 ? (
                        <div className="text-center py-20">
                            <span className="text-4xl block mb-4">🛵</span>
                            <p className="text-gray-500">No delivery partners found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="p-4">Name/Phone</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {partners.map((partner) => (
                                        <tr key={partner.id} className="hover:bg-gray-50/50">
                                            <td className="p-4">
                                                <div className="font-bold text-gray-900">{partner.name || 'Unknown Name'}</div>
                                                <div className="text-xs text-gray-500">{partner.phone}</div>
                                            </td>
                                            <td className="p-4 text-gray-600">{partner.email}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${partner.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {partner.is_active ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleToggleActive(partner.id, partner.is_active)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${partner.is_active
                                                            ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                        }`}
                                                >
                                                    {partner.is_active ? 'Disable' : 'Enable Access'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
