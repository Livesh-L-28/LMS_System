import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { DEFAULT_CURRICULUM_BY_LEVEL, LEVEL_CONFIG } from '@/lib/batchUtils';

export async function GET(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const { searchParams } = new URL(request.url);

    // Retrieve global configured levels list
    const levelsSetting = await prisma.systemSetting.findUnique({
      where: { key: 'CONFIGURED_LEVELS' },
    });

    let configuredLevels: string[] = [];
    if (levelsSetting?.value) {
      try {
        const parsed = JSON.parse(levelsSetting.value);
        if (Array.isArray(parsed)) {
          configuredLevels = parsed;
        }
      } catch (e) {}
    }

    // Retrieve all TASK_CONFIG_% settings to build levelDisplayNames map
    const allTaskSettings = await prisma.systemSetting.findMany({
      where: { key: { startsWith: 'TASK_CONFIG_' } },
    });

    const levelDisplayNames: Record<string, string> = {};

    allTaskSettings.forEach((s) => {
      try {
        const data = JSON.parse(s.value);
        const lvlCode = s.key.replace('TASK_CONFIG_', '');
        // Match against configuredLevels
        for (const l of configuredLevels) {
          if (l.toUpperCase().replace(/\s+/g, '_') === lvlCode) {
            if (data.levelName || data.levelTitle) {
              levelDisplayNames[l] = data.levelName || data.levelTitle;
            }
          }
        }
      } catch (e) {}
    });

    // If client just wants the list of levels
    if (searchParams.get('action') === 'levels') {
      return NextResponse.json({
        success: true,
        configuredLevels,
        levelDisplayNames,
      });
    }

    const requestedLevel = searchParams.get('level');
    // If no level requested and no configured levels exist, return clean empty response
    if (!requestedLevel && configuredLevels.length === 0) {
      return NextResponse.json({
        success: true,
        level: '',
        levelName: '',
        days: 0,
        tasks: [],
        configuredLevels: [],
        levelDisplayNames: {},
      });
    }

    const level = requestedLevel || (configuredLevels.length > 0 ? configuredLevels[0] : '');
    if (!level) {
      return NextResponse.json({
        success: true,
        level: '',
        levelName: '',
        days: 0,
        tasks: [],
        configuredLevels: [],
        levelDisplayNames: {},
      });
    }

    const levelCode = level.toUpperCase().replace(/\s+/g, '_');
    const settingKey = `TASK_CONFIG_${levelCode}`;

    const setting = await prisma.systemSetting.findUnique({
      where: { key: settingKey },
    });

    const defaultLevelTitle = LEVEL_CONFIG[level]?.name || level;

    const normalizeItem = (item: any) => ({
      ...item,
      tasks: (item.tasks && Array.isArray(item.tasks) && item.tasks.length > 0)
        ? item.tasks
        : [{ id: `task-${item.dayNumber}-1`, title: item.taskTitle || '', description: item.taskDescription || '' }],
      resources: Array.isArray(item.resources) ? item.resources : [],
    });

    if (setting && setting.value) {
      try {
        const parsedData = JSON.parse(setting.value);
        if (Array.isArray(parsedData)) {
          return NextResponse.json({
            success: true,
            level,
            levelName: levelDisplayNames[level] || defaultLevelTitle,
            days: parsedData.length,
            tasks: parsedData.map(normalizeItem),
            configuredLevels,
            levelDisplayNames,
          });
        } else if (parsedData && Array.isArray(parsedData.tasks)) {
          return NextResponse.json({
            success: true,
            level,
            levelName: parsedData.levelName || parsedData.levelTitle || levelDisplayNames[level] || defaultLevelTitle,
            days: parsedData.days || parsedData.tasks.length,
            tasks: parsedData.tasks.map(normalizeItem),
            configuredLevels,
            levelDisplayNames,
          });
        }
      } catch (e) {
        // Fallback to default
      }
    }

    const defaultTasks = DEFAULT_CURRICULUM_BY_LEVEL[level] || DEFAULT_CURRICULUM_BY_LEVEL['Level 1'] || [];
    return NextResponse.json({
      success: true,
      level,
      levelName: levelDisplayNames[level] || defaultLevelTitle,
      days: defaultTasks.length || 10,
      tasks: defaultTasks.map(normalizeItem),
      configuredLevels,
      levelDisplayNames,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch level task configuration' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const body = await request.json();
    const { level, levelName, levelTitle, days, tasks, updateLevelsList } = body;

    if (!level || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Level and tasks array are required' }, { status: 400 });
    }

    const levelCode = level.toUpperCase().replace(/\s+/g, '_');
    const settingKey = `TASK_CONFIG_${levelCode}`;

    const defaultTitle = LEVEL_CONFIG[level]?.name || level;
    const assignedLevelName = levelName || levelTitle || defaultTitle;

    const configToSave = {
      levelName: assignedLevelName,
      days: typeof days === 'number' && days > 0 ? days : tasks.length,
      tasks,
    };

    const updated = await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: JSON.stringify(configToSave) },
      create: { key: settingKey, value: JSON.stringify(configToSave) },
    });

    // Keep CONFIGURED_LEVELS list updated in database
    const levelsSetting = await prisma.systemSetting.findUnique({ where: { key: 'CONFIGURED_LEVELS' } });
    let currentLevels: string[] = [];
    if (levelsSetting?.value) {
      try {
        const parsed = JSON.parse(levelsSetting.value);
        if (Array.isArray(parsed)) currentLevels = parsed;
      } catch (e) {}
    }

    if (Array.isArray(updateLevelsList)) {
      currentLevels = updateLevelsList;
      await prisma.systemSetting.upsert({
        where: { key: 'CONFIGURED_LEVELS' },
        update: { value: JSON.stringify(currentLevels) },
        create: { key: 'CONFIGURED_LEVELS', value: JSON.stringify(currentLevels) },
      });
    } else if (!currentLevels.includes(level)) {
      currentLevels.push(level);
      await prisma.systemSetting.upsert({
        where: { key: 'CONFIGURED_LEVELS' },
        update: { value: JSON.stringify(currentLevels) },
        create: { key: 'CONFIGURED_LEVELS', value: JSON.stringify(currentLevels) },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Task & Day configuration for ${assignedLevelName} saved successfully!`,
      level,
      levelName: assignedLevelName,
      days: configToSave.days,
      setting: updated,
      configuredLevels: currentLevels,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Save level task configuration error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save level task configuration' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuth(['ADMIN']);
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    if (!level) return NextResponse.json({ error: 'Level parameter is required' }, { status: 400 });

    const levelCode = level.toUpperCase().replace(/\s+/g, '_');
    await prisma.systemSetting.deleteMany({
      where: { key: `TASK_CONFIG_${levelCode}` },
    });

    const levelsSetting = await prisma.systemSetting.findUnique({ where: { key: 'CONFIGURED_LEVELS' } });
    let updatedLevels: string[] = [];
    if (levelsSetting?.value) {
      try {
        const parsed = JSON.parse(levelsSetting.value);
        if (Array.isArray(parsed)) {
          updatedLevels = parsed.filter((l) => l !== level);
          await prisma.systemSetting.upsert({
            where: { key: 'CONFIGURED_LEVELS' },
            update: { value: JSON.stringify(updatedLevels) },
            create: { key: 'CONFIGURED_LEVELS', value: JSON.stringify(updatedLevels) },
          });
        }
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: `Level '${level}' removed successfully.`,
      configuredLevels: updatedLevels,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to remove level' }, { status: 500 });
  }
}
