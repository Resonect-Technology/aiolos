// test-diagnostics.js
// A script to test sending diagnostics data to the CoAP proxy

import coap from 'coap';

// Configuration
const COAP_SERVER = 'localhost';
const COAP_PORT = 5683;
const STATION_ID = 'aiolos-test';

// Create diagnostics payload
const payload = {
  stationId: STATION_ID,
  batteryV: 3.82,
  solarV: 5.1,
  signalDb: -85,
  uptimeS: 3600,
  freeMemB: 128000,
  resetCause: 1,
  timestamp: Math.floor(Date.now() / 1000)
};

// Create CoAP request
const req = coap.request({
  host: COAP_SERVER,
  port: COAP_PORT,
  method: 'POST',
  pathname: `/station/${STATION_ID}/diagnostics`,
  options: {
    'Content-Format': 'application/json'
  }
});

// Set payload and send
req.write(JSON.stringify(payload));

// Handle response
req.on('response', (res) => {
  console.log('Response code:', res.code);
  console.log('Response payload:', res.payload.toString());
  process.exit(0);
});

// Handle error
req.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

// Set timeout
req.on('timeout', (err) => {
  console.error('Timeout:', err);
  process.exit(1);
});

console.log(`Sending diagnostics data to coap://${COAP_SERVER}:${COAP_PORT}/station/${STATION_ID}/diagnostics`);
console.log('Payload:', payload);

// Send request
req.end();
