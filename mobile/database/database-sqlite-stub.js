// Stub for expo-sqlite on web — SQLite is not supported in the browser.
// All exports are no-ops to prevent bundling errors.

export const openDatabaseAsync = async () => ({
  execAsync: async () => {},
  runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
  getAllAsync: async () => [],
  getFirstAsync: async () => null,
  closeAsync: async () => {},
});

export const openDatabaseSync = () => ({
  execSync: () => {},
  runSync: () => ({ lastInsertRowId: 0, changes: 0 }),
  getAllSync: () => [],
  getFirstSync: () => null,
  closeSync: () => {},
});

export default { openDatabaseAsync, openDatabaseSync };
