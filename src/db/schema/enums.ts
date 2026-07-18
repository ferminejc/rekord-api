import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['runner', 'organizer', 'admin']);

export const genderEnum = pgEnum('gender', ['male', 'female']);

export const terrainEnum = pgEnum('terrain', ['road', 'trail', 'track', 'mixed']);

export const eventTypeEnum = pgEnum('event_type', ['individual', 'relay', 'virtual']);

export const distanceCategoryEnum = pgEnum('distance_category', [
  'five_k',
  'ten_k',
  'half_marathon',
  'marathon',
  'ultra',
  'custom',
]);

export const resultSourceEnum = pgEnum('result_source', ['official', 'manual', 'import']);

export const resultStatusEnum = pgEnum('result_status', ['verified', 'pending', 'disputed']);

export const claimMethodEnum = pgEnum('claim_method', [
  'email_code',
  'social_match',
  'id_document',
]);

/** Shared by claims.status and edit_requests.status — both are a submit → admin-review workflow. */
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected']);

export const goalTypeEnum = pgEnum('goal_type', [
  'target_time',
  'yearly_distance',
  'yearly_race_count',
]);

export const integrationProviderEnum = pgEnum('integration_provider', ['strava', 'garmin']);

export const integrationStatusEnum = pgEnum('integration_status', [
  'connected',
  'disconnected',
  'error',
]);

export const importCandidateStatusEnum = pgEnum('import_candidate_status', [
  'pending',
  'imported',
  'dismissed',
]);

export const uploadPurposeEnum = pgEnum('upload_purpose', [
  'avatar',
  'claim_evidence',
  'result_evidence',
]);
