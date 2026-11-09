import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const tables = ['register', 'accounts', 'sessions', 'activity', 'password_help'];
const sqliteSchema = [
  'CREATE TABLE IF NOT EXISTS register(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,data TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS accounts(person_id TEXT PRIMARY KEY,role TEXT NOT NULL,hash TEXT NOT NULL,must_change INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,person_id TEXT NOT NULL,expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY,at TEXT,person_id TEXT,action TEXT)',
  "CREATE TABLE IF NOT EXISTS password_help(id INTEGER PRIMARY KEY,person_id TEXT NOT NULL,requested_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',resolved_at TEXT,resolved_by TEXT)",
];
const mysqlSchema = [
  'CREATE TABLE IF NOT EXISTS register(id INT PRIMARY KEY,revision BIGINT NOT NULL,data LONGTEXT NOT NULL) ENGINE=InnoDB',
  'CREATE TABLE IF NOT EXISTS accounts(person_id VARCHAR(100) PRIMARY KEY,role VARCHAR(24) NOT NULL,hash VARCHAR(256) NOT NULL,must_change INT NOT NULL) ENGINE=InnoDB',
  'CREATE TABLE IF NOT EXISTS sessions(hash VARCHAR(64) PRIMARY KEY,person_id VARCHAR(100) NOT NULL,expires BIGINT NOT NULL,INDEX(person_id)) ENGINE=InnoDB',
  'CREATE TABLE IF NOT EXISTS activity(id BIGINT PRIMARY KEY AUTO_INCREMENT,at VARCHAR(40),person_id VARCHAR(100),action VARCHAR(256)) ENGINE=InnoDB',
  "CREATE TABLE IF NOT EXISTS password_help(id BIGINT PRIMARY KEY AUTO_INCREMENT,person_id VARCHAR(100) NOT NULL,requested_at VARCHAR(40) NOT NULL,status VARCHAR(24) NOT NULL DEFAULT 'pending',resolved_at VARCHAR(40),resolved_by VARCHAR(100)) ENGINE=InnoDB",
];

export async function openDatabase({ filename, url = process.env.MYSQL_URL, tablePrefix = process.env.MYSQL_TABLE_PREFIX || '' } = {}) {
  if (!/^[a-z0-9_]{0,50}$/.test(tablePrefix)) throw new Error('Invalid MySQL table prefix.');
  const mysqlSql = sql => sql.replace(/\b(register|accounts|sessions|activity|password_help)\b/g, table => `\`${tablePrefix}${table}\``);
  const context = new AsyncLocalStorage();
  let sqlite, pool, queue = Promise.resolve();
  if (url) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'mysql:') throw new Error('MYSQL_URL must use the mysql protocol.');
    pool = mysql.createPool({
      host: parsed.hostname, port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.slice(1)), charset: 'utf8mb4',
      connectionLimit: 5, supportBigNumbers: true, bigNumberStrings: false,
      ...(process.env.MYSQL_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}),
    });
    for (const sql of mysqlSchema) await pool.query(mysqlSql(sql));
  } else {
    mkdirSync(path.dirname(filename), { recursive: true });
    sqlite = new Database(filename);
    sqlite.pragma('journal_mode=WAL');
    sqlite.pragma('busy_timeout=10000');
    for (const sql of sqliteSchema) sqlite.exec(sql);
  }

  function serial(work) {
    if (context.getStore()) return work();
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  }
  async function query(sql, values, mode) {
    if (pool) {
      const [rows] = await (context.getStore() || pool).execute(mysqlSql(sql), values);
      return mode === 'get' ? rows[0] : mode === 'all' ? rows : { changes: rows.affectedRows, lastInsertRowid: rows.insertId };
    }
    return serial(() => sqlite.prepare(sql)[mode](...values));
  }
  const db = {
    engine: pool ? 'mysql' : 'sqlite',
    prepare(sql) {
      return Object.fromEntries(['get','all','run'].map(mode => [mode, (...values) => query(sql, values, mode)]));
    },
    transaction(work) {
      return async (...args) => {
        if (context.getStore()) return work(...args);
        if (pool) {
          const connection = await pool.getConnection();
          try {
            await connection.beginTransaction();
            // Every register mutation takes the same lock before reading its revision.
            await connection.query(mysqlSql('SELECT id FROM register WHERE id=1 FOR UPDATE'));
            const result = await context.run(connection, () => work(...args));
            await connection.commit();
            return result;
          } catch (error) { await connection.rollback(); throw error; }
          finally { connection.release(); }
        }
        return serial(async () => {
          sqlite.exec('BEGIN IMMEDIATE');
          try {
            const result = await context.run(true, () => work(...args));
            sqlite.exec('COMMIT'); return result;
          } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
        });
      };
    },
    async backup(destination) {
      if (sqlite) return serial(() => sqlite.backup(destination));
      // Portable snapshots retain the existing restore format, including accounts and history.
      return db.transaction(async () => {
        const snapshot = new Database(destination);
        try {
          for (const sql of sqliteSchema) snapshot.exec(sql);
          for (const table of tables) {
            const rows = await db.prepare(`SELECT * FROM ${table}`).all();
            snapshot.transaction(() => {
              for (const row of rows) {
                const columns = Object.keys(row);
                snapshot.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...Object.values(row));
              }
            })();
          }
        } finally { snapshot.close(); }
        return destination;
      })();
    },
    async close() { if (pool) await pool.end(); else await serial(() => sqlite.close()); },
  };

  if (pool && filename && existsSync(filename) && !(await db.prepare('SELECT id FROM register').get())) {
    const source = new Database(filename, { readonly: true });
    try {
      if (source.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('Existing SQLite register failed integrity verification.');
      const snapshotPath = path.join(path.dirname(filename), 'backups', `before-mysql-${Date.now()}.db`);
      mkdirSync(path.dirname(snapshotPath), { recursive: true }); await source.backup(snapshotPath);
      await db.transaction(async () => {
        if (await db.prepare('SELECT id FROM register').get()) return;
        for (const table of tables) {
          if (!source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)) continue;
          for (const row of source.prepare(`SELECT * FROM ${table}`).all()) {
            const columns = Object.keys(row);
            await db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...Object.values(row));
          }
        }
      })();
      console.log('Existing register and accounts migrated to MySQL. SQLite source and backup retained.');
    } finally { source.close(); }
  }
  return db;
}
