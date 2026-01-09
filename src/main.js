// WebXR Gift Card - Main Entry Point
// Simplified: Basic camera feed only (marker tracking removed for debugging)

const canvas = document.getElementById('xr-canvas');
let xrSession = null;
let xrButton = null; // Will be used for manual trigger if needed
let referenceSpace = null;
let xrLayer = null; // Store the XR layer for framebuffer binding

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

    // Request immersive AR session - simplified, no image tracking
    const sessionInit = {
      requiredFeatures: ['local'] // Required for AR
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
    xrLayer = new XRWebGLLayer(xrSession, gl);
    await xrSession.updateRenderState({
      baseLayer: xrLayer
    });
    
    debugLog(`XRWebGLLayer created. Antialias: ${xrLayer.antialias}, IgnoreDepthValues: ${xrLayer.ignoreDepthValues}`, 'info');
    debugLog(`XRWebGLLayer framebuffer: ${xrLayer.framebufferWidth}x${xrLayer.framebufferHeight}`, 'info');
    debugLog(`XRWebGLLayer framebuffer object: ${xrLayer.framebuffer}`, xrLayer.framebuffer ? 'success' : 'warning');
    
    if (!xrLayer.framebuffer) {
      debugLog('⚠️ Framebuffer is null - this is normal on iOS WebXRViewer', 'warning');
      debugLog('The camera feed should still work - XRWebGLLayer handles it', 'info');
    }

    // Set canvas size - on iOS WebXRViewer, we might need to use screen size
    // instead of the small framebuffer size
    const screenWidth = window.innerWidth || canvas.offsetWidth;
    const screenHeight = window.innerHeight || canvas.offsetHeight;
    
    // Try setting canvas to screen size first (iOS WebXRViewer might need this)
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    debugLog(`Canvas set to screen size: ${canvas.width}x${canvas.height}`, 'info');
    debugLog(`GL drawingBuffer: ${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`, 'info');
    debugLog(`Screen dimensions: ${screenWidth}x${screenHeight}`, 'info');
    
    // Try to get the actual render state to see the real dimensions
    const renderState = xrSession.renderState;
    if (renderState && renderState.baseLayer) {
      debugLog(`BaseLayer framebuffer: ${renderState.baseLayer.framebufferWidth}x${renderState.baseLayer.framebufferHeight}`, 'info');
    }
    
    // On iOS WebXRViewer, the framebuffer might be null, so we need to
    // ensure the canvas is the right size for the camera feed
    debugLog('Canvas size set - camera feed should match screen', 'info');
    
    // Verify canvas is visible
    const canvasStyle = window.getComputedStyle(canvas);
    debugLog(`Canvas display: ${canvasStyle.display}, visibility: ${canvasStyle.visibility}`, 'info');
    debugLog(`Canvas position: ${canvasStyle.position}, z-index: ${canvasStyle.zIndex}`, 'info');
    debugLog(`Canvas dimensions: ${canvas.offsetWidth}x${canvas.offsetHeight}`, 'info');
    
    // On iOS WebXRViewer, we might need to wait for the session to fully initialize
    debugLog('Waiting for session to fully initialize...', 'info');

    // Get reference space for tracking
    debugLog('Requesting reference space...', 'info');
    referenceSpace = await xrSession.requestReferenceSpace('local');
    debugLog('Reference space obtained', 'success');
    updateDebugStatus();

    // Handle session end
    xrSession.addEventListener('end', handleSessionEnd);

    // Start the render loop - just for camera feed
    debugLog('Starting render loop for camera feed...', 'info');
    xrSession.requestAnimationFrame(onXRFrame);

    debugLog('WebXR session initialized - camera feed should be visible', 'success');
    debugLog('If you see black screen, the XRWebGLLayer may not be rendering', 'warning');
    return true;

  } catch (error) {
    debugLog(`Failed to start AR session: ${error.message}`, 'error');
    debugLog(`Error stack: ${error.stack}`, 'error');
    showError(`Failed to start AR: ${error.message}`);
    return false;
  }
}

// Handle XR frame - Simple camera feed only
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
    debugLog('Camera feed should be visible now', 'info');
    updateDebugStatus();
  } else if (frameCount % 60 === 0) {
    // Update status every 60 frames (~1 second at 60fps)
    updateDebugStatus();
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

  // IMPORTANT: On iOS WebXRViewer, the framebuffer might be null
  // The camera feed should still work without explicitly binding it
  // The XRWebGLLayer handles the camera feed automatically
  
  if (xrLayer) {
    if (xrLayer.framebuffer) {
      // Framebuffer is available - bind it (standard WebXR behavior)
      gl.bindFramebuffer(gl.FRAMEBUFFER, xrLayer.framebuffer);
      gl.viewport(0, 0, xrLayer.framebufferWidth, xrLayer.framebufferHeight);
      
      if (frameCount === 1) {
        debugLog(`✅ Bound XR framebuffer: ${xrLayer.framebufferWidth}x${xrLayer.framebufferHeight}`, 'success');
      }
    } else {
      // Framebuffer is null (iOS WebXRViewer behavior)
      // Bind to default framebuffer (null/0)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      
      // Set viewport to canvas size (not drawingBuffer size)
      // On iOS, the canvas size should match the screen
      const viewportWidth = canvas.width || gl.drawingBufferWidth;
      const viewportHeight = canvas.height || gl.drawingBufferHeight;
      gl.viewport(0, 0, viewportWidth, viewportHeight);
      
      if (frameCount === 1) {
        debugLog('⚠️ Framebuffer is null (iOS WebXRViewer) - using default framebuffer', 'warning');
        debugLog(`Viewport set to canvas size: ${viewportWidth}x${viewportHeight}`, 'info');
        debugLog('Camera feed should be handled by XRWebGLLayer automatically', 'info');
        debugLog('If still black, iOS WebXRViewer might need different approach', 'warning');
      }
    }
  } else {
    if (frameCount === 1) {
      debugLog('❌ XR layer not available', 'error');
    }
  }

  // Force debug overlay to stay visible (in case it gets hidden)
  if (frameCount % 30 === 0) {
    forceDebugVisible();
  }

  // In WebXR immersive AR, the camera feed should be automatically composited
  // by the XRWebGLLayer. However, on some platforms (like iOS WebXRViewer),
  // we might need to do a minimal render operation to trigger the camera feed.
  
  // On iOS WebXRViewer, the camera feed should appear automatically
  // Don't clear or render anything - let the XRWebGLLayer handle it
  // Any clearing might hide the camera feed
  
  // Just ensure we're ready - the camera feed should be composited by the browser
  if (frameCount === 1) {
    debugLog('First frame - camera feed should be visible if XRWebGLLayer is working', 'info');
    debugLog('No clearing performed - letting XRWebGLLayer handle camera', 'info');
  }
  
  // Note: If camera is still black, it might be:
  // 1. iOS WebXRViewer specific behavior
  // 2. Camera permissions issue
  // 3. XRWebGLLayer not properly initialized
  // 4. Browser needs different rendering approach

  // Get the viewer pose for this frame (just to verify tracking is working)
  const viewerPose = frame.getViewerPose(referenceSpace);
  
  if (viewerPose) {
    // Session is active and tracking
    if (frameCount === 1) {
      debugLog('✅ Viewer pose available - tracking active', 'success');
      debugLog('If camera is black, check XRWebGLLayer setup', 'warning');
    }
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

