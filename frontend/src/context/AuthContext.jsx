import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            setLoading(false)
        }).catch((error) => {
            console.error('Session error:', error)
            // Clear any corrupted session
            supabase.auth.signOut()
            setUser(null)
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null)

                if (event === 'SIGNED_OUT') {
                    setUserProfile(null)
                }

                if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
                    // Sync with backend
                    const { usersApi } = await import('../lib/api')
                    usersApi.syncUser({
                        supabase_uid: session.user.id,
                        email: session.user.email,
                        phone: session.user.phone
                    }).catch(err => console.error('Sync failed:', err))
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    // Load user profile from localStorage
    useEffect(() => {
        if (user) {
            const savedProfile = localStorage.getItem(`profile_${user.id}`)
            if (savedProfile) {
                setUserProfile(JSON.parse(savedProfile))
            }
        }
    }, [user])

    // Sign up with email and password
    const signUp = async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name,
                }
            }
        })
        return { data, error }
    }

    // Sign in with email and password
    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { data, error }
    }

    // Sign out
    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (!error) {
            setUser(null)
            setUserProfile(null)
        }
        return { error }
    }

    // Get access token for API calls
    const getAccessToken = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token || null
    }

    // Get current session
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        return session
    }

    // Save user profile
    const saveUserProfile = async (profile) => {
        if (user) {
            // 1. Save to local storage for quick access
            localStorage.setItem(`profile_${user.id}`, JSON.stringify(profile))
            setUserProfile(profile)

            // 2. Persist to Supabase Auth Metadata (Critical for Backend)
            try {
                const { data, error } = await supabase.auth.updateUser({
                    data: {
                        app_role: profile.role, // Use 'app_role' to match middleware requirements
                        full_name: profile.name || user.user_metadata?.full_name
                    }
                })

                if (error) {
                    console.error('Failed to update Supabase metadata:', error)
                } else {
                    console.log('Supabase metadata updated:', data.user.user_metadata)

                    // CRITICAL: Force session refresh to get new JWT with updated roles
                    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
                    if (refreshError) console.error('Token refresh failed:', refreshError)

                    if (session) {
                        console.log('Token refreshed with new metadata')
                        setUser(session.user)
                    }
                }
            } catch (err) {
                console.error('Error saving profile to Supabase:', err)
            }
        }
    }

    // Resend confirmation email
    const resendConfirmationEmail = async (email) => {
        const { data, error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        })
        return { data, error }
    }

    // Reset password
    const resetPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        return { data, error }
    }

    const value = {
        user,
        userProfile,
        setUserProfile: saveUserProfile,
        loading,
        signUp,
        signIn,
        signOut,
        getAccessToken,
        getSession,
        resendConfirmationEmail,
        resetPassword,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
