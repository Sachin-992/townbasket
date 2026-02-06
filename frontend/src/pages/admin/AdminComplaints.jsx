import { useState, useEffect } from 'react'
import { complaintsApi } from '../../lib/api'

export default function AdminComplaints() {
    const [complaints, setComplaints] = useState([])
    const [activeTab, setActiveTab] = useState('pending') // pending | resolved
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadComplaints()
    }, [activeTab])

    const loadComplaints = async () => {
        setLoading(true)
        try {
            const data = await complaintsApi.getAllComplaints(activeTab)
            setComplaints(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Error loading complaints:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleResolve = async (complaintId) => {
        const note = prompt('Add a resolution note (optional):')
        if (note === null) return

        try {
            await complaintsApi.resolveComplaint(complaintId, { admin_note: note })
            loadComplaints()
        } catch (err) {
            console.error('Error resolving complaint:', err)
            alert('Failed to resolve complaint')
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        })
    }

    return (
        <div className="p-4 md:p-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Complaints & Issues</h1>
                    <p className="text-gray-500">Resolve customer and partner grievances.</p>
                </div>

                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 inline-flex">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'pending'
                            ? 'bg-rose-50 text-rose-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Pending Attention
                    </button>
                    <button
                        onClick={() => setActiveTab('resolved')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'resolved'
                            ? 'bg-emerald-50 text-emerald-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Resolved History
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="py-20 text-center text-gray-400">
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                    Loading Issues...
                </div>
            ) : (
                <div className="space-y-4">
                    {complaints.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <span className="text-4xl block mb-4">✨</span>
                            <p className="text-gray-500">No {activeTab} complaints found. Good job!</p>
                        </div>
                    ) : (
                        complaints.map((complaint) => (
                            <div key={complaint.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${complaint.issue_type === 'delivery' ? 'bg-amber-100 text-amber-700' :
                                        complaint.issue_type === 'food_quality' ? 'bg-rose-100 text-rose-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {complaint.issue_type.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-gray-400">{formatDate(complaint.created_at)}</span>
                                </div>

                                <h3 className="text-gray-900 font-medium mb-2">{complaint.description}</h3>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-50">
                                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                                        <span>👤</span>
                                        <span className="font-medium text-gray-700">{complaint.user_name || 'Unknown User'}</span>
                                    </span>
                                    {complaint.user_phone && complaint.user_phone !== '' && (
                                        <a
                                            href={`tel:${complaint.user_phone}`}
                                            className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                                        >
                                            <span>📞</span>
                                            <span className="font-medium">{complaint.user_phone}</span>
                                        </a>
                                    )}
                                    {complaint.order_id && (
                                        <span className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1.5 rounded-lg text-indigo-600 font-medium">
                                            <span>📦</span> Order #{complaint.order_id}
                                        </span>
                                    )}
                                </div>

                                {activeTab === 'pending' ? (
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => handleResolve(complaint.id)}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                                        >
                                            ✅ Mark Resolved
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                                        <p className="text-gray-500 text-xs mb-1 uppercase font-bold">Resolution Note</p>
                                        <p className="text-gray-800">{complaint.admin_note || 'No note provided'}</p>
                                        <p className="text-xs text-gray-400 mt-2 text-right">Resolved at {formatDate(complaint.resolved_at)}</p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
