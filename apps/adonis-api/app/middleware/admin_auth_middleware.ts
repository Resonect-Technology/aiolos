import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';

/**
 * Name of the encrypted cookie issued by POST /api/admin/session.
 * Encrypted with APP_KEY — rotating APP_KEY invalidates all sessions.
 */
export const ADMIN_COOKIE = 'aiolos_admin';

/**
 * Auth for admin endpoints (station/system config writes).
 * Requires the encrypted admin session cookie.
 */
export default class AdminAuthMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    if (!request.encryptedCookie(ADMIN_COOKIE)) {
      return response.unauthorized({ error: 'Unauthorized' });
    }

    return next();
  }
}
