export const BUILT_IN_PRESETS = {
  fire: [
    {
      name: 'Candle',
      params: {
        intensity: 28, flameHeight: 42, flameWidth: 22, turbulence: 12, flickerSpeed: 65,
        windDir: 0, windStrength: 0, emberAmount: 8, sparkAmount: 4,
        bloom: 38, heatDistortion: 8, colorTemp: 90, coreBrightness: 85, smokeAmount: 10,
      },
    },
    {
      name: 'Torch',
      params: {
        intensity: 52, flameHeight: 95, flameWidth: 40, turbulence: 28, flickerSpeed: 55,
        windDir: 0, windStrength: 18, emberAmount: 35, sparkAmount: 22,
        bloom: 55, heatDistortion: 18, colorTemp: 80, coreBrightness: 78, smokeAmount: 25,
      },
    },
    {
      name: 'Campfire',
      params: {
        intensity: 62, flameHeight: 75, flameWidth: 110, turbulence: 35, flickerSpeed: 45,
        windDir: 0, windStrength: 8, emberAmount: 65, sparkAmount: 45,
        bloom: 58, heatDistortion: 22, colorTemp: 82, coreBrightness: 72, smokeAmount: 35,
      },
    },
    {
      name: 'Heavy Fire',
      params: {
        intensity: 90, flameHeight: 130, flameWidth: 155, turbulence: 55, flickerSpeed: 50,
        windDir: 0, windStrength: 5, emberAmount: 70, sparkAmount: 55,
        bloom: 80, heatDistortion: 40, colorTemp: 78, coreBrightness: 88, smokeAmount: 55,
      },
    },
    {
      name: 'Wind-Blown',
      params: {
        intensity: 65, flameHeight: 90, flameWidth: 95, turbulence: 50, flickerSpeed: 60,
        windDir: 40, windStrength: 72, emberAmount: 55, sparkAmount: 40,
        bloom: 60, heatDistortion: 28, colorTemp: 80, coreBrightness: 75, smokeAmount: 30,
      },
    },
    {
      name: 'Gas Flame',
      params: {
        intensity: 48, flameHeight: 68, flameWidth: 55, turbulence: 18, flickerSpeed: 35,
        windDir: 0, windStrength: 0, emberAmount: 5, sparkAmount: 8,
        bloom: 45, heatDistortion: 15, colorTemp: 20, coreBrightness: 90, smokeAmount: 5,
      },
    },
    {
      name: 'Wildfire',
      params: {
        intensity: 82, flameHeight: 115, flameWidth: 200, turbulence: 88, flickerSpeed: 72,
        windDir: 25, windStrength: 45, emberAmount: 90, sparkAmount: 80,
        bloom: 72, heatDistortion: 50, colorTemp: 68, coreBrightness: 70, smokeAmount: 65,
      },
    },
  ],

  sparks: [
    {
      name: 'Gun Muzzle Flash',
      params: { sparkCount: 48, spreadAngle: 22, length: 95, brightness: 96, decay: 78, direction: -90, flashSize: 88 },
    },
    {
      name: 'Sci-fi Flash',
      params: { sparkCount: 62, spreadAngle: 180, length: 72, brightness: 85, decay: 48, direction: -90, flashSize: 72 },
    },
    {
      name: 'Welding Sparks',
      params: { sparkCount: 22, spreadAngle: 38, length: 45, brightness: 68, decay: 65, direction: -45, flashSize: 30 },
    },
    {
      name: 'Fireworks Burst',
      params: { sparkCount: 70, spreadAngle: 360, length: 88, brightness: 78, decay: 30, direction: -90, flashSize: 55 },
    },
  ],

  glare: [
    {
      name: 'Anamorphic Lens',
      params: { radius: 110, brightness: 75, softness: 55, color: '#a8d8ff', streakAmount: 4, anamorphic: 90 },
    },
    {
      name: 'Soft Bloom',
      params: { radius: 160, brightness: 60, softness: 85, color: '#ffe8c0', streakAmount: 0, anamorphic: 0 },
    },
    {
      name: 'Sun Flare',
      params: { radius: 200, brightness: 82, softness: 50, color: '#fff0b0', streakAmount: 8, anamorphic: 40 },
    },
    {
      name: 'Neon Glow',
      params: { radius: 90, brightness: 88, softness: 40, color: '#00ffaa', streakAmount: 6, anamorphic: 0 },
    },
  ],

  rays: [
    {
      name: 'Morning God Rays',
      params: { rayCount: 10, rayLength: 80, angle: 0, softness: 72, opacity: 65, atmosphere: 75 },
    },
    {
      name: 'Divine Light',
      params: { rayCount: 6, rayLength: 95, angle: 0, softness: 55, opacity: 85, atmosphere: 40 },
    },
    {
      name: 'Laser Fan',
      params: { rayCount: 18, rayLength: 85, angle: 0, softness: 15, opacity: 80, atmosphere: 5 },
    },
    {
      name: 'Halo Burst',
      params: { rayCount: 24, rayLength: 55, angle: 0, softness: 60, opacity: 60, atmosphere: 55 },
    },
  ],

  smoke: [
    {
      name: 'Heavy Fog',
      params: { density: 75, spread: 90, softness: 88, speed: 18, opacity: 82, turbulence: 20 },
    },
    {
      name: 'Thin Mist',
      params: { density: 22, spread: 100, softness: 95, speed: 25, opacity: 45, turbulence: 10 },
    },
    {
      name: 'Smoke Trail',
      params: { density: 40, spread: 30, softness: 70, speed: 55, opacity: 65, turbulence: 35 },
    },
    {
      name: 'Steam Vent',
      params: { density: 55, spread: 20, softness: 60, speed: 80, opacity: 55, turbulence: 55 },
    },
  ],

  embers: [
    {
      name: 'Campfire Embers',
      params: { intensity: 40, spread: 80, glow: 55, drift: 60, opacity: 78 },
    },
    {
      name: 'Wildfire Embers',
      params: { intensity: 85, spread: 250, glow: 80, drift: 85, opacity: 90 },
    },
  ],

  energyPulse: [
    {
      name: 'Energy Burst',
      params: { speed: 72, radius: 280, thickness: 10, color: '#00e5ff', intensity: 88 },
    },
    {
      name: 'Radar Pulse',
      params: { speed: 28, radius: 350, thickness: 3, color: '#00ff88', intensity: 55 },
    },
  ],

  explosionRing: [
    {
      name: 'Dust Impact',
      params: { force: 55, thickness: 12, color: '#c08040', rate: 40, shockwave: 70 },
    },
    {
      name: 'Shockwave',
      params: { force: 90, thickness: 6, color: '#ff8020', rate: 25, shockwave: 85 },
    },
  ],

  electricArc: [
    {
      name: 'Lightning',
      params: { intensity: 70, color: '#c0e0ff', reach: 220, branches: 5, flicker: 88 },
    },
    {
      name: 'Tesla Coil',
      params: { intensity: 90, color: '#ff80ff', reach: 160, branches: 8, flicker: 55 },
    },
  ],

  dustBurst: [
    {
      name: 'Dirt Impact',
      params: { volume: 55, spread: 65, size: 25, color: '#8a6030', rate: 40, opacity: 75 },
    },
    {
      name: 'Pollen Cloud',
      params: { volume: 35, spread: 90, size: 18, color: '#d4b840', rate: 55, opacity: 55 },
    },
  ],
};

// ── localStorage persistence ──────────────────────────────
const LS_KEY = 'firecracker-user-presets-v1';

export function getUserPresets() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveUserPreset(effectId, name, params) {
  const all = getUserPresets();
  if (!all[effectId]) all[effectId] = [];
  const idx = all[effectId].findIndex(p => p.name === name);
  const entry = { name, params: { ...params } };
  if (idx >= 0) all[effectId][idx] = entry;
  else all[effectId].push(entry);
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  return { ...all };
}

export function deleteUserPreset(effectId, name) {
  const all = getUserPresets();
  if (all[effectId]) all[effectId] = all[effectId].filter(p => p.name !== name);
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  return { ...all };
}
