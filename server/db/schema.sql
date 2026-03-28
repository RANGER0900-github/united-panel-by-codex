CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'admin',
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS vps_instances (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  status TEXT,
  cpu INTEGER,
  ram_mb INTEGER,
  disk_gb INTEGER,
  disk_path TEXT,
  image TEXT,
  technology TEXT,
  ip_address TEXT,
  expires_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  display_name TEXT,
  size_gb REAL,
  rootfs_path TEXT,
  available INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT
);
