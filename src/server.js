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

// Sound Transit GTFS-RT feeds
const GTFS_RT_FEEDS = {
  tripUpdates: `${OBA_BASE_URL}/gtfs_realtime/trip-updates-for-agency/40.pb?key=${OBA_API_KEY}`,
  vehiclePositions: `${OBA_BASE_URL}/gtfs_realtime/vehicle-positions-for-agency/40.pb?key=${OBA_API_KEY}`,
  serviceAlerts: 'https://s3.amazonaws.com/st-service-alerts-prod/alerts.pb'
};

// Link 1 Line stations (Lynnwood City Center to Federal Way Downtown)
// Platform stop IDs verified against Sound Transit GTFS (dir 0 = southbound to Federal Way, dir 1 = northbound to Lynnwood)
const LINK_1_LINE_STATIONS = {
  'lynnwood': {
    name: 'Lynnwood City Center',
    stopIds: ['40_N23-T1', '40_N23-T2'],
    southbound: '40_N23-T2',
    northbound: '40_N23-T1',
    outboundDirection: 'southbound',
    lat: 47.815637,
    lon: -122.294779
  },
  'mountlake_terrace': {
    name: 'Mountlake Terrace',
    southbound: '40_N19-T2',
    northbound: '40_N19-T1',
    lat: 47.785057,
    lon: -122.314788
  },
  'shoreline_north': {
    name: 'Shoreline North/185th',
    southbound: '40_N17-T2',
    northbound: '40_N17-T1',
    lat: 47.764067,
    lon: -122.322889
  },
  'shoreline_south': {
    name: 'Shoreline South/148th',
    southbound: '40_N15-T2',
    northbound: '40_N15-T1',
    lat: 47.736095,
    lon: -122.325227
  },
  'pinehurst': {
    name: 'Pinehurst',
    southbound: '40_N13-T2',
    northbound: '40_N13-T1',
    lat: 47.724043,
    lon: -122.323851
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
    southbound: '40_99610',
    northbound: '40_99603',
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
    southbound: '40_623',
    northbound: '40_621',
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
    southbound: '40_55949',
    northbound: '40_55860',
    lat: 47.57655,
    lon: -122.297679
  },
  'columbia_city': {
    name: 'Columbia City',
    southbound: '40_56039',
    northbound: '40_55778',
    lat: 47.559733,
    lon: -122.292692
  },
  'othello': {
    name: 'Othello',
    southbound: '40_56159',
    northbound: '40_55656',
    lat: 47.537987,
    lon: -122.281563
  },
  'rainier_beach': {
    name: 'Rainier Beach',
    southbound: '40_56173',
    northbound: '40_55578',
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
    southbound: '40_99904',
    northbound: '40_99903',
    lat: 47.445381,
    lon: -122.296898
  },
  'angle_lake': {
    name: 'Angle Lake',
    southbound: '40_99914',
    northbound: '40_99913',
    lat: 47.422703,
    lon: -122.297714
  },
  'kent_des_moines': {
    name: 'Kent Des Moines',
    southbound: '40_S03-T2',
    northbound: '40_S03-T1',
    lat: 47.389552,
    lon: -122.294399
  },
  'star_lake': {
    name: 'Star Lake',
    southbound: '40_S05-T2',
    northbound: '40_S05-T1',
    lat: 47.359388,
    lon: -122.297391
  },
  'federal_way': {
    name: 'Federal Way Downtown',
    stopIds: ['40_S07-T1', '40_S07-T2'],
    southbound: '40_S07-T2',
    northbound: '40_S07-T1',
    outboundDirection: 'northbound',
    lat: 47.315903,
    lon: -122.303829
  }
};

// Link 2 Line stations (Downtown Redmond <-> Bellevue <-> Seattle <-> Lynnwood City Center)
// southbound = Toward Lynnwood (dir 1 in GTFS), northbound = Toward Redmond (dir 0 in GTFS)
const LINK_2_LINE_STATIONS = {
  'downtown_redmond': {
    name: 'Downtown Redmond',
    stopIds: ['40_E31-T1', '40_E31-T2'],
    southbound: '40_E31-T1',
    northbound: '40_E31-T1',
    outboundDirection: 'southbound',
    lat: 47.671645,
    lon: -122.118480
  },
  'marymoor_village': {
    name: 'Marymoor Village',
    stopIds: ['40_E29-T1', '40_E29-T2'],
    southbound: '40_E29-T1',
    northbound: '40_E29-T2',
    lat: 47.667263,
    lon: -122.109800
  },
  'redmond_tech': {
    name: 'Redmond Technology',
    stopIds: ['40_E27-T1', '40_E27-T2'],
    southbound: '40_E27-T1',
    northbound: '40_E27-T2',
    lat: 47.644842,
    lon: -122.133628
  },
  'overlake_village': {
    name: 'Overlake Village',
    stopIds: ['40_E25-T1', '40_E25-T2'],
    southbound: '40_E25-T1',
    northbound: '40_E25-T2',
    lat: 47.636310,
    lon: -122.138920
  },
  'bel_red': {
    name: 'BelRed',
    stopIds: ['40_E23-T1', '40_E23-T2'],
    southbound: '40_E23-T1',
    northbound: '40_E23-T2',
    lat: 47.624448,
    lon: -122.165640
  },
  'spring_district': {
    name: 'Spring District',
    stopIds: ['40_E21-T1', '40_E21-T2'],
    southbound: '40_E21-T1',
    northbound: '40_E21-T2',
    lat: 47.623773,
    lon: -122.178573
  },
  'wilburton': {
    name: 'Wilburton',
    stopIds: ['40_E19-T1', '40_E19-T2'],
    southbound: '40_E19-T1',
    northbound: '40_E19-T2',
    lat: 47.617967,
    lon: -122.183762
  },
  'bellevue_downtown': {
    name: 'Bellevue Downtown',
    stopIds: ['40_E15-T1', '40_E15-T2'],
    southbound: '40_E15-T1',
    northbound: '40_E15-T2',
    lat: 47.615223,
    lon: -122.192084
  },
  'east_main': {
    name: 'East Main',
    stopIds: ['40_E11-T1', '40_E11-T2'],
    southbound: '40_E11-T1',
    northbound: '40_E11-T2',
    lat: 47.608188,
    lon: -122.191147
  },
  'south_bellevue': {
    name: 'South Bellevue',
    stopIds: ['40_E09-T1', '40_E09-T2'],
    southbound: '40_E09-T1',
    northbound: '40_E09-T2',
    lat: 47.586556,
    lon: -122.190396
  },
  'mercer_island': {
    name: 'Mercer Island',
    stopIds: ['40_E07-T1', '40_E07-T2'],
    southbound: '40_E07-T1',
    northbound: '40_E07-T2',
    lat: 47.588198,
    lon: -122.233232
  },
  'judkins_park': {
    name: 'Judkins Park',
    stopIds: ['40_E01-T1', '40_E01-T2'],
    southbound: '40_E01-T1',
    northbound: '40_E01-T2',
    lat: 47.590299,
    lon: -122.304508
  },
  'chinatown': {
    name: "Int'l Dist/Chinatown",
    stopIds: ['40_621', '40_623'],
    southbound: '40_621',
    northbound: '40_623',
    lat: 47.598355,
    lon: -122.327992
  },
  'pioneer_square': {
    name: 'Pioneer Square',
    stopIds: ['40_532', '40_501'],
    southbound: '40_532',
    northbound: '40_501',
    lat: 47.602560,
    lon: -122.331216
  },
  'symphony': {
    name: 'Symphony',
    stopIds: ['40_565', '40_455'],
    southbound: '40_565',
    northbound: '40_455',
    lat: 47.607810,
    lon: -122.336020
  },
  'westlake': {
    name: 'Westlake',
    stopIds: ['40_1121', '40_1108'],
    southbound: '40_1121',
    northbound: '40_1108',
    lat: 47.611572,
    lon: -122.336720
  },
  'capitol_hill': {
    name: 'Capitol Hill',
    stopIds: ['40_99603', '40_99610'],
    southbound: '40_99603',
    northbound: '40_99610',
    lat: 47.619060,
    lon: -122.320195
  },
  'uw': {
    name: 'Univ of Washington',
    stopIds: ['40_99605', '40_99604'],
    southbound: '40_99605',
    northbound: '40_99604',
    lat: 47.649815,
    lon: -122.303763
  },
  'u_district': {
    name: 'U District',
    stopIds: ['40_990002', '40_990001'],
    southbound: '40_990002',
    northbound: '40_990001',
    lat: 47.660301,
    lon: -122.314132
  },
  'roosevelt': {
    name: 'Roosevelt',
    stopIds: ['40_990004', '40_990003'],
    southbound: '40_990004',
    northbound: '40_990003',
    lat: 47.676595,
    lon: -122.315976
  },
  'northgate': {
    name: 'Northgate',
    stopIds: ['40_990006', '40_990005'],
    southbound: '40_990006',
    northbound: '40_990005',
    lat: 47.703028,
    lon: -122.328290
  },
  'pinehurst': {
    name: 'Pinehurst',
    stopIds: ['40_N13-T1', '40_N13-T2'],
    southbound: '40_N13-T1',
    northbound: '40_N13-T2',
    lat: 47.724043,
    lon: -122.323851
  },
  'shoreline_south': {
    name: 'Shoreline South/148th',
    stopIds: ['40_N15-T1', '40_N15-T2'],
    southbound: '40_N15-T1',
    northbound: '40_N15-T2',
    lat: 47.736095,
    lon: -122.325227
  },
  'shoreline_north': {
    name: 'Shoreline North/185th',
    stopIds: ['40_N17-T1', '40_N17-T2'],
    southbound: '40_N17-T1',
    northbound: '40_N17-T2',
    lat: 47.764067,
    lon: -122.322889
  },
  'mountlake_terrace': {
    name: 'Mountlake Terrace',
    stopIds: ['40_N19-T1', '40_N19-T2'],
    southbound: '40_N19-T1',
    northbound: '40_N19-T2',
    lat: 47.785057,
    lon: -122.314788
  },
  'lynnwood': {
    name: 'Lynnwood City Center',
    stopIds: ['40_N23-T1', '40_N23-T2'],
    southbound: '40_N23-T1',
    northbound: '40_N23-T2',
    outboundDirection: 'northbound',
    lat: 47.815637,
    lon: -122.294779
  }
};

// Route IDs for Link Light Rail (GTFS-RT omits the '40_' agency prefix that OBA includes)
const LINK_ROUTES = {
  '1_line': {
    ids: new Set(['100479', '40_100479']),
    shortName: '1 Line',
    defaultHeadsigns: {
      southbound: 'Federal Way Downtown',
      northbound: 'Lynnwood City Center'
    }
  },
  '2_line': {
    ids: new Set(['2LINE', '40_2LINE']),
    shortName: '2 Line',
    defaultHeadsigns: {
      southbound: 'Lynnwood City Center',
      northbound: 'Downtown Redmond'
    }
  }
};

// Combined all lines
const ALL_LINES = {
  '1_line': {
    name: '1 Line',
    color: '#28813F',
    stations: LINK_1_LINE_STATIONS,
    directions: {
      southbound: 'Southbound (to Federal Way)',
      northbound: 'Northbound (to Lynnwood)'
    }
  },
  '2_line': {
    name: '2 Line',
    color: '#007CAD',
    stations: LINK_2_LINE_STATIONS,
    directions: {
      southbound: 'Toward Lynnwood',
      northbound: 'Toward Redmond'
    }
  }
};

const STOP_ID_TO_STATION_NAME = new Map();
for (const stations of [LINK_1_LINE_STATIONS, LINK_2_LINE_STATIONS]) {
  for (const st of Object.values(stations)) {
    for (const id of [st.southbound, st.northbound, ...(st.stopIds || [])]) {
      if (!id) continue;
      STOP_ID_TO_STATION_NAME.set(id, st.name);
      STOP_ID_TO_STATION_NAME.set(id.replace(/^40_/, ''), st.name);
    }
  }
}

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

// Pace uncached OBA calls to respect public TEST key rate limits and dedupe concurrent stop requests
const OBA_MIN_INTERVAL_MS = 1100;
let obaQueue = Promise.resolve();
let lastObaCallAt = 0;
const obaInFlight = new Map();

function enqueueObaFetch(fn) {
  const run = obaQueue.then(async () => {
    const waitMs = Math.max(0, lastObaCallAt + OBA_MIN_INTERVAL_MS - Date.now());
    if (waitMs > 0) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
    lastObaCallAt = Date.now();
    return fn();
  });
  obaQueue = run.catch(() => {});
  return run;
}

// Get arrivals for a specific stop using OneBusAway API (with cache + pacing)
async function getArrivalsFromOBA(stopId) {
  const cacheKey = `oba:${stopId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }
  if (obaInFlight.has(cacheKey)) {
    return obaInFlight.get(cacheKey);
  }

  const url = `${OBA_BASE_URL}/where/arrivals-and-departures-for-stop/${stopId}.json?key=${OBA_API_KEY}&minutesBefore=0&minutesAfter=60`;

  const promise = enqueueObaFetch(async () => {
    try {
      let response = await fetch(url);
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        lastObaCallAt = Date.now();
        response = await fetch(url);
      }
      if (!response.ok) {
        throw new Error(`OBA API error: ${response.status}`);
      }
      const data = await response.json();
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error fetching OBA arrivals for ${stopId}:`, error.message);
      return null;
    } finally {
      obaInFlight.delete(cacheKey);
    }
  });

  obaInFlight.set(cacheKey, promise);
  return promise;
}

// Parse trip updates for specific stops
function parseTripUpdates(feed, targetStopIds, lineId, direction, stationName) {
  const arrivals = [];
  if (!feed || !feed.entity) return arrivals;

  const targetNormalized = new Set(targetStopIds.map(id => id.replace(/^40_/, '')));
  const routeMeta = LINK_ROUTES[lineId];

  for (const entity of feed.entity) {
    if (!entity.tripUpdate) continue;

    const tripUpdate = entity.tripUpdate;
    const trip = tripUpdate.trip;
    const routeId = trip?.routeId || '';
    if (routeMeta && !routeMeta.ids.has(routeId)) continue;

    const stus = tripUpdate.stopTimeUpdate || [];
    if (stus.length === 0) continue;

    const lastStopRaw = stus[stus.length - 1]?.stopId || '';
    const lastStopName = STOP_ID_TO_STATION_NAME.get(lastStopRaw) || STOP_ID_TO_STATION_NAME.get(`40_${lastStopRaw}`);
    const fallbackHeadsign = routeMeta?.defaultHeadsigns?.[direction] || '';
    const tripHeadsign = lastStopName || fallbackHeadsign;

    for (let idx = 0; idx < stus.length; idx++) {
      const stopTimeUpdate = stus[idx];
      const stopIdRaw = stopTimeUpdate.stopId || '';
      const stopIdNorm = stopIdRaw.replace(/^40_/, '');
      if (!targetNormalized.has(stopIdNorm)) continue;

      const arrival = stopTimeUpdate.arrival;
      const departure = stopTimeUpdate.departure;
      const eventTimeSec = departure?.time || arrival?.time;
      const arrivalTime = arrival?.time ? Number(arrival.time) * 1000 : (eventTimeSec ? Number(eventTimeSec) * 1000 : null);
      const departureTime = departure?.time ? Number(departure.time) * 1000 : arrivalTime;
      const arrivalDelay = arrival?.delay || 0;
      const departureDelay = departure?.delay || 0;

      // At a terminus, ignore trains ending their run there when querying outbound departures
      const isLastStop = idx === stus.length - 1;
      if (isLastStop && stationName && tripHeadsign === stationName) {
        const stationInfo = ALL_LINES[lineId]?.stations?.[Object.keys(ALL_LINES[lineId]?.stations || {}).find(k => ALL_LINES[lineId].stations[k].name === stationName)];
        if (stationInfo?.outboundDirection === direction) {
          continue;
        }
      }

      arrivals.push({
        tripId: trip?.tripId || 'unknown',
        routeId: routeId || 'unknown',
        routeShortName: routeMeta?.shortName || routeId,
        tripHeadsign,
        directionId: trip?.directionId,
        stopId: stopIdRaw.startsWith('40_') ? stopIdRaw : `40_${stopIdRaw}`,
        arrivalTime,
        scheduledArrivalTime: arrivalTime && arrivalDelay ? arrivalTime - arrivalDelay * 1000 : arrivalTime,
        predictedArrivalTime: arrivalTime,
        arrivalDelay,
        departureTime,
        departureDelay,
        predicted: true,
        vehicleId: tripUpdate.vehicle?.id || null,
        scheduleRelationship: stopTimeUpdate.scheduleRelationship
      });
    }
  }

  arrivals.sort((a, b) => (a.arrivalTime || Infinity) - (b.arrivalTime || Infinity));
  return arrivals;
}

const VALID_DIRECTIONS = new Set(['southbound', 'northbound']);

function validateLineAndDirection(res, line, direction) {
  if (line && !ALL_LINES[line]) {
    res.status(400).json({ error: 'Invalid line' });
    return false;
  }
  if (direction && !VALID_DIRECTIONS.has(direction)) {
    res.status(400).json({ error: 'Invalid direction' });
    return false;
  }
  return true;
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
  if (!validateLineAndDirection(res, line)) return;
  const lineData = line ? ALL_LINES[line] : ALL_LINES['2_line'];
  
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
  if (!validateLineAndDirection(res, line, direction)) return;
  
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
  let targetStopIds = station.stopIds || [station.southbound, station.northbound].filter(Boolean);
  if (station.outboundDirection === direction && station.stopIds) {
    targetStopIds = station.stopIds;
  } else if (direction === 'southbound' && station.southbound) {
    targetStopIds = [station.southbound];
  } else if (direction === 'northbound' && station.northbound) {
    targetStopIds = [station.northbound];
  }

  const expectedRoutes = LINK_ROUTES[lineId]?.ids;

  try {
    // Try Sound Transit agency GTFS-RT feed first (single cached call)
    const feed = await fetchGtfsRt(GTFS_RT_FEEDS.tripUpdates);
    let arrivals = parseTripUpdates(feed, targetStopIds, lineId, direction, station.name);

    // Enrich or fall back to OBA stop API when GTFS-RT yields few or no upcoming trips
    if (arrivals.length < 3) {
      for (const stopId of targetStopIds) {
        const obaData = await getArrivalsFromOBA(stopId);
        if (obaData?.data?.entry?.arrivalsAndDepartures) {
          for (const arrival of obaData.data.entry.arrivalsAndDepartures) {
            if (expectedRoutes && arrival.routeId && !expectedRoutes.has(arrival.routeId)) {
              continue;
            }
            if (station.outboundDirection === direction && arrival.tripHeadsign === station.name) {
              continue;
            }
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

    // Deduplicate by normalized tripId (GTFS-RT omits '40_' prefix that OBA includes)
    const tripMap = new Map();
    for (const arrival of arrivals) {
      const key = String(arrival.tripId || '').replace(/^40_/, '');
      const existing = tripMap.get(key);
      if (!existing) {
        tripMap.set(key, arrival);
      } else if (arrival.scheduledArrivalTime && !existing.arrivalDelay) {
        tripMap.set(key, {
          ...existing,
          scheduledArrivalTime: arrival.scheduledArrivalTime,
          tripHeadsign: arrival.tripHeadsign || existing.tripHeadsign,
          predicted: arrival.predicted || existing.predicted
        });
      } else if (arrival.predicted && !existing.predicted) {
        tripMap.set(key, arrival);
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
          direction: 'Optional: southbound or northbound',
          line: 'Optional: 1_line or 2_line'
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
