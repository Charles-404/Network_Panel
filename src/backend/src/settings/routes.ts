import type { FastifyInstance } from 'fastify';
import { settingsService } from './service.js';

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  // ============================================================
  // GET /api/settings - Get current user settings
  // ============================================================
  app.get('/api/settings', async (request) => {
    const query = request.query as { userId?: string };
    const userId = query.userId || 'default';
    const settings = await settingsService.getUserSettings(userId);
    return { success: true, data: settings, timestamp: new Date() };
  });

  // ============================================================
  // PUT /api/settings - Update user settings
  // ============================================================
  app.put('/api/settings', async (request, reply) => {
    const body = request.body as {
      userId?: string;
      settings: Record<string, Record<string, unknown>>;
    };

    if (!body.settings || typeof body.settings !== 'object') {
      return reply.code(400).send({
        success: false,
        error: 'Invalid settings format. Expected { settings: { category: { key: value } } }',
        timestamp: new Date(),
      });
    }

    const userId = body.userId || 'default';
    await settingsService.updateSettings(body.settings, userId);
    const updated = await settingsService.getUserSettings(userId);

    return { success: true, data: updated, timestamp: new Date() };
  });

  // ============================================================
  // GET /api/settings/system - System configuration (admin)
  // ============================================================
  app.get('/api/settings/system', async () => {
    const settings = await settingsService.getSystemSettings();
    return { success: true, data: settings, timestamp: new Date() };
  });

  // ============================================================
  // PUT /api/settings/system - Update system configuration (admin)
  // ============================================================
  app.put('/api/settings/system', async (request, reply) => {
    const body = request.body as {
      settings: Record<string, unknown>;
    };

    if (!body.settings || typeof body.settings !== 'object') {
      return reply.code(400).send({
        success: false,
        error: 'Invalid settings format. Expected { settings: { key: value } }',
        timestamp: new Date(),
      });
    }

    await settingsService.updateSystemSettings(body.settings);
    const updated = await settingsService.getSystemSettings();

    return { success: true, data: updated, timestamp: new Date() };
  });

  // ============================================================
  // POST /api/settings/export - Export settings
  // ============================================================
  app.post('/api/settings/export', async (request) => {
    const body = request.body as { userId?: string };
    const userId = body?.userId || 'default';
    const exported = await settingsService.exportSettings(userId);
    return { success: true, data: exported, timestamp: new Date() };
  });

  // ============================================================
  // POST /api/settings/import - Import settings
  // ============================================================
  app.post('/api/settings/import', async (request, reply) => {
    const body = request.body as {
      userId?: string;
      data: Record<string, unknown>;
    };

    if (!body.data || typeof body.data !== 'object') {
      return reply.code(400).send({
        success: false,
        error: 'Invalid import data format',
        timestamp: new Date(),
      });
    }

    const userId = body.userId || 'default';
    const result = await settingsService.importSettings(body.data, userId);

    return {
      success: true,
      data: {
        imported: result.imported,
        errors: result.errors,
      },
      timestamp: new Date(),
    };
  });

  // ============================================================
  // POST /api/settings/reset - Reset settings to defaults
  // ============================================================
  app.post('/api/settings/reset', async (request) => {
    const body = request.body as { userId?: string };
    const userId = body?.userId || 'default';
    await settingsService.resetSettings(userId);
    const settings = await settingsService.getUserSettings(userId);
    return { success: true, data: settings, timestamp: new Date() };
  });
}
