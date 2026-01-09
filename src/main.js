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

// Debug overlay setup
const debugContent = document.getElementById('debug-content');
const debugToggle = document.getElementById('debug-toggle');
let debugVisible = true;
let frameCount = 0;

// Debug logging functions
function debugLog(message, type = 'info') {
  const className = `debug-${type}`;
  const line = document.createElement('div');
  line.className = `debug-line ${className}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  debugContent.appendChild(line);
  debugContent.scrollTop = debugContent.scrollHeight;
  console.log(`[DEBUG] ${message}`);
}

function updateDebugStatus() {
  const status = {
    webxr: !!navigator.xr,
    session: !!xrSession,
    referenceSpace: !!referenceSpace,
    canvas: !!canvas,
    gl: !!canvas?.getContext('webgl'),
    frames: frameCount,
    canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'N/A'
  };
  
  const statusDiv = document.getElementById('debug-status');
  if (!statusDiv) {
    const div = document.createElement('div');
    div.id = 'debug-status';
    div.className = 'debug-line debug-info';
    debugContent.insertBefore(div, debugContent.firstChild);
  }
  
  const statusEl = document.getElementById('debug-status');
  statusEl.innerHTML = `<strong>Status:</strong><br>
    WebXR: ${status.webxr ? '✅' : '❌'} | 
    Session: ${status.session ? '✅' : '❌'} | 
    GL: ${status.gl ? '✅' : '❌'}<br>
    Frames: ${frameCount} | 
    Canvas: ${status.canvasSize}`;
}

// Toggle debug overlay
debugToggle.addEventListener('click', () => {
  debugVisible = !debugVisible;
  const overlay = document.getElementById('debug-overlay');
  overlay.style.display = debugVisible ? 'block' : 'none';
  debugToggle.textContent = debugVisible ? 'Hide Debug' : 'Show Debug';
});

// Check WebXR support
async function checkWebXRSupport() {
  debugLog('Checking WebXR support...', 'info');
  updateDebugStatus();
  
  if (!navigator.xr) {
    debugLog('WebXR is not supported in this browser', 'error');
    showError('WebXR is not supported. Please use a compatible browser like Chrome on Android.');
    return false;
  }

  debugLog('navigator.xr found', 'success');
  
  // Check if immersive AR is supported
  let isARSupported = false;
  try {
    isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
    debugLog(`Immersive AR supported: ${isARSupported}`, isARSupported ? 'success' : 'error');
  } catch (error) {
    debugLog(`Error checking AR support: ${error.message}`, 'error');
    showError('AR mode is not supported on this device.');
    return false;
  }

  if (!isARSupported) {
    debugLog('Immersive AR is not supported', 'error');
    showError('AR mode is not supported on this device.');
    return false;
  }

  // Check if image tracking is available
  const isImageTrackingSupported = 'ImageTracking' in window && 
                                   'XRTrackedImageImage' in window;
  
  debugLog(`Image tracking available: ${isImageTrackingSupported}`, isImageTrackingSupported ? 'success' : 'warning');
  
  if (!isImageTrackingSupported) {
    debugLog('Image tracking may not be supported - this feature is experimental', 'warning');
  }

  return true;
}

// Request AR session with image tracking
async function requestARSession() {
  try {
    if (!navigator.xr) {
      throw new Error('WebXR not available');
    }

    debugLog('Requesting AR session with image tracking...', 'info');

    // Request immersive AR session with image-tracking feature
    const sessionInit = {
      requiredFeatures: ['local'], // Required for AR
      optionalFeatures: ['image-tracking'] // Image tracking (may not be available on all devices)
    };

    debugLog('Calling navigator.xr.requestSession...', 'info');
    xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);
    
    debugLog('AR session started successfully!', 'success');
    updateDebugStatus();

    // Set up canvas for WebXR
    debugLog('Getting WebGL context...', 'info');
    const gl = canvas.getContext('webgl', { 
      xrCompatible: true,
      antialias: true,
      alpha: true
    });

    if (!gl) {
      debugLog('Failed to get WebGL context', 'error');
      throw new Error('Failed to get WebGL context');
    }

    debugLog(`WebGL context created. Canvas: ${canvas.width}x${canvas.height}`, 'success');

    // Make the WebGL context the base layer for the XR session
    debugLog('Creating XRWebGLLayer...', 'info');
    await xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(xrSession, gl)
    });

    // Set canvas size to match the XR viewport
    canvas.width = gl.drawingBufferWidth;
    canvas.height = gl.drawingBufferHeight;
    debugLog(`Canvas resized to: ${canvas.width}x${canvas.height}`, 'info');

    // Get reference space for tracking
    debugLog('Requesting reference space...', 'info');
    referenceSpace = await xrSession.requestReferenceSpace('local');
    debugLog('Reference space obtained', 'success');
    updateDebugStatus();

    // Handle session end
    xrSession.addEventListener('end', handleSessionEnd);

    // Initialize marker tracking (Step 4)
    try {
      debugLog('Initializing marker tracking...', 'info');
      const trackedImage = await initializeMarkerTracking(xrSession);
      if (trackedImage) {
        debugLog('✅ Marker tracking initialized', 'success');
        
        // Set up marker detection callback (Step 5)
        onMarkerDetected((pose) => {
          debugLog('🎯 Marker detected! Ready for animation!', 'success');
          // Animation will be triggered here in Step 6
        });
      } else {
        debugLog('ℹ️ Marker image loaded but tracking not available on this platform', 'warning');
        debugLog('ℹ️ This is normal on Mac/Desktop - will work on Android Chrome', 'warning');
      }
    } catch (error) {
      // Only show error if it's not a platform limitation
      if (!error.message.includes('expected on Mac/Desktop')) {
        debugLog(`⚠️ Marker tracking initialization failed: ${error.message}`, 'error');
      }
      // Continue anyway - we can still test the AR session
    }

    // Start the render loop (will be expanded in later steps)
    debugLog('Starting render loop...', 'info');
    xrSession.requestAnimationFrame(onXRFrame);

    debugLog('WebXR session initialized and ready', 'success');
    return true;

  } catch (error) {
    debugLog(`Failed to start AR session: ${error.message}`, 'error');
    debugLog(`Error stack: ${error.stack}`, 'error');
    showError(`Failed to start AR: ${error.message}`);
    return false;
  }
}

// Handle XR frame - Step 5: Marker Detection
function onXRFrame(time, frame) {
  if (!xrSession || !referenceSpace) {
    if (frameCount === 0) {
      debugLog('Render loop started but session/referenceSpace missing', 'error');
    }
    return;
  }

  frameCount++;
  
  // Update debug info periodically
  if (frameCount === 1) {
    debugLog('✅ Render loop running! Frame 1 processed', 'success');
    updateDebugStatus();
  } else if (frameCount % 60 === 0) {
    // Update status every 60 frames (~1 second at 60fps)
    updateDebugStatus();
    debugLog(`Frames processed: ${frameCount}`, 'info');
  }

  // Continue the render loop
  xrSession.requestAnimationFrame(onXRFrame);

  // Get the WebGL context
  const gl = canvas.getContext('webgl');
  if (!gl) {
    if (frameCount === 1) {
      debugLog('Failed to get WebGL context in render loop', 'error');
    }
    return;
  }

  // IMPORTANT: In WebXR immersive AR, the XRWebGLLayer automatically displays
  // the camera feed. We should NOT clear the canvas as it will hide the camera.
  // Only clear if we're rendering custom content on top.
  // For now, we'll skip clearing to see the camera feed.
  // gl.clearColor(0, 0, 0, 0);
  // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Get the viewer pose for this frame
  const viewerPose = frame.getViewerPose(referenceSpace);
  
  if (viewerPose) {
    // Session is active and tracking
    if (frameCount === 1) {
      debugLog('✅ Viewer pose available - camera should be visible', 'success');
    }
    
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
  } else {
    if (frameCount === 1) {
      debugLog('⚠️ Viewer pose not available on first frame', 'warning');
    }
  }
}

// Handle session end
function handleSessionEnd() {
  debugLog('AR session ended', 'warning');
  xrSession = null;
  referenceSpace = null;
  updateDebugStatus();
  
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
  debugLog('Initializing WebXR Gift Card...', 'info');
  debugLog(`User Agent: ${navigator.userAgent}`, 'info');
  debugLog(`HTTPS: ${location.protocol === 'https:'}`, location.protocol === 'https:' ? 'success' : 'error');

  // Check support
  const isSupported = await checkWebXRSupport();
  if (!isSupported) {
    debugLog('WebXR support check failed', 'error');
    return;
  }

  // Automatically request AR session (no UI needed as per requirements)
  // Note: This will request camera permission automatically
  debugLog('Attempting to start AR session...', 'info');
  const sessionStarted = await requestARSession();
  
  if (sessionStarted) {
    debugLog('✅ WebXR AR session is active and ready for marker tracking', 'success');
  } else {
    debugLog('❌ Failed to start AR session', 'error');
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

