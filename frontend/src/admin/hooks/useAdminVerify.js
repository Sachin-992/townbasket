/**
 * useAdminVerify — MFA verification hook for sensitive admin actions.
 *
 * Sensitive operations (bulk actions, permission changes) require a short-lived
 * verification token obtained from POST /api/admin/request-verify/.
 *
 * Usage:
 *   const { verifyAndExecute, isVerifying } = useAdminVerify()
 *   verifyAndExecute(async (verifyToken) => {
 *     await bulkApi.bulkShops('approve', ids, verifyToken)
 *   })
 */
import { useState, useCallback } from 'react'
import { adminFetch } from '../api/adminApi'

const VERIFY_ENDPOINT = '/admin/request-verify/'

export function useAdminVerify() {
    const [isVerifying, setIsVerifying] = useState(false)
    const [error, setError] = useState(null)

    /**
     * Request a verify token, then execute the callback with it.
     * @param {(verifyToken: string) => Promise<any>} action - Async callback receiving the token
     * @returns {Promise<any>} Result of the action
     */
    const verifyAndExecute = useCallback(async (action) => {
        setIsVerifying(true)
        setError(null)
        try {
            // Step 1: Request verification token from backend
            const { verify_token } = await adminFetch(VERIFY_ENDPOINT, { method: 'POST' })
            if (!verify_token) throw new Error('Failed to obtain verification token')

            // Step 2: Execute the sensitive action with the token
            const result = await action(verify_token)
            return result
        } catch (err) {
            setError(err.message || 'Verification failed')
            throw err
        } finally {
            setIsVerifying(false)
        }
    }, [])

    return { verifyAndExecute, isVerifying, error }
}
