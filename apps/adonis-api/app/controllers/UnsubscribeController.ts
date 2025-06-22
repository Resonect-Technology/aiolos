import type { HttpContext } from '@adonisjs/core/http'

export default class UnsubscribeController {
    async handle({ params, response }: HttpContext) {
        const id = params.id

        if (!id) {
            return response.badRequest({ error: 'No subscription ID specified' })
        }

        // In a real implementation, you would:
        // 1. Find the subscription by ID
        // 2. Remove the client from the channel's subscription list

        // For our simple implementation:
        console.log(`Unsubscribed from subscription: ${id}`)

        return response.json({ ok: true, id })
    }
}
