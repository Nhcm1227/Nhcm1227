export const DAY = 864e5;
export const PRICE = Number(process.env.PRICE_VND || 24000);
export const TRIAL_DAYS = 3;
export const MONTH_DAYS = 30;
export const PACKS = [1, 3, 6, 12];

export function planOf(u, now = Date.now()) {
  if ((u.paidUntil || 0) > now) return { kind: 'paid', until: u.paidUntil };
  if ((u.trialEnds || 0) > now) return { kind: 'trial', until: u.trialEnds };
  return { kind: 'free', until: 0 };
}

export function addMonths(u, months, now = Date.now()) {
  const base = Math.max(now, u.paidUntil || 0);
  u.paidUntil = base + months * MONTH_DAYS * DAY;
  return u;
}
