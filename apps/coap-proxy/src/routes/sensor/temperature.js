/**
 * POST /sensor/temperature
 * @summary Receives temperature data from a sensor
 * @description Accepts temperature data from a meteostation sensor. Requires a sensorId and temperature value.
 *
 * Example payload:
 * ```json
 * {
 *   "sensorId": "station-001",
 *   "temperature": 22.5
 * }
 * ```
 *
 * @bodyContent {object} application/json
 * @bodyRequired
 * @queryParam {string} [unit] - Optional temperature unit (e.g., "C" or "F")
 * @response 204 - Data accepted (no content)
 * @response 400 - Missing or invalid temperature data
 * @response 502 - HTTP forwarding failed
 * @tag Sensor
 */

export const httpPath = '/sensor/temperature';

export async function handler(payload, req, res, logger, apiBaseUrl, axios) {
  // Validate payload for sensorId and temperature
  if (!payload.sensorId || typeof payload.temperature !== 'number') {
    logger.warn({ payload }, 'Missing or invalid temperature data');
    res.code = '4.00'; // Bad Request
    res.end('Missing or invalid temperature data');
    return;
  }
  // Forward to HTTP API
  try {
    const response = await axios.post(`${apiBaseUrl}${httpPath}`, payload);
    logger.info({ status: response.status, sensorId: payload.sensorId }, 'Temperature data forwarded');
    res.code = '2.04'; // Changed (success)
    res.end('OK');
  } catch (err) {
    logger.error({ err }, 'HTTP forwarding failed');
    res.code = '5.02'; // Bad Gateway
    res.end('HTTP forwarding failed');
  }
}
