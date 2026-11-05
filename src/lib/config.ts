/** Shared constants. Kept in one file so the UI never shows two different numbers for one thing. */

/** Scan cadence. Production target is 15 min; the demo clock runs faster than wall time. */
export const SCAN_MINUTES = 15

/** Guardrail: a brand account posting more than this a day starts cannibalising its own reach. */
export const DAILY_CAP = 4

/** Qualified engagement a single post has to clear to count as a hit. */
export const BASELINE_QUALIFIED = 3

/** TelyClaw's own account, used when simulating a publish outcome. */
export const TELYCLAW_FOLLOWERS = 42_000
