/**
 * POST /sensor/{sensorId}/temperature
 * @summary Receives temperature data from a sensor
 * @description Accepts temperature data from a meteostation sensor. The sensorId is provided in the URL path.
 *
 * Example payload:
 * ```json
 * {
 *   "temperature": 22.5
 * }
 * ```
 *
 * @pathParam {string} sensorId - Unique identifier for the sensor
 * @bodyContent {object} application/json
 * @bodyRequired
 * @queryParam {string} [unit] - Optional temperature unit (e.g., "C" or "F")
 * @response 204 - Data accepted (no content)
 * @response 400 - Missing or invalid temperature data
 * @response 502 - HTTP forwarding failed
 * @tag Sensor
 */

export const httpPath = '/sensor/{sensorId}/temperature';

export async function handler(payload, req, res, logger, apiBaseUrl, axios, params) {
  // Validate payload for temperature
  if (!params.sensorId || typeof payload.temperature !== 'number') {
    logger.warn({ payload, params }, 'Missing or invalid temperature data');
    res.code = '4.00'; // Bad Request
    res.end('Missing or invalid temperature data');
    return;
  }
  // Forward to HTTP API
  try {
    const response = await axios.post(`${apiBaseUrl}/sensor/${params.sensorId}/temperature`, payload);
    logger.info({ status: response.status, sensorId: params.sensorId }, 'Temperature data forwarded');
    res.code = '2.04'; // Changed (success)
    res.end('OK');
  } catch (err) {
    logger.error({ err }, 'HTTP forwarding failed');
    res.code = '5.02'; // Bad Gateway
    res.end('HTTP forwarding failed');
  }
}
