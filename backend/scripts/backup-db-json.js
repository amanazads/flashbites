#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const loadMongoUri = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file not found in backend directory');
  }
  const env = dotenv.parse(fs.readFileSync(envPath));
  if (!env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in .env');
  }
  return env.MONGO_URI;
};

const timestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const main = async () => {
  const rootBackupDir = path.resolve(process.cwd(), 'backups');
  const ts = process.argv[2] || timestamp();
  const backupDir = path.join(rootBackupDir, ts);
  const jsonDir = path.join(backupDir, 'json-dump');

  ensureDir(jsonDir);

  const uri = loadMongoUri();
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const manifest = {
    createdAt: new Date().toISOString(),
    database: db.databaseName,
    collectionCount: collections.length,
    collections: [],
  };

  for (const c of collections) {
    const name = c.name;
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(jsonDir, `${name}.json`), JSON.stringify(docs, null, 2));
    manifest.collections.push({ name, count: docs.length, file: `${name}.json` });
    console.log(`${name}: ${docs.length}`);
  }

  fs.writeFileSync(path.join(jsonDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await mongoose.disconnect();

  console.log(`backup_timestamp=${ts}`);
  console.log(`backup_path=backups/${ts}/json-dump`);
};

main().catch(async (error) => {
  console.error(`BACKUP_FAILED: ${error.message}`);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
