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
          // Validate required fields first
          if (!v.household_id || !v.member_id) {
            console.error(`⚠️ Visit ${v.id} missing required fields:`, { 
              household_id: v.household_id, 
              member_id: v.member_id 
            });
            continue;
          }

          // Parse observations — handle both string and already-parsed object
          let observations = v.observations_json;
          if (typeof observations === 'string') {
            try { 
              observations = JSON.parse(observations); 
            } catch (parseError) { 
              console.warn(`Cannot parse observations for visit ${v.id}, using empty object. Raw value:`, observations);
              observations = {}; 
            }
          }
          
          // Ensure observations is an object (not array, not null, not undefined)
          if (!observations || typeof observations !== 'object' || Array.isArray(observations)) {
            console.warn(`Visit ${v.id} observations is not a valid object. Type: ${typeof observations}, Value:`, observations);
            observations = {};
          }

          console.log(`[SYNC DEBUG] Visit ${v.id} observations parsed:`, observations);

          // Ensure household_id and member_id are valid strings
          const householdId = String(v.household_id).trim();
          const memberId = String(v.member_id).trim();

          if (householdId === 'undefined' || householdId === 'null' || householdId === '') {
            console.error(`⚠️ Visit ${v.id} has invalid household_id: "${v.household_id}"`);
            continue;
          }

          if (memberId === 'undefined' || memberId === 'null' || memberId === '') {
            console.error(`⚠️ Visit ${v.id} has invalid member_id: "${v.member_id}"`);
            continue;
          }

          const payload = {
            household_id:      householdId,
            member_id:         memberId,
            visit_type:        v.visit_type || 'general',
            observations:      observations,
            voice_notes:       v.voice_notes || '',
            risk_level:        v.risk_level || 'WATCH',
            ai_reasoning:      v.ai_reasoning || 'Routine checkup',
            ai_recommendation: v.ai_recommendation || 'Monitor condition',
          };

          console.log(`[SYNC] Sending visit ${v.id} to backend...`);
          console.log(`[SYNC] Payload:`, {
            household_id: householdId,
            member_id: memberId,
            visit_type: v.visit_type || 'general',
            observations: observations,
            observations_is_object: typeof observations === 'object' && !Array.isArray(observations)
          });

          const response = await axios.post(
            `${API_URL}/asha/visits`,
            payload,
            { 
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }, 
              timeout: 30000 
            }
          );
          
          await db.runAsync(
            'UPDATE asha_visits SET synced = 1 WHERE id = ?',
            [v.id]
          );
          console.log(`✅ Visit synced: id=${v.id}, backend response:`, response.data);
        } catch (err: any) {
          const errorDetails = err.response?.data || err.message;
          console.error(`⚠️ Visit sync failed (id=${v.id}):`, errorDetails);
          
          // Log full error details for debugging
          if (err.response) {
            console.error(`Backend status code: ${err.response.status}`);
            console.error(`Backend error body:`, JSON.stringify(err.response.data, null, 2));
          } else {
            console.error(`Network or request error:`, err.message);
          }
          
          // Log the exact payload that failed FOR DEBUGGING ONLY
          console.error(`[DEBUG] Failed visit data from SQLite:`, {
            id: v.id,
            household_id: v.household_id,
            member_id: v.member_id,
            visit_type: v.visit_type,
            observations_json_type: typeof v.observations_json,
            observations_json_sample: String(v.observations_json).substring(0, 100)
          });
          
          // leave synced = 0, will retry next time
        }
      }

      console.log("Offline sync attempt complete.");
    } catch (err: any) {
      console.error('Sync service error:', err.message);
    }
  }
};
