import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { mySchema } from './schema';
import Visit from './models/Visit';
import Referral from './models/Referral';

// Set up the adapter (SQLite on iOS/Android, IndexedDB on web)
const adapter = new SQLiteAdapter({
  schema: mySchema,
  // (Optional) Database naming config
  dbName: 'ayudisha_asha_db',
  // (Recommended) Native database error handling
  onSetUpError: error => {
    console.error('WatermelonDB failed to set up:', error);
  }
});

// Create the database instance
export const database = new Database({
  adapter,
  modelClasses: [
    Visit,
    Referral
  ],
});
