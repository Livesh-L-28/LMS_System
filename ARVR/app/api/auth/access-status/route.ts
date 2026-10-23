import { NextResponse } from 'next/server';
import { getCachedSystemSettings } from '@/lib/settings';
import { getClientIp } from '@/lib/security';
import { normalizeIp, isIpInAllowedList } from '@/lib/geofence';

export async function GET(request: Request) {
  try {
    const clientIp = normalizeIp(getClientIp(request));
    const isLocalhost =
      clientIp === '127.0.0.1' ||
      clientIp === '::1' ||
      clientIp === 'localhost' ||
      clientIp.startsWith('127.');

    const settingsMap = await getCachedSystemSettings();

    const geofenceEnabled = settingsMap.get('RESTRICTION_GEOFENCE_ENABLED') === 'true';
    const wifiEnabled = settingsMap.get('RESTRICTION_WIFI_ENABLED') === 'true';
    const wifiSsid = settingsMap.get('RESTRICTION_WIFI_SSID') || '';
    const scope = settingsMap.get('RESTRICTION_SCOPE') || 'LOGIN_AND_ATTENDANCE';
    const allowLocalhost = settingsMap.get('RESTRICTION_ALLOW_LOCALHOST') !== 'false';
    const allowedIpsRaw = settingsMap.get('RESTRICTION_ALLOWED_IPS') || '';

    const wifiPassed = wifiEnabled ? isIpInAllowedList(clientIp, allowedIpsRaw, allowLocalhost) : true;

    return NextResponse.json({
      geofenceEnabled,
      wifiEnabled,
      wifiSsid,
      scope,
      clientIp,
      isLocalhost,
      wifiPassed,
    });
  } catch {
    return NextResponse.json({
      geofenceEnabled: false,
      wifiEnabled: false,
      wifiSsid: '',
      scope: 'LOGIN_AND_ATTENDANCE',
      clientIp: '127.0.0.1',
      isLocalhost: true,
      wifiPassed: true,
    });
  }
}
