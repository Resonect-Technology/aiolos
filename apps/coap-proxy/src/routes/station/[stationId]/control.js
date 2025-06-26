/**
 * GET /station/{stationId}/control
 * @summary Provides control commands to a weather station
 * @description Serves configuration and control commands to a weather station device. The stationId is provided in the URL path.
 *
 * Example response payload:
 * ```json
 * {
 *   "sleepInterval": 3600,
 *   "sensorSamplingRate": 300,
 *   "transmitInterval": 1800,
 *   "firmwareUpdate": {
 *     "available": false,
 *     "url": null,
 *     "version": null
 *   }
 * }
 * ```
 *
 * @pathParam {string} stationId - Unique identifier for the weather station
 * @response 200 - Control commands
 * @response 404 - Station not found
 * @response 502 - HTTP forwarding failed
 * @tag Control
 */

export const httpPath = '/station/{stationId}/control';

export async function handler(payload, req, res, logger, apiBaseUrl, axios, params) {
  // This is a GET request handler, so payload should be empty
  if (!params.stationId) {
    logger.warn({ params }, 'Missing station ID');
    res.code = '4.00'; // Bad Request
    res.end('Missing station ID');
    return;
  }
  
  // Forward to HTTP API to get control data
  try {
    const response = await axios.get(`${apiBaseUrl}/station/${params.stationId}/control`);
    logger.info({ status: response.status, stationId: params.stationId }, 'Control data retrieved');
    
    // Set content format to application/json
    res.setOption('Content-Format', 'application/json');
    res.code = '2.05'; // Content (success)
    res.end(JSON.stringify(response.data));
  } catch (err) {
    if (err.response && err.response.status === 404) {
      logger.warn({ stationId: params.stationId }, 'Station not found');
      res.code = '4.04'; // Not Found
      res.end('Station not found');
    } else {
      logger.error({ err }, 'HTTP forwarding failed');
      res.code = '5.02'; // Bad Gateway
      res.end('HTTP forwarding failed');
    }
  }
}
