import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { invalidateSettingsCache, getCachedSystemSettings } from '@/lib/settings';
import { getClientIp } from '@/lib/security';
import { normalizeIp } from '@/lib/geofence';

export async function GET(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const clientIp = normalizeIp(getClientIp(request));
    const settingsMap = await getCachedSystemSettings();

    return NextResponse.json({
      success: true,
      currentDetectedIp: clientIp,
      geofenceEnabled: settingsMap.get('RESTRICTION_GEOFENCE_ENABLED') === 'true',
      campusLat: settingsMap.get('RESTRICTION_CAMPUS_LAT') || '',
      campusLng: settingsMap.get('RESTRICTION_CAMPUS_LNG') || '',
      radiusMeters: parseInt(settingsMap.get('RESTRICTION_RADIUS_METERS') || '150', 10),
      wifiEnabled: settingsMap.get('RESTRICTION_WIFI_ENABLED') === 'true',
      wifiSsid: settingsMap.get('RESTRICTION_WIFI_SSID') || '',
      allowedIps: settingsMap.get('RESTRICTION_ALLOWED_IPS') || '',
      scope: settingsMap.get('RESTRICTION_SCOPE') || 'LOGIN_AND_ATTENDANCE',
      allowLocalhost: settingsMap.get('RESTRICTION_ALLOW_LOCALHOST') !== 'false',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch access control settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const body = await request.json();
    const {
      geofenceEnabled,
      campusLat,
      campusLng,
      radiusMeters,
      wifiEnabled,
      wifiSsid,
      allowedIps,
      scope,
      allowLocalhost,
    } = body;

    const updates = [
      { key: 'RESTRICTION_GEOFENCE_ENABLED', value: geofenceEnabled ? 'true' : 'false' },
      { key: 'RESTRICTION_CAMPUS_LAT', value: campusLat != null ? String(campusLat).trim() : '' },
      { key: 'RESTRICTION_CAMPUS_LNG', value: campusLng != null ? String(campusLng).trim() : '' },
      { key: 'RESTRICTION_RADIUS_METERS', value: String(radiusMeters || 150) },
      { key: 'RESTRICTION_WIFI_ENABLED', value: wifiEnabled ? 'true' : 'false' },
      { key: 'RESTRICTION_WIFI_SSID', value: wifiSsid != null ? String(wifiSsid).trim() : '' },
      { key: 'RESTRICTION_ALLOWED_IPS', value: allowedIps != null ? String(allowedIps).trim() : '' },
      { key: 'RESTRICTION_SCOPE', value: scope || 'LOGIN_AND_ATTENDANCE' },
      { key: 'RESTRICTION_ALLOW_LOCALHOST', value: allowLocalhost !== false ? 'true' : 'false' },
    ];

    await Promise.all(
      updates.map((u) =>
        prisma.systemSetting.upsert({
          where: { key: u.key },
          update: { value: u.value },
          create: { key: u.key, value: u.value },
        })
      )
    );

    // Invalidate settings cache so login and attendance checks immediately reflect the new policy
    await invalidateSettingsCache();

    return NextResponse.json({
      success: true,
      message: 'Network and geofencing access control settings saved successfully!',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to save access control settings' }, { status: 500 });
  }
}
