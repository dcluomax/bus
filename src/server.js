import express from 'express';
import fetch from 'node-fetch';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// OneBusAway Puget Sound API configuration
const OBA_API_KEY = process.env.OBA_API_KEY || 'TEST';
const OBA_BASE_URL = 'https://api.pugetsound.onebusaway.org/api';

// Sound Transit GTFS-RT feeds (public, no key required)
const GTFS_RT_FEEDS = {
  tripUpdates: 'https://s3.amazonaws.com/kcm-alerts-realtime-prod/tripupdates.pb',
  vehiclePositions: 'https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions.pb',
  serviceAlerts: 'https://s3.amazonaws.com/st-service-alerts-prod/alerts.pb'
};

// Link 2 Line station info (Marymoor Village and nearby)
const LINK_2_LINE_STATIONS = {
  'marymoor_village': {
    name: 'Marymoor Village',
    stopIds: ['40_E29S', '40_E29N'], // Southbound and Northbound platforms
    southbound: '40_E29S',
    northbound: '40_E29N'
  },
  'redmond_tech': {
    name: 'Redmond Technology',
    stopIds: ['40_E28S', '40_E28N'],
    southbound: '40_E28S',
    northbound: '40_E28N'
  },
  'downtown_redmond': {
    name: 'Downtown Redmond',
    stopIds: ['40_E30S', '40_E30N'],
    southbound: '40_E30S',
    northbound: '40_E30N'
  },
  'bellevue_downtown': {
    name: 'Bellevue Downtown',
    stopIds: ['40_E25S', '40_E25N'],
    southbound: '40_E25S',
    northbound: '40_E25N'
  }
};

// Route IDs for Link Light Rail
const LINK_ROUTES = {
  '1_Line': '40_100479',  // 1 Line (Blue)
  '2_Line': '40_2LINE'    // 2 Line (Red) - East Link
};

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Fetch and parse GTFS-RT feed
async function fetchGtfsRt(url) {
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/x-protobuf' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );
    return feed;
  } catch (error) {
    console.error(`Error fetching GTFS-RT from ${url}:`, error.message);
    return null;
  }
}

// Get arrivals for a specific stop using OneBusAway API
async function getArrivalsFromOBA(stopId) {
  const url = `${OBA_BASE_URL}/where/arrivals-and-departures-for-stop/${stopId}.json?key=${OBA_API_KEY}&minutesBefore=0&minutesAfter=60`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OBA API error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching OBA arrivals for ${stopId}:`, error.message);
    return null;
  }
}

// Parse trip updates for specific stops
function parseTripUpdates(feed, targetStopIds) {
  const arrivals = [];
  
  if (!feed || !feed.entity) return arrivals;
  
  for (const entity of feed.entity) {
    if (!entity.tripUpdate) continue;
    
    const tripUpdate = entity.tripUpdate;
    const trip = tripUpdate.trip;
    
    for (const stopTimeUpdate of tripUpdate.stopTimeUpdate || []) {
      const stopId = stopTimeUpdate.stopId;
      
      if (targetStopIds.includes(stopId)) {
        const arrival = stopTimeUpdate.arrival;
        const departure = stopTimeUpdate.departure;
        
        arrivals.push({
          tripId: trip?.tripId || 'unknown',
          routeId: trip?.routeId || 'unknown',
          directionId: trip?.directionId,
          stopId: stopId,
          arrivalTime: arrival?.time ? Number(arrival.time) * 1000 : null,
          arrivalDelay: arrival?.delay || 0,
          departureTime: departure?.time ? Number(departure.time) * 1000 : null,
          departureDelay: departure?.delay || 0,
          scheduleRelationship: stopTimeUpdate.scheduleRelationship
        });
      }
    }
  }
  
  // Sort by arrival time
  arrivals.sort((a, b) => (a.arrivalTime || Infinity) - (b.arrivalTime || Infinity));
  
  return arrivals;
}

// API: Get stations list
app.get('/api/stations', (req, res) => {
  const stations = Object.entries(LINK_2_LINE_STATIONS).map(([id, info]) => ({
    id,
    name: info.name,
    stopIds: info.stopIds
  }));
  res.json(stations);
});

// API: Get arrivals for a station
app.get('/api/arrivals/:stationId', async (req, res) => {
  const { stationId } = req.params;
  const { direction } = req.query; // 'southbound' or 'northbound'
  
  const station = LINK_2_LINE_STATIONS[stationId];
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }
  
  // Determine which stop IDs to query
  let targetStopIds = station.stopIds;
  if (direction === 'southbound' && station.southbound) {
    targetStopIds = [station.southbound];
  } else if (direction === 'northbound' && station.northbound) {
    targetStopIds = [station.northbound];
  }
  
  try {
    // Try GTFS-RT first
    const feed = await fetchGtfsRt(GTFS_RT_FEEDS.tripUpdates);
    let arrivals = parseTripUpdates(feed, targetStopIds);
    
    // If no GTFS-RT data, try OBA API
    if (arrivals.length === 0) {
      for (const stopId of targetStopIds) {
        const obaData = await getArrivalsFromOBA(stopId);
        if (obaData?.data?.entry?.arrivalsAndDepartures) {
          for (const arrival of obaData.data.entry.arrivalsAndDepartures) {
            arrivals.push({
              tripId: arrival.tripId,
              routeId: arrival.routeId,
              routeShortName: arrival.routeShortName,
              tripHeadsign: arrival.tripHeadsign,
              stopId: stopId,
              arrivalTime: arrival.predictedArrivalTime || arrival.scheduledArrivalTime,
              departureTime: arrival.predictedDepartureTime || arrival.scheduledDepartureTime,
              predicted: arrival.predicted,
              vehicleId: arrival.vehicleId,
              distanceFromStop: arrival.distanceFromStop
            });
          }
        }
      }
    }
    
    // Sort and filter to upcoming arrivals only
    const now = Date.now();
    arrivals = arrivals
      .filter(a => a.arrivalTime && a.arrivalTime > now)
      .sort((a, b) => a.arrivalTime - b.arrivalTime)
      .slice(0, 10);
    
    res.json({
      station: station.name,
      direction: direction || 'all',
      timestamp: now,
      arrivals
    });
    
  } catch (error) {
    console.error('Error getting arrivals:', error);
    res.status(500).json({ error: 'Failed to fetch arrivals' });
  }
});

// API: Get service alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const feed = await fetchGtfsRt(GTFS_RT_FEEDS.serviceAlerts);
    const alerts = [];
    
    if (feed?.entity) {
      for (const entity of feed.entity) {
        if (entity.alert) {
          const alert = entity.alert;
          alerts.push({
            id: entity.id,
            headerText: alert.headerText?.translation?.[0]?.text || '',
            descriptionText: alert.descriptionText?.translation?.[0]?.text || '',
            cause: alert.cause,
            effect: alert.effect,
            activePeriod: alert.activePeriod?.map(p => ({
              start: p.start ? Number(p.start) * 1000 : null,
              end: p.end ? Number(p.end) * 1000 : null
            }))
          });
        }
      }
    }
    
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// API docs endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'Bus Arrival Tracker API',
    version: '1.0.0',
    endpoints: [
      {
        path: '/api/stations',
        method: 'GET',
        description: 'Get list of available stations'
      },
      {
        path: '/api/arrivals/:stationId',
        method: 'GET',
        description: 'Get real-time arrivals for a station',
        params: {
          stationId: 'Station ID (e.g., marymoor_village)',
          direction: 'Optional: southbound or northbound'
        }
      },
      {
        path: '/api/alerts',
        method: 'GET',
        description: 'Get current service alerts'
      }
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚌 Bus Arrival Tracker running on http://localhost:${PORT}`);
  console.log(`📖 API docs: http://localhost:${PORT}/api/docs`);
});
