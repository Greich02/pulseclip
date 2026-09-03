// PulseClip runs single-user, no login (auth removed per user request —
// was going to be Clerk, see git history if it needs to come back). Every
// Video/UserSettings row still carries a `userId` column so the schema is
// ready for multi-tenancy again without a migration; every query just uses
// this fixed value instead of a Clerk session id.
export const SINGLE_USER_ID = "default-user";
