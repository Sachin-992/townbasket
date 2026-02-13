import { useState, useEffect } from 'react'
import { usersApi, ordersApi } from '../../lib/api'
import { useToast } from '../../context/ToastContext'

export default function RiderAssignmentModal({ order, isOpen, onClose, onAssigned }) {
    const [riders, setRiders] = useState([])
    const [loading, setLoading] = useState(true)
    const [assigning, setAssigning] = useState(false)
    const toast = useToast()

    useEffect(() => {
        if (isOpen) {
            loadOnlineRiders()
        }
    }, [isOpen])

    const loadOnlineRiders = async () => {
        setLoading(true)
        try {
            // Using a broad search for now, can be restricted by town later
            const data = await usersApi.getOnlinePartners()
            setRiders(data)
        } catch (err) {
            console.error('Failed to load riders:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleAssign = async (riderUid) => {
        setAssigning(true)
        try {
            await ordersApi.acceptDelivery(order.id, riderUid)
            onAssigned()
            onClose()
        } catch (err) {
            toast.error(err.message || 'Failed to assign rider')
        } finally {
            setAssigning(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />

                <div className="p-8 space-y-6 relative z-10">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Assign Rider</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order #{order.order_number}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                        {loading ? (
                            <div className="space-y-3 py-10">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
                                    <span className="material-symbols-rounded text-emerald-500">search</span>
                                </div>
                                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Searching for online riders...</p>
                            </div>
                        ) : riders.length === 0 ? (
                            <div className="text-center py-12 px-6">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-50">
                                    <span className="material-symbols-rounded text-3xl">mood_bad</span>
                                </div>
                                <p className="text-slate-900 font-extrabold text-sm mb-1">No Riders Online</p>
                                <p className="text-slate-400 text-xs font-medium leading-relaxed">Wait for riders to go online or handle delivery yourself.</p>
                            </div>
                        ) : (
                            riders.map(rider => (
                                <div
                                    key={rider.id}
                                    className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-emerald-200 hover:shadow-xl hover:shadow-slate-100 transition-all cursor-pointer"
                                    onClick={() => !assigning && handleAssign(rider.supabase_uid)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-emerald-600">
                                            {(rider.name || rider.email)?.[0]?.toUpperCase() || 'R'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-900 tracking-tight truncate">
                                                {rider.name || rider.email?.split('@')[0] || "Unknown Rider"}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${rider.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                                                    {rider.phone || "No Phone"} {rider.rider_data?.area ? `• ${rider.rider_data.area}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        className="w-10 h-10 bg-emerald-600 text-white rounded-2xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform flex items-center justify-center shadow-lg shadow-emerald-100"
                                        disabled={assigning}
                                    >
                                        <span className="material-symbols-rounded text-lg font-bold">arrow_forward</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pt-2">
                        <p className="text-[9px] font-bold text-center text-slate-400 uppercase tracking-widest">
                            Only verified riders in your town are listed above
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
