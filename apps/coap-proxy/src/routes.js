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

function pathToRegExp(path) {
  // Convert /sensor/{sensorId}/wind to /sensor/([^/]+)/wind
  return new RegExp('^' + path.replace(/\{[^/]+\}/g, '([^/]+)') + '$');
}

export async function loadRoutes() {
  const files = getAllRouteFiles(ROUTES_DIR);
  const routes = [];
  for (const file of files) {
    const routeModule = await import(file.abs);
    // Map relative file path to coapPath, e.g. sensor/{sensorId}/wind.js -> /sensor/{sensorId}/wind
    let coapPath = '/' + file.rel.replace(/\\/g, '/').replace(/\.js$/, '');
    // Support dynamic segments: [sensorId] -> {sensorId}
    coapPath = coapPath.replace(/\[([^/]+)\]/g, '{$1}');
    routes.push({
      coapPath,
      httpPath: routeModule.httpPath,
      handler: routeModule.handler,
      matcher: pathToRegExp(coapPath)
    });
  }
  return routes;
}

export async function findRoute(requestPath) {
  const routes = await loadRoutes();
  for (const route of routes) {
    const match = route.matcher.exec(requestPath);
    if (match) {
      // Extract path params
      const paramNames = [...route.coapPath.matchAll(/\{([^/]+)\}/g)].map(m => m[1]);
      const params = {};
      paramNames.forEach((name, idx) => {
        params[name] = match[idx + 1];
      });
      return { ...route, params };
    }
  }
  return null;
}
