// Web stub — expo-sqlite is not supported on web.
// All SQLite operations are no-ops on this platform.

export const openDatabase = async () => {
  return {
    execAsync: async () => {},
    runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
    getAllAsync: async () => [],
    getFirstAsync: async () => null,
  } as any;
};
