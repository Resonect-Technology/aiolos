import type { HttpContext } from '@adonisjs/core/http';

import { prisma } from '#services/prisma';

export default class SystemConfigsController {
  /**
   * Get a specific system configuration value
   */
  async get({ params, response }: HttpContext) {
    const key = params.key;

    try {
      const config = await prisma.systemConfig.findUnique({ where: { key } });

      if (!config) {
        return {
          key,
          value: null,
          message: `No configuration found for key: ${key}`,
        };
      }

      return {
        key: config.key,
        value: config.value,
      };
    } catch (error) {
      console.error(`Error fetching system configuration for key ${key}:`, error);
      return response.status(500).json({ error: 'Failed to fetch system configuration' });
    }
  }

  /**
   * Get all system configurations
   */
  async index({ response }: HttpContext) {
    try {
      const configs = await prisma.systemConfig.findMany();

      // Transform to a key-value object
      const configObject = configs.reduce(
        (acc, config) => {
          acc[config.key] = config.value;
          return acc;
        },
        {} as Record<string, string>,
      );

      return configObject;
    } catch (error) {
      console.error('Error fetching system configurations:', error);
      return response.status(500).json({ error: 'Failed to fetch system configurations' });
    }
  }

  /**
   * Store/update a system configuration
   * Guarded by the adminAuth middleware (admin session cookie)
   */
  async set({ params, request, response }: HttpContext) {
    const key = params.key;
    const { value } = request.body();

    try {
      // Validate input
      if (value === undefined) {
        return response.badRequest({ error: 'Value is required' });
      }

      // Convert value to string if it's not already
      const stringValue = String(value);

      // Create or update the configuration
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue },
      });

      // Log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`System configuration updated: ${key} = ${stringValue}`);
      }

      return {
        ok: true,
        message: 'System configuration updated successfully',
        key,
        value: stringValue,
      };
    } catch (error) {
      console.error(`Error updating system configuration for key ${key}:`, error);
      return response.status(500).json({ error: 'Failed to update system configuration' });
    }
  }
}
