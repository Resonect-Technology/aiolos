import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';

/**
 * Auth for station data-ingest endpoints (X-API-Key header).
 *
 * When STATION_API_KEY is unset the middleware passes everything through —
 * local dev and tests stay frictionless. Setting the env var is the one
 * knob that turns enforcement on.
 */
export default class StationAuthMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const stationApiKey = process.env.STATION_API_KEY;

    if (stationApiKey && request.header('x-api-key') !== stationApiKey) {
      return response.unauthorized({ error: 'Invalid or missing API key' });
    }

    return next();
  }
}
