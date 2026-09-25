const num = (k: string, d: number) => Number(process.env[k]) || d;

const perIp = new Map<string, number[]>();
let running = 0;
let day = new Date().toDateString();
let today = 0;

export function acquire(ip: string): string | null {
  const now = Date.now();
  const window = num("RUN_WINDOW_MS", 600_000);
  const hits = (perIp.get(ip) ?? []).filter((t) => now - t < window);
  if (hits.length >= num("RUN_PER_IP", 3)) return "Slow down. Try again in a few minutes.";
  if (running >= num("RUN_MAX_CONCURRENT", 3)) return "Too many people asking right now.";
  const d = new Date().toDateString();
  if (d !== day) (day = d), (today = 0);
  if (today >= num("RUN_DAILY_CAP", 100)) return "Out of runs for today.";
  hits.push(now);
  perIp.set(ip, hits);
  running++;
  today++;
  return null;
}

export function release() {
  running = Math.max(0, running - 1);
}
