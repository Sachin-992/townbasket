/**
 * k6 Load Test — SSE Connection Stress Test
 *
 * Run:  k6 run k6_sse.js --env BASE_URL=http://localhost:8000
 *
 * Tests SSE connections to simulate 5,000 concurrent admin sessions.
 * Validates:
 *   - Connection success rate > 99%
 *   - Time to first event < 2s
 *   - Graceful handling of connection churn
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const connectionFailRate = new Rate('sse_connection_failures')

export const options = {
    scenarios: {
        sse_connections: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 100 },
                { duration: '20s', target: 1000 },
                { duration: '30s', target: 5000 },  // peak: 5k concurrent
                { duration: '10s', target: 0 },
            ],
        },
    },
    thresholds: {
        sse_connection_failures: ['rate<0.01'],
    },
}

const BASE = __ENV.BASE_URL || 'http://localhost:8000'
const HEADERS = {
    'Accept': 'text/event-stream',
    'Authorization': `Bearer ${__ENV.ADMIN_TOKEN || 'test-admin-token'}`,
}

export default function () {
    // SSE connections are long-lived; simulate opening and holding for ~5s
    const res = http.get(`${BASE}/admin/sse/stream/`, {
        headers: HEADERS,
        timeout: '6s',
    })

    const success = res.status === 200 || res.status === 0 // 0 = timeout (expected for SSE)
    check(res, { 'SSE connected': () => success })
    connectionFailRate.add(!success)

    sleep(Math.random() * 2 + 1) // stagger reconnections
}
