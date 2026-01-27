/**
 * Subscription API E2E Test
 * 
 * Tests the actual HTTP endpoints
 * 
 * Run: node scripts/testSubscriptionAPI.js
 */

require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Test auth token (you'll need to replace this with a real token)
let AUTH_TOKEN = null;

const log = {
    success: (msg) => console.log('[PASS]', msg),
    error: (msg) => console.log('[FAIL]', msg),
    info: (msg) => console.log('[INFO]', msg),
    section: (msg) => console.log('\n===', msg, '===\n')
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        testsPassed++;
        log.success(testName);
    } else {
        testsFailed++;
        log.error(testName + ': ' + details);
    }
}

function httpRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (AUTH_TOKEN) {
            options.headers['Authorization'] = 'Bearer ' + AUTH_TOKEN;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

async function runTests() {
    console.log('\n========================================');
    console.log('  SUBSCRIPTION API E2E TESTS');
    console.log('========================================\n');

    try {
        // =========================================
        log.section('TEST 1: Health Check');
        // =========================================

        const health = await httpRequest('GET', '/api/health');
        assert(health.status === 200, 'API health check', 'Status: ' + health.status);
        log.info('API is running');

        // =========================================
        log.section('TEST 2: Get Plans (Public)');
        // =========================================

        const plans = await httpRequest('GET', '/api/subscriptions/plans');

        assert(plans.status === 200, 'GET /api/subscriptions/plans returns 200');
        assert(plans.data.success === true, 'Response has success: true');
        assert(Array.isArray(plans.data.data?.plans), 'Response contains plans array');

        if (plans.data.data?.plans) {
            log.info('Plans found: ' + plans.data.data.plans.length);
            plans.data.data.plans.forEach(p => {
                log.info('  - ' + p.displayName + ' (Tier ' + p.tier + ')');
            });
        }

        assert(plans.data.data?.freeStorageGB === 15, 'Free storage is 15GB');

        // =========================================
        log.section('TEST 3: Protected Endpoints (No Auth)');
        // =========================================

        const noAuth = await httpRequest('GET', '/api/subscriptions/my');
        assert(noAuth.status === 401, 'GET /my without auth returns 401', 'Got: ' + noAuth.status);

        const noAuth2 = await httpRequest('POST', '/api/subscriptions/upgrade', { newPlanId: 'Premium' });
        assert(noAuth2.status === 401, 'POST /upgrade without auth returns 401', 'Got: ' + noAuth2.status);

        // =========================================
        log.section('TEST 4: Webhook Endpoint');
        // =========================================

        // Test webhook without signature (should fail)
        const badWebhook = await httpRequest('POST', '/api/webhooks/razorpay', {
            event: 'subscription.charged',
            payload: {}
        });

        assert(badWebhook.status === 401, 'Webhook without signature returns 401', 'Got: ' + badWebhook.status);

        // =========================================
        log.section('TEST 5: Check Content Locked (Public with optional auth)');
        // =========================================

        const checkLocked = await httpRequest('GET', '/api/subscriptions/check-locked/fake-content-id');

        // Should return 404 for non-existent content
        assert(checkLocked.status === 404, 'Check non-existent content returns 404', 'Got: ' + checkLocked.status);

    } catch (error) {
        log.error('Test error: ' + error.message);
        console.error(error);
    }

    // =========================================
    // RESULTS
    // =========================================

    console.log('\n========================================');
    console.log('  TEST RESULTS');
    console.log('========================================');
    console.log('  Passed: ' + testsPassed);
    console.log('  Failed: ' + testsFailed);
    console.log('  Total:  ' + (testsPassed + testsFailed));
    console.log('========================================\n');

    if (testsFailed === 0) {
        console.log('All API tests passed!\n');
    } else {
        console.log(testsFailed + ' test(s) failed.\n');
    }

    process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
