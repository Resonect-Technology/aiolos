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

router.get('/sensor-readings', [SensorReadingsController, 'index'])
router.get('/sensor-readings/:id', [SensorReadingsController, 'show'])
router.post('/sensor-readings', [SensorReadingsController, 'store'])

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swagger)
})
