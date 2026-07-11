import type { ApplicationService } from '@adonisjs/core/types';

/**
 * Disconnects the module-singleton Prisma client on application shutdown.
 * The client itself lives in #services/prisma (no container indirection —
 * single consumer, synchronous access everywhere).
 */
export default class PrismaProvider {
  constructor(protected app: ApplicationService) {}

  async shutdown() {
    const { prisma } = await import('#services/prisma');
    await prisma.$disconnect();
  }
}
