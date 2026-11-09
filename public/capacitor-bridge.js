// Capacitor Native Bridge for ST Tracker
// This file adds native app capabilities when running in Capacitor

(function() {
  // Check if running in Capacitor
  const isCapacitor = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  
  if (!isCapacitor) {
    console.log('Running in browser mode');
    return;
  }
  
  console.log('Running in Capacitor native mode');
  
  // Import Capacitor plugins
  const { Geolocation } = Capacitor.Plugins;
  const { PushNotifications } = Capacitor.Plugins;
  const { StatusBar } = Capacitor.Plugins;
  const { Haptics } = Capacitor.Plugins;
  const { SplashScreen } = Capacitor.Plugins;
  
  // NFC variables
  let cardEmulationEnabled = true;
  let nfcListeners = [];
  
  // Card Emulation (HCE) support for Android
  // The CardEmulationService runs natively — this bridge listens for
  // broadcast events and forwards them to the WebView.
  function setupCardEmulation() {
    console.log('Setting up HCE card emulation bridge');
    
    // Listen for CARD_TAPPED broadcast from CardEmulationService
    // The native service sends a broadcast when a reader taps the phone
    if (typeof Capacitor !== 'undefined') {
      // Register a broadcast receiver via Capacitor plugin or custom bridge
      // For now, we use a polling approach + the JavaScript event bridge
      
      // The MainActivity will forward the broadcast to WebView
      // by calling window.dispatchEvent(new Event('card-tapped'))
      console.log('HCE bridge ready — waiting for card tap events');
    }
  }

  // Override geolocation with Capacitor's native implementation
  if (Geolocation) {
    // Store original functions
    const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    const originalWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);
    
    navigator.geolocation.getCurrentPosition = async function(success, error, options) {
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000
        });
        success({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
          },
          timestamp: position.timestamp
        });
      } catch (e) {
        if (error) error({ code: 1, message: e.message });
      }
    };
    
    navigator.geolocation.watchPosition = function(success, error, options) {
      const watchId = Geolocation.watchPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? true
      }, (position, err) => {
        if (err) {
          if (error) error({ code: 1, message: err.message });
          return;
        }
        success({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
          },
          timestamp: position.timestamp
        });
      });
      return watchId;
    };
  }
  
  // Set card emulation active/inactive
  function setCardEmulation(active) {
    cardEmulationEnabled = active;
    console.log('Card emulation ' + (active ? 'enabled' : 'disabled'));
    // The native CardEmulationService.setEmulationActive() would be called
    // via a Capacitor plugin in production — for now, state is tracked in JS
  }
  
  // Handle card tap event (called from MainActivity when broadcast received)
  function onCardTapped() {
    console.log('Card tapped by reader!');
    
    if (!cardEmulationEnabled) {
      console.log('Card emulation disabled, ignoring tap');
      return;
    }
    
    // Vibrate
    if (Haptics) {
      Haptics.notification({ type: 'SUCCESS' });
    } else if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    // Dispatch event for the WebView app.js to handle
    window.dispatchEvent(new Event('card-tapped'));
    
    // Notify any registered listeners
    nfcListeners.forEach(callback => {
      try {
        callback({ type: 'card-tapped', timestamp: Date.now() });
      } catch (e) {
        console.error('NFC listener error:', e);
      }
    });
  }
  
  // Play NFC scan sound (kept for WebView demo mode)
  function playNfcSound() {
    try {
      const audio = new Audio('sounds/orca-scan.mp3');
      audio.volume = 1.0;
      audio.play().catch(e => {
        console.log('Audio play error, using fallback:', e);
        playFallbackBeep();
      });
    } catch (e) {
      console.log('Audio error:', e);
      playFallbackBeep();
    }
  }
  
  // Fallback beep using Web Audio API
  function playFallbackBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const frequencies = [880, 1100];
      const duration = 0.12;
      const gap = 0.05;
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = audioCtx.currentTime + (index * (duration + gap));
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    } catch (e) {
      console.log('Web Audio error:', e);
    }
  }
  
  // Show card tap notification in modal
  function showCardTapNotification() {
    const modal = document.getElementById('nfc-modal');
    const serialEl = document.getElementById('nfc-serial');
    
    if (modal) {
      if (serialEl) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        serialEl.textContent = 'Tap time: ' + timeStr;
      }
      modal.classList.add('show');
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        modal.classList.remove('show');
      }, 3000);
    }
  }
  
  // Setup Push Notifications
  async function setupPushNotifications() {
    if (!PushNotifications) return;
    
    try {
      // Request permission
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive === 'granted') {
        await PushNotifications.register();
      }
      
      // Listen for registration
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration token:', token.value);
        // Store token for later use
        localStorage.setItem('pushToken', token.value);
      });
      
      // Listen for push notifications
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
        // Trigger haptic feedback
        if (Haptics) {
          Haptics.notification({ type: 'SUCCESS' });
        }
      });
      
      // Handle notification tap
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push notification action:', action);
      });
    } catch (e) {
      console.error('Push notification setup error:', e);
    }
  }
  
  // Setup Status Bar
  async function setupStatusBar() {
    if (!StatusBar) return;
    
    try {
      await StatusBar.setBackgroundColor({ color: '#0072CE' });
      await StatusBar.setStyle({ style: 'DARK' });
    } catch (e) {
      console.error('Status bar setup error:', e);
    }
  }
  
  // Add haptic feedback to buttons
  function addHapticFeedback() {
    if (!Haptics) return;
    
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.matches('button, .btn, .line-btn, .dir-btn, .arrival-card')) {
        Haptics.impact({ style: 'LIGHT' });
      }
    });
  }
  
  // Hide splash screen when app is ready
  async function hideSplash() {
    if (!SplashScreen) return;
    
    try {
      await SplashScreen.hide();
    } catch (e) {
      console.error('Splash screen error:', e);
    }
  }
  
  // Initialize native features
  document.addEventListener('DOMContentLoaded', async () => {
    await setupStatusBar();
    await setupPushNotifications();
    addHapticFeedback();
    setupCardEmulation();
    
    // Hide splash after a short delay
    setTimeout(hideSplash, 500);
  });
  
  // Expose native functions globally
  window.STNative = {
    isCapacitor: true,
    cardEmulationEnabled: () => cardEmulationEnabled,
    setCardEmulation: setCardEmulation,
    haptic: (style = 'MEDIUM') => {
      if (Haptics) Haptics.impact({ style });
    },
    onCardTapped: onCardTapped,
    onNfcScan: (callback) => {
      nfcListeners.push(callback);
    },
    playNfcSound: playNfcSound,
    showCardTapNotification: showCardTapNotification
  };
})();
