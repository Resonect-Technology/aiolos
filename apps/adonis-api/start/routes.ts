/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
const SensorReadingsController = () => import('#app/SensorReadingsController')
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

// Sensor readings routes with sensor_id in the path for IoT-friendly API
router.get('/sensors/:sensor_id/readings', [SensorReadingsController, 'index'])
router.get('/sensors/:sensor_id/readings/:id', [SensorReadingsController, 'show'])
router.post('/sensors/:sensor_id/readings', [SensorReadingsController, 'store'])

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swagger)
})
