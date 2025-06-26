/**
 * POST /station/{stationId}/wind
 * @summary Receives wind speed and direction from a weather station
 * @description Accepts wind data from a weather station. The stationId is provided in the URL path.
 *
 * Example payload:
 * ```json
 * {
 *   "speed": 5.2,
 *   "direction": 270
 * }
 * ```
 *
 * @pathParam {string} stationId - Unique identifier for the weather station
 * @bodyContent {object} application/json
 * @bodyRequired
 * @queryParam {string} [unit] - Optional wind speed unit (e.g., "m/s", "km/h")
 * @response 204 - Data accepted (no content)
 * @response 400 - Missing or invalid wind data
 * @response 502 - HTTP forwarding failed
 * @tag Station
 */

export const httpPath = '/station/{stationId}/wind';

export async function handler(payload, req, res, logger, apiBaseUrl, axios, params) {
  // Validate payload for speed and direction
  if (!params.stationId || typeof payload.speed !== 'number' || typeof payload.direction !== 'number') {
    logger.warn({ payload, params }, 'Missing or invalid wind data');
    res.code = '4.00'; // Bad Request
    res.end('Missing or invalid wind data');
    return;
  }
  // Forward to HTTP API
  try {
    const response = await axios.post(`${apiBaseUrl}/station/${params.stationId}/wind`, payload);
    logger.info({ status: response.status, stationId: params.stationId }, 'Wind data forwarded');
    res.code = '2.04'; // Changed (success)
    res.end('OK');
  } catch (err) {
    logger.error({ err }, 'HTTP forwarding failed');
    res.code = '5.02'; // Bad Gateway
    res.end('HTTP forwarding failed');
  }
}
