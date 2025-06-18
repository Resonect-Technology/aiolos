/**
 * POST /sensor/{sensorId}/wind
 * @summary Receives wind speed and direction from a sensor
 * @description Accepts wind data from a meteostation sensor. The sensorId is provided in the URL path.
 *
 * Example payload:
 * ```json
 * {
 *   "speed": 5.2,
 *   "direction": 270
 * }
 * ```
 *
 * @pathParam {string} sensorId - Unique identifier for the sensor
 * @bodyContent {object} application/json
 * @bodyRequired
 * @queryParam {string} [unit] - Optional wind speed unit (e.g., "m/s", "km/h")
 * @response 204 - Data accepted (no content)
 * @response 400 - Missing or invalid wind data
 * @response 502 - HTTP forwarding failed
 * @tag Sensor
 */

export const httpPath = '/sensor/{sensorId}/wind';

export async function handler(payload, req, res, logger, apiBaseUrl, axios, params) {
  // Validate payload for speed and direction
  if (!params.sensorId || typeof payload.speed !== 'number' || typeof payload.direction !== 'number') {
    logger.warn({ payload, params }, 'Missing or invalid wind data');
    res.code = '4.00'; // Bad Request
    res.end('Missing or invalid wind data');
    return;
  }
  // Forward to HTTP API
  try {
    const response = await axios.post(`${apiBaseUrl}/sensor/${params.sensorId}/wind`, payload);
    logger.info({ status: response.status, sensorId: params.sensorId }, 'Wind data forwarded');
    res.code = '2.04'; // Changed (success)
    res.end('OK');
  } catch (err) {
    logger.error({ err }, 'HTTP forwarding failed');
    res.code = '5.02'; // Bad Gateway
    res.end('HTTP forwarding failed');
  }
}
