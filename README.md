# WebXR Animated Gift Card

A web-based augmented reality experience that uses marker tracking to display an animated gift card. Users scan a QR code to open the website, which then tracks a printed marker image and plays an animation.

## Prerequisites

- **Node.js** (version 18 or higher)
- **Modern mobile browser** with WebXR support:
  - Android: Chrome (recommended)
  - iOS: Limited support (may require alternative solutions)
- **HTTPS connection** (required for WebXR - automatically handled in development)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - The server will start with HTTPS on `https://localhost:5173`
   - You'll need to accept the self-signed certificate warning (this is normal for local development)
   - For mobile testing, use your computer's IP address: `https://YOUR_IP:5173`
   - Find your IP address:
     - Mac/Linux: `ifconfig | grep "inet "`
     - Windows: `ipconfig`

## Project Structure

```
webxr-gift-card/
├── index.html              # Main HTML entry point
├── src/
│   ├── main.js            # WebXR initialization and main loop
│   └── marker-tracker.js  # Marker image loading and registration
├── public/                 # Static assets
│   ├── marker-image.jpg   # Trackable marker image (REQUIRED - see below)
│   └── animation.mp4      # Animation/video file (add your animation here)
├── vite.config.js         # Vite configuration with HTTPS
└── package.json           # Dependencies
```

## Development Workflow

1. Run `npm run dev` to start the development server
2. The server will automatically reload when you make changes
3. Test on mobile devices by accessing the HTTPS URL

## Browser Compatibility

### Android
- **Chrome**: Full WebXR support
- May need to enable experimental features:
  - Navigate to `chrome://flags`
  - Enable "WebXR Incubations"

### iOS
- **Safari**: Limited WebXR support
- Consider alternative solutions for iOS compatibility

## Marker Image Setup (Step 4)

### Where to Place Your Marker Image

1. **Place your marker image in the `public/` folder:**
   - File name: `marker-image.jpg` (or `.png`)
   - Full path: `/public/marker-image.jpg`
   - The image will be accessible at `/marker-image.jpg` when the app runs

### Marker Image Requirements

For best tracking results, your marker image should:

1. **High Contrast**: Use images with clear, distinct patterns
   - Avoid low-contrast or gradient-heavy images
   - Black and white patterns work very well
   - High color contrast helps

2. **Unique Features**: Include distinctive elements
   - Avoid repetitive patterns (like checkerboards)
   - Include unique shapes, logos, or text
   - Asymmetric designs track better than symmetric ones

3. **Image Quality**:
   - Minimum size: 512x512 pixels (larger is better)
   - Format: JPG or PNG
   - Clear, sharp image (not blurry)
   - Good lighting in the image

4. **Physical Dimensions**:
   - The marker's real-world size must be specified in the code
   - Default: 10cm x 10cm (0.1m x 0.1m)
   - To change: Edit `MARKER_CONFIG.physicalWidth` and `MARKER_CONFIG.physicalHeight` in `src/marker-tracker.js`
   - **Important**: The physical dimensions must match the actual printed size!

### How to Configure Physical Dimensions

1. **Measure your printed marker** (in meters):
   - Example: If your marker is 15cm wide and 10cm tall
   - Width: 0.15 meters
   - Height: 0.10 meters

2. **Update the configuration** in `src/marker-tracker.js`:
   ```javascript
   const MARKER_CONFIG = {
     imagePath: '/marker-image.jpg',
     physicalWidth: 0.15,  // Your actual width in meters
     physicalHeight: 0.10   // Your actual height in meters
   };
   ```

### Testing Your Marker Image

1. **Add your marker image** to `/public/marker-image.jpg`
2. **Start the dev server**: `npm run dev`
3. **Check the console** for:
   - "Marker image loaded successfully" - Image loaded
   - "Marker image registered successfully" - Ready for tracking
   - Any error messages if the image failed to load

### Troubleshooting Marker Images

**Image not loading:**
- Check file is in `/public/` folder
- Verify filename matches exactly: `marker-image.jpg`
- Check file format (JPG or PNG)
- Check browser console for specific error

**Git LFS / Vercel Deployment Issues:**
If you see "Git LFS pointer file" errors in production:
1. **Set up Git LFS token in Vercel:**
   - Go to Vercel project settings → Environment Variables
   - Add `GIT_LFS_TOKEN` with a GitHub Personal Access Token
   - Token needs `repo` scope to access Git LFS files
   - Redeploy after adding the token

2. **Verify Git LFS tracking:**
   ```bash
   git lfs ls-files  # Should show marker-image.jpg
   ```

3. **Check Vercel build logs:**
   - Look for Git LFS download messages
   - Ensure files are downloaded before build completes

4. **Alternative:** If Git LFS continues to cause issues, you can:
   - Upload marker-image.jpg directly to Vercel's file system
   - Or use a CDN/cloud storage and update the path in code

**Marker not tracking:**
- Ensure physical dimensions match printed size
- Try a higher contrast image
- Ensure good lighting when testing
- Make sure marker is flat and not wrinkled
- Try a larger marker (15cm+ recommended)

## Animation/Video Setup

### Where to Place Your Animation

1. **Place your video file in the `public/` folder:**
   - File name: `animation.mp4` (or other video format)
   - Full path: `/public/animation.mp4`
   - The video will be accessible at `/animation.mp4` when the app runs

### Video Requirements

- **Format**: MP4 (H.264 codec recommended for best compatibility)
- **Resolution**: 1080p or lower for better performance
- **Duration**: Any length (will play once when marker is detected)
- **File size**: Keep under 10MB for faster loading

**Note**: Video playback will be implemented in Step 6. For now, just place your video file in the `public/` folder.

## Marker Detection Testing (Step 5)

### How to Test Marker Detection

1. **On Android Chrome** (recommended):
   - Ensure WebXR Incubations flag is enabled: `chrome://flags/#webxr-incubations`
   - Open the app and grant camera permissions
   - Point camera at your printed marker image
   - Check browser console for detection messages

2. **Expected Console Output:**
   ```
   🎯 Marker detected! { position: { x: 0.000, y: 0.000, z: 0.000 } }
   ```
   - This appears when marker first comes into view
   - Position updates continuously while marker is tracked

3. **Marker States:**
   - **"tracked"**: Marker is actively detected and tracked
   - **"emulated"**: Marker not visible, using last known position
   - **"untracked"**: Marker not detected
   - **"❌ Marker lost"**: Marker went out of view

4. **What's Working:**
   - ✅ Marker image loads and registers
   - ✅ Marker detection in real-time
   - ✅ Marker pose (position/orientation) tracking
   - ✅ Detection callbacks ready for animation trigger

5. **Next Step:**
   - Step 6 will add video playback when marker is detected
   - Video will be positioned exactly on top of the marker

**Note**: On Mac/Desktop, marker detection won't work (this is expected). Full functionality requires Android Chrome.

## Troubleshooting

### Certificate Warning
- The self-signed certificate warning is expected in development
- Click "Advanced" → "Proceed to localhost" (or similar)

### WebXR Not Available
- Ensure you're using HTTPS
- Check browser compatibility
- Enable WebXR flags if needed

### Mobile Connection Issues
- Ensure mobile device and computer are on the same network
- Check firewall settings
- Verify IP address is correct

