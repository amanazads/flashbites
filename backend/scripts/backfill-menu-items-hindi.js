#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../src/models/MenuItem');

const isDryRun = process.argv.includes('--dry-run');

const hasMissingHindi = {
  $or: [
    { nameHi: { $exists: false } },
    { nameHi: null },
    { nameHi: '' },
    { descriptionHi: { $exists: false } },
    { descriptionHi: null },
    { descriptionHi: '' },
  ],
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });

  const total = await MenuItem.countDocuments();
  const missing = await MenuItem.countDocuments(hasMissingHindi);

  console.log(`Total menu items: ${total}`);
  console.log(`Items missing Hindi fields: ${missing}`);

  if (missing === 0) {
    console.log('No backfill needed.');
    return;
  }

  if (isDryRun) {
    console.log('Dry run complete. No changes were written.');
    return;
  }

  const cursor = MenuItem.find(hasMissingHindi).cursor();
  let updated = 0;

  for await (const item of cursor) {
    let shouldSave = false;

    if (!item.nameHi || !item.nameHi.trim()) {
      item.nameHi = String(item.name || '').trim();
      shouldSave = true;
    }

    if (!item.descriptionHi || !item.descriptionHi.trim()) {
      item.descriptionHi = String(item.description || '').trim();
      shouldSave = true;
    }

    if (shouldSave) {
      await item.save();
      updated += 1;
    }
  }

  console.log(`Backfill complete. Updated items: ${updated}`);
};

run()
  .catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
  });
