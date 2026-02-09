# PWA Features

## Overview
FinAtlas now supports Progressive Web App (PWA) capabilities, allowing users to install the app on their devices and use it with offline support.

## What's Been Added

### 1. PWA Manifest (`public/manifest.json`)
- App name, description, and branding
- Icon specifications (192x192 and 512x512)
- Standalone display mode for app-like experience
- Dark theme colors (zinc-950 background)

### 2. Service Worker (`public/sw.js`)
- Caches static assets on install
- Network-first strategy for API calls
- Cache-first strategy for static assets
- Automatic cache cleanup on updates
- Excludes `/api/auth` routes from caching

### 3. PWA Meta Tags (in `app/layout.tsx`)
- Viewport configuration with safe area insets for notched devices
- Theme color for status bar
- Apple-specific PWA tags
- Manifest link

### 4. Mobile Navigation (`components/layout/MobileNav.tsx`)
- Fixed bottom navigation bar
- Shows on mobile screens (< lg breakpoint)
- Five main sections: Dashboard, Budget, Investments, AI Assistant, Settings
- Active state highlighting with emerald color
- Safe area insets for devices with home indicator

### 5. Mobile Optimizations (`components/layout/AppShell.tsx`)
- Safe area insets for notched devices (`env(safe-area-inset-*)`)
- Bottom padding to accommodate mobile navigation
- Touch-friendly spacing

### 6. Offline Fallback Page (`app/offline/page.tsx`)
- Shows when user is offline and content isn't cached
- Simple, branded message
- "Try again" button to reload

## Icon Generation

### Option 1: Web-Based Generator (Recommended)
1. Start the dev server: `pnpm dev`
2. Navigate to `http://localhost:3000/generate-icons.html`
3. Click "Generate Icons"
4. Download each PNG (right-click or use the download buttons)
5. Save as `icon-192.png` and `icon-512.png` in `public/icons/`

### Option 2: Command Line (requires librsvg or ImageMagick)
```bash
cd apps/web
./scripts/generate-pwa-icons.sh
```

Install dependencies if needed:
```bash
# macOS
brew install librsvg
# or
brew install imagemagick
```

## Testing PWA Features

### Desktop (Chrome/Edge)
1. Open the app in Chrome/Edge
2. Look for the install icon in the address bar
3. Click to install
4. App opens in standalone window

### Mobile (iOS)
1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. App installs with custom icon

### Mobile (Android)
1. Open in Chrome
2. Tap menu (three dots)
3. Tap "Install app" or "Add to Home Screen"
4. App installs with custom icon

### Testing Offline Mode
1. Open app in browser
2. Open DevTools > Application > Service Workers
3. Check "Offline" checkbox
4. Reload page
5. Cached content should still load
6. New API requests will show offline fallback

## Mobile Navigation
On screens smaller than `lg` breakpoint (1024px):
- Bottom navigation bar appears
- Main content has bottom padding to avoid overlap
- Sidebar opens as overlay when menu button is clicked
- Active page is highlighted in emerald color

## Safe Area Insets
For devices with notches, rounded corners, or home indicators:
- Header has top padding: `pt-[env(safe-area-inset-top)]`
- Mobile nav has bottom padding: `pb-[env(safe-area-inset-bottom)]`
- Content is never hidden behind system UI

## Files Modified
- `app/layout.tsx` - Added PWA meta tags and viewport config
- `components/layout/AppShell.tsx` - Added mobile nav and safe area insets

## Files Created
- `public/manifest.json` - PWA manifest
- `public/sw.js` - Service worker
- `public/icons/icon.svg` - App icon (SVG)
- `public/icons/icon-192.png` - PWA icon (192x192)
- `public/icons/icon-512.png` - PWA icon (512x512)
- `public/generate-icons.html` - Web-based icon generator
- `components/PWARegister.tsx` - Service worker registration
- `components/layout/MobileNav.tsx` - Mobile bottom navigation
- `app/offline/page.tsx` - Offline fallback page
- `scripts/generate-pwa-icons.sh` - CLI icon generator

## Service Worker Cache Strategy

### Static Assets (Cache-First)
- HTML pages
- JavaScript bundles
- CSS files
- Images
- Fonts

### API Calls (Network-First)
- All `/api/*` routes except auth
- Falls back to cache if offline
- Auth routes always go to network (not cached)

### Cache Updates
- Old caches are automatically cleaned up on service worker activation
- Cache name: `finatlas-v1` (increment version to force update)

## Lighthouse PWA Checklist
- ✓ Registers a service worker
- ✓ Responds with a 200 when offline
- ✓ Provides a valid web app manifest
- ✓ Configured for a custom splash screen
- ✓ Sets theme color
- ✓ Content sized correctly for viewport
- ✓ Uses HTTPS (required in production)

## Browser Support
- Chrome/Edge: Full PWA support
- Safari (iOS 16.4+): Full PWA support with limitations
- Firefox: Service worker support, limited install experience
- Safari (macOS): Service worker support, no install prompt

## Notes
- Service worker only works over HTTPS (or localhost)
- Clear browser cache if service worker isn't updating
- Use "Update on reload" in DevTools during development
- iOS requires user action to install (no automatic prompt)
