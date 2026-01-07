// State
let currentStation = 'marymoor_village';
let currentDirection = 'southbound';
let refreshInterval = null;

// DOM Elements
const stationSelect = document.getElementById('station');
const stationName = document.getElementById('station-name');
const directionLabel = document.getElementById('direction-label');
const arrivalsList = document.getElementById('arrivals-list');
const alertsList = document.getElementById('alerts-list');
const lastUpdated = document.getElementById('last-updated');
const refreshBtn = document.getElementById('refresh-btn');
const dirBtns = document.querySelectorAll('.dir-btn');

// Station display names
const stationNames = {
  'marymoor_village': 'Marymoor Village',
  'redmond_tech': 'Redmond Technology',
  'downtown_redmond': 'Downtown Redmond',
  'bellevue_downtown': 'Bellevue Downtown'
};

// Direction labels
const directionLabels = {
  'southbound': '→ Southbound to Bellevue',
  'northbound': '→ Northbound to Redmond'
};

// Format countdown
function formatCountdown(ms) {
  if (ms < 0) return 'Departed';
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes === 0) {
    return `${seconds}s`;
  } else if (minutes < 60) {
    return `${minutes}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
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

// Render arrivals
function renderArrivals(arrivals) {
  if (!arrivals || arrivals.length === 0) {
    arrivalsList.innerHTML = `
      <div class="no-arrivals">
        <p>No upcoming arrivals found</p>
        <p style="font-size: 0.8rem; margin-top: 10px;">
          Try selecting a different station or direction
        </p>
      </div>
    `;
    return;
  }
  
  const now = Date.now();
  
  arrivalsList.innerHTML = arrivals.map(arrival => {
    const timeUntil = arrival.arrivalTime - now;
    const countdownClass = getCountdownClass(timeUntil);
    const headsign = arrival.tripHeadsign || (currentDirection === 'southbound' ? 'Bellevue' : 'Redmond');
    const routeName = arrival.routeShortName || '2 Line';
    
    return `
      <div class="arrival-card ${countdownClass}">
        <div class="arrival-info">
          <h3>${headsign}</h3>
          <span class="route">${routeName} • ${arrival.predicted ? 'Real-time' : 'Scheduled'}</span>
        </div>
        <div class="arrival-time">
          <div class="countdown ${countdownClass}" data-arrival="${arrival.arrivalTime}">
            ${formatCountdown(timeUntil)}
          </div>
          <div class="actual-time">${formatTime(arrival.arrivalTime)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Render alerts
function renderAlerts(alerts) {
  if (!alerts || alerts.length === 0) {
    alertsList.innerHTML = '<div class="no-alerts">No active alerts</div>';
    return;
  }
  
  alertsList.innerHTML = alerts.map(alert => `
    <div class="alert-card">
      <h4>${alert.headerText || 'Service Alert'}</h4>
      <p>${alert.descriptionText || 'No details available'}</p>
    </div>
  `).join('');
}

// Fetch arrivals
async function fetchArrivals() {
  try {
    arrivalsList.innerHTML = '<div class="loading">Loading arrivals...</div>';
    
    const response = await fetch(`/api/arrivals/${currentStation}?direction=${currentDirection}`);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    renderArrivals(data.arrivals);
    lastUpdated.textContent = new Date().toLocaleTimeString();
    
  } catch (error) {
    console.error('Error fetching arrivals:', error);
    arrivalsList.innerHTML = `
      <div class="no-arrivals">
        <p>Error loading arrivals</p>
        <p style="font-size: 0.8rem; margin-top: 10px;">${error.message}</p>
      </div>
    `;
  }
}

// Fetch alerts
async function fetchAlerts() {
  try {
    const response = await fetch('/api/alerts');
    const alerts = await response.json();
    renderAlerts(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
  }
}

// Update countdowns in real-time
function updateCountdowns() {
  const countdowns = document.querySelectorAll('.countdown[data-arrival]');
  const now = Date.now();
  
  countdowns.forEach(el => {
    const arrivalTime = parseInt(el.dataset.arrival);
    const timeUntil = arrivalTime - now;
    
    if (timeUntil < -60000) {
      // Departed more than 1 minute ago, refresh
      fetchArrivals();
      return;
    }
    
    el.textContent = formatCountdown(timeUntil);
    
    // Update class
    const card = el.closest('.arrival-card');
    const countdownClass = getCountdownClass(timeUntil);
    card.className = `arrival-card ${countdownClass}`;
    el.className = `countdown ${countdownClass}`;
  });
}

// Update UI state
function updateUI() {
  stationName.textContent = stationNames[currentStation];
  directionLabel.textContent = directionLabels[currentDirection];
  
  dirBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.direction === currentDirection);
  });
}

// Event Listeners
stationSelect.addEventListener('change', (e) => {
  currentStation = e.target.value;
  updateUI();
  fetchArrivals();
});

dirBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentDirection = btn.dataset.direction;
    updateUI();
    fetchArrivals();
  });
});

refreshBtn.addEventListener('click', () => {
  fetchArrivals();
  fetchAlerts();
});

// Initialize
function init() {
  updateUI();
  fetchArrivals();
  fetchAlerts();
  
  // Update countdowns every second
  setInterval(updateCountdowns, 1000);
  
  // Refresh data every 30 seconds
  refreshInterval = setInterval(() => {
    fetchArrivals();
  }, 30000);
  
  // Refresh alerts every 5 minutes
  setInterval(fetchAlerts, 300000);
}

// Start app
init();
