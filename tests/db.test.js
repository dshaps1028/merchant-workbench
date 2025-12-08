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
    expect(target.last_run).toBeNull();
    expect(target.next_run).toBeNull();
  });

  test('saves order search results and returns latest row', async () => {
    const sampleOrders = [
      { id: 10, name: 'Order #10', email: 'a@example.com' },
      { id: 11, name: 'Order #11', email: 'b@example.com' }
    ];
    const saved = await db.saveOrderResults({
      label: 'Last search',
      search_query: 'pending orders',
      orders: sampleOrders
    });
    expect(saved).toMatchObject({
      label: 'Last search',
      search_query: 'pending orders'
    });
    expect(saved.orders).toEqual(sampleOrders);

    const rows = await db.listOrderResults(3);
    expect(rows.length).toBe(1);
    expect(rows[0].orders).toEqual(sampleOrders);
  });

  test('defaults orders_json to empty array when saving without orders', async () => {
    await db.saveOrderResults({
      label: 'Empty search',
      search_query: 'none',
      orders: null
    });
    const rows = await db.listOrderResults(1);
    expect(rows[0].orders).toEqual([]);
  });

  test('overwrites previous order search rows with the latest search', async () => {
    await db.saveOrderResults({
      label: 'First',
      search_query: 'first search',
      orders: [{ id: 1, name: 'Order #1' }]
    });
    await db.saveOrderResults({
      label: 'Second',
      search_query: 'second search',
      orders: [{ id: 2, name: 'Order #2' }]
    });
    const rows = await db.listOrderResults(5);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({
      label: 'Second',
      search_query: 'second search'
    });
    expect(rows[0].orders).toEqual([{ id: 2, name: 'Order #2' }]);
  });

  test('saves created orders snapshot and overwrites previous snapshot', async () => {
    await db.saveCreatedOrders({
      label: 'First batch',
      orders: [{ id: 5, name: 'Order #5' }]
    });
    await db.saveCreatedOrders({
      label: 'Second batch',
      orders: [
        { id: 6, name: 'Order #6' },
        { id: 7, name: 'Order #7' }
      ]
    });
    const rows = await db.listCreatedOrders(3);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({ label: 'Second batch' });
    expect(rows[0].orders).toEqual([
      { id: 6, name: 'Order #6' },
      { id: 7, name: 'Order #7' }
    ]);
  });
});
