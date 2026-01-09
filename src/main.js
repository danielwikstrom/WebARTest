// WebXR Gift Card - Main Entry Point
// Step 3: WebXR Session Initialization
// Step 4: Marker Image Registration  
// Step 5: Marker Detection and Tracking
// Using Three.js WebGLRenderer like WebXRGaussian does

import * as THREE from 'three';
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
let xrLayer = null; // Store the XR layer for framebuffer binding
let renderer = null; // Three.js renderer (like WebXRGaussian uses)

// Debug overlay setup (hidden by default now that camera works)
const debugContent = document.getElementById('debug-content');
const debugToggle = document.getElementById('debug-toggle');
let debugVisible = false; // Hide debug by default
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

// Force debug overlay to stay visible
function forceDebugVisible() {
  const overlay = document.getElementById('debug-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    overlay.style.zIndex = '2147483647';
  }
}

// Periodically check and force debug overlay visibility
setInterval(() => {
  forceDebugVisible();
}, 100);

// Hide debug overlay by default
const debugOverlay = document.getElementById('debug-overlay');
if (debugOverlay) {
  debugOverlay.style.display = 'none';
}

// Toggle debug overlay
debugToggle.addEventListener('click', () => {
  debugVisible = !debugVisible;
  const overlay = document.getElementById('debug-overlay');
  if (debugVisible) {
    forceDebugVisible();
  } else {
    overlay.style.display = 'none';
  }
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

  return true;
}

// Request AR session with image tracking
async function requestARSession() {
  try {
    if (!navigator.xr) {
      throw new Error('WebXR not available');
    }

    debugLog('Requesting AR session (basic camera feed only)...', 'info');

    // Request immersive AR session with image tracking
    const sessionInit = {
      requiredFeatures: ['local'], // Required for AR
      optionalFeatures: ['image-tracking'] // Image tracking for marker detection
    };

    debugLog('Calling navigator.xr.requestSession...', 'info');
    xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);
    
    debugLog('AR session started successfully!', 'success');
    updateDebugStatus();

    // Set up Three.js WebGLRenderer (like WebXRGaussian does)
    // This is the key difference - Three.js handles XR session properly
    debugLog('Creating Three.js WebGLRenderer...', 'info');
    renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: false, // Like WebXRGaussian
      alpha: true, // Transparent background so camera shows through
      powerPreference: 'high-performance'
    });
    
    // Set clear color to transparent (important for camera feed to show!)
    renderer.setClearColor(0x000000, 0); // Black with 0 alpha = transparent
    
    // Enable XR on the renderer (this is crucial!)
    renderer.xr.enabled = true;
    renderer.xr.setSession(xrSession);
    
    debugLog('Three.js renderer created and XR enabled', 'success');
    debugLog(`Renderer size: ${renderer.getSize(new THREE.Vector2()).x}x${renderer.getSize(new THREE.Vector2()).y}`, 'info');
    
    // Set renderer size to match screen
    const screenWidth = window.innerWidth || canvas.offsetWidth;
    const screenHeight = window.innerHeight || canvas.offsetHeight;
    renderer.setSize(screenWidth, screenHeight);
    debugLog(`Renderer resized to: ${screenWidth}x${screenHeight}`, 'info');
    
    // Get the WebGL context from Three.js renderer
    const gl = renderer.getContext();
    debugLog(`WebGL context from Three.js renderer obtained`, 'success');
    
    // The XR session is now managed by Three.js renderer
    // Three.js automatically creates the XRWebGLLayer and handles camera feed
    debugLog('Three.js is managing XR session - camera feed should work', 'info');
    
    // Three.js renderer handles canvas sizing automatically
    // Verify canvas is visible
    const canvasStyle = window.getComputedStyle(canvas);
    debugLog(`Canvas display: ${canvasStyle.display}, visibility: ${canvasStyle.visibility}`, 'info');
    debugLog(`Canvas position: ${canvasStyle.position}, z-index: ${canvasStyle.zIndex}`, 'info');
    debugLog(`Canvas dimensions: ${canvas.offsetWidth}x${canvas.offsetHeight}`, 'info');

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

    // Start the render loop using Three.js renderer
    // Three.js handles the XR frame loop automatically
    debugLog('Starting Three.js XR render loop...', 'info');
    
    // Create a simple scene (needed for Three.js to render)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, screenWidth / screenHeight, 0.1, 1000);
    scene.add(camera);
    
    // Store scene and camera for later use (marker tracking, video rendering)
    window.xrScene = scene;
    window.xrCamera = camera;
    
    // Start the render loop
    renderer.setAnimationLoop((time, frame) => {
      // Three.js automatically handles XR rendering and camera feed
      renderer.render(scene, camera);
      frameCount++;
      
      // Update marker tracking (Step 5)
      if (xrSession && referenceSpace && frame) {
        const markerPose = updateMarkerTracking(frame, referenceSpace);
        
        if (markerPose) {
          // Marker is detected - we have its pose
          // This will be used in Step 6 to position the video/animation
          // For now, we just track it (logging happens in marker-tracker.js)
        }
      }
      
      if (frameCount === 1) {
        debugLog('✅ Three.js render loop started', 'success');
        debugLog('Camera feed should be visible via Three.js XR', 'info');
      }
      
      // Update debug status periodically
      if (frameCount % 60 === 0) {
        updateDebugStatus();
      }
    });

    debugLog('WebXR session initialized - camera feed should be visible', 'success');
    debugLog('If you see black screen, the XRWebGLLayer may not be rendering', 'warning');
    
    // iOS WebXRViewer specific note
    if (navigator.userAgent.includes('WebXRViewer')) {
      debugLog('⚠️ iOS WebXRViewer detected - camera feed support may be limited', 'warning');
      debugLog('Consider testing on Android Chrome for full WebXR support', 'info');
    }
    
    return true;

  } catch (error) {
    debugLog(`Failed to start AR session: ${error.message}`, 'error');
    debugLog(`Error stack: ${error.stack}`, 'error');
    showError(`Failed to start AR: ${error.message}`);
    return false;
  }
}

// Three.js handles the render loop automatically via setAnimationLoop
// No need for manual onXRFrame function - Three.js does it all!

// Handle session end
function handleSessionEnd() {
  debugLog('AR session ended', 'warning');
  
  // Stop Three.js animation loop
  if (renderer) {
    renderer.setAnimationLoop(null);
    debugLog('Three.js animation loop stopped', 'info');
  }
  
  xrSession = null;
  referenceSpace = null;
  renderer = null;
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

