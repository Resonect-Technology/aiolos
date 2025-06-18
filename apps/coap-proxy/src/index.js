// coap-proxy: CoAP-to-HTTP Proxy Service
// ---------------------------------------
// This service listens for CoAP POST requests, parses JSON payloads, and forwards them to an HTTP API.
// It is configured via environment variables and uses pino for structured logging.

import coap from 'coap';
import axios from 'axios';
import dotenv from 'dotenv';
import pino from 'pino';
import { findRoute } from './routes.js';

// Load environment variables from .env file
dotenv.config();

// Configuration
const COAP_PORT = process.env.COAP_PORT || 5683;
const API_BASE_URL = process.env.API_BASE_URL;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Validate required env vars
if (!API_BASE_URL) {
  console.error('Missing required environment variable: API_BASE_URL');
  process.exit(1);
}

// Logger setup
const logger = pino({
  level: LOG_LEVEL,
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

// CoAP server setup
const server = coap.createServer();

server.on('request', async (req, res) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming CoAP request');

  // Only accept POST
  if (req.method !== 'POST') {
    logger.warn('Rejected non-POST request');
    res.code = '4.05'; // Method Not Allowed
    res.end('Only POST allowed');
    return;
  }

  // Route matching (file-based, async)
  const route = await findRoute(req.url);
  if (!route) {
    logger.warn({ url: req.url }, 'No route found');
    res.code = '4.04'; // Not Found
    res.end('Not found');
    return;
  }

  // Parse JSON payload
  let payload;
  try {
    payload = JSON.parse(req.payload.toString());
  } catch (err) {
    logger.error({ err }, 'Invalid JSON payload');
    res.code = '4.00'; // Bad Request
    res.end('Invalid JSON');
    return;
  }

  // Use the route's handler, pass params if present
  try {
    await route.handler(payload, req, res, logger, API_BASE_URL, axios, route.params);
  } catch (err) {
    logger.error({ err }, 'Route handler error');
    res.code = '5.00'; // Internal Server Error
    res.end('Handler error');
  }
});

// Start server
server.listen(COAP_PORT, () => {
  logger.info(`CoAP proxy listening on port ${COAP_PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down CoAP proxy...');
  server.close(() => {
    logger.info('CoAP server closed.');
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
