const env = require('../config/env');
const { httpError } = require('./auth.helpers');

const NOMINATIM_HEADERS = { 'User-Agent': 'UniMove/1.0 (booking-autocomplete)' };

function parseCoord(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractLocality(pickupAddress) {
  const parts = String(pickupAddress || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (/thành phố|tp\.?\s|đà nẵng|hồ chí minh|hà nội|cần thơ|hải phòng|huế|nha trang|bình dương|đồng nai/i.test(part)) {
      return part.replace(/^thành phố\s+/i, '').trim() || part;
    }
  }

  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return '';
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatMainText(row) {
  const addr = row.address || {};
  const house = addr.house_number ? String(addr.house_number).trim() : '';
  const road = addr.road ? String(addr.road).trim() : '';
  if (house && road) return `${house} ${road}`;
  if (road) return road;
  const name = String(row.name || '').trim();
  if (name) return name;
  return String(row.display_name || '').split(',')[0].trim();
}

function mapNominatimRow(row, fallbackInput) {
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  const address = String(row.display_name || '').trim();
  return {
    place_id: `osm:${lat}:${lng}`,
    main_text: formatMainText(row) || fallbackInput,
    secondary_text: address,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

function dedupeAndRank(rows, biasLat, biasLng, limit) {
  const seen = new Set();
  const unique = [];

  for (const row of rows) {
    const key = `${row.lat?.toFixed(5)}:${row.lng?.toFixed(5)}:${row.secondary_text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  if (biasLat != null && biasLng != null) {
    unique.sort((a, b) => {
      const da =
        a.lat != null && a.lng != null
          ? haversineKm(biasLat, biasLng, a.lat, a.lng)
          : 9999;
      const db =
        b.lat != null && b.lng != null
          ? haversineKm(biasLat, biasLng, b.lat, b.lng)
          : 9999;
      return da - db;
    });

    // Ưu tiên kết quả trong bán kính ~40km quanh điểm đi
    const nearby = unique.filter(
      (r) => r.lat != null && r.lng != null && haversineKm(biasLat, biasLng, r.lat, r.lng) <= 40,
    );
    if (nearby.length > 0) return nearby.slice(0, limit);
  }

  return unique.slice(0, limit);
}

async function nominatimFetch(params) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) {
    throw httpError(502, 'Không tìm được địa chỉ (Nominatim)', 'upstream_error');
  }

  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function nominatimSearch(input, options = {}) {
  const q = String(input || '').trim();
  const biasLat = parseCoord(options.lat);
  const biasLng = parseCoord(options.lng);
  const locality = extractLocality(options.pickupAddress);
  const collected = [];

  const viewboxParams = {};
  if (biasLat != null && biasLng != null) {
    const delta = 0.15;
    viewboxParams.viewbox = `${biasLng - delta},${biasLat + delta},${biasLng + delta},${biasLat - delta}`;
    viewboxParams.bounded = '0';
  }

  // 1) Tìm trong vùng gần điểm đi (strict bounded)
  if (biasLat != null && biasLng != null) {
    const localRows = await nominatimFetch({
      q: locality ? `${q}, ${locality}, Việt Nam` : `${q}, Việt Nam`,
      format: 'json',
      addressdetails: 1,
      limit: 10,
      countrycodes: 'vn',
      viewbox: `${biasLng - 0.12},${biasLat + 0.12},${biasLng + 0.12},${biasLat - 0.12}`,
      bounded: 1,
    });
    collected.push(...localRows.map((row) => mapNominatimRow(row, q)));
  }

  // 2) Structured: số nhà + tên đường + thành phố
  const hasHouseNumber = /^\d+\s+/.test(q);
  if (hasHouseNumber && locality) {
    const structuredRows = await nominatimFetch({
      street: q,
      city: locality,
      country: 'Vietnam',
      format: 'json',
      addressdetails: 1,
      limit: 8,
      ...viewboxParams,
    });
    collected.push(...structuredRows.map((row) => mapNominatimRow(row, q)));
  }

  // 3) Text search có thêm thành phố từ điểm đi
  const textQuery =
    locality && !q.toLowerCase().includes(locality.toLowerCase())
      ? `${q}, ${locality}, Việt Nam`
      : `${q}, Việt Nam`;
  const textRows = await nominatimFetch({
    q: textQuery,
    format: 'json',
    addressdetails: 1,
    limit: 10,
    countrycodes: 'vn',
    ...viewboxParams,
  });
  collected.push(...textRows.map((row) => mapNominatimRow(row, q)));

  return dedupeAndRank(collected, biasLat, biasLng, 6);
}

async function googleAutocomplete(input, sessionToken, options = {}) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', input);
  url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);
  url.searchParams.set('language', 'vi');
  url.searchParams.set('components', 'country:vn');

  const biasLat = parseCoord(options.lat);
  const biasLng = parseCoord(options.lng);
  if (biasLat != null && biasLng != null) {
    url.searchParams.set('location', `${biasLat},${biasLng}`);
    url.searchParams.set('radius', '30000');
    url.searchParams.set('strictbounds', 'false');
  }

  if (sessionToken) url.searchParams.set('sessiontoken', sessionToken);

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw httpError(502, `Google Places: ${data.status}`, 'upstream_error');
  }

  return (data.predictions || []).map((p) => ({
    place_id: `google:${p.place_id}`,
    main_text: p.structured_formatting?.main_text || p.description,
    secondary_text: p.structured_formatting?.secondary_text || '',
    lat: null,
    lng: null,
  }));
}

async function googlePlaceDetails(placeId, sessionToken) {
  const googleId = placeId.startsWith('google:') ? placeId.slice(7) : placeId;
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', googleId);
  url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);
  url.searchParams.set('language', 'vi');
  url.searchParams.set('fields', 'formatted_address,geometry,name');
  if (sessionToken) url.searchParams.set('sessiontoken', sessionToken);

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.result) {
    throw httpError(502, `Google Place Details: ${data.status}`, 'upstream_error');
  }

  const r = data.result;
  const lat = r.geometry?.location?.lat;
  const lng = r.geometry?.location?.lng;
  const address = String(r.formatted_address || r.name || '').trim();

  return {
    place_id: `google:${googleId}`,
    title: String(r.name || address.split(',')[0] || address).trim(),
    address,
    lat: lat != null ? Number(lat) : null,
    lng: lng != null ? Number(lng) : null,
  };
}

function osmPlaceDetails(placeId, fallbackAddress) {
  const parts = String(placeId || '').split(':');
  if (parts[0] !== 'osm' || parts.length < 3) {
    throw httpError(400, 'place_id OSM không hợp lệ', 'validation_error');
  }
  const lat = Number(parts[1]);
  const lng = Number(parts[2]);
  const address = String(fallbackAddress || '').trim();
  if (!address) {
    throw httpError(400, 'Thiếu địa chỉ cho place_id OSM', 'validation_error');
  }
  return {
    place_id: placeId,
    title: address.split(',')[0].trim() || address,
    address,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

/** GET /api/maps/places/autocomplete */
async function autocomplete(input, sessionToken, options = {}) {
  const q = String(input || '').trim();
  if (q.length < 2) return [];

  const biasOptions = {
    lat: options.lat,
    lng: options.lng,
    pickupAddress: options.pickupAddress,
  };

  if (env.GOOGLE_MAPS_API_KEY) {
    try {
      const googleResults = await googleAutocomplete(q, sessionToken, biasOptions);
      if (googleResults.length > 0) return googleResults;
    } catch (_) {
      // fallback when Google fails or quota exceeded
    }
  }

  return nominatimSearch(q, biasOptions);
}

/** GET /api/maps/places/details */
async function placeDetails(placeId, sessionToken, fallbackAddress) {
  const id = String(placeId || '').trim();
  if (!id) {
    throw httpError(400, 'Thiếu place_id', 'validation_error');
  }

  if (id.startsWith('osm:')) {
    return osmPlaceDetails(id, fallbackAddress);
  }

  if (id.startsWith('google:')) {
    if (!env.GOOGLE_MAPS_API_KEY) {
      throw httpError(503, 'Google Maps API key chưa cấu hình', 'config_error');
    }
    return googlePlaceDetails(id, sessionToken);
  }

  throw httpError(400, 'place_id không hỗ trợ', 'validation_error');
}

module.exports = {
  autocomplete,
  placeDetails,
};
