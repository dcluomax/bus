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

// Link 1 Line stations (Lynnwood to Federal Way)
const LINK_1_LINE_STATIONS = {
  'lynnwood': {
    name: 'Lynnwood City Center',
    southbound: '40_N23-T1',
    northbound: '40_N23-T2',
    lat: 47.815637,
    lon: -122.294779
  },
  'mountlake_terrace': {
    name: 'Mountlake Terrace',
    southbound: '40_N19-T1',
    northbound: '40_N19-T2',
    lat: 47.785057,
    lon: -122.314788
  },
  'shoreline_north': {
    name: 'Shoreline North/185th',
    southbound: '40_N17-T1',
    northbound: '40_N17-T2',
    lat: 47.764067,
    lon: -122.322889
  },
  'shoreline_south': {
    name: 'Shoreline South/148th',
    southbound: '40_N15-T1',
    northbound: '40_N15-T2',
    lat: 47.736095,
    lon: -122.325227
  },
  'northgate': {
    name: 'Northgate',
    southbound: '40_990005',
    northbound: '40_990006',
    lat: 47.703028,
    lon: -122.32829
  },
  'roosevelt': {
    name: 'Roosevelt',
    southbound: '40_990003',
    northbound: '40_990004',
    lat: 47.676595,
    lon: -122.315976
  },
  'u_district': {
    name: 'U District',
    southbound: '40_990001',
    northbound: '40_990002',
    lat: 47.660301,
    lon: -122.314132
  },
  'uw': {
    name: 'Univ of Washington',
    southbound: '40_99604',
    northbound: '40_99605',
    lat: 47.649815,
    lon: -122.303763
  },
  'capitol_hill': {
    name: 'Capitol Hill',
    southbound: '40_99603',
    northbound: '40_99610',
    lat: 47.61906,
    lon: -122.320195
  },
  'westlake': {
    name: 'Westlake',
    southbound: '40_1108',
    northbound: '40_1121',
    lat: 47.611572,
    lon: -122.33672
  },
  'symphony': {
    name: 'Symphony',
    southbound: '40_455',
    northbound: '40_565',
    lat: 47.60781,
    lon: -122.33602
  },
  'pioneer_square': {
    name: 'Pioneer Square',
    southbound: '40_501',
    northbound: '40_532',
    lat: 47.60256,
    lon: -122.331216
  },
  'chinatown': {
    name: "Int'l Dist/Chinatown",
    southbound: '40_621',
    northbound: '40_623',
    lat: 47.598355,
    lon: -122.327992
  },
  'stadium': {
    name: 'Stadium',
    southbound: '40_99101',
    northbound: '40_99260',
    lat: 47.591108,
    lon: -122.327172
  },
  'sodo': {
    name: 'SODO',
    southbound: '40_99111',
    northbound: '40_99256',
    lat: 47.581074,
    lon: -122.32739
  },
  'beacon_hill': {
    name: 'Beacon Hill',
    southbound: '40_99121',
    northbound: '40_99240',
    lat: 47.579328,
    lon: -122.311533
  },
  'mount_baker': {
    name: 'Mount Baker',
    southbound: '40_55860',
    northbound: '40_55949',
    lat: 47.57655,
    lon: -122.297679
  },
  'columbia_city': {
    name: 'Columbia City',
    southbound: '40_55778',
    northbound: '40_56039',
    lat: 47.559733,
    lon: -122.292692
  },
  'othello': {
    name: 'Othello',
    southbound: '40_55656',
    northbound: '40_56159',
    lat: 47.537987,
    lon: -122.281563
  },
  'rainier_beach': {
    name: 'Rainier Beach',
    southbound: '40_55578',
    northbound: '40_56173',
    lat: 47.522394,
    lon: -122.279391
  },
  'tukwila': {
    name: "Tukwila Int'l Blvd",
    southbound: '40_99900',
    northbound: '40_99905',
    lat: 47.464031,
    lon: -122.287996
  },
  'seatac': {
    name: 'SeaTac/Airport',
    southbound: '40_99903',
    northbound: '40_99904',
    lat: 47.445381,
    lon: -122.296898
  },
  'angle_lake': {
    name: 'Angle Lake',
    southbound: '40_99913',
    northbound: '40_99914',
    lat: 47.422703,
    lon: -122.297714
  },
  'kent_des_moines': {
    name: 'Kent Des Moines',
    southbound: '40_S03-T1',
    northbound: '40_S03-T2',
    lat: 47.389552,
    lon: -122.294399
  },
  'star_lake': {
    name: 'Star Lake',
    southbound: '40_S05-T1',
    northbound: '40_S05-T2',
    lat: 47.359388,
    lon: -122.297391
  },
  'federal_way': {
    name: 'Federal Way Downtown',
    southbound: '40_S07-T1',
    northbound: '40_S07-T2',
    lat: 47.315903,
    lon: -122.303829
  }
};

// Link 2 Line station info (with correct OBA stop IDs from API)
// Format: 40_E##-T1 = Southbound (to Bellevue), T2 = Northbound (to Redmond)
const LINK_2_LINE_STATIONS = {
  'downtown_redmond': {
    name: 'Downtown Redmond',
    stopIds: ['40_E31-T1', '40_E31-T2'],
    southbound: '40_E31-T1',
    northbound: '40_E31-T2',
    lat: 47.671467,
    lon: -122.117864
  },
  'marymoor_village': {
    name: 'Marymoor Village',
    stopIds: ['40_E29-T1', '40_E29-T2'],
    southbound: '40_E29-T1',
    northbound: '40_E29-T2',
    lat: 47.667166,
    lon: -122.110398
  },
  'redmond_tech': {
    name: 'Redmond Technology',
    stopIds: ['40_E27-T1', '40_E27-T2'],
    southbound: '40_E27-T1',
    northbound: '40_E27-T2',
    lat: 47.644424,
    lon: -122.133556
  },
  'overlake_village': {
    name: 'Overlake Village',
    stopIds: ['40_E25-T1', '40_E25-T2'],
    southbound: '40_E25-T1',
    northbound: '40_E25-T2',
    lat: 47.636151,
    lon: -122.139236
  },
  'bel_red': {
    name: 'BelRed',
    stopIds: ['40_E23-T1', '40_E23-T2'],
    southbound: '40_E23-T1',
    northbound: '40_E23-T2',
    lat: 47.624499,
    lon: -122.166364
  },
  'spring_district': {
    name: 'Spring District',
    stopIds: ['40_E21-T1', '40_E21-T2'],
    southbound: '40_E21-T1',
    northbound: '40_E21-T2',
    lat: 47.623772,
    lon: -122.178901
  },
  'wilburton': {
    name: 'Wilburton',
    stopIds: ['40_E19-T1', '40_E19-T2'],
    southbound: '40_E19-T1',
    northbound: '40_E19-T2',
    lat: 47.617909,
    lon: -122.183806
  },
  'east_main': {
    name: 'East Main',
    stopIds: ['40_E11-T1', '40_E11-T2'],
    southbound: '40_E11-T1',
    northbound: '40_E11-T2',
    lat: 47.607707,
    lon: -122.191202
  },
  'bellevue_downtown': {
    name: 'Bellevue Downtown',
    stopIds: ['40_E15-T1', '40_E15-T2'],
    southbound: '40_E15-T1',
    northbound: '40_E15-T2',
    lat: 47.615285,
    lon: -122.192531
  },
  'south_bellevue': {
    name: 'South Bellevue',
    stopIds: ['40_E09-T1', '40_E09-T2'],
    southbound: '40_E09-T1',
    northbound: '40_E09-T2',
    lat: 47.586932,
    lon: -122.190604
  }
};

// Route IDs for Link Light Rail
const LINK_ROUTES = {
  '1_Line': '40_100479',  // 1 Line (Blue)
  '2_Line': '40_2LINE'    // 2 Line (Red) - East Link
};

// Combined all lines
const ALL_LINES = {
  '1_line': {
    name: '1 Line',
    color: '#0072CE',
    stations: LINK_1_LINE_STATIONS,
    directions: {
      southbound: 'Southbound (to Federal Way)',
      northbound: 'Northbound (to Lynnwood)'
    }
  },
  '2_line': {
    name: '2 Line',
    color: '#E31837',
    stations: LINK_2_LINE_STATIONS,
    directions: {
      southbound: 'Southbound (to Bellevue)',
      northbound: 'Northbound (to Redmond)'
    }
  }
};

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Cache for API responses (3 minutes TTL to avoid 429 rate limiting)
const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    expiry: Date.now() + CACHE_TTL
  });
}

// Fetch and parse GTFS-RT feed (with cache)
async function fetchGtfsRt(url) {
  // Check cache first
  const cacheKey = `gtfsrt:${url}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }
  
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
    setCache(cacheKey, feed);
    return feed;
  } catch (error) {
    console.error(`Error fetching GTFS-RT from ${url}:`, error.message);
    return null;
  }
}

// Get arrivals for a specific stop using OneBusAway API (with cache)
async function getArrivalsFromOBA(stopId) {
  // Check cache first
  const cacheKey = `oba:${stopId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }
  
  const url = `${OBA_BASE_URL}/where/arrivals-and-departures-for-stop/${stopId}.json?key=${OBA_API_KEY}&minutesBefore=0&minutesAfter=60`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OBA API error: ${response.status}`);
    }
    const data = await response.json();
    setCache(cacheKey, data);
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

// API: Get all lines
app.get('/api/lines', (req, res) => {
  const lines = Object.entries(ALL_LINES).map(([id, info]) => ({
    id,
    name: info.name,
    color: info.color,
    directions: info.directions,
    stationCount: Object.keys(info.stations).length
  }));
  res.json(lines);
});

// API: Get stations list for a line
app.get('/api/stations', (req, res) => {
  const { line } = req.query;
  const lineData = ALL_LINES[line] || ALL_LINES['2_line'];
  
  const stations = Object.entries(lineData.stations).map(([id, info]) => ({
    id,
    name: info.name,
    lat: info.lat,
    lon: info.lon
  }));
  res.json({
    line: lineData.name,
    directions: lineData.directions,
    stations
  });
});

// API: Get arrivals for a station
app.get('/api/arrivals/:stationId', async (req, res) => {
  const { stationId } = req.params;
  const { direction, line } = req.query; // direction: 'southbound' or 'northbound', line: '1_line' or '2_line'
  
  // Find station in the specified line or search all lines
  let station = null;
  let lineId = line || '2_line';
  
  if (line && ALL_LINES[line]) {
    station = ALL_LINES[line].stations[stationId];
  } else {
    // Search all lines for the station
    for (const [lid, lineData] of Object.entries(ALL_LINES)) {
      if (lineData.stations[stationId]) {
        station = lineData.stations[stationId];
        lineId = lid;
        break;
      }
    }
  }
  
  if (!station) {
    return res.status(404).json({ error: 'Station not found' });
  }
  
  // Check cache first
  const cacheKey = `arrivals:${lineId}:${stationId}:${direction || 'all'}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
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
              scheduledArrivalTime: arrival.scheduledArrivalTime,
              predictedArrivalTime: arrival.predictedArrivalTime,
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
    
    // Deduplicate by tripId - keep the one with real-time data if available
    const tripMap = new Map();
    for (const arrival of arrivals) {
      const key = arrival.tripId;
      const existing = tripMap.get(key);
      if (!existing) {
        tripMap.set(key, arrival);
      } else {
        // Keep the one with predicted data (real-time)
        if (arrival.predicted && !existing.predicted) {
          tripMap.set(key, arrival);
        }
      }
    }
    arrivals = Array.from(tripMap.values());
    
    arrivals = arrivals
      .filter(a => a.arrivalTime && a.arrivalTime > now)
      .sort((a, b) => a.arrivalTime - b.arrivalTime)
      .slice(0, 10);
    
    const response = {
      station: station.name,
      direction: direction || 'all',
      timestamp: now,
      arrivals
    };
    
    // Cache the response
    setCache(cacheKey, response);
    
    res.json(response);
    
  } catch (error) {
    console.error('Error getting arrivals:', error);
    res.status(500).json({ error: 'Failed to fetch arrivals' });
  }
});

// API: Get service alerts (cached)
app.get('/api/alerts', async (req, res) => {
  // Check cache first
  const cacheKey = 'alerts';
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ alerts: cached, cached: true });
  }
  
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
    
    setCache(cacheKey, alerts);
    res.json({ alerts, cached: false });
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
