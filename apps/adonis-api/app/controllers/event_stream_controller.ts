import type { HttpContext } from '@adonisjs/core/http'
import { Readable } from 'node:stream'
import transmit from '@adonisjs/transmit/services/main'

// Map of active SSE streams by channel
const activeStreams: Record<string, Set<Readable>> = {}

// Define the event type based on the actual Transmit broadcast structure
interface BroadcastEvent {
  channel: string
  payload: any // Using any since we don't know the exact payload structure
}

// Setup direct stream broadcast
transmit.on('broadcast', (event: BroadcastEvent) => {
  const channelName = event.channel
  console.log(`Broadcasting to channel: ${channelName}`, event.payload)

  // If we have active streams for this channel
  if (activeStreams[channelName]) {
    activeStreams[channelName].forEach((stream) => {
      // Format as SSE event
      const message = `event: message\ndata: ${JSON.stringify({
        channel: channelName,
        data: event.payload,
      })}\n\n`

      // Send to client
      stream.push(message)
    })
  }
})

export default class EventStreamController {
  async handle({ request, response }: HttpContext) {
    const channelQuery = request.input('channels')

    if (!channelQuery) {
      return response.badRequest({ error: 'No channels specified' })
    }

    // Parse channels (comma-separated list)
    const channels = channelQuery.split(',')

    response.header('Content-Type', 'text/event-stream')
    response.header('Connection', 'keep-alive')
    response.header('Cache-Control', 'no-cache')
    response.header('X-Accel-Buffering', 'no') // For Nginx

    // Create a stream for SSE
    const stream = new Readable({
      read() {}, // This is required but can be empty
    })

    // Register this stream for each channel
    channels.forEach((channel: string) => {
      if (!activeStreams[channel]) {
        activeStreams[channel] = new Set()
      }
      activeStreams[channel].add(stream)
      console.log(`SSE connection established for channel: ${channel}`)
    })

    // Cleanup when connection closes
    response.response.on('close', () => {
      channels.forEach((channel: string) => {
        if (activeStreams[channel]) {
          activeStreams[channel].delete(stream)
          if (activeStreams[channel].size === 0) {
            delete activeStreams[channel]
          }
        }
      })
      console.log('SSE connection closed')
    })

    // Send an initial connection message
    stream.push(
      `event: connection\ndata: {"connected":true,"channels":${JSON.stringify(channels)}}\n\n`
    )

    return response.stream(stream)
  }
}
