// Platform fee tiers — mirror of the Postgres platform_fee_bps_for()
// function. Keep these two in lockstep: any change here must be applied
// as a migration so new closings use the same number the UI previewed.
//
// Tiers (basis points):
//   <  $1,000        → 400 bps (4.0%)
//   $1,000 – $4,999  → 300 bps (3.0%)
//   $5,000 – $19,999 → 200 bps (2.0%)
//   $20,000 – $99,999→ 150 bps (1.5%)
//   $100,000+        → 100 bps (1.0%)

export function platformFeeBpsFor(priceDollars) {
  const cents = Math.round((priceDollars || 0) * 100);
  if (cents < 100000) return 400;
  if (cents < 500000) return 300;
  if (cents < 2000000) return 200;
  if (cents < 10000000) return 150;
  return 100;
}

export function platformFeePctFor(priceDollars) {
  return platformFeeBpsFor(priceDollars) / 100;
}

// Useful for the "fee schedule" tooltip / disclosure copy.
export const FEE_TIERS = [
  { upTo: 1000, pct: 4.0 },
  { upTo: 5000, pct: 3.0 },
  { upTo: 20000, pct: 2.0 },
  { upTo: 100000, pct: 1.5 },
  { upTo: Infinity, pct: 1.0 },
];
