import { test } from '@japa/runner';

/**
 * The wind aggregation management and debug routes mutate or expose
 * production aggregates — they must require the admin session cookie.
 */
test.group('Ops route guards', () => {
  test('wind aggregation management routes require admin auth', async ({ client }) => {
    const status = await client.get('/api/wind/aggregation/status');
    status.assertStatus(401);

    const trigger = await client.post('/api/wind/aggregation/10min/trigger');
    trigger.assertStatus(401);
  });

  test('wind debug routes require admin auth', async ({ client }) => {
    const debug = await client.get('/api/wind/debug/some-station');
    debug.assertStatus(401);

    const mockData = await client.post('/api/wind/debug/some-station/create-mock-data');
    mockData.assertStatus(401);
  });
});
