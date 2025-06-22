import transmit from '@adonisjs/transmit/services/main'
import type { HttpContext } from '@adonisjs/core/http'

// Authorize all clients for wind/live/:sensor_id for now
transmit.authorize<{ sensor_id: string }>('wind/live/:sensor_id', (ctx: HttpContext, { sensor_id }) => {
    return true
})
