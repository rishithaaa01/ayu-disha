import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const openDatabase = async () => {
    // If we have an instance and it's already fully initialized, return it
    if (dbInstance) return dbInstance;

    // If an initialization is already in progress, wait for it
    if (initPromise) return initPromise;

    // Start a new initialization process
    initPromise = (async () => {
        try {
            const db = await SQLite.openDatabaseAsync('ayudisha.db');
            
            // Safety: Wait for native side to stabilize
            await new Promise(resolve => setTimeout(resolve, 200));

            // Setup Journal Mode
            await db.execAsync('PRAGMA journal_mode = WAL;');
            
            // Create tables individually for max stability
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS asha_visits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    household_id TEXT NOT NULL,
                    member_id TEXT NOT NULL,
                    visit_type TEXT NOT NULL,
                    observations_json TEXT NOT NULL,
                    voice_notes TEXT,
                    risk_level TEXT NOT NULL,
                    ai_reasoning TEXT NOT NULL,
                    ai_recommendation TEXT NOT NULL,
                    offline_audio_uri TEXT,
                    synced INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS pending_referrals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    visit_id TEXT,
                    patient_id TEXT,
                    to_hospital_id TEXT,
                    urgency TEXT,
                    ai_summary TEXT,
                    synced INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS asha_households (
                    id TEXT PRIMARY KEY,
                    family_name TEXT NOT NULL,
                    village TEXT NOT NULL,
                    block TEXT,
                    district TEXT,
                    risk_level TEXT DEFAULT 'green',
                    last_visit_date TEXT,
                    members_json TEXT,
                    synced INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Migration: Add offline_audio_uri if it doesn't exist yet
            try {
                await db.execAsync('ALTER TABLE asha_visits ADD COLUMN offline_audio_uri TEXT;');
            } catch (migrationError) {
                // Column probably already exists, which is fine
                console.log('Database Migration (offline_audio_uri): Already exists or skipped.');
            }
            
            dbInstance = db;
            return db;
        } catch (e) {
            console.error('CRITICAL: Database initialization failed:', e);
            initPromise = null; // Reset so we can try again
            throw e;
        }
    })();

    return initPromise;
};
