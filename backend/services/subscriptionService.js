/**
 * Subscription Service
 * Central utility for calculating user entitlements and managing subscription logic
 */

const { db, admin } = require('../config/firebase');

const DEFAULT_FREE_STORAGE_GB = 15;
const GRACE_PERIOD_DAYS = 3;

/**
 * Get all active subscriptions for a user
 */
const getUserActiveSubscriptions = async (userId) => {
    const now = admin.firestore.Timestamp.now();

    const subsSnap = await db.collection('userSubscriptions')
        .where('userId', '==', userId)
        .where('status', 'in', ['active', 'grace_period'])
        .get();

    const subscriptions = [];
    for (const doc of subsSnap.docs) {
        const data = doc.data();
        // Double-check expiry (grace period has different expiry)
        const effectiveExpiry = data.status === 'grace_period'
            ? data.gracePeriodEndDate
            : data.expiryDate;

        if (effectiveExpiry && effectiveExpiry.toMillis() > now.toMillis()) {
            subscriptions.push({ id: doc.id, ...data });
        }
    }

    return subscriptions;
};

/**
 * Get user's calculated entitlements based on active subscriptions
 */
const getUserEntitlements = async (userId) => {
    const subscriptions = await getUserActiveSubscriptions(userId);

    // Base entitlements (free tier)
    const entitlements = {
        subscriptionTier: 0,
        subscriptionName: 'Free',
        storageGB: DEFAULT_FREE_STORAGE_GB,
        blueTick: false,
        goldTick: false,
        noAds: false,
        engagementBoost: 1.0,
        bioLinksLimit: 0,
        captionLinksLimit: 0,
        customTheme: false,
        activeSubscriptions: [],
        expiryDate: null
    };

    if (subscriptions.length === 0) {
        return entitlements;
    }

    // Fetch plan details for each subscription
    let highestTierPlan = null;
    let highestTier = 0;
    let totalAddonStorage = 0;

    for (const sub of subscriptions) {
        const planSnap = await db.collection('subscriptionPlans').doc(sub.planId).get();
        if (!planSnap.exists) continue;

        const plan = planSnap.data();

        if (plan.type === 'storage_addon') {
            totalAddonStorage += plan.storageGB || 0;
        } else if (plan.type === 'subscription') {
            const tier = plan.tier || 0;
            if (tier > highestTier) {
                highestTier = tier;
                highestTierPlan = { ...plan, id: planSnap.id, subscriptionId: sub.id, expiryDate: sub.expiryDate };
            }
        }

        entitlements.activeSubscriptions.push({
            id: sub.id,
            planId: sub.planId,
            planName: plan.name,
            type: plan.type,
            expiryDate: sub.expiryDate?.toDate(),
            status: sub.status
        });
    }

    // Apply highest tier plan features
    if (highestTierPlan) {
        const features = highestTierPlan.features || {};
        entitlements.subscriptionTier = highestTier;
        entitlements.subscriptionName = highestTierPlan.name;
        entitlements.storageGB = DEFAULT_FREE_STORAGE_GB + (highestTierPlan.storageGB || 0) + totalAddonStorage;
        entitlements.blueTick = features.blueTick || false;
        entitlements.goldTick = features.goldTick || false;
        entitlements.noAds = features.noAds || false;
        entitlements.engagementBoost = features.engagementBoost || 1.0;
        entitlements.bioLinksLimit = features.bioLinksLimit || 0;
        entitlements.captionLinksLimit = features.captionLinksLimit || 0;
        entitlements.customTheme = features.customTheme || false;
        entitlements.expiryDate = highestTierPlan.expiryDate?.toDate();
    } else if (totalAddonStorage > 0) {
        // Only storage addons active
        entitlements.storageGB = DEFAULT_FREE_STORAGE_GB + totalAddonStorage;
    }

    // Add alias for consistency
    entitlements.totalStorageGB = entitlements.storageGB;

    return entitlements;
};

/**
 * Get user's total private storage used (in GB)
 */
const getUserStorageUsed = async (userId) => {
    let totalBytes = 0;

    // Private reels
    const reelsSnap = await db.collection('reels')
        .where('userId', '==', userId)
        .where('isPrivate', '==', true)
        .get();

    reelsSnap.forEach(doc => {
        totalBytes += doc.data().fileSizeBytes || 0;
    });

    // Private videos (same collection, different contentType)
    // Already included if in reels collection

    // Channel content - get user's channels first
    const channelsSnap = await db.collection('channels')
        .where('creatorId', '==', userId)
        .get();

    for (const channelDoc of channelsSnap.docs) {
        const contentSnap = await db.collection('channelContent')
            .where('channelId', '==', channelDoc.id)
            .get();

        contentSnap.forEach(doc => {
            totalBytes += doc.data().fileSizeBytes || 0;
        });
    }

    return {
        bytes: totalBytes,
        gb: totalBytes / (1024 * 1024 * 1024),
        formatted: formatStorageSize(totalBytes)
    };
};

/**
 * Check if user has enough storage for a new upload
 */
const checkStorageQuota = async (userId, fileSizeBytes) => {
    const entitlements = await getUserEntitlements(userId);
    const usage = await getUserStorageUsed(userId);

    const limitBytes = entitlements.storageGB * 1024 * 1024 * 1024;
    const newTotal = usage.bytes + fileSizeBytes;

    return {
        allowed: newTotal <= limitBytes,
        currentUsageBytes: usage.bytes,
        currentUsageGB: usage.gb,
        limitGB: entitlements.storageGB,
        afterUploadGB: newTotal / (1024 * 1024 * 1024),
        remainingGB: (limitBytes - usage.bytes) / (1024 * 1024 * 1024)
    };
};

/**
 * Calculate which content items need to be locked after subscription expiration
 * Uses LIFO (Last In, First Out) - newest content locked first
 */
const calculateContentToLock = async (userId, newStorageLimitGB) => {
    const usage = await getUserStorageUsed(userId);
    const limitBytes = newStorageLimitGB * 1024 * 1024 * 1024;

    if (usage.bytes <= limitBytes) {
        return { needsLocking: false, itemsToLock: [] };
    }

    const excessBytes = usage.bytes - limitBytes;

    // Fetch all private content sorted by createdAt DESC (newest first)
    const allContent = [];

    const reelsSnap = await db.collection('reels')
        .where('userId', '==', userId)
        .where('isPrivate', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

    reelsSnap.forEach(doc => {
        const data = doc.data();
        allContent.push({
            id: doc.id,
            collection: 'reels',
            fileSizeBytes: data.fileSizeBytes || 0,
            createdAt: data.createdAt
        });
    });

    // Get channel content
    const channelsSnap = await db.collection('channels')
        .where('creatorId', '==', userId)
        .get();

    for (const channelDoc of channelsSnap.docs) {
        const contentSnap = await db.collection('channelContent')
            .where('channelId', '==', channelDoc.id)
            .orderBy('createdAt', 'desc')
            .get();

        contentSnap.forEach(doc => {
            const data = doc.data();
            allContent.push({
                id: doc.id,
                collection: 'channelContent',
                fileSizeBytes: data.fileSizeBytes || 0,
                createdAt: data.createdAt
            });
        });
    }

    // Sort all by createdAt DESC
    allContent.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
    });

    // Select items to lock until we've covered the excess
    const itemsToLock = [];
    let lockedBytes = 0;

    for (const item of allContent) {
        if (lockedBytes >= excessBytes) break;

        itemsToLock.push(item);
        lockedBytes += item.fileSizeBytes;
    }

    return {
        needsLocking: true,
        excessBytes,
        itemsToLock,
        totalItemsToLock: itemsToLock.length,
        bytesToLock: lockedBytes
    };
};

/**
 * Lock specified content items
 */
const lockContentItems = async (itemsToLock, reason = 'subscription_expired') => {
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();

    for (const item of itemsToLock) {
        const ref = db.collection(item.collection).doc(item.id);
        batch.update(ref, {
            isLocked: true,
            lockedAt: now,
            lockReason: reason
        });
    }

    await batch.commit();
    return itemsToLock.length;
};

/**
 * Unlock all content for a user (when subscription renewed)
 */
const unlockAllContent = async (userId) => {
    const batch = db.batch();
    let unlocked = 0;

    // Unlock reels
    const reelsSnap = await db.collection('reels')
        .where('userId', '==', userId)
        .where('isLocked', '==', true)
        .get();

    reelsSnap.forEach(doc => {
        batch.update(doc.ref, {
            isLocked: false,
            lockedAt: null,
            lockReason: null
        });
        unlocked++;
    });

    // Unlock channel content
    const channelsSnap = await db.collection('channels')
        .where('creatorId', '==', userId)
        .get();

    for (const channelDoc of channelsSnap.docs) {
        const contentSnap = await db.collection('channelContent')
            .where('channelId', '==', channelDoc.id)
            .where('isLocked', '==', true)
            .get();

        contentSnap.forEach(doc => {
            batch.update(doc.ref, {
                isLocked: false,
                lockedAt: null,
                lockReason: null
            });
            unlocked++;
        });
    }

    if (unlocked > 0) {
        await batch.commit();
    }

    return unlocked;
};

/**
 * Get verification type based on tier
 */
const getVerificationType = (tier) => {
    switch (tier) {
        case 3: return 'gold';
        case 2: return 'blue';
        default: return 'none';
    }
};

/**
 * Format storage size for display
 */
const formatStorageSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/**
 * Update user's subscription-related cached fields
 */
const updateUserSubscriptionCache = async (userId) => {
    const entitlements = await getUserEntitlements(userId);
    const verificationType = getVerificationType(entitlements.subscriptionTier);

    await db.collection('users').doc(userId).update({
        currentSubscriptionTier: entitlements.subscriptionTier,
        currentStorageLimit: entitlements.storageGB,
        verificationType,
        lastSubscriptionCheck: admin.firestore.FieldValue.serverTimestamp()
    });

    return entitlements;
};

module.exports = {
    DEFAULT_FREE_STORAGE_GB,
    GRACE_PERIOD_DAYS,
    getUserActiveSubscriptions,
    getUserEntitlements,
    getUserStorageUsed,
    checkStorageQuota,
    calculateContentToLock,
    lockContentItems,
    unlockAllContent,
    getVerificationType,
    formatStorageSize,
    updateUserSubscriptionCache
};
