import { db, migrateDb } from '../client.js';
import { runSeed } from './run-seed.js';

await migrateDb();
const summary = await runSeed(db);
console.log('Seed complete:', summary);
