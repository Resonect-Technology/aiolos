import { createHash, timingSafeEqual } from 'node:crypto';

import type { HttpContext } from '@adonisjs/core/http';

import { ADMIN_COOKIE } from '#middleware/admin_auth_middleware';
import { adminLoginSchema } from '#validators/admin_session';

const sha256 = (value: string) => createHash('sha256').update(value).digest();

export default class AdminSessionsController {
  /**
   * Log in with the admin password and receive the admin session cookie.
   * Fails closed when ADMIN_PASSWORD is not configured.
   */
  async store({ request, response }: HttpContext) {
    const parsed = adminLoginSchema.safeParse(request.body());
    const expected = process.env.ADMIN_PASSWORD;

    const valid =
      parsed.success &&
      typeof expected === 'string' &&
      expected.length > 0 &&
      timingSafeEqual(sha256(parsed.data.password), sha256(expected));

    if (!valid) {
      return response.unauthorized({ error: 'Invalid password' });
    }

    response.encryptedCookie(
      ADMIN_COOKIE,
      { loggedInAt: new Date().toISOString() },
      { maxAge: '30d' },
    );

    return { ok: true };
  }

  /**
   * Report whether the current request carries a valid admin session.
   */
  async show({ request }: HttpContext) {
    return { authenticated: Boolean(request.encryptedCookie(ADMIN_COOKIE)) };
  }

  /**
   * Log out by clearing the admin session cookie.
   */
  async destroy({ response }: HttpContext) {
    response.clearCookie(ADMIN_COOKIE);
    return { ok: true };
  }
}
