/**
 * k6 Load Test — Admin API Endpoints
 *
 * Run:  k6 run k6_admin.js --env BASE_URL=http://localhost:8000
 *
 * Targets:
 *   - p95 response < 500ms
 *   - error rate < 1%
 *   - 200 virtual users sustained for 60s
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const adminOverview = new Trend('admin_overview_duration')
const adminOrders = new Trend('admin_orders_duration')
const adminUsers = new Trend('admin_users_duration')
const adminHealth = new Trend('admin_health_duration')

export const options = {
    scenarios: {
        // Ramp-up load test
        load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '15s', target: 50 },   // warm up
                { duration: '30s', target: 200 },   // peak
                { duration: '15s', target: 0 },     // cool down
            ],
        },
        // Sustained spike test
        spike_test: {
            executor: 'constant-vus',
            vus: 100,
            duration: '60s',
            startTime: '65s',  // runs after load test
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<500'],  // 95th percentile < 500ms
        errors: ['rate<0.01'],              // < 1% error rate
    },
}

const BASE = __ENV.BASE_URL || 'http://localhost:8000'

// Simulated admin JWT — replace with a valid token for real tests
const HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${__ENV.ADMIN_TOKEN || 'test-admin-token'}`,
}

export default function () {
    // 1. Overview endpoint (most frequently hit)
    {
        const res = http.get(`${BASE}/admin/overview/`, { headers: HEADERS })
        check(res, { 'overview 200': (r) => r.status === 200 })
        errorRate.add(res.status !== 200)
        adminOverview.add(res.timings.duration)
    }

    sleep(0.5)

    // 2. Orders list
    {
        const res = http.get(`${BASE}/admin/orders/`, { headers: HEADERS })
        check(res, { 'orders 200': (r) => r.status === 200 })
        errorRate.add(res.status !== 200)
        adminOrders.add(res.timings.duration)
    }

    sleep(0.3)

    // 3. Users list
    {
        const res = http.get(`${BASE}/admin/users/`, { headers: HEADERS })
        check(res, { 'users 200': (r) => r.status === 200 })
        errorRate.add(res.status !== 200)
        adminUsers.add(res.timings.duration)
    }

    sleep(0.3)

    // 4. System health
    {
        const res = http.get(`${BASE}/admin/system-health/`, { headers: HEADERS })
        check(res, { 'health 200': (r) => r.status === 200 })
        errorRate.add(res.status !== 200)
        adminHealth.add(res.timings.duration)
    }

    sleep(0.5)

    // 5. Quick search (simulates command palette usage)
    {
        const q = ['rice', 'milk', 'bread', 'oil', 'sugar'][Math.floor(Math.random() * 5)]
        const res = http.get(`${BASE}/admin/search/?q=${q}`, { headers: HEADERS })
        check(res, { 'search 200': (r) => r.status === 200 })
        errorRate.add(res.status !== 200)
    }

    sleep(0.2)

    // 6. Analytics
    {
        const res = http.get(`${BASE}/admin/analytics/`, { headers: HEADERS })
        check(res, { 'analytics 200': (r) => r.status === 200 })
        errorRate.add(res.status !== 200)
    }

    sleep(0.5)
}

/**
 * Expected output (healthy system):
 *
 * ✓ overview 200
 * ✓ orders 200
 * ✓ users 200
 * ✓ health 200
 * ✓ search 200
 * ✓ analytics 200
 *
 * http_req_duration..............: avg=45ms  p(95)=120ms  p(99)=250ms
 * errors........................: 0.00%
 */
