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
        next_run DATETIME
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
      orders_snapshot: row.orders_snapshot ? JSON.parse(row.orders_snapshot) : []
    });
  }
  stmt.free();
  return rows;
};

const saveAutomation = async (payload = {}) => {
  const { db } = await ensureDb();
  const ordersJson = JSON.stringify(payload.orders_snapshot || []);
  const stmt = db.prepare(
    'INSERT INTO automations (label, schedule, action, search_query, orders_snapshot, last_run, next_run) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run([
    payload.label || 'Automation',
    payload.schedule || '',
    payload.action || '',
    payload.search_query || '',
    ordersJson,
    payload.last_run || null,
    payload.next_run || null
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

module.exports = {
  listAutomations,
  saveAutomation
};
