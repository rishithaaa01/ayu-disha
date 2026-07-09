import { openDatabase } from '../database/database-sqlite';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/Config';

const API_URL = Config.API_URL;

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
      const unsyncedHouseholds: any[] = await db.getAllAsync(
        'SELECT * FROM asha_households WHERE synced = 0'
      );

      // 2. Fetch unsynced visits
      const unsyncedVisits: any[] = await db.getAllAsync(
        'SELECT * FROM asha_visits WHERE synced = 0'
      );

      if (unsyncedHouseholds.length === 0 && unsyncedVisits.length === 0) return;

      console.log(`Syncing ${unsyncedHouseholds.length} households, ${unsyncedVisits.length} visits...`);

      // ── SYNC HOUSEHOLDS one by one so partial failures don't kill the batch ──
      for (const h of unsyncedHouseholds) {
        try {
          await axios.post(
            `${API_URL}/asha/households`,
            {
              family_name: h.family_name,
              village:     h.village,
              block:       h.block || '',
              district:    h.district || '',
              members:     h.members_json ? JSON.parse(h.members_json) : [],
            },
            { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
          );
          await db.runAsync(
            'UPDATE asha_households SET synced = 1 WHERE id = ?',
            [h.id]
          );
          console.log(`✅ Household synced: ${h.family_name}`);
        } catch (err: any) {
          console.warn(`⚠️ Household sync failed (${h.family_name}):`, err.message);
          // leave synced = 0, will retry next time
        }
      }

      // ── SYNC VISITS one by one ──
      for (const v of unsyncedVisits) {
        try {
          // Parse observations — handle both string and already-parsed object
          let observations = v.observations_json;
          if (typeof observations === 'string') {
            try { observations = JSON.parse(observations); } catch { observations = { raw: observations }; }
          }

          await axios.post(
            `${API_URL}/asha/visits`,
            {
              household_id:     v.household_id,
              member_id:        v.member_id,
              visit_type:       v.visit_type,
              observations:     observations,
              voice_notes:      v.voice_notes || '',
              risk_level:       v.risk_level || 'WATCH',
              ai_reasoning:     v.ai_reasoning || '',
              ai_recommendation:v.ai_recommendation || '',
            },
            { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
          );
          await db.runAsync(
            'UPDATE asha_visits SET synced = 1 WHERE id = ?',
            [v.id]
          );
          console.log(`✅ Visit synced: id=${v.id}`);
        } catch (err: any) {
          console.warn(`⚠️ Visit sync failed (id=${v.id}):`, err.message);
          // leave synced = 0, will retry next time
        }
      }

      console.log("Offline sync attempt complete.");
    } catch (err: any) {
      console.error('Sync service error:', err.message);
    }
  }
};
