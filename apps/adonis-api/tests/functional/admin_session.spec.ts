import { test } from '@japa/runner';

const PASSWORD = 'test-admin-password';

test.group('Admin Sessions Controller', (group) => {
  let originalPassword: string | undefined;

  group.each.setup(() => {
    originalPassword = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = PASSWORD;
  });

  group.each.teardown(() => {
    if (originalPassword === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = originalPassword;
    }
  });

  test('should reject login with wrong password', async ({ client }) => {
    const response = await client.post('/api/admin/session').json({ password: 'wrong' });

    response.assertStatus(401);
    response.assertBody({ error: 'Invalid password' });
  });

  test('should reject login with missing password', async ({ client }) => {
    const response = await client.post('/api/admin/session').json({});

    response.assertStatus(401);
  });

  test('should fail closed when ADMIN_PASSWORD is not configured', async ({ client }) => {
    delete process.env.ADMIN_PASSWORD;

    const response = await client.post('/api/admin/session').json({ password: '' });

    response.assertStatus(401);
  });

  test('should set admin cookie on successful login', async ({ client, assert }) => {
    const response = await client.post('/api/admin/session').json({ password: PASSWORD });

    response.assertStatus(200);
    response.assertBody({ ok: true });

    const cookie = response.cookie('aiolos_admin');
    assert.exists(cookie, 'aiolos_admin cookie should be set');
  });

  test('should report session state via GET /api/admin/session', async ({ client }) => {
    const anonymous = await client.get('/api/admin/session');
    anonymous.assertStatus(200);
    anonymous.assertBody({ authenticated: false });

    const authenticated = await client
      .get('/api/admin/session')
      .withEncryptedCookie('aiolos_admin', { loggedInAt: new Date().toISOString() });
    authenticated.assertStatus(200);
    authenticated.assertBody({ authenticated: true });
  });

  test('should clear the cookie on logout', async ({ client, assert }) => {
    const response = await client
      .delete('/api/admin/session')
      .withEncryptedCookie('aiolos_admin', { loggedInAt: new Date().toISOString() });

    response.assertStatus(200);
    response.assertBody({ ok: true });

    const cookie = response.cookie('aiolos_admin');
    assert.isTrue(
      !cookie || cookie.maxAge === -1 || !cookie.value,
      'aiolos_admin cookie should be cleared',
    );
  });

  test('should guard system config writes with the admin session', async ({ client }) => {
    const unauthorized = await client.post('/api/system/config/test_key').json({ value: '1' });
    unauthorized.assertStatus(401);
    unauthorized.assertBody({ error: 'Unauthorized' });

    const authorized = await client
      .post('/api/system/config/test_key')
      .withEncryptedCookie('aiolos_admin', { loggedInAt: new Date().toISOString() })
      .json({ value: '1' });
    authorized.assertStatus(200);
  });
});
