import { defineConfig } from '@adonisjs/transmit'

/**
 * We're not using this config as we've registered our own routes manually in routes.ts
 * using PascalCase controllers: EventStreamController, SubscribeController, UnsubscribeController
 */
export default defineConfig({
    pingInterval: '30s',
    transport: null,
})
