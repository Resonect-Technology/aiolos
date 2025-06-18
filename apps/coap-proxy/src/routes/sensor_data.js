// /routes/sensor_data.js
// Handles POST /sensor/data

export const httpPath = '/sensor/data';

export async function handler(payload, req, res, logger, apiBaseUrl, axios) {
  // Default: forward to HTTP API
  try {
    const response = await axios.post(`${apiBaseUrl}${httpPath}`, payload);
    logger.info({ status: response.status }, 'Forwarded to HTTP API');
    res.code = '2.04'; // Changed (success)
    res.end('OK');
  } catch (err) {
    logger.error({ err }, 'HTTP forwarding failed');
    res.code = '5.02'; // Bad Gateway
    res.end('HTTP forwarding failed');
  }
}
