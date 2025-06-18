// test-coap-client.js
// Script to send test CoAP POST requests to the proxy, simulating a real device

import coap from 'coap';

function sendCoapPost(path, payload) {
  return new Promise((resolve, reject) => {
    const req = coap.request({
      hostname: 'localhost',
      port: process.env.COAP_PORT ? parseInt(process.env.COAP_PORT) : 5683,
      method: 'POST',
      pathname: path,
      confirmable: true
    });

    req.setOption('Content-Format', 'application/json');

    req.on('response', (res) => {
      console.log(`Response for ${path}:`, res.code, res.payload.toString());
      resolve(res);
    });

    req.on('error', (err) => {
      console.error(`Error for ${path}:`, err);
      reject(err);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function main() {
  // Simulate wind sensor
  await sendCoapPost('/sensor/wind', {
    sensorId: 'station-001',
    speed: 5.2,
    direction: 270
  });

  // Simulate temperature sensor
  await sendCoapPost('/sensor/temperature', {
    sensorId: 'station-001',
    temperature: 22.5
  });
}

main().catch(console.error);
