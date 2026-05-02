export const BUILT_IN_PRESETS = {
  fire: [
    {
      name: 'Candle',
      params: {
        intensity: 28, flameHeight: 42, flameWidth: 20, velocity: 22,
        turbulence: 12, flickerSpeed: 65, windDir: 0, windStrength: 0,
        emberAmount: 6, sparkAmount: 3, bloom: 35, heatDistortion: 8,
        colorTemp: 55, coreBrightness: 85, smokeAmount: 8, colorPreset: 'natural',
      },
    },
    {
      name: 'Torch',
      params: {
        intensity: 52, flameHeight: 95, flameWidth: 38, velocity: 58,
        turbulence: 28, flickerSpeed: 55, windDir: 0, windStrength: 18,
        emberAmount: 38, sparkAmount: 24, bloom: 55, heatDistortion: 18,
        colorTemp: 52, coreBrightness: 78, smokeAmount: 26, colorPreset: 'natural',
      },
    },
    {
      name: 'Campfire',
      params: {
        intensity: 62, flameHeight: 75, flameWidth: 115, velocity: 45,
        turbulence: 38, flickerSpeed: 45, windDir: 0, windStrength: 8,
        emberAmount: 70, sparkAmount: 50, bloom: 60, heatDistortion: 22,
        colorTemp: 52, coreBrightness: 72, smokeAmount: 40, colorPreset: 'natural',
      },
    },
    {
      name: 'Heavy Fire',
      params: {
        intensity: 90, flameHeight: 130, flameWidth: 160, velocity: 55,
        turbulence: 55, flickerSpeed: 50, windDir: 0, windStrength: 5,
        emberAmount: 74, sparkAmount: 60, bloom: 80, heatDistortion: 40,
        colorTemp: 48, coreBrightness: 88, smokeAmount: 60, colorPreset: 'natural',
      },
    },
    {
      name: 'Wildfire',
      params: {
        intensity: 85, flameHeight: 118, flameWidth: 255, velocity: 62,
        turbulence: 88, flickerSpeed: 72, windDir: 25, windStrength: 45,
        emberAmount: 92, sparkAmount: 82, bloom: 74, heatDistortion: 50,
        colorTemp: 45, coreBrightness: 70, smokeAmount: 68, colorPreset: 'wildfire',
      },
    },
    {
      name: 'Wind-Blown',
      params: {
        intensity: 65, flameHeight: 90, flameWidth: 95, velocity: 60,
        turbulence: 50, flickerSpeed: 60, windDir: 40, windStrength: 72,
        emberAmount: 60, sparkAmount: 44, bloom: 62, heatDistortion: 28,
        colorTemp: 50, coreBrightness: 75, smokeAmount: 32, colorPreset: 'natural',
      },
    },
    {
      name: 'Gas Flame',
      params: {
        intensity: 48, flameHeight: 68, flameWidth: 52, velocity: 72,
        turbulence: 15, flickerSpeed: 35, windDir: 0, windStrength: 0,
        emberAmount: 4, sparkAmount: 8, bloom: 42, heatDistortion: 15,
        colorTemp: 50, coreBrightness: 90, smokeAmount: 4, colorPreset: 'gas',
      },
    },
    {
      name: 'Jet Flame',
      params: {
        intensity: 78, flameHeight: 125, flameWidth: 45, velocity: 170,
        turbulence: 16, flickerSpeed: 28, windDir: 0, windStrength: 0,
        emberAmount: 25, sparkAmount: 58, bloom: 68, heatDistortion: 35,
        colorTemp: 56, coreBrightness: 92, smokeAmount: 7, colorPreset: 'jet',
      },
    },
    {
      name: 'Engine Exhaust',
      params: {
        intensity: 72, flameHeight: 108, flameWidth: 78, velocity: 145,
        turbulence: 24, flickerSpeed: 38, windDir: 0, windStrength: 0,
        emberAmount: 40, sparkAmount: 65, bloom: 58, heatDistortion: 30,
        colorTemp: 47, coreBrightness: 86, smokeAmount: 16, colorPreset: 'jet',
      },
    },
  ],

  sparks: [
    {
      name: 'Gun Muzzle Flash',
      params: {
        sparkCount: 28, spreadAngle: 15, direction: -90, length: 142,
        particleLife: 18, gravity: 16, airDrag: 18, chaos: 36,
        brightness: 100, flashSize: 88, gasPlume: 92, smokeAmount: 52,
        smokeDrift: 48, lensFlare: 42, spillGlow: 62, decay: 92,
        trailLength: 22, trailWidth: 18, fragmentWeight: 12, microAmount: 34,
        colorTemp: 58, directionalBurst: 98, deflection: 0, randomSeed: 1101,
      },
    },
    {
      name: 'Sci-fi Flash',
      params: {
        sparkCount: 58, spreadAngle: 72, direction: -90, length: 128,
        particleLife: 36, gravity: 6, airDrag: 26, chaos: 30,
        brightness: 96, flashSize: 58, gasPlume: 46, smokeAmount: 8,
        smokeDrift: 22, lensFlare: 78, spillGlow: 36, decay: 66,
        trailLength: 58, trailWidth: 14, fragmentWeight: 8, microAmount: 54,
        colorTemp: 12, directionalBurst: 88, deflection: 0, randomSeed: 2402,
      },
    },
    {
      name: 'Welding Sparks',
      params: {
        sparkCount: 86, spreadAngle: 68, direction: -35, length: 70,
        particleLife: 58, gravity: 92, airDrag: 54, chaos: 64,
        brightness: 88, flashSize: 24, gasPlume: 8, smokeAmount: 28,
        smokeDrift: 54, lensFlare: 8, spillGlow: 18, decay: 46,
        trailLength: 42, trailWidth: 30, fragmentWeight: 78, microAmount: 92,
        colorTemp: 74, directionalBurst: 58, deflection: 48, randomSeed: 3303,
      },
    },
    {
      name: 'Fireworks Burst',
      params: {
        sparkCount: 96, spreadAngle: 360, direction: -90, length: 112,
        particleLife: 86, gravity: 56, airDrag: 18, chaos: 74,
        brightness: 84, flashSize: 42, gasPlume: 14, smokeAmount: 18,
        smokeDrift: 36, lensFlare: 6, spillGlow: 18, decay: 20,
        trailLength: 92, trailWidth: 42, fragmentWeight: 58, microAmount: 38,
        colorTemp: 56, directionalBurst: 0, deflection: 0, randomSeed: 4404,
      },
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
