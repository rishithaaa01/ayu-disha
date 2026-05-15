import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Visit extends Model {
  static table = 'asha_visits';

  @field('household_id') householdId!: string;
  @field('member_id') memberId!: string;
  @field('visit_type') visitType!: string;
  @field('observations_json') observationsJson!: string;
  @field('voice_notes') voiceNotes?: string;
  @field('risk_level') riskLevel!: string;
  @field('ai_reasoning') aiReasoning!: string;
  @field('ai_recommendation') aiRecommendation!: string;
  @field('synced') synced!: boolean;
  @date('created_at') createdAt!: number;
}
