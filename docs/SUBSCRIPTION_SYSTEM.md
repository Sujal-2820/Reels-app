# Subscription System - Complete Design & Implementation Guide

## Overview

This document outlines the complete subscription management system for ReelBox, including:
- Razorpay Subscriptions API integration (autopay)
- Upgrade/Downgrade with proration
- Storage tracking and content locking
- Background job processing for non-blocking operations

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        SUBSCRIPTION SYSTEM                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │   Frontend  │────>│   Backend   │────>│  Razorpay   │           │
│  │   React     │<────│   Express   │<────│  Webhooks   │           │
│  └─────────────┘     └──────┬──────┘     └─────────────┘           │
│                              │                                      │
│                      ┌───────▼───────┐                              │
│                      │   Firestore   │                              │
│                      │  Collections  │                              │
│                      └───────┬───────┘                              │
│                              │                                      │
│                      ┌───────▼───────┐                              │
│                      │  Background   │                              │
│                      │ Job Processor │                              │
│                      └───────────────┘                              │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## Firestore Collections

### subscriptionPlans
```javascript
{
  name: "premium",              // Internal identifier
  displayName: "Premium",       // UI display name
  tier: 2,                      // 0=Free, 1=Basic, 2=Premium, 3=Ultra
  type: "subscription",         // 'subscription' or 'storage_addon'
  billingCycle: "monthly",      // 'monthly' or 'yearly'
  price: 499,                   // Price in INR
  priceYearly: 3999,            // Yearly price (if applicable)
  durationDays: 30,
  durationDaysYearly: 365,
  storageGB: 101,               // Additional storage
  features: {
    blueTick: true,
    goldTick: false,
    noAds: true,
    engagementBoost: 1.25,
    bioLinksLimit: 3,
    captionLinksLimit: 1,
    customTheme: true
  },
  razorpayPlanId: "plan_xyz",   // Razorpay plan ID
  isActive: true,
  isBestValue: true,
  sortOrder: 2
}
```

### userSubscriptions
```javascript
{
  userId: "firebase_uid",
  planId: "doc_id_of_plan",
  planName: "premium",
  planDisplayName: "Premium",
  planType: "subscription",
  planTier: 2,
  billingCycle: "monthly",
  status: "active",             // active, past_due, grace_period, expired, cancelled, upgraded
  razorpaySubscriptionId: "sub_xyz",
  razorpayCustomerId: "cust_abc",
  startDate: Timestamp,
  expiryDate: Timestamp,
  gracePeriodEndDate: Timestamp,
  autoRenew: true,
  storageGB: 101,
  features: {...},
  scheduledChange: {            // For downgrades
    type: "downgrade",
    newPlanId: "basic",
    effectiveDate: Timestamp
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### users (subscription-related fields)
```javascript
{
  // ... existing user fields
  razorpayCustomerId: "cust_abc",
  currentSubscriptionTier: 2,
  currentSubscriptionName: "Premium",
  currentStorageLimit: 116,     // 15 free + 101 from plan
  hasBlueTick: true,
  hasGoldTick: false,
  verificationType: "blue",     // 'none', 'blue', 'gold'
  noAds: true,
  engagementBoost: 1.25,
  bioLinksLimit: 3,
  captionLinksLimit: 1,
  customThemeEnabled: true
}
```

### backgroundJobs
```javascript
{
  type: "update_user_entitlements",     // Job type
  data: { userId: "..." },              // Job-specific data
  status: "pending",                    // pending, processing, completed, failed
  attempts: 0,
  createdAt: Timestamp,
  completedAt: Timestamp,
  lastError: null
}
```

### webhookLogs
```javascript
{
  event: "subscription.charged",
  payload: {...},
  processedAt: Timestamp,
  status: "processed"
}
```

---

## API Endpoints

### Subscription Routes (`/api/subscriptions`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/plans` | No | Get all active plans |
| GET | `/my` | Yes | Get user's subscriptions |
| GET | `/entitlements` | Yes | Get calculated entitlements |
| POST | `/purchase` | Yes | Create one-time order (legacy) |
| POST | `/verify` | Yes | Verify payment (legacy) |
| POST | `/create-recurring` | Yes | Create Razorpay subscription |
| POST | `/upgrade` | Yes | Upgrade to higher tier |
| POST | `/downgrade` | Yes | Schedule downgrade |
| POST | `/cancel` | Yes | Cancel subscription |
| POST | `/proration-preview` | Yes | Preview upgrade cost |
| GET | `/check-locked/:contentId` | Optional | Check if content is locked |

### Webhook Routes (`/api/webhooks`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/razorpay` | Signature | Handle Razorpay webhooks |

---

## Razorpay Webhooks

### Events Handled

| Event | Action |
|-------|--------|
| `subscription.authenticated` | Create subscription record, update entitlements |
| `subscription.activated` | Mark active, handle upgrade completion |
| `subscription.charged` | Extend expiry, log transaction |
| `subscription.pending` | Mark past_due, send reminder |
| `subscription.halted` | Start grace period |
| `subscription.cancelled` | Mark cancelled, recalculate entitlements |
| `subscription.completed` | Process end, lock content if needed |

---

## Background Jobs

### Job Types

| Type | Purpose |
|------|---------|
| `update_user_entitlements` | Recalculate and cache user's entitlements |
| `process_subscription_end` | Handle expired subscription |
| `lock_excess_content` | Lock content exceeding storage limit (LIFO) |
| `unlock_user_content` | Unlock all locked content |
| `send_notification` | Send in-app notification |
| `process_scheduled_downgrade` | Execute scheduled plan change |

### Processing

- Jobs stored in `backgroundJobs` collection
- Processor runs every 10 seconds
- Max 3 retry attempts per job
- Failed jobs logged for review

---

## Proration Calculation

### Upgrade Formula

```
Days used = Total days - Days remaining
Daily rate = Plan price / Total days
Unused credit = Daily rate × Days remaining
Amount to pay = New plan price - Unused credit
```

### Example

```
Current: Basic ₹299/month, subscribed 15 days ago
Remaining: 15 days

Unused credit = ₹299 × (15/30) = ₹149.50
New plan: Premium ₹499/month
User pays: ₹499 - ₹149.50 = ₹349.50
```

---

## Content Locking (LIFO)

### When Locking Occurs

1. Subscription expires after grace period
2. Downgrade takes effect
3. Cancellation completes

### Locking Logic

1. Calculate excess storage (used - new limit)
2. Fetch private content sorted by `createdAt DESC` (newest first)
3. Lock content until excess is covered
4. Send notification to user

### Content Fields

```javascript
{
  isLocked: true,
  lockedAt: Timestamp,
  lockReason: "storage_limit_exceeded"
}
```

---

## Storage Limits

| Plan | Storage |
|------|---------|
| Free | 15 GB |
| Basic | 15 + 50 = **65 GB** |
| Premium | 15 + 101 = **116 GB** |
| Ultra Premium | 15 + 500 = **515 GB** |
| Storage Lite Add-on | +50 GB |
| Storage Plus Add-on | +100 GB |

---

## Files Added/Modified

### New Files

| File | Purpose |
|------|---------|
| `services/razorpaySubscriptionService.js` | Razorpay Subscriptions API integration |
| `services/webhookService.js` | Webhook processing |
| `services/backgroundJobProcessor.js` | Async job processing |
| `controllers/webhookController.js` | Webhook handler |
| `routes/webhookRoutes.js` | Webhook routes |

### Modified Files

| File | Change |
|------|--------|
| `controllers/subscriptionController.js` | Added upgrade/downgrade/cancel endpoints |
| `routes/subscriptionRoutes.js` | Added new route definitions |
| `services/subscriptionService.js` | Added totalStorageGB alias |
| `server.js` | Added webhook routes, started background processor |

---

## Frontend Integration

### Purchase Flow

```javascript
// 1. Create recurring subscription
const response = await subscriptionAPI.createRecurringSubscription(planId, billingCycle);

// 2. Redirect to Razorpay hosted page OR use Razorpay checkout
window.location.href = response.data.shortUrl;

// 3. After payment, Razorpay redirects back + webhook processes
```

### Upgrade Flow

```javascript
// 1. Get proration preview
const preview = await subscriptionAPI.prorationPreview(newPlanId, billingCycle);
// Show: "You'll pay ₹349.50 (₹149.50 credit applied)"

// 2. If user confirms, upgrade
const result = await subscriptionAPI.upgradeSubscription(newPlanId, billingCycle);
```

### Downgrade Flow

```javascript
// 1. Request downgrade (scheduled for end of cycle)
const result = await subscriptionAPI.downgradeSubscription(newPlanId, billingCycle);
// Response includes storage impact warning if applicable
```

---

## Environment Variables Required

```env
RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx  # Optional, uses KEY_SECRET if not set
```

---

## Razorpay Dashboard Setup

1. **Create Plans**: Create plans in Razorpay dashboard matching your tiers
2. **Store Plan IDs**: Update `subscriptionPlans` collection with `razorpayPlanId`
3. **Configure Webhooks**: 
   - URL: `https://your-domain.com/api/webhooks/razorpay`
   - Events: All subscription events
4. **Generate Webhook Secret**: Store in environment variables

---

## Testing

### Test Webhook Locally

```bash
# Use test endpoint in development
curl -X POST http://localhost:5000/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "event": "subscription.authenticated",
    "payload": {
      "subscription": {
        "id": "sub_test123",
        "notes": { "userId": "test_user_id", "planId": "test_plan_id" }
      }
    }
  }'
```

---

## Non-Breaking Guarantees

✅ **Existing payment flow untouched** - `/purchase` and `/verify` still work
✅ **New endpoints are additive** - No existing routes modified
✅ **Background processing** - Heavy operations don't block API
✅ **Graceful degradation** - System works even if processor is down
✅ **Webhook retries** - Failed webhooks are logged for retry
