/**
 * Geofencing & Network Access Restriction Engine
 * Enforces physical campus boundaries (via GPS/W3C Geolocation) and authorized WiFi networks (via Egress IP & Subnet checks).
 */

export interface AccessVerificationParams {
  clientIp: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  action: 'LOGIN' | 'ATTENDANCE';
  settings: Map<string, string>;
}

export interface AccessVerificationResult {
  allowed: boolean;
  reason?: string;
  distanceMeters?: number;
  allowedRadiusMeters?: number;
  geofencePassed?: boolean;
  networkPassed?: boolean;
  clientIp: string;
  isLocalhost?: boolean;
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula (returns distance in meters).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Normalizes an IP address by stripping IPv6-mapped IPv4 prefixes (e.g. ::ffff:192.168.1.1).
 */
export function normalizeIp(ip: string): string {
  if (!ip) return '127.0.0.1';
  return ip.replace(/^::ffff:/, '').trim();
}

/**
 * Checks if an IP is within a CIDR subnet (e.g. 192.168.1.0/24 or 10.0.0.0/8).
 */
function ipInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bitsStr] = cidr.split('/');
    if (!bitsStr) return ip === range;

    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits) || bits < 0 || bits > 32) return false;

    const ipNum = ipToLong(ip);
    const rangeNum = ipToLong(range);
    if (ipNum === null || rangeNum === null) return false;

    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

function ipToLong(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const part = parseInt(parts[i], 10);
    if (isNaN(part) || part < 0 || part > 255) return null;
    num = ((num << 8) + part) >>> 0;
  }
  return num;
}

/**
 * Checks if a client IP matches an allowed list of individual IPs or CIDR subnets.
 */
export function isIpInAllowedList(
  clientIp: string,
  allowedListRaw: string | string[],
  allowLocalhost: boolean = true
): boolean {
  const cleanClientIp = normalizeIp(clientIp);

  // Localhost / Loopback addresses (dev environment support)
  const isLoopback =
    cleanClientIp === '127.0.0.1' ||
    cleanClientIp === '::1' ||
    cleanClientIp === 'localhost' ||
    cleanClientIp.startsWith('127.');

  if (isLoopback && allowLocalhost) {
    return true;
  }

  const allowedIps: string[] = Array.isArray(allowedListRaw)
    ? allowedListRaw
    : (allowedListRaw || '')
        .split(/[,\n;]/)
        .map((s) => s.trim())
        .filter(Boolean);

  if (allowedIps.length === 0) {
    return true; // No IPs specified implies unrestricted if list is empty
  }

  for (const item of allowedIps) {
    const cleanItem = normalizeIp(item);
    if (cleanItem.includes('/')) {
      if (ipInCidr(cleanClientIp, cleanItem)) return true;
    } else {
      if (cleanClientIp === cleanItem) return true;
    }
  }

  return false;
}

/**
 * Main verification function that enforces geofence and WiFi restrictions.
 */
export function verifyAccessRestriction(
  params: AccessVerificationParams
): AccessVerificationResult {
  const { clientIp, latitude, longitude, accuracy, action, settings } = params;
  const cleanIp = normalizeIp(clientIp);
  const isLoopback =
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('127.');

  // Read configuration from settings
  const geofenceEnabled = settings.get('RESTRICTION_GEOFENCE_ENABLED') === 'true';
  const wifiEnabled = settings.get('RESTRICTION_WIFI_ENABLED') === 'true';
  const restrictionScope = settings.get('RESTRICTION_SCOPE') || 'LOGIN_AND_ATTENDANCE'; // 'LOGIN_AND_ATTENDANCE' | 'LOGIN_ONLY' | 'ATTENDANCE_ONLY'
  const allowLocalhost = settings.get('RESTRICTION_ALLOW_LOCALHOST') !== 'false'; // Default to true

  // Check if restriction applies to this action
  const appliesToAction =
    restrictionScope === 'LOGIN_AND_ATTENDANCE' ||
    (restrictionScope === 'LOGIN_ONLY' && action === 'LOGIN') ||
    (restrictionScope === 'ATTENDANCE_ONLY' && action === 'ATTENDANCE');

  if (!appliesToAction) {
    return {
      allowed: true,
      clientIp: cleanIp,
      isLocalhost: isLoopback,
    };
  }

  // 1. NETWORK / WIFI RESTRICTION CHECK
  let networkPassed = true;
  if (wifiEnabled) {
    const allowedIpsRaw = settings.get('RESTRICTION_ALLOWED_IPS') || '';
    networkPassed = isIpInAllowedList(cleanIp, allowedIpsRaw, allowLocalhost);

    if (!networkPassed) {
      const actionName = action === 'LOGIN' ? 'login' : 'marking attendance';
      const wifiSsid = settings.get('RESTRICTION_WIFI_SSID');
      const networkPrompt = wifiSsid ? `the designated Academy WiFi "${wifiSsid}"` : 'the designated Academy WiFi network';
      return {
        allowed: false,
        reason: `Access restricted: You must be connected to ${networkPrompt} for ${actionName}. (Current IP: ${cleanIp})`,
        networkPassed: false,
        clientIp: cleanIp,
        isLocalhost: isLoopback,
      };
    }
  }

  // 2. GEOFENCE LOCATION CHECK
  let distanceMeters: number | undefined;
  let allowedRadius: number | undefined;

  if (geofenceEnabled) {
    // If testing on localhost and allowLocalhost is true, permit testing even without GPS if not supplied
    if (isLoopback && allowLocalhost && (latitude == null || longitude == null)) {
      return {
        allowed: true,
        networkPassed: true,
        geofencePassed: true,
        distanceMeters: 0,
        allowedRadiusMeters: 150,
        clientIp: cleanIp,
        isLocalhost: true,
      };
    }

    // Latitude & Longitude are required when Geofence is active
    if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
      return {
        allowed: false,
        reason:
          'Location verification required: Please allow location access in your browser to verify campus attendance.',
        geofencePassed: false,
        networkPassed,
        clientIp: cleanIp,
        isLocalhost: isLoopback,
      };
    }

    // Check accuracy tolerance (e.g. reject coarse cell/IP estimates > 200m)
    if (accuracy != null && accuracy > 250) {
      return {
        allowed: false,
        reason: `Location accuracy too low (±${Math.round(accuracy)}m). Please turn on High Accuracy / GPS on your device.`,
        geofencePassed: false,
        networkPassed,
        clientIp: cleanIp,
        isLocalhost: isLoopback,
      };
    }

    const campusLatStr = settings.get('RESTRICTION_CAMPUS_LAT');
    const campusLngStr = settings.get('RESTRICTION_CAMPUS_LNG');
    const radiusStr = settings.get('RESTRICTION_RADIUS_METERS') || '150';

    if (campusLatStr && campusLngStr) {
      const campusLat = parseFloat(campusLatStr);
      const campusLng = parseFloat(campusLngStr);
      allowedRadius = parseInt(radiusStr, 10) || 150;

      if (!isNaN(campusLat) && !isNaN(campusLng)) {
        distanceMeters = calculateHaversineDistance(latitude, longitude, campusLat, campusLng);

        if (distanceMeters > allowedRadius) {
          const actionName = action === 'LOGIN' ? 'login' : 'mark attendance';
          return {
            allowed: false,
            reason: `Location boundary exceeded: You are approximately ${distanceMeters}m away from the campus center (allowed within ${allowedRadius}m). You must be present inside the academy to ${actionName}.`,
            distanceMeters,
            allowedRadiusMeters: allowedRadius,
            geofencePassed: false,
            networkPassed,
            clientIp: cleanIp,
            isLocalhost: isLoopback,
          };
        }
      }
    }
  }

  return {
    allowed: true,
    distanceMeters,
    allowedRadiusMeters: allowedRadius,
    geofencePassed: true,
    networkPassed: true,
    clientIp: cleanIp,
    isLocalhost: isLoopback,
  };
}
