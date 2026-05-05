const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend folder
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Restaurant = require('../src/models/Restaurant');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI is not set in environment');
  process.exit(1);
}

const OUT_DIR = path.resolve(__dirname, '../backups/pre-migration-' + Date.now());

async function main() {
  await mongoose.connect(uri, {
    maxPoolSize: 5,
    minPoolSize: 1,
    // useNewUrlParser/UnifiedTopology are defaults in modern mongoose
  });

  const restaurants = await Restaurant.find({}).lean();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'restaurants.json');
  fs.writeFileSync(outPath, JSON.stringify(restaurants, null, 2), 'utf8');
  console.log('Exported', restaurants.length, 'restaurants to', outPath);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('DUMP_FAILED', err);
  process.exit(1);
});
