import { openDatabase } from '../database/database-sqlite';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/Config';

const API_URL = Config.API_URL; // Host IP

export const syncService = {
  startSyncListener: () => {
    console.log("Sync listener started...");
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log("Internet restored! Attempting sync...");
        syncService.syncPendingData();
      }
    });
  },

  syncPendingData: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;

      const db = await openDatabase();

      // 1. Fetch unsynced households
      const unsyncedHouseholds = await db.getAllAsync('SELECT * FROM asha_households WHERE synced = 0');
      
      // 2. Fetch unsynced visits
      const unsyncedVisits = await db.getAllAsync('SELECT * FROM asha_visits WHERE synced = 0');

      if (unsyncedHouseholds.length > 0 || unsyncedVisits.length > 0) {
        console.log(`Syncing ${unsyncedHouseholds.length} households and ${unsyncedVisits.length} visits...`);
        
        const householdsPayload = unsyncedHouseholds.map((h: any) => ({
          ...h,
          members: h.members_json ? JSON.parse(h.members_json) : [],
        }));

        const visitsPayload = unsyncedVisits.map((v: any) => ({
          local_id: v.id.toString(),
          household_id: v.household_id,
          member_id: v.member_id,
          visit_type: v.visit_type,
          observations: JSON.parse(v.observations_json),
          risk_level: v.risk_level,
          ai_reasoning: v.ai_reasoning,
          ai_recommendation: v.ai_recommendation,
          voice_notes: v.voice_notes,
          created_at: v.created_at
        }));

        await axios.post(`${API_URL}/asha/sync`, { 
          households: householdsPayload,
          visits: visitsPayload 
        }, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 5000 // 5 seconds timeout
        });

        // 3. Mark as synced locally
        for (const h of unsyncedHouseholds as any[]) {
          await db.runAsync('UPDATE asha_households SET synced = 1 WHERE id = ?', [h.id]);
        }
        for (const v of unsyncedVisits as any[]) {
          await db.runAsync('UPDATE asha_visits SET synced = 1 WHERE id = ?', [v.id]);
        }
        
        console.log("Offline sync complete.");
      }
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }
};
