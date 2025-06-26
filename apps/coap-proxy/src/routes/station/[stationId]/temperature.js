/**
 * POST /station/{stationId}/temperature
 * @summary Receives temperature data from a weather station
 * @description Accepts temperature data from a weather station. The stationId is provided in the URL path.
 *
 * Example payload:
 * ```json
 * {
 *   "temperature": 22.5
 * }
 * ```
 *
 * @pathParam {string} stationId - Unique identifier for the weather station
 * @bodyContent {object} application/json
 * @bodyRequired
 * @queryParam {string} [unit] - Optional temperature unit (e.g., "C" or "F")
 * @response 204 - Data accepted (no content)
 * @response 400 - Missing or invalid temperature data
 * @response 502 - HTTP forwarding failed
 * @tag Station
 */

export const httpPath = '/station/{stationId}/temperature';

export async function handler(payload, req, res, logger, apiBaseUrl, axios, params) {
  // Validate payload for temperature
  if (!params.stationId || typeof payload.temperature !== 'number') {
    logger.warn({ payload, params }, 'Missing or invalid temperature data');
    res.code = '4.00'; // Bad Request
    res.end('Missing or invalid temperature data');
    return;
  }
  // Forward to HTTP API
  try {
    const response = await axios.post(`${apiBaseUrl}/station/${params.stationId}/temperature`, payload);
    logger.info({ status: response.status, stationId: params.stationId }, 'Temperature data forwarded');
    res.code = '2.04'; // Changed (success)
    res.end('OK');
  } catch (err) {
    logger.error({ err }, 'HTTP forwarding failed');
    res.code = '5.02'; // Bad Gateway
    res.end('HTTP forwarding failed');
  }
}
