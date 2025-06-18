// routes.js
// File-based routing: dynamically load all route handlers from ./routes directory
import fs from 'fs';
import path from 'path';

const ROUTES_DIR = new URL('./routes', import.meta.url).pathname;

export async function loadRoutes() {
  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
  const routes = [];
  for (const file of files) {
    const routeModule = await import(path.join(ROUTES_DIR, file));
    // Use filename as coapPath, e.g. sensor_data.js -> /sensor/data
    const coapPath = '/' + file.replace(/_/g, '/').replace(/\.js$/, '');
    routes.push({
      coapPath,
      httpPath: routeModule.httpPath,
      handler: routeModule.handler
    });
  }
  return routes;
}

export async function findRoute(path) {
  const routes = await loadRoutes();
  return routes.find(r => r.coapPath === path);
}
