# 🎬 REEL BOX - Complete Platform Documentation

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Backend API](#backend-api)
6. [Frontend Structure](#frontend-structure)
7. [Features & Modules](#features--modules)
8. [UI/UX Design System](#uiux-design-system)
9. [Authentication & Security](#authentication--security)
10. [File Upload & Storage](#file-upload--storage)
11. [Subscription System](#subscription-system)
12. [Admin Panel](#admin-panel)

---

## Platform Overview

**Reel Box** is a modern, Instagram-like short-form video sharing platform with advanced features including:
- **Public & Private Content**: Users can upload public reels (max 120s) or private videos (unlimited duration)
- **Dual Content Types**: Reels (short-form) and Videos (long-form)
- **Channels**: Community-based content sharing (public/private channels)
- **Subscription System**: Tiered storage plans with Razorpay integration
- **Referral System**: User growth through referral codes
- **Admin Dashboard**: Comprehensive content and user management

---

## Technology Stack

### Backend
```json
{
  "runtime": "Node.js (Express 5.2.1)",
  "database": "Firebase Firestore",
  "authentication": "Firebase Auth",
  "storage": "Cloudinary (Videos, Images, Avatars)",
  "payments": "Razorpay (Test Mode)",
  "dependencies": {
    "express": "^5.2.1",
    "firebase-admin": "^13.6.0",
    "cloudinary": "^2.8.0",
    "razorpay": "^2.9.6",
    "multer": "^2.0.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.3",
    "uuid": "^13.0.0"
  }
}
```

### Frontend
```json
{
  "framework": "React 19.2.0",
  "routing": "React Router DOM 7.12.0",
  "build": "Vite 7.2.4",
  "http": "Axios 1.13.2",
  "authentication": "Firebase 12.7.0",
  "styling": "Vanilla CSS with CSS Variables"
}
```

### Infrastructure
- **Hosting**: Vercel (Frontend), Custom Backend Server
- **CDN**: Cloudinary for media delivery
- **Database**: Firebase Firestore (NoSQL)
- **Environment**: Development & Production configs

---

## Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  Firebase    │  │   Razorpay   │      │
│  │   (Vite)     │  │   Auth SDK   │  │   Checkout   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │ HTTP/REST        │ Firebase Auth    │ Payment
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────┐
│                      API GATEWAY                             │
│                   Express.js Server                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware: CORS, Auth, Upload, Error Handling      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │  Auth   │ │  Reels  │ │ Channels│ │  Admin  │          │
│  │ Routes  │ │ Routes  │ │ Routes  │ │ Routes  │          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
└───────┼───────────┼───────────┼───────────┼────────────────┘
        │           │           │           │
┌───────▼───────────▼───────────▼───────────▼────────────────┐
│                    BUSINESS LOGIC LAYER                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Controllers  │  │   Services   │  │  Validators  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────┬──────────────────┬──────────────────┬────────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼────────────┐
│                     DATA LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Firebase   │  │  Cloudinary  │  │  Razorpay    │     │
│  │  Firestore   │  │   Storage    │  │   Gateway    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow
1. **Client** → React UI sends HTTP request
2. **API Gateway** → Express server receives request
3. **Middleware** → Auth verification, CORS, body parsing
4. **Router** → Routes to appropriate controller
5. **Controller** → Business logic execution
6. **Service** → External API calls (Firebase, Cloudinary, Razorpay)
7. **Response** → JSON response back to client

---

## Database Schema

### Firestore Collections

#### 1. **users**
```javascript
{
  id: "user_firebase_uid",
  name: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  profilePic: "cloudinary_url",
  bio: "Content creator",
  verificationType: "none" | "blue" | "gold",
  followersCount: 0,
  followingCount: 0,
  dailyUploadCount: 0,
  lastUploadDate: Timestamp,
  storageUsed: 0, // bytes
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 2. **reels**
```javascript
{
  id: "auto_generated",
  userId: "creator_id",
  contentType: "reel" | "video",
  
  // Content
  caption: "string (max 150 chars for public reels)",
  title: "string (for videos/private)",
  description: "string (for videos/private)",
  category: "string (for videos/private)",
  
  // Media
  videoUrl: "cloudinary_url",
  posterUrl: "cloudinary_url",
  cloudinaryPublicId: "string",
  posterPublicId: "string",
  duration: 0, // seconds
  videoSize: 0, // bytes
  
  // Privacy & Access
  isPrivate: false,
  accessToken: "uuid_for_private",
  isLocked: false,
  lockReason: "subscription_expired",
  
  // Engagement
  likesCount: 0,
  commentsCount: 0,
  viewsCount: 0,
  sharesCount: 0,
  viralityScore: 0,
  likes: ["userId1", "userId2"],
  savedBy: ["userId1", "userId2"],
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 3. **channels**
```javascript
{
  id: "auto_generated",
  creatorId: "user_id",
  name: "Channel Name",
  description: "Channel description",
  profilePic: "cloudinary_url",
  
  // Privacy
  isPrivate: false,
  accessToken: "uuid_for_private",
  
  // Status
  isActive: true,
  isBanned: false,
  status: "active",
  
  // Stats
  memberCount: 0,
  reportCount: 0,
  
  createdAt: Timestamp
}
```

#### 4. **channelMembers**
```javascript
{
  id: "channelId_userId",
  channelId: "channel_id",
  userId: "user_id",
  joinedAt: Timestamp
}
```

#### 5. **channelPosts**
```javascript
{
  id: "auto_generated",
  channelId: "channel_id",
  creatorId: "user_id",
  content: {
    text: "Post text",
    images: [{url: "cloudinary_url", size: 0, publicId: ""}],
    videos: [{url: "cloudinary_url", size: 0, publicId: ""}],
    files: []
  },
  createdAt: Timestamp
}
```

#### 6. **comments**
```javascript
{
  id: "auto_generated",
  reelId: "reel_id",
  userId: "user_id",
  text: "Comment text",
  createdAt: Timestamp
}
```

#### 7. **follows**
```javascript
{
  id: "followerId_followingId",
  followerId: "user_id",
  followingId: "user_id",
  createdAt: Timestamp
}
```

#### 8. **subscriptionPlans**
```javascript
{
  id: "auto_generated",
  name: "basic" | "pro" | "premium",
  displayName: "Basic Plan",
  tier: 1, // 1=basic, 2=pro, 3=premium
  type: "subscription" | "storage_addon",
  
  // Pricing
  billingCycle: "monthly" | "yearly",
  price: 99, // INR in paise
  priceYearly: 999,
  durationDays: 30,
  durationDaysYearly: 365,
  
  // Features
  storageGB: 50,
  features: ["Feature 1", "Feature 2"],
  
  // Display
  isBestValue: false,
  sortOrder: 0,
  isActive: true,
  
  createdAt: Timestamp
}
```

#### 9. **userSubscriptions**
```javascript
{
  id: "auto_generated",
  userId: "user_id",
  planId: "plan_id",
  planType: "subscription" | "storage_addon",
  planTier: 1,
  
  // Billing
  billingCycle: "monthly" | "yearly",
  
  // Status
  status: "active" | "expired" | "cancelled" | "upgraded",
  startDate: Timestamp,
  expiryDate: Timestamp,
  gracePeriodEndDate: Timestamp,
  autoRenew: true,
  
  // Payment
  paymentId: "razorpay_order_id",
  upgradedTo: "new_plan_id",
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 10. **subscriptionPayments**
```javascript
{
  id: "razorpay_order_id",
  userId: "user_id",
  planId: "plan_id",
  billingCycle: "monthly",
  durationDays: 30,
  amount: 9900, // paise
  
  // Razorpay
  razorpayOrderId: "order_id",
  razorpayPaymentId: "payment_id",
  razorpaySignature: "signature",
  
  status: "CREATED" | "SUCCESS" | "FAILED",
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 11. **referrals**
```javascript
{
  id: "auto_generated",
  referrerId: "user_id",
  referralCode: "unique_code",
  referredUsers: ["userId1", "userId2"],
  totalReferrals: 0,
  createdAt: Timestamp
}
```

#### 12. **supportTickets**
```javascript
{
  id: "auto_generated",
  userId: "user_id",
  subject: "Issue subject",
  description: "Issue description",
  category: "technical" | "billing" | "content" | "other",
  status: "open" | "in_progress" | "resolved" | "closed",
  priority: "low" | "medium" | "high",
  messages: [{
    senderId: "user_id",
    message: "text",
    timestamp: Timestamp
  }],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 13. **reports**
```javascript
{
  id: "auto_generated",
  reporterId: "user_id",
  targetType: "reel" | "user" | "channel" | "comment",
  targetId: "target_id",
  reason: "spam" | "inappropriate" | "harassment" | "other",
  description: "Report details",
  status: "pending" | "reviewed" | "action_taken" | "dismissed",
  createdAt: Timestamp
}
```

#### 14. **appSettings**
```javascript
{
  id: "global",
  maxChannelPostsPerDay: 10,
  maxImageSize: 5242880, // 5MB
  maxVideoSize: 104857600, // 100MB
  maxFileSize: 10485760, // 10MB
  maxFilesPerPost: 10,
  allowChannels: true,
  updatedAt: Timestamp
}
```

---

## Backend API

### Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-backend-url.com/api`

### API Endpoints

#### Authentication (`/api/auth`)
```javascript
POST   /auth/register          // Legacy (Firebase handles this)
POST   /auth/login             // Legacy (Firebase handles this)
GET    /users/me               // Get current user profile
GET    /users/profile/:id      // Get public user profile
PUT    /users/me               // Update profile (with avatar upload)
GET    /users/check-username/:username  // Check username availability
```

#### Reels (`/api/reels`)
```javascript
POST   /reels                  // Upload reel (multipart/form-data)
GET    /reels/feed             // Get feed (paginated, ?cursor=0&limit=10&type=reel&category=All)
GET    /reels/:id              // Get single reel
GET    /reels/private/:token   // Get private reel by access token
GET    /reels/user/:userId     // Get user's reels
GET    /reels/my               // Get my reels
POST   /reels/:id/like         // Toggle like
POST   /reels/:id/save         // Toggle save
GET    /reels/my/saved         // Get saved reels
PUT    /reels/:id              // Update reel metadata
DELETE /reels/:id              // Delete reel
```

#### Comments (`/api/comments`)
```javascript
POST   /comments               // Create comment (body: {reelId, text})
GET    /comments/:reelId       // Get reel comments
DELETE /comments/:id           // Delete comment
```

#### Channels (`/api/channels`)
```javascript
POST   /channels               // Create channel
GET    /channels               // Get all channels (paginated)
GET    /channels/:id           // Get channel by ID
POST   /channels/:id/join      // Join channel
POST   /channels/:id/leave     // Leave channel
POST   /channels/:id/posts     // Create channel post
GET    /channels/:id/posts     // Get channel posts
DELETE /channels/:id           // Delete channel
GET    /channels/my            // Get my channels
GET    /channels/joined        // Get joined channels
```

#### Follow (`/api/follow`)
```javascript
POST   /follow/:userId         // Follow user
DELETE /follow/:userId         // Unfollow user
GET    /follow/followers/:userId  // Get followers
GET    /follow/following/:userId  // Get following
```

#### Subscriptions (`/api/subscriptions`)
```javascript
GET    /subscriptions/plans    // Get all active plans
GET    /subscriptions/my       // Get my subscriptions
GET    /subscriptions/entitlements  // Get entitlements
POST   /subscriptions/purchase // Create purchase order
POST   /subscriptions/verify   // Verify payment
GET    /subscriptions/check-locked/:contentId  // Check if content is locked

// Recurring Subscriptions (Razorpay)
POST   /subscriptions/create-recurring  // Create recurring subscription
POST   /subscriptions/upgrade  // Upgrade subscription
POST   /subscriptions/downgrade  // Schedule downgrade
POST   /subscriptions/cancel   // Cancel subscription
POST   /subscriptions/proration-preview  // Get proration preview
```

#### Payments (`/api/payments`)
```javascript
POST   /payments/create-order  // Create Razorpay order
POST   /payments/verify        // Verify payment
GET    /payments/history       // Get payment history
```

#### Referrals (`/api/referrals`)
```javascript
GET    /referrals/my           // Get my referral info
POST   /referrals/validate/:code  // Validate referral code
GET    /referrals/stats        // Get referral stats
```

#### Support (`/api/support`)
```javascript
POST   /support/tickets        // Create support ticket
GET    /support/tickets        // Get my tickets
GET    /support/tickets/:id    // Get ticket details
POST   /support/tickets/:id/messages  // Add message to ticket
PUT    /support/tickets/:id    // Update ticket status
```

#### Reports (`/api/reports`)
```javascript
POST   /reports                // Create report
GET    /reports/my             // Get my reports
```

#### Search (`/api/search`)
```javascript
GET    /search?q=query&type=all  // Search (type: all|users|reels|channels)
```

#### Admin (`/api/admin`)
```javascript
// Auth
POST   /admin/login            // Admin login (BYPASS ACTIVE)

// Users
GET    /admin/users            // Get all users
GET    /admin/users/:id        // Get user details
PUT    /admin/users/:id        // Update user
DELETE /admin/users/:id        // Delete user

// Reels
GET    /admin/reels            // Get all reels
DELETE /admin/reels/:id        // Delete reel
PUT    /admin/reels/:id/feature  // Feature reel

// Channels
GET    /admin/channels         // Get all channels
PUT    /admin/channels/:id/ban  // Ban/unban channel

// Comments
GET    /admin/comments         // Get all comments
DELETE /admin/comments/:id     // Delete comment

// Plans
GET    /admin/plans            // Get all plans
POST   /admin/plans            // Create plan
PUT    /admin/plans/:id        // Update plan
DELETE /admin/plans/:id        // Delete plan

// Subscriptions
GET    /admin/subscriptions    // Get all subscriptions
GET    /admin/transactions     // Get all transactions

// Support
GET    /admin/support          // Get all tickets
PUT    /admin/support/:id      // Update ticket

// Reports
GET    /admin/reports          // Get all reports
PUT    /admin/reports/:id      // Update report status

// Settings
GET    /admin/settings         // Get app settings
PUT    /admin/settings         // Update app settings

// Analytics
GET    /admin/analytics        // Get platform analytics
```

#### Webhooks (`/api/webhooks`)
```javascript
POST   /webhooks/razorpay      // Razorpay webhook handler
```

---

## Frontend Structure

### Directory Structure
```
frontend/src/
├── assets/              # Static assets
├── components/          # Reusable components
│   ├── common/          # Shared components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Toast.jsx
│   │   ├── ContentSwitch.jsx
│   │   └── ...
│   ├── layout/          # Layout components
│   │   ├── Header.jsx
│   │   ├── BottomNav.jsx
│   │   ├── Sidebar.jsx
│   │   └── ...
│   ├── reel/            # Reel-specific components
│   │   ├── ReelCard.jsx
│   │   ├── ReelPlayer.jsx
│   │   ├── ReelActions.jsx
│   │   └── ...
│   └── video/           # Video-specific components
│       ├── VideoCard.jsx
│       ├── VideoPlayer.jsx
│       └── ...
├── config/              # Configuration
│   └── firebase.js
├── context/             # React Context
│   ├── AuthContext.jsx
│   ├── ThemeContext.jsx
│   ├── AppSettingsContext.jsx
│   └── ToastContext.jsx
├── pages/               # Page components
│   ├── Home/
│   ├── Login/
│   ├── Upload/
│   ├── Profile/
│   ├── ReelView/
│   ├── Video/
│   ├── Channels/
│   ├── Settings/
│   ├── Support/
│   ├── Admin/
│   └── ...
├── services/            # API services
│   ├── api.js
│   └── firebase.js
├── App.jsx              # Main app component
├── App.css              # App-specific styles
├── index.css            # Global styles
└── main.jsx             # Entry point
```

### Routing Structure
```javascript
/                          // Home (Feed)
/login                     // Login/Signup
/signup                    // Signup
/forgot-password           // Password reset

// Content
/reel/:id                  // Public reel view
/reel/private/:token       // Private reel view
/video/:id                 // Public video view
/video/private/:token      // Private video view

// Channels
/channels                  // Explore channels
/channels/:id              // Channel view

// User
/profile                   // Own profile
/profile/:userId           // User profile
/upload                    // Upload content
/upload/success            // Upload success
/private-content           // Private content library

// Settings
/settings                  // Settings home
/settings/profile          // Manage profile
/settings/security         // Security settings
/settings/notifications    // Notification preferences
/settings/language         // Language settings
/settings/analytics        // User analytics
/settings/subscription     // Subscription management
/settings/private-content  // Private content settings
/settings/about            // About
/settings/help             // Help

// Subscription
/plans                     // View plans
/subscription-plans        // Subscription plans

// Support
/support                   // Support tickets
/support/:ticketId         // Ticket details

// Admin
/admin/dashboard           // Admin dashboard
/admin/analytics           // Platform analytics
/admin/users               // User management
/admin/users/:userId       // User details
/admin/channels            // Channel management
/admin/referrals           // Referral management
/admin/reels               // Reel management
/admin/videos              // Video management
/admin/private             // Private content
/admin/reels/viral         // Viral content
/admin/reports             // Reports
/admin/comments            // Comment moderation
/admin/plans               // Plan management
/admin/transactions        // Transactions
/admin/subscribers         // Subscribers
/admin/support             // Support tickets
/admin/support/:ticketId   // Ticket details
/admin/settings            // App settings

// Other
/onboarding                // Complete profile
/r/:code                   // Referral gate
```

---

## Features & Modules

### 1. **Content Management**

#### Reels (Short-form)
- **Public Reels**: Max 120 seconds, visible to all
- **Daily Limit**: 5 public reels per day
- **Features**:
  - Video trimming (start/end offset)
  - Custom cover image or auto-generated thumbnail
  - Caption (max 150 chars)
  - Like, comment, save, share
  - Virality score algorithm

#### Videos (Long-form)
- **No Time Limit**: Unlimited duration
- **Metadata**: Title, description, category
- **Same Features**: Like, comment, save, share

#### Private Content
- **Unlimited Duration**: No time restrictions
- **Storage-based**: Counts against user's storage quota
- **Access Control**: Unique access token for sharing
- **Locking**: Content locks when subscription expires

### 2. **Channels**

#### Public Channels
- **Limit**: 10 per user
- **Features**:
  - Text, images, videos
  - Member system
  - Daily post limit (configurable)
  - Creator-only posting

#### Private Channels
- **Limit**: 50 per user
- **Access**: Token-based access
- **Same Features**: As public channels

### 3. **Subscription System**

#### Free Tier
- **Storage**: 15 GB for private content
- **Public Reels**: 5 per day
- **Videos**: Unlimited (public)

#### Paid Plans
```javascript
// Example Plans
{
  basic: {
    price: 99/month,
    storage: 50 GB,
    features: ["Ad-free", "Priority support"]
  },
  pro: {
    price: 299/month,
    storage: 200 GB,
    features: ["All Basic", "Analytics", "Verification badge"]
  },
  premium: {
    price: 599/month,
    storage: 500 GB,
    features: ["All Pro", "Custom branding", "API access"]
  }
}
```

#### Features
- **Razorpay Integration**: Secure payments
- **Recurring Billing**: Auto-renewal
- **Proration**: Credit for upgrades
- **Grace Period**: 7 days after expiry
- **Content Locking**: Automatic when storage exceeded

### 4. **Social Features**

#### Follow System
- Follow/unfollow users
- Followers/following lists
- Follow counts

#### Engagement
- **Like**: Heart animation
- **Comment**: Threaded comments
- **Save**: Bookmark content
- **Share**: Generate shareable links

#### Virality Score
```javascript
viralityScore = 
  (views * 0.1) + 
  (likes * 1) + 
  (comments * 2) + 
  (saves * 2) + 
  (shares * 3)
```

### 5. **Referral System**
- Unique referral code per user
- Track referred users
- Referral stats dashboard
- Referral gate for new users

### 6. **Support System**
- Create support tickets
- Category-based routing
- Priority levels
- Real-time messaging
- Admin response system

### 7. **Reporting System**
- Report reels, users, channels, comments
- Reason categories
- Admin review workflow
- Action tracking

### 8. **Search**
- Global search (users, reels, channels)
- Type-specific filtering
- Real-time results

---

## UI/UX Design System

### Design Principles
1. **No Pure Black**: Use `#121212` instead of `#000000`
2. **Elevation via Lightness**: Lighter backgrounds for elevated elements
3. **Desaturated Accents**: -20% saturation in dark mode
4. **Smooth Transitions**: 300ms for all state changes

### Color Palette

#### Light Theme
```css
--color-bg-primary: #FFFFFF;
--color-bg-secondary: #F8F9FA;
--color-text-primary: #1A1A1A;
--color-accent-primary: #FFD700; /* Gold */
--color-accent-gradient: linear-gradient(135deg, #FFD700 0%, #FF8C00 100%);
```

#### Dark Theme
```css
--color-bg-primary: #121212;
--color-bg-secondary: #1E1E1E;
--color-text-primary: #E4E6EB;
--color-accent-primary: #E6C200; /* Desaturated Gold */
--color-accent-gradient: linear-gradient(135deg, #E6C200 0%, #B86500 100%);
```

### Typography
```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-size-xs: 11px;
--font-size-sm: 13px;
--font-size-md: 15px;
--font-size-lg: 17px;
--font-size-xl: 20px;
```

### Spacing
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

### Components

#### Buttons
- **Primary**: Gradient background, dark text
- **Secondary**: Tertiary background, border
- **Ghost**: Transparent, hover effect
- **Icon**: Circular, 44px touch target

#### Inputs
- **Background**: Tertiary color
- **Border**: 1px solid border color
- **Focus**: Accent color border + shadow
- **Placeholder**: Tertiary text color

#### Cards
- **Background**: Secondary color
- **Border**: 1px solid border color
- **Radius**: 12px
- **Shadow**: Elevation-based

### Animations
```css
@keyframes fadeIn { /* 0 → 1 opacity */ }
@keyframes fadeInUp { /* Slide up + fade */ }
@keyframes scaleIn { /* Scale 0.9 → 1 */ }
@keyframes pulse { /* Scale 1 → 1.05 → 1 */ }
@keyframes heartBeat { /* Like animation */ }
@keyframes spin { /* Loading spinner */ }
@keyframes shimmer { /* Skeleton loading */ }
```

### Layout
```css
--header-height: 70px;
--bottom-nav-height: 64px;
--max-content-width: 480px;
```

### Responsive
- **Mobile-first**: Base styles for mobile
- **Breakpoints**: 480px (small phones)
- **Touch Targets**: Minimum 44x44px
- **Safe Areas**: iOS notch support

---

## Authentication & Security

### Firebase Authentication
```javascript
// Supported Methods
- Email/Password
- Google OAuth
- Phone (OTP)
- Anonymous (guest mode)
```

### JWT Middleware
```javascript
// Backend Auth Flow
1. Client sends Firebase ID token in Authorization header
2. Middleware verifies token with Firebase Admin SDK
3. Extracts user ID and attaches to req.userId
4. Controller uses req.userId for authorization
```

### Protected Routes
```javascript
// Frontend
<ProtectedRoute>
  <Component />
</ProtectedRoute>

// Backend
router.get('/protected', authMiddleware, controller);
```

### Admin Authentication
```javascript
// CRITICAL: Admin bypass is ACTIVE
// Check server.js line 1: ADMIN AUTH BYPASS ACTIVE
// Implement proper admin authentication before production
```

### Security Best Practices
1. **CORS**: Whitelist allowed origins
2. **Rate Limiting**: Prevent abuse (TODO)
3. **Input Validation**: Sanitize all inputs
4. **File Upload**: Size and type restrictions
5. **SQL Injection**: N/A (Firestore)
6. **XSS**: React auto-escapes
7. **CSRF**: Token-based (TODO)

---

## File Upload & Storage

### Cloudinary Configuration
```javascript
{
  cloud_name: "dgqprkkmt",
  folders: {
    videos: "reelbox/videos",
    covers: "reelbox/covers",
    avatars: "reelbox/avatars",
    channel_images: "channel_images",
    channel_videos: "channel_videos"
  }
}
```

### Upload Limits
```javascript
{
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxImageSize: 5 * 1024 * 1024,   // 5MB
  maxFileSize: 10 * 1024 * 1024,   // 10MB
  maxFilesPerPost: 10
}
```

### Video Processing
```javascript
// Cloudinary Transformations
{
  quality: "auto",
  fetch_format: "auto",
  start_offset: 0,      // Trim start
  end_offset: undefined // Trim end
}
```

### Image Processing
```javascript
// Avatar
{
  width: 400,
  height: 400,
  crop: "fill",
  gravity: "face",
  quality: "auto:good"
}

// Cover
{
  width: 720,
  height: 1280,
  crop: "fill",
  gravity: "center"
}
```

### Upload Flow
```javascript
1. Client selects file
2. Multer middleware saves to temp folder
3. Controller uploads to Cloudinary
4. Cloudinary returns secure_url
5. Save URL to Firestore
6. Delete temp file
7. Return URL to client
```

### Error Handling
```javascript
// Automatic cleanup on error
try {
  // Upload logic
} catch (error) {
  cleanupFile(req.file.path);
  throw error;
}
```

---

## Subscription System

### Storage Calculation
```javascript
// Total Storage
totalStorage = 
  FREE_STORAGE (15 GB) + 
  SUM(active_subscription_plans.storageGB)

// Usage Tracking
- Each private reel/video adds to storageUsed
- Public content doesn't count
- Storage checked before upload
```

### Content Locking
```javascript
// When subscription expires
1. Calculate new storage limit
2. Get user's private content (sorted by createdAt DESC)
3. Lock newest content until within limit
4. Set isLocked = true, lockReason = "subscription_expired"
```

### Unlocking
```javascript
// When subscription renewed
1. Get all locked content for user
2. Calculate new storage limit
3. Unlock content within new limit
4. Set isLocked = false
```

### Payment Flow
```javascript
1. User selects plan
2. Backend creates Razorpay order
3. Frontend opens Razorpay checkout
4. User completes payment
5. Razorpay redirects with payment details
6. Frontend calls verify endpoint
7. Backend verifies signature
8. Create userSubscription record
9. Unlock content
10. Update user cache
```

### Recurring Subscriptions
```javascript
// Razorpay Subscriptions API
1. Create Razorpay plan (if not exists)
2. Create Razorpay subscription
3. User authorizes auto-debit
4. Razorpay charges automatically
5. Webhook notifies backend
6. Backend updates subscription status
```

### Upgrade/Downgrade
```javascript
// Upgrade (immediate)
1. Calculate proration credit
2. Create new subscription
3. Deactivate old subscription
4. Charge difference

// Downgrade (end of cycle)
1. Schedule downgrade
2. Continue current plan until expiry
3. Activate new plan on expiry date
4. Lock excess content if needed
```

---

## Admin Panel

### Dashboard
- **Total Users**: Count + growth
- **Total Reels**: Count + growth
- **Total Videos**: Count + growth
- **Total Channels**: Count + growth
- **Revenue**: Total + monthly
- **Active Subscriptions**: Count

### User Management
- View all users
- Search/filter users
- View user details
- Edit user profile
- Ban/unban users
- Delete users
- View user content
- View user subscriptions

### Content Management
- View all reels/videos
- Filter by type, category, status
- Feature content
- Delete content
- View content analytics
- Moderate comments

### Channel Management
- View all channels
- Ban/unban channels
- Delete channels
- View channel posts
- View channel members

### Subscription Management
- View all subscriptions
- View transactions
- Refund payments (TODO)
- Manage plans (CRUD)
- View revenue analytics

### Support Management
- View all tickets
- Filter by status, priority
- Respond to tickets
- Close tickets
- Escalate tickets

### Report Management
- View all reports
- Filter by type, status
- Review reports
- Take action (ban, delete, dismiss)
- Track actions

### Settings
- App configuration
- Upload limits
- Feature toggles
- Maintenance mode (TODO)

### Analytics
- User growth
- Content growth
- Engagement metrics
- Revenue metrics
- Top creators
- Viral content

---

## Environment Variables

### Backend (.env)
```bash
# Server
PORT=5000
NODE_ENV=development

# MongoDB (Legacy - Not used)
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=reels_app_jwt_secret_dev_key_2026

# Cloudinary
CLOUDINARY_CLOUD_NAME=dgqprkkmt
CLOUDINARY_API_KEY=246542237811397
CLOUDINARY_API_SECRET=BXrfmys1eTs4XGqEYeZslIxoCio

# Razorpay (Test)
RAZORPAY_KEY_ID=rzp_test_S2tOuYBZiOuLb4
RAZORPAY_KEY_SECRET=tiR3NbQKSBa5mrdKyZbsnh7x
RAZORPAY_WEBHOOK_SECRET=kbkjbjbrv89y3hf4hf84hfi4fb

# Frontend
FRONTEND_URL=http://localhost:5173

# Firebase (Optional - can use serviceAccountKey.json)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:5000/api
```

---

## Deployment

### Frontend (Vercel)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "environmentVariables": {
    "VITE_API_URL": "https://api.reelbox.com/api"
  }
}
```

### Backend
```bash
# Requirements
- Node.js 18+
- PM2 (process manager)
- Nginx (reverse proxy)

# Steps
1. Clone repository
2. npm install
3. Set environment variables
4. npm start (or pm2 start server.js)
5. Configure Nginx reverse proxy
```

### Database
- Firebase Firestore (managed)
- No manual setup required
- Automatic backups (Firebase)

### Storage
- Cloudinary (managed)
- No manual setup required
- CDN included

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (dev mode only)"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "nextCursor": "cursor_value" // null if no more
  }
}
```

---

## Testing

### Backend Testing
```bash
# Test subscription system
node scripts/testSubscriptionSystem.js

# Test subscription API
node scripts/testSubscriptionAPI.js

# Seed subscription plans
node scripts/seedSubscriptionPlans.js
```

### Frontend Testing
```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Known Issues & TODOs

### Critical
- [ ] Implement proper admin authentication (BYPASS ACTIVE)
- [ ] Add rate limiting to prevent abuse
- [ ] Implement CSRF protection
- [ ] Add input sanitization middleware

### High Priority
- [ ] Implement push notifications (Firebase Cloud Messaging)
- [ ] Add email notifications (SendGrid/Mailgun)
- [ ] Implement video compression before upload
- [ ] Add content moderation (AI-based)
- [ ] Implement analytics tracking (Google Analytics)

### Medium Priority
- [ ] Add video playback quality selection
- [ ] Implement live streaming
- [ ] Add stories feature
- [ ] Implement direct messaging
- [ ] Add hashtag system

### Low Priority
- [ ] Add dark mode auto-detection
- [ ] Implement PWA features
- [ ] Add offline support
- [ ] Implement i18n (internationalization)
- [ ] Add accessibility improvements (ARIA)

---

## Support & Contact

### Developer
- **Name**: Reel Box Development Team
- **Email**: support@reelbox.com
- **GitHub**: https://github.com/reelbox

### Documentation
- **API Docs**: /docs/api.md
- **Setup Guide**: /docs/setup.md
- **Deployment Guide**: /docs/deployment.md

---

## License

Proprietary - All rights reserved

---

## Changelog

### v3.0.0 (Current)
- Added subscription system with Razorpay
- Implemented private content with storage limits
- Added channels feature
- Implemented referral system
- Added support ticket system
- Redesigned UI with dark mode

### v2.0.0
- Added video content type
- Implemented admin panel
- Added reporting system
- Improved performance

### v1.0.0
- Initial release
- Basic reel upload/view
- User authentication
- Follow system
- Like/comment features

---

**Last Updated**: January 28, 2026
**Version**: 3.0.0
**Status**: Active Development
