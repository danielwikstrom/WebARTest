// Marker Tracker - Step 4: Marker Image Registration
// Step 5: Marker Detection and Tracking
// Handles loading, registering, and detecting trackable marker images

let trackableImage = null;
let markerImageLoaded = false;

// Tracking state
let isMarkerDetected = false;
let currentMarkerPose = null;
let onMarkerDetectedCallback = null;
let onMarkerLostCallback = null;

// Marker configuration
const MARKER_CONFIG = {
  imagePath: '/marker-image.jpg', // Path to marker image in public folder
  physicalWidth: 0.1, // Physical width in meters (10cm = 0.1m)
  physicalHeight: 0.15 // Physical height in meters (assumes square, adjust if needed)
};

/**
 * Load the marker image from the public folder
 * @returns {Promise<ImageBitmap>} The loaded image as ImageBitmap
 */
async function loadMarkerImage() {
  try {
    console.log('Loading marker image from:', MARKER_CONFIG.imagePath);
    
    // Fetch the image
    const response = await fetch(MARKER_CONFIG.imagePath);
    if (!response.ok) {
      throw new Error(`Failed to load marker image: ${response.status} ${response.statusText}. File may not exist or Git LFS file not downloaded.`);
    }

    // Convert to blob
    const blob = await response.blob();
    
    // Check if blob is suspiciously small (Git LFS pointer files are < 200 bytes)
    // or if it's actually a text file (Git LFS pointer)
    if (blob.size < 200) {
      // Might be a Git LFS pointer - check by reading as text
      const text = await blob.text();
      if (text.startsWith('version https://git-lfs.github.com')) {
        throw new Error('Marker image is a Git LFS pointer file, not the actual image. The file needs to be downloaded from Git LFS. Check Vercel build logs and ensure GIT_LFS_TOKEN is set in environment variables.');
      }
      // If it's small but not a pointer, might be corrupted - throw error
      throw new Error(`Marker image file is too small (${blob.size} bytes). File may be corrupted or not properly downloaded from Git LFS.`);
    }
    
    // Try to create ImageBitmap from the blob
    const imageBitmap = await createImageBitmap(blob);
    
    console.log('Marker image loaded successfully:', {
      width: imageBitmap.width,
      height: imageBitmap.height
    });

    markerImageLoaded = true;
    return imageBitmap;

  } catch (error) {
    console.error('Error loading marker image:', error);
    
    // Provide helpful error message
    let errorMessage = `Could not load marker image: ${error.message}`;
    if (error.message.includes('Git LFS')) {
      errorMessage += '\n\nGit LFS Setup Required:\n';
      errorMessage += '1. Ensure GIT_LFS_TOKEN is set in Vercel environment variables\n';
      errorMessage += '2. Check Vercel build logs for Git LFS download errors\n';
      errorMessage += '3. Verify marker-image.jpg is properly tracked by Git LFS\n';
      errorMessage += '4. The file should be in /public/marker-image.jpg';
    } else {
      errorMessage += '\n\nMake sure marker-image.jpg exists in the public folder.';
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Check if we're on a platform that likely doesn't support image tracking
 * @returns {boolean} True if on unsupported platform
 */
function isUnsupportedPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMac = /macintosh|mac os x/i.test(navigator.platform);
  const isDesktop = !/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  return isMac || (isDesktop && !/chrome/i.test(userAgent));
}

/**
 * Register the marker image as a trackable image with the XR session
 * @param {XRSession} session - The WebXR session
 * @param {ImageBitmap} imageBitmap - The marker image as ImageBitmap
 * @returns {Promise<XRTrackedImageImage>} The registered trackable image
 */
async function registerTrackableImage(session, imageBitmap) {
  try {
    console.log('Registering marker image as trackable...');

    // Check if image tracking API is available
    if (!('ImageTracking' in window) || !session.requestImageTrackableImage) {
      const isUnsupported = isUnsupportedPlatform();
      if (isUnsupported) {
        console.warn('⚠️ Image tracking not available on this platform (Mac/Desktop).');
        console.info('ℹ️ This is expected - image tracking requires Android Chrome or compatible mobile device.');
        console.info('ℹ️ The marker image is loaded and ready. Testing on Android will enable tracking.');
        throw new Error('Image tracking not supported on this platform (expected on Mac/Desktop)');
      } else {
        throw new Error('Image tracking API not available. Try enabling WebXR Incubations in chrome://flags');
      }
    }

    // Create XRTrackedImageImage with physical dimensions
    // The physical dimensions tell WebXR the real-world size of the marker
    const trackedImage = await session.requestImageTrackableImage(imageBitmap, {
      physicalWidth: MARKER_CONFIG.physicalWidth,
      physicalHeight: MARKER_CONFIG.physicalHeight || MARKER_CONFIG.physicalWidth // Default to square
    });

    if (!trackedImage) {
      throw new Error('Failed to create trackable image');
    }

    trackableImage = trackedImage;
    console.log('✅ Marker image registered successfully:', {
      physicalWidth: MARKER_CONFIG.physicalWidth,
      physicalHeight: MARKER_CONFIG.physicalHeight,
      imageWidth: imageBitmap.width,
      imageHeight: imageBitmap.height
    });

    return trackedImage;

  } catch (error) {
    // Don't log as error if it's expected (unsupported platform)
    if (error.message.includes('expected on Mac/Desktop')) {
      console.warn('Marker registration skipped:', error.message);
    } else {
      console.error('Error registering trackable image:', error);
    }
    throw error;
  }
}

/**
 * Initialize marker tracking - loads and registers the marker image
 * @param {XRSession} session - The WebXR session
 * @returns {Promise<XRTrackedImageImage>} The registered trackable image
 */
export async function initializeMarkerTracking(session) {
  try {
    // Load the marker image
    const imageBitmap = await loadMarkerImage();

    // Register it as a trackable image
    try {
      const trackedImage = await registerTrackableImage(session, imageBitmap);
      return trackedImage;
    } catch (error) {
      // If registration fails due to platform limitations, that's okay
      // The image is still loaded and ready for when testing on supported devices
      if (error.message.includes('expected on Mac/Desktop')) {
        console.info('✅ Marker image loaded and ready. Will work on Android Chrome.');
        return null; // Return null to indicate it's not registered but that's okay
      }
      // Re-throw other errors
      throw error;
    }

  } catch (error) {
    // Only log as error if it's not a platform limitation
    if (!error.message.includes('expected on Mac/Desktop')) {
      console.error('Failed to initialize marker tracking:', error);
    }
    throw error;
  }
}

/**
 * Get the registered trackable image
 * @returns {XRTrackedImageImage|null} The trackable image or null if not registered
 */
export function getTrackableImage() {
  return trackableImage;
}

/**
 * Check if marker image has been loaded
 * @returns {boolean} True if marker image is loaded
 */
export function isMarkerImageLoaded() {
  return markerImageLoaded;
}

/**
 * Get marker configuration (for use in other modules)
 * @returns {Object} Marker configuration
 */
export function getMarkerConfig() {
  return { ...MARKER_CONFIG };
}

/**
 * Update marker tracking - checks for marker in current frame
 * Should be called every frame in the render loop
 * @param {XRFrame} frame - The current XR frame
 * @param {XRReferenceSpace} referenceSpace - The reference space for pose calculations
 * @returns {XRPose|null} The marker pose if detected, null otherwise
 */
export function updateMarkerTracking(frame, referenceSpace) {
  if (!trackableImage || !referenceSpace) {
    return null;
  }

  // Check if frame has image tracking results
  if (!frame.getImageTrackingResults) {
    return null;
  }

  try {
    // Get all image tracking results for this frame
    const trackingResults = frame.getImageTrackingResults();
    
    if (!trackingResults || trackingResults.length === 0) {
      // No tracking results
      if (isMarkerDetected) {
        // Marker was detected before but is now lost
        handleMarkerLost();
      }
      return null;
    }

    // Find the result that matches our trackable image
    let markerResult = null;
    for (const result of trackingResults) {
      if (result.trackedImage === trackableImage) {
        markerResult = result;
        break;
      }
    }

    if (!markerResult) {
      // Our marker is not in the results
      if (isMarkerDetected) {
        handleMarkerLost();
      }
      return null;
    }

    // Check tracking state
    const trackingState = markerResult.trackingState;
    
    if (trackingState === 'tracked') {
      // Marker is actively being tracked
      // Get the pose of the marker relative to the reference space
      const pose = frame.getPose(markerResult.imageSpace, referenceSpace);
      
      if (pose) {
        // Marker is detected and we have a valid pose
        if (!isMarkerDetected) {
          // First time detecting the marker
          handleMarkerDetected(pose);
        }
        
        // Update current pose
        currentMarkerPose = pose;
        isMarkerDetected = true;
        
        return pose;
      }
    } else if (trackingState === 'emulated') {
      // Marker not currently visible, but using last known position
      // We can still use the pose if available
      const pose = frame.getPose(markerResult.imageSpace, referenceSpace);
      if (pose && isMarkerDetected) {
        // Keep using the last known pose
        currentMarkerPose = pose;
        return pose;
      } else if (isMarkerDetected) {
        // Lost tracking
        handleMarkerLost();
      }
      return null;
    } else {
      // trackingState === 'untracked' - marker not detected
      if (isMarkerDetected) {
        handleMarkerLost();
      }
      return null;
    }

  } catch (error) {
    // Silently handle errors (might be platform-specific API differences)
    console.warn('Error getting image tracking results:', error);
    return null;
  }
}

/**
 * Handle marker detection (first time marker appears)
 * @param {XRPose} pose - The marker pose
 */
function handleMarkerDetected(pose) {
  isMarkerDetected = true;
  currentMarkerPose = pose;
  
  console.log('🎯 Marker detected!', {
    position: {
      x: pose.transform.position.x.toFixed(3),
      y: pose.transform.position.y.toFixed(3),
      z: pose.transform.position.z.toFixed(3)
    }
  });

  // Call callback if registered
  if (onMarkerDetectedCallback) {
    onMarkerDetectedCallback(pose);
  }
}

/**
 * Handle marker lost (marker no longer in view)
 */
function handleMarkerLost() {
  isMarkerDetected = false;
  currentMarkerPose = null;
  
  console.log('❌ Marker lost');

  // Call callback if registered
  if (onMarkerLostCallback) {
    onMarkerLostCallback();
  }
}

/**
 * Register callback for when marker is first detected
 * @param {Function} callback - Callback function that receives the marker pose
 */
export function onMarkerDetected(callback) {
  onMarkerDetectedCallback = callback;
}

/**
 * Register callback for when marker is lost
 * @param {Function} callback - Callback function
 */
export function onMarkerLost(callback) {
  onMarkerLostCallback = callback;
}

/**
 * Get current marker detection state
 * @returns {boolean} True if marker is currently detected
 */
export function isMarkerCurrentlyDetected() {
  return isMarkerDetected;
}

/**
 * Get current marker pose
 * @returns {XRPose|null} Current marker pose or null if not detected
 */
export function getCurrentMarkerPose() {
  return currentMarkerPose;
}

