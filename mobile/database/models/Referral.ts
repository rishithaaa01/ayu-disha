import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Referral extends Model {
  static table = 'pending_referrals';

  @field('visit_id') visitId!: string;
  @field('patient_id') patientId!: string;
  @field('to_hospital_id') toHospitalId!: string;
  @field('urgency') urgency!: string;
  @field('ai_summary') aiSummary!: string;
  @field('synced') synced!: boolean;
  @date('created_at') createdAt!: number;
}
