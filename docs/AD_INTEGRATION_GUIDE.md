# Google Ad Manager Integration Guide

## 🎯 Overview
This guide covers the complete setup of Google Ad Manager for the ReelBox web application, including test configurations and production deployment.

## 📋 Ad Types Implemented

### 1. **Banner Ads** (`AdBanner.jsx`)
- Horizontal banners (728x90, 970x90, 320x50)
- Vertical skyscrapers (300x600, 160x600)
- Rectangle ads (300x250, 336x280)
- **Use Cases**: Between video lists, in feed, sidebar

### 2. **Reel Ads** (`ReelAd.jsx`)
- Full-screen vertical ads (9:16 aspect ratio)
- Seamlessly integrated into reel scroll
- **Use Cases**: Every 5-7 reels in the feed

### 3. **Video Ads** (`VideoAd.jsx`)
- Pre-roll ads (before video starts)
- Mid-roll ads (during video playback)
- Skippable after 5 seconds
- **Use Cases**: Before watching videos, mid-video breaks

## 🚀 Quick Start (Development/Testing)

### Step 1: Get Test Ad Units from Google Ad Manager

1. Go to [Google Ad Manager](https://admanager.google.com/)
2. Navigate to **Inventory** → **Ad units**
3. Click **New ad unit**
4. Create the following ad units:

#### Test Ad Units to Create:

```
Name: ReelBox_Banner_Horizontal
Size: 728x90, 970x90, 320x50
Code: /YOUR_NETWORK_ID/reelbox_banner_horizontal

Name: ReelBox_Banner_Rectangle
Size: 300x250, 336x280
Code: /YOUR_NETWORK_ID/reelbox_banner_rectangle

Name: ReelBox_Reel_Ad
Size: 300x533, 360x640, 405x720
Code: /YOUR_NETWORK_ID/reelbox_reel_ad

Name: ReelBox_Video_Preroll
Type: Video (VAST)
Code: /YOUR_NETWORK_ID/reelbox_video_preroll
```

### Step 2: Create Environment Variables

Create `.env` file in frontend directory:

```bash
# Google Ad Manager Configuration
VITE_AD_NETWORK_ID=YOUR_NETWORK_ID_HERE
VITE_AD_ENABLED=true

# Test Mode (set to false in production)
VITE_AD_TEST_MODE=true
```

### Step 3: Update Ad Slot IDs

The components use placeholder ad slots. Replace them with your actual ad units:

**Example:**
```javascript
// Before (placeholder)
<AdBanner adSlot="/6499/example/banner" />

// After (your ad unit)
<AdBanner adSlot="/123456789/reelbox_banner_horizontal" />
```

## 📱 Implementation Examples

### Banner Ad in Home Feed

```javascript
import AdBanner from '../../components/ads/AdBanner';

function Home() {
    return (
        <div>
            {/* Video list */}
            {videos.slice(0, 5).map(video => <VideoCard key={video.id} {...video} />)}
            
            {/* Ad after 5 videos */}
            <AdBanner 
                adSlot={`/${import.meta.env.VITE_AD_NETWORK_ID}/reelbox_banner_horizontal`}
                adFormat="horizontal"
            />
            
            {/* More videos */}
            {videos.slice(5).map(video => <VideoCard key={video.id} {...video} />)}
        </div>
    );
}
```

### Reel Ad in Reel Feed

```javascript
import ReelAd from '../../components/ads/ReelAd';

function ReelView() {
    const [reels, setReels] = useState([]);
    
    // Insert ad every 5-7 reels
    const reelsWithAds = useMemo(() => {
        const result = [];
        reels.forEach((reel, index) => {
            result.push(reel);
            // Add ad after every 6 reels
            if ((index + 1) % 6 === 0) {
                result.push({ 
                    id: `ad-${index}`, 
                    isAd: true 
                });
            }
        });
        return result;
    }, [reels]);
    
    return (
        <div className="reel-container">
            {reelsWithAds.map(item => 
                item.isAd ? (
                    <ReelAd 
                        key={item.id}
                        adSlot={`/${import.meta.env.VITE_AD_NETWORK_ID}/reelbox_reel_ad`}
                        onAdLoad={() => console.log('Reel ad loaded')}
                        onAdError={() => console.log('Reel ad failed')}
                    />
                ) : (
                    <ReelPlayer key={item.id} reel={item} />
                )
            )}
        </div>
    );
}
```

### Video Pre-roll Ad

```javascript
import { useState } from 'react';
import VideoAd from '../../components/ads/VideoAd';

function VideoShowcase() {
    const [showAd, setShowAd] = useState(true);
    const [showVideo, setShowVideo] = useState(false);
    
    const handleAdComplete = () => {
        setShowAd(false);
        setShowVideo(true);
    };
    
    const handleAdError = () => {
        // Ad failed, skip to video
        setShowAd(false);
        setShowVideo(true);
    };
    
    return (
        <div className="video-container">
            {showAd && (
                <VideoAd
                    adTagUrl={`https://pubads.g.doubleclick.net/gampad/ads?iu=/${import.meta.env.VITE_AD_NETWORK_ID}/reelbox_video_preroll&...`}
                    onAdComplete={handleAdComplete}
                    onAdError={handleAdError}
                    skippable={true}
                />
            )}
            
            {showVideo && (
                <video src={videoUrl} controls autoPlay />
            )}
        </div>
    );
}
```

## 🧪 Testing with Google Ad Manager

### Option 1: Use Test Mode (Recommended for Development)

The components automatically enable test mode when `import.meta.env.DEV` is true. This shows placeholder ads without real impressions.

### Option 2: Use Google's Test Ad Units

Google provides public test ad units you can use:

```javascript
// Test Banner Ad
<AdBanner adSlot="/6499/example/banner" />

// Test Video Ad (VAST)
const testVastUrl = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';
```

### Option 3: Create Test Creatives in Ad Manager

1. Go to **Delivery** → **Creatives**
2. Click **New creative**
3. Choose **Image** or **Video**
4. Upload a test image/video
5. Link to your ad units

## 💰 Revenue & Monetization

### Ad Placement Strategy (Recommended)

1. **Reel Feed**: 1 ad per 6-7 reels (not too aggressive)
2. **Video List**: 1 ad per 8-10 videos
3. **Video Pre-roll**: 1 ad before videos >2 minutes
4. **Banner Ads**: 1-2 per page (top/bottom)

### Frequency Capping

Prevent ad fatigue by limiting how often users see the same ad:

```javascript
// In Google Ad Manager:
// Delivery → Frequency caps
// Set: 3 impressions per user per day
```

## 🔒 Privacy & Compliance

### GDPR Compliance

Add consent management:

```javascript
// Before loading ads, check consent
if (userHasConsented) {
    window.googletag.cmd.push(() => {
        window.googletag.pubads().setRequestNonPersonalizedAds(0);
    });
} else {
    window.googletag.cmd.push(() => {
        window.googletag.pubads().setRequestNonPersonalizedAds(1);
    });
}
```

### COPPA Compliance

If your app has users under 13:

```javascript
window.googletag.cmd.push(() => {
    window.googletag.pubads().setTagForChildDirectedTreatment(1);
});
```

## 📊 Ad Performance Tracking

### Track Ad Events

```javascript
<AdBanner 
    adSlot="/123456789/banner"
    onAdLoad={() => {
        // Track successful ad load
        analytics.track('ad_loaded', { type: 'banner' });
    }}
    onAdError={() => {
        // Track ad failure
        analytics.track('ad_failed', { type: 'banner' });
    }}
/>
```

### Monitor in Google Ad Manager

1. Go to **Reports** → **New report**
2. Select metrics:
   - Impressions
   - Clicks
   - CTR (Click-through rate)
   - Revenue
3. Filter by ad unit

## 🚀 Production Deployment Checklist

- [ ] Replace test ad units with production ad units
- [ ] Set `VITE_AD_TEST_MODE=false`
- [ ] Verify ad units are approved in Ad Manager
- [ ] Set up frequency capping
- [ ] Implement consent management (GDPR)
- [ ] Test on multiple devices/browsers
- [ ] Monitor ad performance for 24 hours
- [ ] Adjust placement based on user feedback

## 🛠️ Troubleshooting

### Ads Not Showing

1. **Check Console**: Look for GPT errors
2. **Verify Ad Unit**: Ensure ad unit code is correct
3. **Check Inventory**: Ensure ad units have creatives assigned
4. **Test Network**: Disable ad blockers
5. **Check Targeting**: Verify geographic/demographic targeting

### Ads Loading Slowly

1. **Enable SRA**: Single Request Architecture (already enabled)
2. **Lazy Loading**: Load ads only when in viewport
3. **Reduce Ad Sizes**: Use smaller ad units where possible

### Revenue Lower Than Expected

1. **Increase Viewability**: Ensure ads are visible (50%+ in viewport)
2. **Optimize Placement**: Test different positions
3. **Enable Auto-refresh**: Refresh ads every 30-60 seconds (use carefully)
4. **Check Fill Rate**: Ensure ads are filling 90%+ of requests

## 📚 Additional Resources

- [Google Ad Manager Help](https://support.google.com/admanager)
- [GPT Reference](https://developers.google.com/publisher-tag/reference)
- [IMA SDK Documentation](https://developers.google.com/interactive-media-ads)
- [VAST Specification](https://www.iab.com/guidelines/vast/)

## 🆓 Absolutely FREE Approach

**What's FREE:**
- ✅ Google Ad Manager account
- ✅ Ad serving (no hosting fees)
- ✅ GPT library (Google Publisher Tag)
- ✅ IMA SDK (Interactive Media Ads)
- ✅ Reporting & analytics

**What Costs Money:**
- ❌ Nothing! Google takes a revenue share (typically 32%) from ad earnings
- ❌ You only pay Google when you EARN money

**No Upfront Costs. No Monthly Fees. 100% Free to Start.**

## 🎓 Next Steps

1. Create Google Ad Manager account (if not done)
2. Set up ad units
3. Add environment variables
4. Test with sample ads
5. Deploy to production
6. Monitor performance
7. Optimize based on data

---

**Need Help?** Check the troubleshooting section or Google Ad Manager support.
