// /routes/sensor/wind.js
// Handles POST /sensor/wind

export const httpPath = '/sensor/wind';

export async function handler(payload, req, res, logger, apiBaseUrl, axios) {
  // Validate payload for sensorId, speed, and direction
  if (!payload.sensorId || typeof payload.speed !== 'number' || typeof payload.direction !== 'number') {
    logger.warn({ payload }, 'Missing or invalid wind data');
    res.code = '4.00'; // Bad Request
    res.end('Missing or invalid wind data');
    return;
  }
  // Forward to HTTP API
  try {
    const response = await axios.post(`${apiBaseUrl}${httpPath}`, payload);
    logger.info({ status: response.status, sensorId: payload.sensorId }, 'Wind data forwarded');
    res.code = '2.04'; // Changed (success)
    res.end('OK');
  } catch (err) {
    logger.error({ err }, 'HTTP forwarding failed');
    res.code = '5.02'; // Bad Gateway
    res.end('HTTP forwarding failed');
  }
}
