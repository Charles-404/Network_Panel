import { query, getOne, getAll } from '../database/index.js';

// ============================================================
// Types
// ============================================================

export type SettingCategory = 'general' | 'display' | 'notification' | 'system';

export interface Setting {
  id: number;
  user_id: string;
  key: string;
  value: Record<string, unknown>;
  category: SettingCategory;
  created_at: Date;
  updated_at: Date;
}

export interface UserSettings {
  general: Record<string, unknown>;
  display: Record<string, unknown>;
  notification: Record<string, unknown>;
}

export interface SystemSettings {
  snmp: Record<string, unknown>;
  syslog: Record<string, unknown>;
  fortigate: Record<string, unknown>;
  users: Record<string, unknown>;
}

// ============================================================
// Default settings
// ============================================================

const DEFAULT_GENERAL_SETTINGS: Record<string, unknown> = {
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
};

const DEFAULT_DISPLAY_SETTINGS: Record<string, unknown> = {
  theme: 'dark',
  refreshInterval: 5000,
  chartAnimations: true,
  chartGridLines: true,
  compactMode: false,
  showTimestamps: true,
};

const DEFAULT_NOTIFICATION_SETTINGS: Record<string, unknown> = {
  enabled: true,
  webhookUrl: '',
  notifyOnCritical: true,
  notifyOnHigh: true,
  notifyOnMedium: false,
  notifyOnLow: false,
  soundEnabled: true,
  desktopNotifications: false,
};

const DEFAULT_SYSTEM_SETTINGS: Record<string, unknown> = {
  snmp: {
    enabled: false,
    host: '',
    port: 161,
    community: 'public',
    version: '2c',
    interval: 30000,
  },
  syslog: {
    enabled: true,
    port: 514,
    protocol: 'udp',
  },
  fortigate: {
    host: '',
    token: '',
    verifySsl: false,
  },
  users: {
    adminPassword: '',
    guestAccess: false,
  },
};

// ============================================================
// Settings Service
// ============================================================

class SettingsService {
  /**
   * Get all settings for a user (grouped by category)
   */
  async getUserSettings(userId: string = 'default'): Promise<UserSettings> {
    const rows = await getAll(
      'SELECT key, value, category FROM settings WHERE user_id = $1 AND category != $2',
      [userId, 'system']
    );

    const settings: UserSettings = {
      general: { ...DEFAULT_GENERAL_SETTINGS },
      display: { ...DEFAULT_DISPLAY_SETTINGS },
      notification: { ...DEFAULT_NOTIFICATION_SETTINGS },
    };

    for (const row of rows as Setting[]) {
      const category = row.category as keyof UserSettings;
      if (settings[category]) {
        settings[category][row.key] = row.value;
      }
    }

    return settings;
  }

  /**
   * Get a single setting
   */
  async getSetting(key: string, userId: string = 'default'): Promise<unknown | null> {
    const row = await getOne(
      'SELECT value FROM settings WHERE user_id = $1 AND key = $2',
      [userId, key]
    );
    return row ? (row as Setting).value : null;
  }

  /**
   * Update a single setting
   */
  async updateSetting(
    key: string,
    value: Record<string, unknown>,
    category: SettingCategory = 'general',
    userId: string = 'default'
  ): Promise<Setting> {
    const row = await getOne(
      `INSERT INTO settings (user_id, key, value, category, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, key) DO UPDATE SET value = $3, category = $4, updated_at = NOW()
       RETURNING *`,
      [userId, key, JSON.stringify(value), category]
    );
    return row as Setting;
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(
    settings: Record<string, Record<string, unknown>>,
    userId: string = 'default'
  ): Promise<void> {
    for (const [category, values] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(values)) {
        await this.updateSetting(key, value, category as SettingCategory, userId);
      }
    }
  }

  /**
   * Get system settings (admin only)
   */
  async getSystemSettings(): Promise<SystemSettings> {
    const rows = await getAll(
      'SELECT key, value FROM settings WHERE user_id = $1 AND category = $2',
      ['system', 'system']
    );

    const settings: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS };

    for (const row of rows as Setting[]) {
      settings[row.key as keyof SystemSettings] = row.value;
    }

    return settings;
  }

  /**
   * Update system settings (admin only)
   */
  async updateSystemSettings(settings: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.updateSetting(key, value, 'system', 'system');
    }
  }

  /**
   * Export all settings for a user
   */
  async exportSettings(userId: string = 'default'): Promise<Record<string, unknown>> {
    const userSettings = await this.getUserSettings(userId);
    const systemSettings = await this.getSystemSettings();

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userSettings,
      systemSettings,
    };
  }

  /**
   * Import settings for a user
   */
  async importSettings(
    data: Record<string, unknown>,
    userId: string = 'default'
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      // Import user settings
      if (data.userSettings && typeof data.userSettings === 'object') {
        const userSettings = data.userSettings as Record<string, Record<string, unknown>>;
        for (const [category, values] of Object.entries(userSettings)) {
          if (['general', 'display', 'notification'].includes(category)) {
            for (const [key, value] of Object.entries(values)) {
              try {
                await this.updateSetting(key, value, category as SettingCategory, userId);
                imported++;
              } catch (err: any) {
                errors.push(`Failed to import ${category}.${key}: ${err.message}`);
              }
            }
          }
        }
      }

      // Import system settings
      if (data.systemSettings && typeof data.systemSettings === 'object') {
        const systemSettings = data.systemSettings as Record<string, unknown>;
        for (const [key, value] of Object.entries(systemSettings)) {
          try {
            await this.updateSetting(key, value, 'system', 'system');
            imported++;
          } catch (err: any) {
            errors.push(`Failed to import system.${key}: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      errors.push(`Import failed: ${err.message}`);
    }

    return { imported, errors };
  }

  /**
   * Reset settings to defaults for a user
   */
  async resetSettings(userId: string = 'default'): Promise<void> {
    await query('DELETE FROM settings WHERE user_id = $1', [userId]);
  }
}

// Singleton instance
export const settingsService = new SettingsService();
