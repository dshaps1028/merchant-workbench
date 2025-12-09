const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbPath = process.env.AUTOMATIONS_DB_PATH || path.join(__dirname, 'automations.sqlite');
let dbPromise = null;

const ensureDb = async () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs();
      let db;
      if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
      } else {
        db = new SQL.Database();
      }
      db.run(`
        CREATE TABLE IF NOT EXISTS automations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL,
          schedule TEXT NOT NULL,
          action TEXT NOT NULL,
          search_query TEXT,
          orders_snapshot TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_run DATETIME,
          next_run DATETIME,
          start_at DATETIME,
          end_at DATETIME,
          enabled INTEGER DEFAULT 1,
          interval_days INTEGER DEFAULT 1
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS order_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT,
          search_query TEXT,
          orders_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS created_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT,
          orders_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // Backfill new columns if migrating from older schema
      const tableInfo = db.exec("PRAGMA table_info('automations');");
      const columns = tableInfo?.[0]?.values?.map((row) => row[1]) || [];
      if (!columns.includes('last_run')) {
        db.run(`ALTER TABLE automations ADD COLUMN last_run DATETIME;`);
      }
      if (!columns.includes('next_run')) {
        db.run(`ALTER TABLE automations ADD COLUMN next_run DATETIME;`);
      }
      if (!columns.includes('start_at')) {
        db.run(`ALTER TABLE automations ADD COLUMN start_at DATETIME;`);
      }
      if (!columns.includes('end_at')) {
        db.run(`ALTER TABLE automations ADD COLUMN end_at DATETIME;`);
      }
      if (!columns.includes('enabled')) {
        db.run(`ALTER TABLE automations ADD COLUMN enabled INTEGER DEFAULT 1;`);
      }
      if (!columns.includes('interval_days')) {
        db.run(`ALTER TABLE automations ADD COLUMN interval_days INTEGER DEFAULT 1;`);
      }
      return { db, SQL };
    })();
  }
  return dbPromise;
};

const persist = (db) => {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

const listAutomations = async () => {
  const { db } = await ensureDb();
  const stmt = db.prepare('SELECT * FROM automations ORDER BY created_at DESC');
  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({
      ...row,
      orders_snapshot: row.orders_snapshot ? JSON.parse(row.orders_snapshot) : [],
      enabled: row.enabled === undefined ? 1 : row.enabled
    });
  }
  stmt.free();
  return rows;
};

const saveAutomation = async (payload = {}) => {
  const { db } = await ensureDb();
  const ordersJson = JSON.stringify(payload.orders_snapshot || []);
  const stmt = db.prepare(
    'INSERT INTO automations (label, schedule, action, search_query, orders_snapshot, last_run, next_run, start_at, end_at, enabled, interval_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run([
    payload.label || 'Automation',
    payload.schedule || '',
    payload.action || '',
    payload.search_query || '',
    ordersJson,
    payload.last_run || null,
    payload.next_run || null,
    payload.start_at || null,
    payload.end_at || null,
    payload.enabled === undefined ? 1 : payload.enabled ? 1 : 0,
    payload.interval_days !== undefined ? payload.interval_days : 1
  ]);
  stmt.free();
  const rowStmt = db.prepare(
    'SELECT * FROM automations ORDER BY created_at DESC LIMIT 1'
  );
  let entry = null;
  if (rowStmt.step()) {
    const row = rowStmt.getAsObject();
    entry = {
      ...row,
      orders_snapshot: row.orders_snapshot ? JSON.parse(row.orders_snapshot) : []
    };
  }
  rowStmt.free();
  persist(db);
  return entry;
};

const updateAutomation = async (payload = {}) => {
  if (!payload.id) {
    throw new Error('updateAutomation requires an id');
  }
  const { db } = await ensureDb();
  const fields = [];
  const values = [];
  const allowed = [
    'label',
    'schedule',
    'action',
    'search_query',
    'orders_snapshot',
    'last_run',
    'next_run',
    'start_at',
    'end_at',
    'enabled',
    'interval_days'
  ];
  for (const key of allowed) {
    if (payload[key] !== undefined) {
      fields.push(`${key} = ?`);
      if (key === 'orders_snapshot') {
        values.push(JSON.stringify(payload[key] || []));
      } else if (key === 'enabled') {
        values.push(payload[key] ? 1 : 0);
      } else {
        values.push(payload[key]);
      }
    }
  }
  if (!fields.length) return null;
  values.push(payload.id);
  const stmt = db.prepare(`UPDATE automations SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(values);
  stmt.free();
  persist(db);
  return payload.id;
};

const deleteAutomation = async (id) => {
  if (!id) {
    throw new Error('deleteAutomation requires an id');
  }
  const { db } = await ensureDb();
  const stmt = db.prepare('DELETE FROM automations WHERE id = ?');
  stmt.run([id]);
  stmt.free();
  persist(db);
  let deleted = 0;
  try {
    const res = db.exec('SELECT changes() AS count;');
    const row = res?.[0]?.values?.[0];
    if (row && row.length) {
      deleted = Number(row[0]) || 0;
    }
  } catch (e) {
    deleted = 0;
  }
  return { ok: true, deleted };
};

const listOrderResults = async (limit = 1) => {
  const { db } = await ensureDb();
  const stmt = db.prepare(
    'SELECT * FROM order_results ORDER BY id DESC, created_at DESC LIMIT ?'
  );
  stmt.bind([limit || 1]);
  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({
      ...row,
      orders: row.orders_json ? JSON.parse(row.orders_json) : []
    });
  }
  stmt.free();
  return rows;
};

const saveOrderResults = async (payload = {}) => {
  const { db } = await ensureDb();
  const ordersJson = JSON.stringify(Array.isArray(payload.orders) ? payload.orders : []);
  // Keep only the most recent search; clear previous rows before insert
  db.run('DELETE FROM order_results;');
  const stmt = db.prepare(
    'INSERT INTO order_results (label, search_query, orders_json) VALUES (?, ?, ?)'
  );
  stmt.run([payload.label || 'Latest orders', payload.search_query || '', ordersJson]);
  stmt.free();

  const rowStmt = db.prepare(
    'SELECT * FROM order_results ORDER BY id DESC, created_at DESC LIMIT 1'
  );
  let entry = null;
  if (rowStmt.step()) {
    const row = rowStmt.getAsObject();
    entry = {
      ...row,
      orders: row.orders_json ? JSON.parse(row.orders_json) : []
    };
  }
  rowStmt.free();
  persist(db);
  return entry;
};

const listCreatedOrders = async (limit = 1) => {
  const { db } = await ensureDb();
  const stmt = db.prepare(
    'SELECT * FROM created_orders ORDER BY id DESC, created_at DESC LIMIT ?'
  );
  stmt.bind([limit || 1]);
  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({
      ...row,
      orders: row.orders_json ? JSON.parse(row.orders_json) : []
    });
  }
  stmt.free();
  return rows;
};

const saveCreatedOrders = async (payload = {}) => {
  const { db } = await ensureDb();
  const ordersJson = JSON.stringify(Array.isArray(payload.orders) ? payload.orders : []);
  // Only keep the latest snapshot of created orders
  db.run('DELETE FROM created_orders;');
  const stmt = db.prepare(
    'INSERT INTO created_orders (label, orders_json) VALUES (?, ?)'
  );
  stmt.run([payload.label || 'Recently created', ordersJson]);
  stmt.free();

  const rowStmt = db.prepare(
    'SELECT * FROM created_orders ORDER BY id DESC, created_at DESC LIMIT 1'
  );
  let entry = null;
  if (rowStmt.step()) {
    const row = rowStmt.getAsObject();
    entry = {
      ...row,
      orders: row.orders_json ? JSON.parse(row.orders_json) : []
    };
  }
  rowStmt.free();
  persist(db);
  return entry;
};

module.exports = {
  listAutomations,
  saveAutomation,
  updateAutomation,
  deleteAutomation,
  listOrderResults,
  saveOrderResults,
  listCreatedOrders,
  saveCreatedOrders
};
