import path from 'node:path'

export default {
  path: path.resolve(process.cwd()),
  info: {
    title: 'Meteostation Sensor API',
    version: '1.0.0',
    description:
      'REST API for storing and retrieving sensor readings (wind, temperature) from meteostation devices.',
  },
  tagIndex: 1,
  ignore: ['/swagger', '/docs'],
  snakeCase: true,
  debug: false, // Debug mode off
  common: {
    parameters: {},
    headers: {},
  },
  securitySchemes: {},
  authMiddlewares: ['auth', 'auth:api'],
  defaultSecurityScheme: undefined,
  persistAuthorization: true,
  showFullPath: false,
}
