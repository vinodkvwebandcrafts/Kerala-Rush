/* ═══════════════════════════════════════════════════
   Math Utilities
   ═══════════════════════════════════════════════════ */

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
}

export function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

export function distanceSq(x1, z1, x2, z2) {
    const dx = x1 - x2;
    const dz = z1 - z2;
    return dx * dx + dz * dz;
}
