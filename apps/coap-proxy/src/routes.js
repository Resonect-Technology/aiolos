// routes.js
// File-based routing: recursively load all route handlers from ./routes directory
import fs from 'fs';
import path from 'path';

const ROUTES_DIR = new URL('./routes', import.meta.url).pathname;

function getAllRouteFiles(dir, base = '') {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files = files.concat(getAllRouteFiles(path.join(dir, entry.name), path.join(base, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push({
        abs: path.join(dir, entry.name),
        rel: path.join(base, entry.name)
      });
    }
  }
  return files;
}

export async function loadRoutes() {
  const files = getAllRouteFiles(ROUTES_DIR);
  const routes = [];
  for (const file of files) {
    const routeModule = await import(file.abs);
    // Map relative file path to coapPath, e.g. sensor/wind.js -> /sensor/wind
    const coapPath = '/' + file.rel.replace(/\\/g, '/').replace(/\.js$/, '');
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
