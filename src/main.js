// WebXR Gift Card - Main Entry Point
// Step 3: WebXR Session Initialization
// Step 4: Marker Image Registration
// Step 5: Marker Detection and Tracking

import { 
  initializeMarkerTracking, 
  getTrackableImage,
  updateMarkerTracking,
  onMarkerDetected,
  isMarkerCurrentlyDetected
} from './marker-tracker.js';

const canvas = document.getElementById('xr-canvas');
let xrSession = null;
let xrButton = null; // Will be used for manual trigger if needed
let referenceSpace = null;

// Check WebXR support
async function checkWebXRSupport() {
  if (!navigator.xr) {
    console.error('WebXR is not supported in this browser');
    showError('WebXR is not supported. Please use a compatible browser like Chrome on Android.');
    return false;
  }

  // Check if immersive AR is supported
  const isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!isARSupported) {
    console.error('Immersive AR is not supported');
    showError('AR mode is not supported on this device.');
    return false;
  }

  // Check if image tracking is available
  const isImageTrackingSupported = 'ImageTracking' in window && 
                                   'XRTrackedImageImage' in window;
  
  console.log('WebXR Support:', {
    webxr: true,
    immersiveAR: isARSupported,
    imageTracking: isImageTrackingSupported
  });

  if (!isImageTrackingSupported) {
    console.warn('Image tracking may not be supported - this feature is experimental');
  }

  return true;
}

// Request AR session with image tracking
async function requestARSession() {
  try {
    if (!navigator.xr) {
      throw new Error('WebXR not available');
    }

    console.log('Requesting AR session with image tracking...');

    // Request immersive AR session with image-tracking feature
    const sessionInit = {
      requiredFeatures: ['local'], // Required for AR
      optionalFeatures: ['image-tracking'] // Image tracking (may not be available on all devices)
    };

    xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);
    
    console.log('AR session started successfully!', xrSession);

    // Set up canvas for WebXR
    const gl = canvas.getContext('webgl', { 
      xrCompatible: true,
      antialias: true,
      alpha: true
    });

    if (!gl) {
      throw new Error('Failed to get WebGL context');
    }

    // Make the WebGL context the base layer for the XR session
    await xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(xrSession, gl)
    });

    // Set canvas size to match the XR viewport
    canvas.width = gl.drawingBufferWidth;
    canvas.height = gl.drawingBufferHeight;

    // Get reference space for tracking
    referenceSpace = await xrSession.requestReferenceSpace('local');

    // Handle session end
    xrSession.addEventListener('end', handleSessionEnd);

    // Initialize marker tracking (Step 4)
    try {
      console.log('Initializing marker tracking...');
      const trackedImage = await initializeMarkerTracking(xrSession);
      if (trackedImage) {
        console.log('✅ Marker tracking initialized');
        
        // Set up marker detection callback (Step 5)
        onMarkerDetected((pose) => {
          console.log('🎯 Marker detected callback triggered - ready for animation!');
          // Animation will be triggered here in Step 6
        });
      } else {
        console.log('ℹ️ Marker image loaded but tracking not available on this platform');
        console.log('ℹ️ This is normal on Mac/Desktop - will work on Android Chrome');
      }
    } catch (error) {
      // Only show error if it's not a platform limitation
      if (!error.message.includes('expected on Mac/Desktop')) {
        console.error('⚠️ Marker tracking initialization failed:', error);
      }
      // Continue anyway - we can still test the AR session
      // In production, you might want to handle this differently
    }

    // Start the render loop (will be expanded in later steps)
    xrSession.requestAnimationFrame(onXRFrame);

    console.log('WebXR session initialized and ready');
    return true;

  } catch (error) {
    console.error('Failed to start AR session:', error);
    showError(`Failed to start AR: ${error.message}`);
    return false;
  }
}

// Handle XR frame - Step 5: Marker Detection
function onXRFrame(time, frame) {
  if (!xrSession || !referenceSpace) return;

  // Continue the render loop
  xrSession.requestAnimationFrame(onXRFrame);

  // Get the WebGL context
  const gl = canvas.getContext('webgl');
  if (!gl) return;

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Get the viewer pose for this frame
  const viewerPose = frame.getViewerPose(referenceSpace);
  
  if (viewerPose) {
    // Session is active and tracking
    
    // Step 5: Update marker tracking - check if marker is detected
    const markerPose = updateMarkerTracking(frame, referenceSpace);
    
    if (markerPose) {
      // Marker is detected and we have its pose
      // The pose contains:
      // - markerPose.transform.position (x, y, z in meters)
      // - markerPose.transform.orientation (quaternion)
      // - markerPose.transform.matrix (4x4 transformation matrix)
      
      // This pose will be used in Step 6 to position the video/animation
      // For now, we just log that it's detected
      // (Logging every frame would be too verbose, so we only log on first detection)
    }
    
    // In Step 6, we'll render the video/animation here using the markerPose
  }
}

// Handle session end
function handleSessionEnd() {
  console.log('AR session ended');
  xrSession = null;
  
  // Reset canvas
  const gl = canvas.getContext('webgl');
  if (gl) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }
}

// Show error message (temporary - no UI, so we'll use console and alert)
function showError(message) {
  console.error('ERROR:', message);
  // In production, you might want to show a user-friendly message
  // For now, we'll just log it
  alert(message); // Temporary - will be removed when we have proper error handling
}

// Initialize WebXR when page loads
async function init() {
  console.log('Initializing WebXR Gift Card...');

  // Check support
  const isSupported = await checkWebXRSupport();
  if (!isSupported) {
    return;
  }

  // Automatically request AR session (no UI needed as per requirements)
  // Note: This will request camera permission automatically
  const sessionStarted = await requestARSession();
  
  if (sessionStarted) {
    console.log('✅ WebXR AR session is active and ready for marker tracking');
  } else {
    console.error('❌ Failed to start AR session');
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

