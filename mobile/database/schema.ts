import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'asha_visits',
      columns: [
        { name: 'household_id', type: 'string' },
        { name: 'member_id', type: 'string' },
        { name: 'visit_type', type: 'string' },
        { name: 'observations_json', type: 'string' },
        { name: 'voice_notes', type: 'string', isOptional: true },
        { name: 'risk_level', type: 'string' },
        { name: 'ai_reasoning', type: 'string' },
        { name: 'ai_recommendation', type: 'string' },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'pending_referrals',
      columns: [
        { name: 'visit_id', type: 'string' },
        { name: 'patient_id', type: 'string' },
        { name: 'to_hospital_id', type: 'string' },
        { name: 'urgency', type: 'string' },
        { name: 'ai_summary', type: 'string' },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
