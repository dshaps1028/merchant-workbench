const fs = require('fs');
const os = require('os');
const path = require('path');

describe('automations db (sql.js)', () => {
  jest.setTimeout(20000);
  let dbPath;
  let db;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `automations-test-${Date.now()}.sqlite`);
    process.env.AUTOMATIONS_DB_PATH = dbPath;
    // Defer require until after env var is set so db.js picks it up
    db = require('../db');
  });

  afterEach(async () => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    delete require.cache[require.resolve('../db')];
    delete process.env.AUTOMATIONS_DB_PATH;
  });

  test('saves automation with snapshots and scheduling fields', async () => {
    const payload = {
      label: 'Daily Tagger',
      schedule: 'daily at 6am',
      action: 'apply tag',
      search_query: 'orders from yesterday',
      orders_snapshot: [{ id: 1, name: 'Order #1' }],
      last_run: '2025-01-01T00:00:00Z',
      next_run: '2025-01-02T00:00:00Z'
    };

    const saved = await db.saveAutomation(payload);
    expect(saved).toMatchObject({
      label: 'Daily Tagger',
      schedule: 'daily at 6am',
      action: 'apply tag',
      search_query: 'orders from yesterday',
      last_run: '2025-01-01T00:00:00Z',
      next_run: '2025-01-02T00:00:00Z'
    });
    expect(saved.orders_snapshot).toEqual([{ id: 1, name: 'Order #1' }]);

    const rows = await db.listAutomations();
    expect(rows.length).toBe(1);
    expect(rows[0].orders_snapshot).toEqual([{ id: 1, name: 'Order #1' }]);
  });

  test('orders_snapshot defaults to empty array when omitted', async () => {
    await db.saveAutomation({
      label: 'One-off',
      schedule: 'once',
      action: 'noop'
    });
    const rows = await db.listAutomations();
    const target = rows.find((r) => r.label === 'One-off' && r.schedule === 'once');
    expect(target).toBeTruthy();
    expect(target.orders_snapshot).toEqual([]);
  });
});
