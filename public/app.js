// State
let currentLine = '2_line';
let currentStation = 'downtown_redmond';
let currentDirection = 'southbound';
let refreshTimeout = null;
let nextArrivalTime = null;
let locationGranted = false;
let currentDistance = null;
let isFirstLoad = true;
let isOnboard = false;  // User is on the train
let manualSelection = false;  // User manually selected a station
let watchId = null;     // Geolocation watch ID
let userLat = null;
let userLon = null;

// All lines data
const lines = {
  '1_line': {
    name: '1 Line',
    color: '#0072CE',
    directions: {
      southbound: '↓ Southbound (Federal Way)',
      northbound: '↑ Northbound (Lynnwood)'
    },
    stationOrder: [
      'lynnwood', 'mountlake_terrace', 'shoreline_north', 'shoreline_south',
      'northgate', 'roosevelt', 'u_district', 'uw', 'capitol_hill',
      'westlake', 'symphony', 'pioneer_square', 'chinatown', 'stadium', 'sodo',
      'beacon_hill', 'mount_baker', 'columbia_city', 'othello', 'rainier_beach',
      'tukwila', 'seatac', 'angle_lake', 'kent_des_moines', 'star_lake', 'federal_way'
    ],
    stations: {
      'lynnwood': { name: 'Lynnwood City Center', lat: 47.815637, lon: -122.294779 },
      'mountlake_terrace': { name: 'Mountlake Terrace', lat: 47.785057, lon: -122.314788 },
      'shoreline_north': { name: 'Shoreline North/185th', lat: 47.764067, lon: -122.322889 },
      'shoreline_south': { name: 'Shoreline South/148th', lat: 47.736095, lon: -122.325227 },
      'northgate': { name: 'Northgate', lat: 47.703028, lon: -122.32829 },
      'roosevelt': { name: 'Roosevelt', lat: 47.676595, lon: -122.315976 },
      'u_district': { name: 'U District', lat: 47.660301, lon: -122.314132 },
      'uw': { name: 'Univ of Washington', lat: 47.649815, lon: -122.303763 },
      'capitol_hill': { name: 'Capitol Hill', lat: 47.61906, lon: -122.320195 },
      'westlake': { name: 'Westlake', lat: 47.611572, lon: -122.33672 },
      'symphony': { name: 'Symphony', lat: 47.60781, lon: -122.33602 },
      'pioneer_square': { name: 'Pioneer Square', lat: 47.60256, lon: -122.331216 },
      'chinatown': { name: "Int'l Dist/Chinatown", lat: 47.598355, lon: -122.327992 },
      'stadium': { name: 'Stadium', lat: 47.591108, lon: -122.327172 },
      'sodo': { name: 'SODO', lat: 47.581074, lon: -122.32739 },
      'beacon_hill': { name: 'Beacon Hill', lat: 47.579328, lon: -122.311533 },
      'mount_baker': { name: 'Mount Baker', lat: 47.57655, lon: -122.297679 },
      'columbia_city': { name: 'Columbia City', lat: 47.559733, lon: -122.292692 },
      'othello': { name: 'Othello', lat: 47.537987, lon: -122.281563 },
      'rainier_beach': { name: 'Rainier Beach', lat: 47.522394, lon: -122.279391 },
      'tukwila': { name: "Tukwila Int'l Blvd", lat: 47.464031, lon: -122.287996 },
      'seatac': { name: 'SeaTac/Airport', lat: 47.445381, lon: -122.296898 },
      'angle_lake': { name: 'Angle Lake', lat: 47.422703, lon: -122.297714 },
      'kent_des_moines': { name: 'Kent Des Moines', lat: 47.389552, lon: -122.294399 },
      'star_lake': { name: 'Star Lake', lat: 47.359388, lon: -122.297391 },
      'federal_way': { name: 'Federal Way Downtown', lat: 47.315903, lon: -122.303829 }
    }
  },
  '2_line': {
    name: '2 Line',
    color: '#E31837',
    directions: {
      southbound: '↓ Southbound (Bellevue)',
      northbound: '↑ Northbound (Redmond)'
    },
    stationOrder: [
      'downtown_redmond', 'marymoor_village', 'redmond_tech', 'overlake_village',
      'bel_red', 'spring_district', 'wilburton', 'bellevue_downtown', 'east_main', 'south_bellevue'
    ],
    stations: {
      'downtown_redmond': { name: 'Downtown Redmond', lat: 47.671467, lon: -122.117864 },
      'marymoor_village': { name: 'Marymoor Village', lat: 47.667166, lon: -122.110398 },
      'redmond_tech': { name: 'Redmond Technology', lat: 47.644424, lon: -122.133556 },
      'overlake_village': { name: 'Overlake Village', lat: 47.636151, lon: -122.139236 },
      'bel_red': { name: 'BelRed', lat: 47.624499, lon: -122.166364 },
      'spring_district': { name: 'Spring District', lat: 47.623772, lon: -122.178901 },
      'wilburton': { name: 'Wilburton', lat: 47.617909, lon: -122.183806 },
      'east_main': { name: 'East Main', lat: 47.607707, lon: -122.191202 },
      'bellevue_downtown': { name: 'Bellevue Downtown', lat: 47.615285, lon: -122.192531 },
      'south_bellevue': { name: 'South Bellevue', lat: 47.586932, lon: -122.190604 }
    }
  }
};

// Helper to get current line data
function getLineData() {
  return lines[currentLine] || lines['2_line'];
}

function getStations() {
  return getLineData().stations;
}

function getStationOrder() {
  return getLineData().stationOrder;
}

// Cookie helpers (10 year expiry)
function setCookie(name, value) {
  const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// Clean up old/invalid cookies
function cleanupOldCookies() {
  // Delete any old format cookies that might cause issues
  const oldCookieNames = ['station', 'direction', 'bus_prefs', 'transit_station', 'transit_direction'];
  oldCookieNames.forEach(function(name) {
    deleteCookie(name);
  });
  
  // Validate current cookies - if station doesn't exist in current line, clear it
  const savedStation = getCookie('bus_station');
  if (savedStation && !getStations()[savedStation]) {
    deleteCookie('bus_station');
  }
  
  // Load saved line
  const savedLine = getCookie('bus_line');
  if (savedLine && lines[savedLine]) {
    currentLine = savedLine;
  }
  
  // Validate direction
  const savedDirection = getCookie('bus_direction');
  if (savedDirection && savedDirection !== 'southbound' && savedDirection !== 'northbound') {
    deleteCookie('bus_direction');
  }
}

// Load saved direction
function loadPreferences() {
  const savedDirection = getCookie('bus_direction');
  if (savedDirection && (savedDirection === 'southbound' || savedDirection === 'northbound')) {
    currentDirection = savedDirection;
  }
}

// Load station from cookie (fallback when no location)
function loadStationFromCookie() {
  const savedStation = getCookie('bus_station');
  var stationsMap = getStations();
  if (savedStation && stationsMap[savedStation]) {
    currentStation = savedStation;
  } else {
    // Default to first station of current line
    currentStation = getStationOrder()[0];
  }
}

// Save preferences
function savePreferences() {
  setCookie('bus_line', currentLine);
  setCookie('bus_direction', currentDirection);
  if (!locationGranted) {
    setCookie('bus_station', currentStation);
  }
}

// Calculate distance (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

// Find nearest station (searches current line first, then all lines)
function findNearestStation(lat, lon) {
  let nearest = null;
  let minDistance = Infinity;
  let foundLine = currentLine;
  
  // Search current line first
  var currentStations = getStations();
  for (const [id, station] of Object.entries(currentStations)) {
    const distance = getDistance(lat, lon, station.lat, station.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = { id: id, distance: distance, line: currentLine };
    }
  }
  
  // Also search other lines to find absolute nearest
  for (const [lineId, lineData] of Object.entries(lines)) {
    if (lineId === currentLine) continue;
    for (const [id, station] of Object.entries(lineData.stations)) {
      const distance = getDistance(lat, lon, station.lat, station.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { id: id, distance: distance, line: lineId };
      }
    }
  }
  
  return nearest;
}

// Calculate walk time (4 km/h slow pace, x2 for conservative estimate)
function getWalkTime(distanceMeters) {
  const walkSpeedKmh = 4;
  const distanceKm = distanceMeters / 1000;
  const minutes = (distanceKm / walkSpeedKmh) * 60 * 2;
  return Math.ceil(minutes);
}

// Update walk time display
function updateWalkTimeDisplay() {
  var walkTimeEl = document.getElementById('walk-time');
  if (!walkTimeEl) return;
  
  // If onboard, show next station ETA
  if (isOnboard) {
    var nextStationInfo = getNextStationETA();
    if (nextStationInfo) {
      walkTimeEl.textContent = '🚇 On train → ' + nextStationInfo.name + ' in ~' + nextStationInfo.eta + ' min';
      walkTimeEl.classList.remove('error');
      walkTimeEl.classList.add('onboard');
    } else {
      walkTimeEl.textContent = '🚇 On train';
      walkTimeEl.classList.remove('error');
      walkTimeEl.classList.add('onboard');
    }
    return;
  }
  
  if (currentDistance !== null) {
    var distanceM = Math.round(currentDistance);
    var distanceKm = (currentDistance / 1000).toFixed(1);
    var walkMins = getWalkTime(currentDistance);
    
    // If distance is unreasonable (>50km), something is wrong
    if (currentDistance > 50000) {
      walkTimeEl.textContent = '📍 Location error - select manually';
      walkTimeEl.classList.add('error');
      return;
    }
    
    // Show distance and walk time together
    if (currentDistance > 1000) {
      walkTimeEl.textContent = '🚶 ' + distanceKm + ' km · ' + walkMins + ' min walk';
    } else {
      walkTimeEl.textContent = '🚶 ' + distanceM + ' m · ' + walkMins + ' min walk';
    }
    walkTimeEl.classList.remove('error');
    walkTimeEl.classList.remove('onboard');
  } else {
    walkTimeEl.textContent = '📍 Select station manually';
    walkTimeEl.classList.add('error');
    walkTimeEl.classList.remove('onboard');
  }
}

// Get next station ETA based on current position and direction
function getNextStationETA() {
  if (!userLat || !userLon) return null;
  
  var nearest = findNearestStation(userLat, userLon);
  if (!nearest) return null;
  
  var stationOrder = getStationOrder();
  var stations = getStations();
  var currentIdx = stationOrder.indexOf(nearest.id);
  if (currentIdx === -1) return null;
  
  var nextIdx;
  if (currentDirection === 'southbound') {
    nextIdx = currentIdx + 1;
    if (nextIdx >= stationOrder.length) return null;
  } else {
    nextIdx = currentIdx - 1;
    if (nextIdx < 0) return null;
  }
  
  var nextStationId = stationOrder[nextIdx];
  var nextStation = stations[nextStationId];
  
  // Calculate distance to next station
  var distToNext = getDistance(userLat, userLon, nextStation.lat, nextStation.lon);
  
  // Estimate ETA: assume train moves at ~40 km/h average (including stops)
  var trainSpeedKmh = 40;
  var etaMinutes = Math.ceil((distToNext / 1000) / trainSpeedKmh * 60);
  
  // Minimum 1 minute
  if (etaMinutes < 1) etaMinutes = 1;
  
  return { name: nextStation.name, eta: etaMinutes };
}

// Handle position update (called by watchPosition)
function onPositionUpdate(position) {
  var walkTimeEl = document.getElementById('walk-time');
  var stationSelect = document.getElementById('station');
  
  userLat = position.coords.latitude;
  userLon = position.coords.longitude;
  
  var nearest = findNearestStation(userLat, userLon);
  if (!nearest) return;
  
  // Always calculate distance to SELECTED station, not nearest
  var selectedStation = getStations()[currentStation];
  if (selectedStation) {
    currentDistance = getDistance(userLat, userLon, selectedStation.lat, selectedStation.lon);
  }
  
  // Check if user is at a station (within 50m) - they're onboard
  if (nearest.distance < 50) {
    if (!isOnboard) {
      isOnboard = true;
      manualSelection = false;  // Reset manual selection when boarding
      currentStation = nearest.id;
      if (stationSelect) stationSelect.value = nearest.id;
      // Update distance to this new station
      currentDistance = nearest.distance;
    }
    // Update current station as user moves along the line
    currentStation = nearest.id;
    if (stationSelect) stationSelect.value = nearest.id;
    currentDistance = nearest.distance;
  } else if (nearest.distance > 500) {
    // If user moves away from stations, they got off
    isOnboard = false;
  }
  
  // Only auto-select nearest station if user hasn't manually selected one
  if (!isOnboard && !manualSelection && nearest.distance < 5000) {
    locationGranted = true;
    currentStation = nearest.id;
    if (stationSelect) stationSelect.value = nearest.id;
  }
  
  updateWalkTimeDisplay();
  updateUI();
}

// Start watching location (non-blocking)
function startLocationWatch() {
  var walkTimeEl = document.getElementById('walk-time');
  
  if (!navigator.geolocation) {
    if (walkTimeEl) {
      walkTimeEl.textContent = '📍 Location not supported';
      walkTimeEl.classList.add('error');
    }
    return;
  }
  
  var isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!isSecure) {
    if (walkTimeEl) {
      walkTimeEl.textContent = '📍 HTTPS required for GPS';
      walkTimeEl.classList.add('error');
    }
    return;
  }
  
  if (walkTimeEl) {
    walkTimeEl.textContent = '📍 Locating...';
    walkTimeEl.classList.remove('error');
  }
  
  // First get current position
  navigator.geolocation.getCurrentPosition(
    function(position) {
      onPositionUpdate(position);
      fetchArrivals(true);
      
      // Then start watching for updates
      watchId = navigator.geolocation.watchPosition(
        onPositionUpdate,
        function(error) {
          console.log('Watch error:', error.code);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    },
    function(error) {
      var msg = '📍 Select station';
      if (error.code === 1) msg = '📍 Location denied';
      if (error.code === 2) msg = '📍 Location unavailable';
      if (error.code === 3) msg = '📍 Location timeout';
      if (walkTimeEl) {
        walkTimeEl.textContent = msg;
        walkTimeEl.classList.add('error');
      }
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

// Format countdown
function formatCountdown(ms) {
  if (ms < 0) return 'Departed';
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes === 0) {
    return seconds + 's';
  } else if (minutes < 60) {
    return minutes + 'm';
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours + 'h ' + mins + 'm';
  }
}

// Format time
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Get countdown class
function getCountdownClass(ms) {
  const minutes = ms / 60000;
  if (minutes <= 2) return 'imminent';
  if (minutes <= 5) return 'soon';
  return '';
}

// Schedule next refresh
function scheduleNextRefresh(arrivals) {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
  
  var now = Date.now();
  
  if (arrivals && arrivals.length > 0) {
    var nextArrival = null;
    for (var i = 0; i < arrivals.length; i++) {
      if (arrivals[i].arrivalTime > now) {
        nextArrival = arrivals[i];
        break;
      }
    }
    
    if (nextArrival) {
      nextArrivalTime = nextArrival.arrivalTime;
      var timeToArrival = nextArrivalTime - now;
      var refreshDelay = Math.max(timeToArrival + 5000, 10000);
      
      console.log('Next train in ' + Math.round(timeToArrival / 1000) + 's, refresh scheduled in ' + Math.round(refreshDelay / 1000) + 's');
      
      refreshTimeout = setTimeout(function() {
        console.log('Refreshing arrivals...');
        fetchArrivals();
      }, refreshDelay);
      return;
    }
  }
  
  console.log('No upcoming arrivals, refresh in 60s');
  refreshTimeout = setTimeout(fetchArrivals, 60000);
}

// Render arrivals
function renderArrivals(arrivals) {
  var arrivalsList = document.getElementById('arrivals-list');
  
  if (!arrivals || arrivals.length === 0) {
    arrivalsList.innerHTML = '<div class="no-arrivals"><p>No upcoming arrivals found</p><p style="font-size: 0.8rem; margin-top: 10px;">Try selecting a different station or direction</p></div>';
    return;
  }
  
  var now = Date.now();
  var html = '';
  
  for (var i = 0; i < arrivals.length; i++) {
    var arrival = arrivals[i];
    var timeUntil = arrival.arrivalTime - now;
    var countdownClass = getCountdownClass(timeUntil);
    var headsign = arrival.tripHeadsign || (currentDirection === 'southbound' ? 'Bellevue' : 'Redmond');
    var routeName = arrival.routeShortName || '2 Line';
    
    // Build status text: show real-time vs scheduled difference if available
    var statusText = routeName;
    if (arrival.predicted && arrival.scheduledArrivalTime) {
      var diffMs = arrival.arrivalTime - arrival.scheduledArrivalTime;
      var diffMin = Math.round(diffMs / 60000);
      if (diffMin > 0) {
        statusText += ' • 🔴 ' + diffMin + ' min late';
      } else if (diffMin < 0) {
        statusText += ' • 🟢 ' + Math.abs(diffMin) + ' min early';
      } else {
        statusText += ' • 🟢 On time';
      }
    } else if (!arrival.predicted) {
      statusText += ' • Scheduled';
    }
    
    html += '<div class="arrival-card ' + countdownClass + '" data-tripid="' + arrival.tripId + '" data-arrival="' + arrival.arrivalTime + '" data-headsign="' + headsign + '">';
    html += '<div class="arrival-info">';
    html += '<h3>' + headsign + '</h3>';
    html += '<span class="route">' + statusText + '</span>';
    html += '</div>';
    html += '<div class="arrival-time">';
    html += '<div class="countdown ' + countdownClass + '" data-arrival="' + arrival.arrivalTime + '">';
    html += formatCountdown(timeUntil);
    html += '</div>';
    html += '<div class="actual-time">' + formatTime(arrival.arrivalTime) + '</div>';
    html += '</div>';
    html += '<div class="notify-btn" title="Set reminder">🔔</div>';
    html += '</div>';
  }
  
  arrivalsList.innerHTML = html;
}

// Render alerts
function renderAlerts(alerts) {
  var alertsList = document.getElementById('alerts-list');
  
  // Ensure alerts is an array
  if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
    alertsList.innerHTML = '<div class="no-alerts">No active alerts</div>';
    return;
  }
  
  var html = '';
  for (var i = 0; i < alerts.length; i++) {
    var alert = alerts[i];
    html += '<div class="alert-card">';
    html += '<h4>' + (alert.headerText || 'Service Alert') + '</h4>';
    html += '<p>' + (alert.descriptionText || 'No details available') + '</p>';
    html += '</div>';
  }
  
  alertsList.innerHTML = html;
}

// Fetch arrivals
function fetchArrivals(showLoading) {
  var arrivalsList = document.getElementById('arrivals-list');
  var lastUpdated = document.getElementById('last-updated');
  
  if (isFirstLoad || showLoading) {
    arrivalsList.innerHTML = '<div class="loading">Loading arrivals...</div>';
  }
  
  fetch('/api/arrivals/' + currentStation + '?direction=' + currentDirection + '&line=' + currentLine)
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      if (data.error) {
        throw new Error(data.error);
      }
      
      renderArrivals(data.arrivals);
      
      var cacheInfo = data.cached ? ' (cached)' : '';
      lastUpdated.textContent = new Date().toLocaleTimeString() + cacheInfo;
      
      isFirstLoad = false;
      scheduleNextRefresh(data.arrivals);
    })
    .catch(function(error) {
      console.error('Error fetching arrivals:', error);
      arrivalsList.innerHTML = '<div class="no-arrivals"><p>Error loading arrivals</p><p style="font-size: 0.8rem; margin-top: 10px;">' + error.message + '</p></div>';
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(fetchArrivals, 30000);
    });
}

// Fetch alerts
function fetchAlerts() {
  fetch('/api/alerts')
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      // Handle various response formats
      var alerts = [];
      if (Array.isArray(data)) {
        alerts = data;
      } else if (data && Array.isArray(data.alerts)) {
        alerts = data.alerts;
      }
      renderAlerts(alerts);
    })
    .catch(function(error) {
      console.error('Error fetching alerts:', error);
      renderAlerts([]);
    });
}

// Update countdowns
function updateCountdowns() {
  var countdowns = document.querySelectorAll('.countdown[data-arrival]');
  var now = Date.now();
  
  countdowns.forEach(function(el) {
    var arrivalTime = parseInt(el.dataset.arrival);
    var timeUntil = arrivalTime - now;
    
    if (timeUntil < -60000) {
      fetchArrivals();
      return;
    }
    
    el.textContent = formatCountdown(timeUntil);
    
    var card = el.closest('.arrival-card');
    var countdownClass = getCountdownClass(timeUntil);
    card.className = 'arrival-card ' + countdownClass;
    el.className = 'countdown ' + countdownClass;
  });
}

// Update UI state
function updateUI() {
  var stationSelect = document.getElementById('station');
  var stationNameEl = document.getElementById('station-name');
  var directionLabel = document.getElementById('direction-label');
  var dirBtns = document.querySelectorAll('.dir-btn');
  var lineBtns = document.querySelectorAll('.line-btn');
  var lineData = getLineData();
  var stationsMap = getStations();
  
  stationSelect.value = currentStation;
  stationNameEl.textContent = stationsMap[currentStation] ? stationsMap[currentStation].name : currentStation;
  directionLabel.textContent = lineData.directions[currentDirection];
  
  // Update line buttons
  lineBtns.forEach(function(btn) {
    if (btn.dataset.line === currentLine) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update direction button labels
  dirBtns.forEach(function(btn) {
    var dir = btn.dataset.direction;
    btn.textContent = lineData.directions[dir];
    
    if (dir === currentDirection) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Populate station dropdown based on current line
function populateStationDropdown() {
  var stationSelect = document.getElementById('station');
  var stationOrder = getStationOrder();
  var stationsMap = getStations();
  
  stationSelect.innerHTML = '';
  stationOrder.forEach(function(stationId) {
    var station = stationsMap[stationId];
    if (station) {
      var option = document.createElement('option');
      option.value = stationId;
      option.textContent = station.name;
      stationSelect.appendChild(option);
    }
  });
  
  // Make sure current station is valid for this line
  if (!stationsMap[currentStation]) {
    currentStation = stationOrder[0];
  }
  stationSelect.value = currentStation;
}

// Switch line
function switchLine(newLine) {
  if (newLine === currentLine) return;
  
  currentLine = newLine;
  isFirstLoad = true;
  manualSelection = false;
  
  // Populate stations for new line
  populateStationDropdown();
  
  // If we have location, find nearest station on new line
  if (userLat && userLon) {
    var nearest = findNearestStation(userLat, userLon);
    if (nearest && nearest.line === currentLine && nearest.distance < 5000) {
      currentStation = nearest.id;
      currentDistance = nearest.distance;
    }
  }
  
  savePreferences();
  updateUI();
  fetchArrivals(true);
}

// Initialize
function init() {
  // Clean up old cookies first
  cleanupOldCookies();
  
  loadPreferences();
  
  // Populate stations for current line
  populateStationDropdown();
  
  // Start with cookie-saved station first
  loadStationFromCookie();
  
  updateUI();
  fetchArrivals();
  fetchAlerts();
  
  // Start watching location in background (non-blocking)
  startLocationWatch();
  
  // Setup event listeners
  var stationSelect = document.getElementById('station');
  var refreshBtn = document.getElementById('refresh-btn');
  var dirBtns = document.querySelectorAll('.dir-btn');
  var lineBtns = document.querySelectorAll('.line-btn');
  
  // Line button handlers
  lineBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchLine(btn.dataset.line);
    });
  });
  
  stationSelect.addEventListener('change', function(e) {
    currentStation = e.target.value;
    isOnboard = false;  // Manual selection = not onboard
    manualSelection = true;  // User manually selected
    isFirstLoad = true;
    
    // Calculate distance to new station if we have location
    if (userLat && userLon) {
      var station = getStations()[currentStation];
      if (station) {
        currentDistance = getDistance(userLat, userLon, station.lat, station.lon);
        locationGranted = true;
      }
    } else {
      currentDistance = null;
      locationGranted = false;
    }
    
    updateWalkTimeDisplay();
    savePreferences();
    updateUI();
    fetchArrivals(true);
  });
  
  dirBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      currentDirection = btn.dataset.direction;
      isFirstLoad = true;
      savePreferences();
      updateUI();
      fetchArrivals(true);
    });
  });
  
  refreshBtn.addEventListener('click', function() {
    refreshBtn.style.transform = 'rotate(360deg)';
    refreshBtn.style.transition = 'transform 0.5s';
    setTimeout(function() {
      refreshBtn.style.transform = '';
      refreshBtn.style.transition = '';
    }, 500);
    
    fetchArrivals(true);
    fetchAlerts();
  });
  
  setInterval(updateCountdowns, 1000);
  setInterval(fetchAlerts, 300000);
  
  // Setup notification click handlers (delegated)
  document.getElementById('arrivals-list').addEventListener('click', function(e) {
    var notifyBtn = e.target.closest('.notify-btn');
    if (!notifyBtn) return;
    
    var card = notifyBtn.closest('.arrival-card');
    if (!card) return;
    
    var arrivalTime = parseInt(card.dataset.arrival);
    var headsign = card.dataset.headsign;
    var tripId = card.dataset.tripid;
    
    scheduleNotification(arrivalTime, headsign, tripId, notifyBtn);
  });
}

// Schedule notification for a train
function scheduleNotification(arrivalTime, headsign, tripId, btn) {
  // Request notification permission
  if (!('Notification' in window)) {
    alert('This browser does not support notifications');
    return;
  }
  
  if (Notification.permission === 'denied') {
    alert('Notifications are blocked. Please enable in browser settings.');
    return;
  }
  
  var now = Date.now();
  var timeUntil = arrivalTime - now;
  
  if (timeUntil < 60000) {
    alert('Train arriving too soon for notification!');
    return;
  }
  
  // Notify 2 minutes before arrival
  var notifyBefore = 2 * 60 * 1000;
  var delay = Math.max(0, timeUntil - notifyBefore);
  var minsUntilNotify = Math.round(delay / 60000);
  
  Notification.requestPermission().then(function(permission) {
    if (permission !== 'granted') {
      alert('Please allow notifications to use this feature');
      return;
    }
    
    // Mark button as scheduled
    btn.textContent = '✅';
    btn.classList.add('scheduled');
    
    // Store scheduled notification
    var notifId = 'train-' + tripId;
    scheduledNotifications[notifId] = {
      timeout: setTimeout(function() {
        var stationName = getStations()[currentStation] ? getStations()[currentStation].name : currentStation;
        new Notification('🚇 Train Arriving!', {
          body: headsign + ' arriving in 2 minutes at ' + stationName,
          icon: '/icon-192.png',
          tag: notifId,
          vibrate: [200, 100, 200],
          requireInteraction: true
        });
        btn.textContent = '🔔';
        btn.classList.remove('scheduled');
        delete scheduledNotifications[notifId];
      }, delay),
      arrivalTime: arrivalTime
    };
    
    // Show confirmation
    var confirmMsg = minsUntilNotify > 0 
      ? 'Reminder set! Will notify in ' + minsUntilNotify + ' min'
      : 'Reminder set! Will notify shortly';
    showToast(confirmMsg);
  });
}

// Scheduled notifications tracker
var scheduledNotifications = {};

// Toast notification
function showToast(message) {
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(function() {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() {
      toast.remove();
    }, 300);
  }, 3000);
}

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(function(reg) {
    console.log('SW registered');
  }).catch(function(err) {
    console.log('SW registration failed:', err);
  });
}

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
