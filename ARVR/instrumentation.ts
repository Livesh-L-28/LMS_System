export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateProductionSecurityEnvironment } = await import('@/lib/security');
    const secAudit = validateProductionSecurityEnvironment();
    if (!secAudit.valid) {
      console.error('[SECURITY_CRITICAL] Production security validation failed:');
      secAudit.errors.forEach((err) => console.error(`  ❌ ${err}`));
    }
    secAudit.warnings.forEach((warn) => console.warn(`  ⚠️ [Security Warning] ${warn}`));

    const { initMorningWatchdogScheduler } = await import('@/lib/cronScheduler');
    initMorningWatchdogScheduler();
  }
}
