/**
 * POST /station/{stationId}/diagnostics
 * @summary Receives system diagnostics from a weather station
 * @description Accepts system diagnostics data from a weather station device. The stationId is provided in the URL path.
 *
 * Example payload:
 * ```json
 * {
 *   "stationId": "aiolos-01",
 *   "batteryV": 3.82,
 *   "solarV": 5.1,
 *   "signalDb": -85,
 *   "uptimeS": 3600,
 *   "freeMemB": 128000,
 *   "resetCause": 1,
 *   "timestamp": 1687756800
 * }
 * ```
 *
 * @pathParam {string} stationId - Unique identifier for the weather station
 * @bodyContent {object} application/json
 * @bodyRequired
 * @response 204 - Data accepted (no content)
 * @response 400 - Missing or invalid diagnostics data
 * @response 502 - HTTP forwarding failed
 * @tag Diagnostics
 */

export const httpPath = '/station/{stationId}/diagnostics';

export async function handler(payload, req, res, logger, apiBaseUrl, axios, params) {
  // Validate payload for essential diagnostics fields
  if (!params.stationId || 
      !payload.stationId || 
      typeof payload.batteryV !== 'number' || 
      typeof payload.signalDb !== 'number') {
    logger.warn({ payload, params }, 'Missing or invalid diagnostics data');
    res.code = '4.00'; // Bad Request
    res.end('Missing or invalid diagnostics data');
    return;
  }
  
  // Forward to HTTP API
  try {
    const response = await axios.post(`${apiBaseUrl}/station/${params.stationId}/diagnostics`, payload);
    logger.info({ status: response.status, stationId: params.stationId }, 'Diagnostics data forwarded');
    res.code = '2.04'; // Changed (success)
    res.end('OK');
  } catch (err) {
    logger.error({ err }, 'HTTP forwarding failed');
    res.code = '5.02'; // Bad Gateway
    res.end('HTTP forwarding failed');
  }
}
