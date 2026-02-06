import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        // Check if we have a recovery session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // If no session, it might be an invalid or expired link
                // But we should wait a bit as Supabase might still be processing the hash
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabase.auth.getSession()
                    if (!retrySession) {
                        setError('Invalid or expired reset link. Please request a new one.')
                    }
                }, 1000)
            }
        }
        checkSession()
    }, [])

    const handleReset = async (e) => {
        e.preventDefault()
        setError('')

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        })
        setLoading(false)

        if (updateError) {
            setError(updateError.message || 'Failed to update password')
        } else {
            setSuccess(true)
            setTimeout(() => {
                navigate('/login')
            }, 3000)
        }
    }

    return (
        <div className="min-h-screen bg-white grid lg:grid-cols-2 selection:bg-emerald-100">
            {/* Left Side: Visual Hero */}
            <div className="hidden lg:flex relative bg-emerald-600 overflow-hidden flex-col p-12 xl:p-16">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
                </div>

                <div className="relative z-20 flex items-center gap-4 group">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-900/20 group-hover:scale-105 transition-transform duration-300">
                        <span className="text-emerald-600 text-3xl font-black">T</span>
                    </div>
                    <div>
                        <span className="text-3xl font-black tracking-tight text-white block">TownBasket</span>
                        <span className="text-emerald-200 text-sm font-medium tracking-widest uppercase">Security Center</span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center relative z-10 text-white mt-8">
                    <h1 className="text-5xl xl:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
                        Secure your<br />
                        <span className="text-emerald-300">account</span> access.
                    </h1>
                    <p className="text-emerald-100/90 text-xl max-w-lg font-medium leading-relaxed mb-8">
                        Choose a strong password to protect your community connections and personal data.
                    </p>
                </div>

                <div className="relative z-10 pt-8 border-t border-emerald-500/50 text-white mt-auto">
                    <p className="text-sm font-medium opacity-60">© {new Date().getFullYear()} TownBasket. All rights reserved.</p>
                </div>
            </div>

            {/* Right Side: Reset Form */}
            <div className="flex flex-col justify-center items-center p-8 lg:p-12 bg-gray-50/30 overflow-y-auto">
                <div className="w-full max-w-[440px] space-y-6">
                    <div className="text-center lg:text-left space-y-3">
                        <div className="lg:hidden w-16 h-16 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-emerald-200 mb-6">
                            <span className="text-white text-3xl font-black">T</span>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Set New Password</h2>
                        <p className="text-gray-500 text-lg font-medium">Create a new secure password for your account.</p>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden group">
                        {success ? (
                            <div className="text-center py-8 space-y-6 animate-in fade-in zoom-in duration-300">
                                <div className="w-20 h-20 bg-emerald-100 rounded-2xl mx-auto flex items-center justify-center">
                                    <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-gray-900">Success!</h3>
                                    <p className="text-gray-500 font-medium">Your password has been updated. Redirecting to login...</p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleReset} className="space-y-6 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">New Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min 6 characters"
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900 shadow-inner"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900 shadow-inner"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
                                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white h-14 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Updating...</span>
                                        </>
                                    ) : (
                                        <span>Update Password</span>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
