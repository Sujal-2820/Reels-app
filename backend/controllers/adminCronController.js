/**
 * Admin Cron Controller
 * Handles manual triggering of subscription cron jobs
 */

const subscriptionCronService = require('../services/subscriptionCronService');

/**
 * Manually trigger all subscription cron jobs
 * POST /api/admin/cron/run-all
 */
const runAllCronJobs = async (req, res) => {
    try {
        console.log('[Admin] Manually triggering all subscription cron jobs...');
        const result = await subscriptionCronService.runAllCronJobs();

        res.json({
            success: true,
            message: 'Cron jobs executed successfully',
            data: result
        });
    } catch (error) {
        console.error('[Admin] Cron job execution error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to execute cron jobs',
            error: error.message
        });
    }
};

/**
 * Process expired subscriptions only
 * POST /api/admin/cron/process-expired
 */
const processExpiredSubscriptions = async (req, res) => {
    try {
        const result = await subscriptionCronService.processExpiredSubscriptions();
        res.json({
            success: true,
            message: 'Expired subscriptions processed',
            data: result
        });
    } catch (error) {
        console.error('[Admin] Process expired error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process expired subscriptions',
            error: error.message
        });
    }
};

/**
 * Process grace period endings only
 * POST /api/admin/cron/process-grace-period
 */
const processGracePeriodEnded = async (req, res) => {
    try {
        const result = await subscriptionCronService.processGracePeriodEnded();
        res.json({
            success: true,
            message: 'Grace period endings processed',
            data: result
        });
    } catch (error) {
        console.error('[Admin] Process grace period error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process grace period endings',
            error: error.message
        });
    }
};

/**
 * Send expiry reminders only
 * POST /api/admin/cron/send-reminders
 */
const sendExpiryReminders = async (req, res) => {
    try {
        const result = await subscriptionCronService.sendExpiryReminders();
        res.json({
            success: true,
            message: 'Expiry reminders sent',
            data: result
        });
    } catch (error) {
        console.error('[Admin] Send reminders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send expiry reminders',
            error: error.message
        });
    }
};

module.exports = {
    runAllCronJobs,
    processExpiredSubscriptions,
    processGracePeriodEnded,
    sendExpiryReminders
};
