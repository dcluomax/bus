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
let nfcReader = null;   // NFC reader instance
let scanAudio = null;   // Audio for NFC scan sound

// All lines data
const lines = {
  '1_line': {
    name: '1 Line',
    color: '#28813F',
    directions: {
      southbound: 'Toward Federal Way',
      northbound: 'Toward Lynnwood'
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
    color: '#007CAD',
    directions: {
      southbound: 'Toward Bellevue',
      northbound: 'Toward Redmond'
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
      walkTimeEl.textContent = 'On board · next stop ' + nextStationInfo.name + ' in ~' + nextStationInfo.eta + ' min';
      walkTimeEl.classList.remove('error');
      walkTimeEl.classList.add('onboard');
    } else {
      walkTimeEl.textContent = 'On board';
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
      walkTimeEl.textContent = 'Location looks wrong — choose a station';
      walkTimeEl.classList.add('error');
      return;
    }
    
    // Show distance and walk time together
    if (currentDistance > 1000) {
      walkTimeEl.textContent = walkMins + ' min walk · ' + distanceKm + ' km';
    } else {
      walkTimeEl.textContent = walkMins + ' min walk · ' + distanceM + ' m';
    }
    walkTimeEl.classList.remove('error');
    walkTimeEl.classList.remove('onboard');
  } else {
    walkTimeEl.textContent = 'Choose a station';
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
      walkTimeEl.textContent = 'Location not supported';
      walkTimeEl.classList.add('error');
    }
    return;
  }
  
  var isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!isSecure) {
    if (walkTimeEl) {
      walkTimeEl.textContent = 'Location needs HTTPS';
      walkTimeEl.classList.add('error');
    }
    return;
  }
  
  if (walkTimeEl) {
    walkTimeEl.textContent = 'Locating…';
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
      var msg = 'Choose a station';
      if (error.code === 1) msg = 'Location off — choose a station';
      if (error.code === 2) msg = 'Location unavailable';
      if (error.code === 3) msg = 'Location timed out';
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
    return seconds < 30 ? 'Now' : seconds + ' s';
  } else if (minutes < 60) {
    return minutes + ' min';
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours + ' h ' + mins + ' min';
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

// Split a clock time into "12:41" and "PM" for the departure board
function formatTimeParts(timestamp) {
  var parts = formatTime(timestamp).split(' ');
  return { clock: parts[0], ampm: parts[1] || '' };
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

var BELL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

// Get countdown class
function getCountdownClass(ms) {
  if (ms < 0) return 'departed';
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

// Render arrivals as departure-board rows
function renderArrivals(arrivals) {
  var arrivalsList = document.getElementById('arrivals-list');
  
  if (!arrivals || arrivals.length === 0) {
    arrivalsList.innerHTML = '<div class="no-arrivals"><p>No upcoming departures</p><p class="hint">Try another station or direction</p></div>';
    renderTimetable([]);
    return;
  }
  
  var now = Date.now();
  var html = '';
  
  for (var i = 0; i < arrivals.length; i++) {
    var arrival = arrivals[i];
    var timeUntil = arrival.arrivalTime - now;
    var countdownClass = getCountdownClass(timeUntil);
    var headsign = arrival.tripHeadsign || getLineData().directions[currentDirection].replace(/^Toward /, '');
    var time = formatTimeParts(arrival.arrivalTime);
    
    // Real-time vs scheduled difference
    var statusText = 'Scheduled';
    var statusClass = 'status-scheduled';
    if (arrival.predicted && arrival.scheduledArrivalTime) {
      var diffMin = Math.round((arrival.arrivalTime - arrival.scheduledArrivalTime) / 60000);
      if (diffMin > 0) {
        statusText = diffMin + ' min late';
        statusClass = 'status-late';
      } else if (diffMin < 0) {
        statusText = Math.abs(diffMin) + ' min early';
        statusClass = 'status-early';
      } else {
        statusText = 'On time';
        statusClass = 'status-ontime';
      }
    } else if (arrival.predicted) {
      statusText = 'Live';
      statusClass = 'status-ontime';
    }
    
    html += '<div class="arrival-card ' + countdownClass + '" role="listitem" data-tripid="' + escapeHtml(arrival.tripId) + '" data-arrival="' + arrival.arrivalTime + '" data-headsign="' + escapeHtml(headsign) + '">';
    html += '<div class="arrival-time"><span class="clock">' + time.clock + '</span><span class="ampm">' + time.ampm + '</span></div>';
    html += '<div class="arrival-info">';
    html += '<h3>' + escapeHtml(headsign) + '</h3>';
    html += '<span class="route ' + statusClass + '">' + statusText + '</span>';
    html += '</div>';
    html += '<div class="countdown ' + countdownClass + '" data-arrival="' + arrival.arrivalTime + '">' + formatCountdown(timeUntil) + '</div>';
    html += '<button type="button" class="notify-btn" title="Remind me 2 min before" aria-label="Remind me 2 minutes before">' + BELL_SVG + '</button>';
    html += '</div>';
  }
  
  arrivalsList.innerHTML = html;
  renderTimetable(arrivals);
  syncReminderButtons();
  updateRanks();
}

// The board shows the next three trains still to come (先発 / 次発 / 次々発);
// trains that have left drop off, and past times dim in the timetable
function updateRanks() {
  var rank = 0;
  document.querySelectorAll('#arrivals-list .arrival-card').forEach(function(card) {
    if (card.classList.contains('departed') || rank >= 3) {
      card.removeAttribute('data-rank');
    } else {
      rank += 1;
      card.setAttribute('data-rank', String(rank));
    }
  });
  var list = document.getElementById('arrivals-list');
  list.classList.toggle('all-departed', rank === 0 && !!list.querySelector('.arrival-card'));
  var now = Date.now();
  document.querySelectorAll('.tt-min[data-arrival]').forEach(function(chip) {
    chip.classList.toggle('past', parseInt(chip.dataset.arrival) < now);
  });
}

// Destination marks for the timetable, e.g. "L" = Lynnwood City Center
function destinationMarks(headsigns) {
  var marks = {};
  var used = {};
  headsigns.forEach(function(name) {
    if (marks[name]) return;
    var words = name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean);
    var candidates = words.map(function(w) { return w[0].toUpperCase(); }).concat(words.join('').toUpperCase().split(''));
    for (var i = 0; i < candidates.length; i++) {
      if (!used[candidates[i]]) { marks[name] = candidates[i]; used[candidates[i]] = true; return; }
    }
    marks[name] = '?';
  });
  return marks;
}

// Hour-by-hour timetable: hour on the left, minutes across (時刻表)
function renderTimetable(arrivals) {
  var section = document.getElementById('timetable-section');
  var body = document.getElementById('timetable');
  var legend = document.getElementById('tt-legend');
  if (!section || !body) return;
  if (!arrivals || arrivals.length === 0) {
    section.hidden = true;
    body.innerHTML = '';
    return;
  }
  
  var fallback = getLineData().directions[currentDirection].replace(/^Toward /, '');
  var headsigns = arrivals.map(function(a) { return a.tripHeadsign || fallback; });
  var distinct = headsigns.filter(function(h, i) { return headsigns.indexOf(h) === i; });
  var marks = distinct.length > 1 ? destinationMarks(distinct) : {};
  
  var hours = [];
  var byHour = {};
  arrivals.forEach(function(a, i) {
    var d = new Date(a.arrivalTime);
    var key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate() + '-' + d.getHours();
    if (!byHour[key]) { byHour[key] = { date: d, items: [] }; hours.push(key); }
    byHour[key].items.push({ a: a, headsign: headsigns[i], minute: d.getMinutes() });
  });
  
  var html = '';
  hours.forEach(function(key) {
    var group = byHour[key];
    var h24 = group.date.getHours();
    var h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    html += '<div class="tt-row">';
    html += '<div class="tt-hour"><span class="tt-h">' + h12 + '</span><span class="tt-ampm">' + (h24 < 12 ? 'AM' : 'PM') + '</span></div>';
    html += '<div class="tt-mins">';
    group.items.forEach(function(item) {
      var a = item.a;
      var late = (a.predicted && a.scheduledArrivalTime) ? Math.round((a.arrivalTime - a.scheduledArrivalTime) / 60000) : 0;
      var mm = (item.minute < 10 ? '0' : '') + item.minute;
      var label = formatTime(a.arrivalTime) + ' to ' + item.headsign + (late > 0 ? ', ' + late + ' min late' : '');
      html += '<button type="button" class="tt-min notify-btn" data-tripid="' + escapeHtml(a.tripId) + '" data-arrival="' + a.arrivalTime + '" data-headsign="' + escapeHtml(item.headsign) + '" title="' + escapeHtml(label) + '" aria-label="Remind me: ' + escapeHtml(label) + '">';
      html += '<span class="tt-m">' + mm + '</span>';
      if (marks[item.headsign]) html += '<sup class="tt-mark">' + marks[item.headsign] + '</sup>';
      if (late > 0) html += '<span class="tt-late">+' + late + '</span>';
      html += '</button>';
    });
    html += '</div></div>';
  });
  body.innerHTML = html;
  
  if (legend) {
    legend.innerHTML = distinct.length > 1
      ? distinct.map(function(name) { return '<span><b>' + marks[name] + '</b> ' + escapeHtml(name) + '</span>'; }).join('')
      : '<span>All trains to ' + escapeHtml(distinct[0]) + '</span>';
  }
  section.hidden = false;
}

// Keep every reminder control for the same trip in the same state
function syncReminderButtons() {
  document.querySelectorAll('.notify-btn').forEach(function(btn) {
    var host = btn.closest('[data-tripid]');
    var on = !!(host && scheduledNotifications['train-' + host.dataset.tripid]);
    btn.classList.toggle('scheduled', on);
    if (on) btn.setAttribute('aria-pressed', 'true'); else btn.removeAttribute('aria-pressed');
  });
}

// Render alerts
function renderAlerts(alerts) {
  var alertsList = document.getElementById('alerts-list');
  var alertsCount = document.getElementById('alerts-count');
  var alertsSection = document.getElementById('alerts-section');
  
  // Ensure alerts is an array
  if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
    alertsList.innerHTML = '<div class="no-alerts">No active alerts</div>';
    if (alertsCount) alertsCount.textContent = 'None';
    if (alertsSection) alertsSection.classList.remove('has-alerts');
    return;
  }
  if (alertsCount) alertsCount.textContent = alerts.length + (alerts.length === 1 ? ' alert' : ' alerts');
  if (alertsSection) alertsSection.classList.add('has-alerts');
  
  var html = '';
  for (var i = 0; i < alerts.length; i++) {
    var alert = alerts[i];
    html += '<div class="alert-card">';
    html += '<h4>' + escapeHtml(alert.headerText || 'Service alert') + '</h4>';
    html += '<p>' + escapeHtml(alert.descriptionText || 'No details available') + '</p>';
    html += '</div>';
  }
  
  alertsList.innerHTML = html;
}

// Fetch arrivals
function fetchArrivals(showLoading) {
  var arrivalsList = document.getElementById('arrivals-list');
  var lastUpdated = document.getElementById('last-updated');
  
  if (isFirstLoad || showLoading) {
    arrivalsList.innerHTML = '<div class="loading">Loading arrivals…</div>';
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
      arrivalsList.innerHTML = '<div class="no-arrivals"><p>Could not load departures</p><p class="hint">' + escapeHtml(error.message) + '</p></div>';
      renderTimetable([]);
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
  updateRanks();
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
  directionLabel.textContent = currentDirection === 'southbound' ? 'Southbound' : 'Northbound';
  renderStationSign(lineData, stationsMap);
  
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

// Station name sign: line colour, line number, previous / next stop in the direction of travel
function renderStationSign(lineData, stationsMap) {
  document.documentElement.style.setProperty('--line', lineData.color);
  var mark = document.getElementById('sign-mark');
  if (mark) mark.textContent = lineData.name.replace(/ Line$/, '');
  
  var order = getStationOrder();
  var idx = order.indexOf(currentStation);
  var step = currentDirection === 'southbound' ? 1 : -1;
  var prevId = idx >= 0 ? order[idx - step] : null;
  var nextId = idx >= 0 ? order[idx + step] : null;
  renderRouteStrip(order, idx, step, stationsMap);
  var prevEl = document.getElementById('adj-prev');
  var nextEl = document.getElementById('adj-next');
  if (prevEl) {
    prevEl.innerHTML = prevId && stationsMap[prevId]
      ? '<span class="adj-label">Prev</span><span class="adj-name">' + escapeHtml(stationsMap[prevId].name) + '</span>'
      : '';
  }
  if (nextEl) {
    nextEl.innerHTML = nextId && stationsMap[nextId]
      ? '<span class="adj-name">' + escapeHtml(stationsMap[nextId].name) + '</span><span class="adj-label">Next</span><span aria-hidden="true">→</span>'
      : '';
  }
}

// Route diagram (路線図): every station of the line in the direction of travel
function renderRouteStrip(order, idx, step, stationsMap) {
  var strip = document.getElementById('route-strip');
  if (!strip) return;
  var seq = step === 1 ? order.slice() : order.slice().reverse();
  var pos = seq.indexOf(currentStation);
  var html = '<span class="rs-end rs-from">' + escapeHtml(stationsMap[seq[0]].name) + '</span><span class="rs-track">';
  seq.forEach(function(id, i) {
    var cls = i < pos ? 'passed' : (i === pos ? 'here' : 'ahead');
    html += '<button type="button" class="rs-stop ' + cls + '" data-station="' + id + '" title="' + escapeHtml(stationsMap[id].name) + '" aria-label="' + escapeHtml(stationsMap[id].name) + '"' + (i === pos ? ' aria-current="true"' : '') + '></button>';
  });
  html += '</span><span class="rs-end rs-to">' + escapeHtml(stationsMap[seq[seq.length - 1]].name) + ' →</span>';
  strip.innerHTML = html;
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
  
  // Setup NFC button (user must click to enable)
  setupNFCButton();
  
  // Setup modal close button
  setupModalHandlers();
  
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
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = '0.5';
    setTimeout(function() {
      refreshBtn.disabled = false;
      refreshBtn.style.opacity = '';
    }, 800);
    
    fetchArrivals(true);
    fetchAlerts();
  });
  
  document.getElementById('route-strip').addEventListener('click', function(e) {
    var stop = e.target.closest('.rs-stop');
    if (!stop || stop.dataset.station === currentStation) return;
    var select = document.getElementById('station');
    select.value = stop.dataset.station;
    select.dispatchEvent(new Event('change'));
  });
  
  setInterval(updateCountdowns, 1000);
  setInterval(fetchAlerts, 300000);
  
  // Setup notification click handlers (delegated)
  document.addEventListener('click', function(e) {
    var notifyBtn = e.target.closest('.notify-btn');
    if (!notifyBtn) return;
    
    var card = notifyBtn.closest('[data-arrival][data-tripid]');
    if (!card) return;
    
    var arrivalTime = parseInt(card.dataset.arrival);
    var headsign = card.dataset.headsign;
    var tripId = card.dataset.tripid;
    
    scheduleNotification(arrivalTime, headsign, tripId, notifyBtn);
  });
}

// Schedule notification for a train
function scheduleNotification(arrivalTime, headsign, tripId, btn) {
  // A second tap cancels an existing reminder
  var existing = scheduledNotifications['train-' + tripId];
  if (existing) {
    clearTimeout(existing.timeout);
    delete scheduledNotifications['train-' + tripId];
    syncReminderButtons();
    showToast('Reminder cancelled');
    return;
  }
  
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
    btn.classList.add('scheduled');
    btn.setAttribute('aria-pressed', 'true');
    
    // Store scheduled notification
    var notifId = 'train-' + tripId;
    scheduledNotifications[notifId] = {
      timeout: setTimeout(function() {
        var stationName = getStations()[currentStation] ? getStations()[currentStation].name : currentStation;
        new Notification('Train arriving', {
          body: headsign + ' arriving in 2 minutes at ' + stationName,
          icon: '/icon-192.png',
          tag: notifId,
          vibrate: [200, 100, 200],
          requireInteraction: true
        });
        delete scheduledNotifications[notifId];
        syncReminderButtons();
      }, delay),
      arrivalTime: arrivalTime
    };
    syncReminderButtons();
    
    // Show confirmation
    var confirmMsg = minsUntilNotify > 0 
      ? 'Reminder set · alert in ' + minsUntilNotify + ' min'
      : 'Reminder set · alert shortly';
    showToast(confirmMsg);
  });
}

// Scheduled notifications tracker
var scheduledNotifications = {};

// Toast notification
function showToast(message) {
  document.querySelectorAll('.toast').forEach(function(old) { old.remove(); });
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

// Setup NFC button - transit card mode (公交卡模拟)
// Web NFC: uses NDEFReader.scan() to detect nearby NFC readers/tags.
// When an external reader's RF field is detected, plays the beep sound.
function setupNFCButton() {
  var nfcBtn = document.getElementById('nfc-enable-btn');
  var nfcStatus = document.getElementById('nfc-status');
  
  if (!nfcBtn || !nfcStatus) return;
  
  // Pre-load the scan audio
  scanAudio = new Audio('/sounds/orca-scan.mp3');
  scanAudio.preload = 'auto';
  
  // Check if running in Capacitor (native app) — use HCE instead
  var isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  
  if (isNative) {
    // Native mode — HCE card emulation via CardEmulationService
    nfcBtn.textContent = 'Transit card on';
    nfcBtn.classList.add('active');
    nfcStatus.textContent = 'Card emulation active — hold the phone to a reader';
    nfcStatus.classList.add('success');
    
    window.addEventListener('card-tapped', function() {
      playOrcaScanSound();
      showNFCModal('TRANSIT-CARD');
    });
    return;
  }
  
  // ---- Web NFC mode ----
  if (!('NDEFReader' in window)) {
    nfcBtn.textContent = 'Transit card';
    nfcStatus.textContent = 'No NFC here — tap the button to play the beep';
    
    // Fallback: manual tap button
    nfcBtn.addEventListener('click', function() {
      playOrcaScanSound();
      showNFCModal('MANUAL');
    });
    return;
  }
  
  // Web NFC is available — use scan() to detect RF field
  var scanning = false;
  var tapCooldown = false; // prevent rapid repeat triggers
  
  nfcBtn.addEventListener('click', function() {
    if (scanning) {
      // Stop scanning
      scanning = false;
      nfcReader = null;
      nfcBtn.textContent = 'Transit card';
      nfcBtn.classList.remove('active');
      nfcStatus.textContent = 'NFC scanning stopped';
      nfcStatus.classList.remove('success');
      nfcStatus.classList.add('info');
      return;
    }
    
    // Start NFC scan — needs user gesture (button click)
    nfcBtn.textContent = 'Starting…';
    nfcBtn.disabled = true;
    
    nfcReader = new NDEFReader();
    
    nfcReader.scan().then(function() {
      scanning = true;
      nfcBtn.disabled = false;
      nfcBtn.textContent = 'Transit card on';
      nfcBtn.classList.add('active');
      nfcStatus.textContent = 'Listening — hold the phone to a reader';
      nfcStatus.classList.add('success');
      nfcStatus.classList.remove('error', 'info');
      
      console.log('Web NFC scan started — waiting for RF field');
    }).catch(function(error) {
      scanning = false;
      nfcBtn.disabled = false;
      nfcBtn.textContent = 'Transit card';
      nfcReader = null;
      
      if (error.name === 'NotAllowedError') {
        nfcStatus.textContent = 'NFC permission denied — allow it in browser settings';
      } else if (error.name === 'NotSupportedError') {
        nfcStatus.textContent = 'NFC not available on this device';
      } else {
        nfcStatus.textContent = error.message;
      }
      nfcStatus.classList.add('error');
      nfcStatus.classList.remove('success');
    });
    
    // When the phone detects any NFC interaction (reader RF field, tag, etc.)
    // → play the transit card beep sound
    nfcReader.addEventListener('reading', function(event) {
      console.log('NFC reading event — RF field detected', event.serialNumber);
      if (!tapCooldown) {
        tapCooldown = true;
        playOrcaScanSound();
        showNFCModal('NFC-TAP');
        // 2 second cooldown to prevent repeated triggers
        setTimeout(function() { tapCooldown = false; }, 2000);
      }
    });
    
    // readingerror also fires when RF field is detected but can't read data
    // — this happens when a card READER (not a tag) comes close
    nfcReader.addEventListener('readingerror', function(event) {
      console.log('NFC readingerror — likely a reader RF field detected');
      if (!tapCooldown) {
        tapCooldown = true;
        playOrcaScanSound();
        showNFCModal('NFC-TAP');
        setTimeout(function() { tapCooldown = false; }, 2000);
      }
    });
  });
}

// Show NFC scan result modal
function showNFCModal(cardId) {
  var modal = document.getElementById('nfc-modal');
  var serialEl = document.getElementById('nfc-serial');
  
  if (!modal) return;
  
  if (serialEl) {
    var now = new Date();
    var timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                  now.getMinutes().toString().padStart(2, '0') + ':' +
                  now.getSeconds().toString().padStart(2, '0');
    serialEl.textContent = 'Tap time: ' + timeStr;
  }
  
  modal.classList.add('show');
  
  // Vibrate if supported
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
  
  // Auto-hide after 3 seconds
  setTimeout(function() {
    hideNFCModal();
  }, 3000);
}

// Setup modal close handlers
function setupModalHandlers() {
  var modal = document.getElementById('nfc-modal');
  var closeBtn = document.getElementById('modal-close-btn');
  
  if (!modal || !closeBtn) return;
  
  closeBtn.addEventListener('click', function() {
    hideNFCModal();
  });
  
  // Close on overlay click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      hideNFCModal();
    }
  });
}

// Hide NFC modal
function hideNFCModal() {
  var modal = document.getElementById('nfc-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// Play ORCA card scan sound
function playOrcaScanSound() {
  // Try to play the MP3 file first
  if (scanAudio) {
    scanAudio.currentTime = 0;
    scanAudio.play().catch(function(error) {
      console.log('MP3 play error, using fallback beep:', error);
      playFallbackBeep();
    });
  } else {
    playFallbackBeep();
  }
}

// Fallback beep sound using Web Audio API (works even without MP3 file)
function playFallbackBeep() {
  try {
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a pleasant double-beep like ORCA readers
    var frequencies = [880, 1100]; // Two ascending tones
    var duration = 0.12;
    var gap = 0.05;
    
    frequencies.forEach(function(freq, index) {
      var oscillator = audioCtx.createOscillator();
      var gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      var startTime = audioCtx.currentTime + (index * (duration + gap));
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (e) {
    console.log('Web Audio API error:', e);
  }
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
