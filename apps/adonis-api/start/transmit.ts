import transmit from '@adonisjs/transmit/services/main'
import type { HttpContext } from '@adonisjs/core/http'

// Authorize all clients for wind/live/:sensor_id for now
transmit.authorize<{ sensor_id: string }>('wind/live/:sensor_id', (_ctx: HttpContext, _params: { sensor_id: string }) => {
    return true
})
