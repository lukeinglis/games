export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

const DEFAULT_POOL_SIZE = 120;

export function createParticlePool(size: number = DEFAULT_POOL_SIZE): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < size; i++) {
    pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: "#fff", size: 2, active: false });
  }
  return pool;
}

export function emitParticles(
  pool: Particle[], count: number,
  x: number, y: number,
  opts: { speedMin: number; speedMax: number; lifeFrames: number; colors: string[]; sizeMin: number; sizeMax: number; gravity?: boolean; dirMin?: number; dirMax?: number },
) {
  let emitted = 0;
  for (let i = 0; i < pool.length && emitted < count; i++) {
    if (!pool[i].active) {
      const dirMin = opts.dirMin ?? 0;
      const dirMax = opts.dirMax ?? Math.PI * 2;
      const angle = dirMin + Math.random() * (dirMax - dirMin);
      const speed = opts.speedMin + Math.random() * (opts.speedMax - opts.speedMin);
      pool[i].x = x;
      pool[i].y = y;
      pool[i].vx = Math.cos(angle) * speed;
      pool[i].vy = Math.sin(angle) * speed;
      pool[i].life = opts.lifeFrames;
      pool[i].maxLife = opts.lifeFrames;
      pool[i].color = opts.colors[Math.floor(Math.random() * opts.colors.length)];
      pool[i].size = opts.sizeMin + Math.random() * (opts.sizeMax - opts.sizeMin);
      pool[i].active = true;
      emitted++;
    }
  }
}

export function updateParticles(pool: Particle[]) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life--;
    if (p.life <= 0) p.active = false;
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, pool: Particle[]) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 3;
  if (streak >= 7) return 2;
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.25;
  return 1;
}

export function getMultiplierColor(mult: number): string {
  if (mult >= 2) return "#ff4444";
  if (mult >= 1.5) return "#ff8800";
  if (mult >= 1.25) return "#FFD700";
  return "white";
}
