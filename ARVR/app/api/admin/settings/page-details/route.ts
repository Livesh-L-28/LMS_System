import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getCachedSystemSettings, invalidateSettingsCache } from '@/lib/settings';

export const DEFAULT_PAGE_SETTINGS: Record<string, string> = {
  PAGE_TITLE: 'AR/VR ACADEMY',
  PAGE_SUBTITLE: 'Spatial Computing & Immersive Training Hub',
  PAGE_BADGE: 'ENTERPRISE',
  BROWSER_TITLE: 'AR/VR Spatial Computing Academy | Immersive Training Platform',
  PAGE_DESCRIPTION: 'Enterprise spatial computing academy and immersive training management system with real-time attendance, daily practical tasks, and automated certification.',
  ORGANIZATION_NAME: 'AR/VR COE',
  FOOTER_TEXT: 'AR/VR Spatial Computing Academy © 2026',
  SUPPORT_EMAIL: 'support@arvr.com',
};

export async function GET() {
  try {
    const settingsMap = await getCachedSystemSettings();

    return NextResponse.json({
      success: true,
      pageTitle: settingsMap.get('PAGE_TITLE') || DEFAULT_PAGE_SETTINGS.PAGE_TITLE,
      pageSubtitle: settingsMap.get('PAGE_SUBTITLE') || DEFAULT_PAGE_SETTINGS.PAGE_SUBTITLE,
      pageBadge: settingsMap.get('PAGE_BADGE') || DEFAULT_PAGE_SETTINGS.PAGE_BADGE,
      browserTitle: settingsMap.get('BROWSER_TITLE') || DEFAULT_PAGE_SETTINGS.BROWSER_TITLE,
      pageDescription: settingsMap.get('PAGE_DESCRIPTION') || DEFAULT_PAGE_SETTINGS.PAGE_DESCRIPTION,
      orgName: settingsMap.get('ORGANIZATION_NAME') || DEFAULT_PAGE_SETTINGS.ORGANIZATION_NAME,
      footerText: settingsMap.get('FOOTER_TEXT') || DEFAULT_PAGE_SETTINGS.FOOTER_TEXT,
      supportEmail: settingsMap.get('SUPPORT_EMAIL') || DEFAULT_PAGE_SETTINGS.SUPPORT_EMAIL,
    });
  } catch {
    return NextResponse.json({
      success: true,
      pageTitle: DEFAULT_PAGE_SETTINGS.PAGE_TITLE,
      pageSubtitle: DEFAULT_PAGE_SETTINGS.PAGE_SUBTITLE,
      pageBadge: DEFAULT_PAGE_SETTINGS.PAGE_BADGE,
      browserTitle: DEFAULT_PAGE_SETTINGS.BROWSER_TITLE,
      pageDescription: DEFAULT_PAGE_SETTINGS.PAGE_DESCRIPTION,
      orgName: DEFAULT_PAGE_SETTINGS.ORGANIZATION_NAME,
      footerText: DEFAULT_PAGE_SETTINGS.FOOTER_TEXT,
      supportEmail: DEFAULT_PAGE_SETTINGS.SUPPORT_EMAIL,
    });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const body = await request.json();
    const {
      pageTitle,
      pageSubtitle,
      pageBadge,
      browserTitle,
      pageDescription,
      orgName,
      footerText,
      supportEmail,
    } = body;

    const updates = [
      { key: 'PAGE_TITLE', value: (pageTitle ?? DEFAULT_PAGE_SETTINGS.PAGE_TITLE).trim() },
      { key: 'PAGE_SUBTITLE', value: (pageSubtitle ?? DEFAULT_PAGE_SETTINGS.PAGE_SUBTITLE).trim() },
      { key: 'PAGE_BADGE', value: (pageBadge ?? DEFAULT_PAGE_SETTINGS.PAGE_BADGE).trim() },
      { key: 'BROWSER_TITLE', value: (browserTitle ?? DEFAULT_PAGE_SETTINGS.BROWSER_TITLE).trim() },
      { key: 'PAGE_DESCRIPTION', value: (pageDescription ?? DEFAULT_PAGE_SETTINGS.PAGE_DESCRIPTION).trim() },
      { key: 'ORGANIZATION_NAME', value: (orgName ?? DEFAULT_PAGE_SETTINGS.ORGANIZATION_NAME).trim() },
      { key: 'FOOTER_TEXT', value: (footerText ?? DEFAULT_PAGE_SETTINGS.FOOTER_TEXT).trim() },
      { key: 'SUPPORT_EMAIL', value: (supportEmail ?? DEFAULT_PAGE_SETTINGS.SUPPORT_EMAIL).trim() },
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

    await invalidateSettingsCache();

    return NextResponse.json({
      success: true,
      message: 'Page title and branding details saved successfully!',
      pageTitle: updates.find((u) => u.key === 'PAGE_TITLE')?.value,
      pageSubtitle: updates.find((u) => u.key === 'PAGE_SUBTITLE')?.value,
      pageBadge: updates.find((u) => u.key === 'PAGE_BADGE')?.value,
      browserTitle: updates.find((u) => u.key === 'BROWSER_TITLE')?.value,
      pageDescription: updates.find((u) => u.key === 'PAGE_DESCRIPTION')?.value,
      orgName: updates.find((u) => u.key === 'ORGANIZATION_NAME')?.value,
      footerText: updates.find((u) => u.key === 'FOOTER_TEXT')?.value,
      supportEmail: updates.find((u) => u.key === 'SUPPORT_EMAIL')?.value,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to save page details settings' }, { status: 500 });
  }
}
