/** Stable machine-readable API errors. Messages are developer-facing, never member-facing copy. */
export type ErrorDetail = { field?: string; code: string; message?: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message || code);
  }
}

export const badRequest = (code = 'bad_request', message?: string) => new ApiError(400, code, message);
export const unauthenticated = (code = 'not_authenticated') => new ApiError(401, code);
export const forbidden = (code = 'forbidden', message?: string) => new ApiError(403, code, message);
/** Used for both "absent" and "not visible to you" so private content never leaks its existence. */
export const notFound = (code = 'not_found') => new ApiError(404, code);
export const conflict = (code: string, message?: string) => new ApiError(409, code, message);
export const unprocessable = (code: string, message?: string, details?: ErrorDetail[]) =>
  new ApiError(422, code, message, details);
export const tooMany = () => new ApiError(429, 'rate_limited');
export const unavailable = (code: string, message?: string) => new ApiError(503, code, message);

/** SQLite/D1 constraint and trigger messages, matched by fragment (D1 prefixes "D1_ERROR: "). */
export function sqlErrorIncludes(error: unknown, fragment: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(fragment);
}

const TRIGGER_CODES: [string, string][] = [
  ['dream title cannot be changed', 'title_immutable'],
  ['invalid Dream phase transition', 'invalid_phase_transition'],
  ['Dream summary locked after Semence', 'field_locked_for_phase'],
  ['Dream cover locked in Floraison', 'field_locked_for_phase'],
  ['Floraison result is locked', 'floraison_locked'],
  ['needs are locked in Floraison', 'floraison_locked'],
  ['release accepted helpers before removing a need', 'need_has_accepted_helpers'],
  ['offers start pending', 'invalid_offer'],
  ['release an accepted offer', 'offer_accepted'],
  ['entry type not permitted for Dream phase', 'entry_not_allowed_for_phase'],
  ['Semence composition is editable only in Semence', 'field_locked_for_phase'],
  ['Floraison media is locked', 'floraison_locked'],
  ['milestones are locked in Floraison', 'floraison_locked'],
  ['only original publisher may repost adaptation', 'publisher_only'],
  ['both parties must accept introduction', 'introduction_consent_missing'],
  ['video calling requires accepted My Circle relationship', 'circle_required'],
  ['inspiration publication does not exist', 'not_found'],
];

/** Translate integrity-rule failures raised by D1 into API errors; rethrow anything else. */
export function mapSqlError(error: unknown): never {
  if (error instanceof ApiError) throw error;
  const message = error instanceof Error ? error.message : String(error);
  for (const [fragment, code] of TRIGGER_CODES) {
    if (message.includes(fragment)) throw unprocessable(code);
  }
  if (message.includes('slots_filled') && message.includes('CHECK')) throw conflict('need_full');
  if (message.includes('UNIQUE constraint failed')) throw conflict('already_exists');
  if (message.includes('FOREIGN KEY constraint failed')) throw unprocessable('invalid_reference');
  throw error;
}
