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
        sparkCount: 32, shotsPerSec: 1, burstsPerShot: 1,
        spreadAngle: 15, direction: -90, length: 142,
        particleLife: 18, gravity: 16, airDrag: 52, chaos: 48,
        brightness: 100, flashSize: 88, gasPlume: 92, smokeAmount: 52,
        smokeDrift: 48, lensFlare: 42, spillGlow: 62, decay: 92,
        trailLength: 18, trailWidth: 16, fragmentWeight: 12, microAmount: 58,
        sparkColor: '#ffb13b', mixColorEnabled: 'off', mixColor: '#3c8cff',
        gasColorEnabled: 'off', gasColor: '#ffb13b', smokeColorEnabled: 'off', smokeColor: '#8a6a52',
        directionalBurst: 98, deflection: 0, randomSeed: 1101,
      },
    },
    {
      name: 'Sci-fi Flash',
      params: {
        sparkCount: 58, shotsPerSec: 1, burstsPerShot: 2,
        spreadAngle: 72, direction: -90, length: 128,
        particleLife: 36, gravity: 6, airDrag: 22, chaos: 18,
        brightness: 96, flashSize: 58, gasPlume: 46, smokeAmount: 8,
        smokeDrift: 22, lensFlare: 78, spillGlow: 36, decay: 66,
        trailLength: 62, trailWidth: 12, fragmentWeight: 6, microAmount: 42,
        sparkColor: '#80c8ff', mixColorEnabled: 'on', mixColor: '#cc44ff',
        gasColorEnabled: 'on', gasColor: '#80c8ff', smokeColorEnabled: 'off', smokeColor: '#8a6a52',
        directionalBurst: 88, deflection: 0, randomSeed: 2402,
      },
    },
    {
      name: 'Welding Sparks',
      params: {
        sparkCount: 88, shotsPerSec: 8, burstsPerShot: 1,
        spreadAngle: 68, direction: -35, length: 72,
        particleLife: 62, gravity: 92, airDrag: 58, chaos: 70,
        brightness: 88, flashSize: 24, gasPlume: 8, smokeAmount: 28,
        smokeDrift: 54, lensFlare: 8, spillGlow: 18, decay: 44,
        trailLength: 38, trailWidth: 32, fragmentWeight: 82, microAmount: 94,
        sparkColor: '#ffe060', mixColorEnabled: 'on', mixColor: '#ff5500',
        gasColorEnabled: 'off', gasColor: '#ffb13b', smokeColorEnabled: 'off', smokeColor: '#8a6a52',
        directionalBurst: 58, deflection: 52, randomSeed: 3303,
      },
    },
    {
      name: 'Fireworks Burst',
      params: {
        sparkCount: 96, shotsPerSec: 1, burstsPerShot: 1,
        spreadAngle: 360, direction: -90, length: 112,
        particleLife: 88, gravity: 56, airDrag: 14, chaos: 52,
        brightness: 84, flashSize: 42, gasPlume: 14, smokeAmount: 18,
        smokeDrift: 36, lensFlare: 6, spillGlow: 18, decay: 18,
        trailLength: 94, trailWidth: 40, fragmentWeight: 58, microAmount: 34,
        sparkColor: '#ffee44', mixColorEnabled: 'on', mixColor: '#ff4488',
        gasColorEnabled: 'off', gasColor: '#ffb13b', smokeColorEnabled: 'off', smokeColor: '#8a6a52',
        directionalBurst: 0, deflection: 0, randomSeed: 4404,
      },
    },
    {
      name: 'Metal Screech',
      params: {
        sparkCount: 72, shotsPerSec: 12, burstsPerShot: 1,
        spreadAngle: 24, direction: 8, length: 95,
        particleLife: 42, gravity: 88, airDrag: 62, chaos: 58,
        brightness: 84, flashSize: 6, gasPlume: 0, smokeAmount: 16,
        smokeDrift: 28, lensFlare: 4, spillGlow: 10, decay: 64,
        trailLength: 30, trailWidth: 28, fragmentWeight: 88, microAmount: 88,
        sparkColor: '#ffaa20', mixColorEnabled: 'on', mixColor: '#ff4400',
        gasColorEnabled: 'off', gasColor: '#ffb13b', smokeColorEnabled: 'off', smokeColor: '#8a6a52',
        directionalBurst: 82, deflection: 44, randomSeed: 5505,
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
      name: 'Divine Light',
      params: { sourceX: 56, sourceY: 0, direction: 92, spreadAngle: 66, beamLength: 114, beamWidth: 84, sourceGlow: 100, rayCount: 15, intensity: 94, softness: 92, density: 76, falloff: 90, atmosphericHaze: 90, edgeFeather: 98, noiseAmount: 56, noiseScale: 36, occlusionGaps: 34, dustAmount: 46, driftSpeed: 18, atmosphereMode: 'misty', rayColor: '#fff0c8', hazeColor: '#c09040', glowColor: '#ffffff', colorBlend: 68, streakSoftness: 60, motionAmount: 38, flickerAmount: 3, drift: 24, breathing: 32, turbulenceSpeed: 14 },
    },
    {
      name: 'Window Sunbeam',
      params: { sourceX: 92, sourceY: 6, direction: 150, spreadAngle: 24, beamLength: 104, beamWidth: 42, sourceGlow: 82, rayCount: 9, intensity: 90, softness: 66, density: 88, falloff: 66, atmosphericHaze: 80, edgeFeather: 78, noiseAmount: 82, noiseScale: 62, occlusionGaps: 86, dustAmount: 96, driftSpeed: 38, atmosphereMode: 'dusty', rayColor: '#ffb840', hazeColor: '#a06820', glowColor: '#fff0c8', colorBlend: 60, streakSoftness: 30, motionAmount: 54, flickerAmount: 7, drift: 46, breathing: 12, turbulenceSpeed: 22 },
    },
    {
      name: 'Forest Morning',
      params: { sourceX: 66, sourceY: 0, direction: 108, spreadAngle: 86, beamLength: 106, beamWidth: 78, sourceGlow: 60, rayCount: 20, intensity: 72, softness: 88, density: 88, falloff: 70, atmosphericHaze: 86, edgeFeather: 94, noiseAmount: 98, noiseScale: 70, occlusionGaps: 98, dustAmount: 56, driftSpeed: 32, atmosphereMode: 'misty', rayColor: '#c8e060', hazeColor: '#60a030', glowColor: '#eeffc0', colorBlend: 78, streakSoftness: 58, motionAmount: 50, flickerAmount: 6, drift: 44, breathing: 26, turbulenceSpeed: 24 },
    },
    {
      name: 'Stage Spotlight',
      params: { sourceX: 14, sourceY: 2, direction: 56, spreadAngle: 18, beamLength: 116, beamWidth: 30, sourceGlow: 88, rayCount: 6, intensity: 94, softness: 62, density: 80, falloff: 60, atmosphericHaze: 88, edgeFeather: 70, noiseAmount: 62, noiseScale: 38, occlusionGaps: 42, dustAmount: 72, driftSpeed: 22, atmosphereMode: 'smoky', rayColor: '#c8e0ff', hazeColor: '#7090b0', glowColor: '#ffffff', colorBlend: 36, streakSoftness: 22, motionAmount: 30, flickerAmount: 18, drift: 14, breathing: 8, turbulenceSpeed: 26 },
    },
    {
      name: 'Underwater Shaft',
      params: { sourceX: 46, sourceY: 0, direction: 90, spreadAngle: 56, beamLength: 120, beamWidth: 92, sourceGlow: 48, rayCount: 15, intensity: 58, softness: 98, density: 98, falloff: 48, atmosphericHaze: 98, edgeFeather: 98, noiseAmount: 86, noiseScale: 84, occlusionGaps: 48, dustAmount: 94, driftSpeed: 64, atmosphereMode: 'underwater', rayColor: '#30c0f0', hazeColor: '#0870b8', glowColor: '#b0f0ff', colorBlend: 86, streakSoftness: 84, motionAmount: 82, flickerAmount: 2, drift: 70, breathing: 50, turbulenceSpeed: 58 },
    },
    {
      name: 'Smoky Room',
      params: { sourceX: 88, sourceY: 20, direction: 157, spreadAngle: 50, beamLength: 92, beamWidth: 96, sourceGlow: 44, rayCount: 12, intensity: 50, softness: 98, density: 98, falloff: 76, atmosphericHaze: 98, edgeFeather: 98, noiseAmount: 94, noiseScale: 42, occlusionGaps: 74, dustAmount: 94, driftSpeed: 26, atmosphereMode: 'smoky', rayColor: '#c8b890', hazeColor: '#706048', glowColor: '#ffe8b0', colorBlend: 82, streakSoftness: 74, motionAmount: 42, flickerAmount: 3, drift: 34, breathing: 16, turbulenceSpeed: 18 },
    },
    {
      name: 'Cloud Break',
      params: { sourceX: 54, sourceY: 0, direction: 92, spreadAngle: 84, beamLength: 118, beamWidth: 88, sourceGlow: 98, rayCount: 18, intensity: 86, softness: 94, density: 80, falloff: 92, atmosphericHaze: 92, edgeFeather: 98, noiseAmount: 90, noiseScale: 28, occlusionGaps: 90, dustAmount: 28, driftSpeed: 22, atmosphereMode: 'misty', rayColor: '#ffe8b8', hazeColor: '#c09848', glowColor: '#ffffff', colorBlend: 60, streakSoftness: 50, motionAmount: 34, flickerAmount: 4, drift: 28, breathing: 34, turbulenceSpeed: 16 },
    },
    {
      name: 'Horror Flashlight',
      params: { sourceX: 2, sourceY: 56, direction: 346, spreadAngle: 15, beamLength: 98, beamWidth: 24, sourceGlow: 32, rayCount: 5, intensity: 82, softness: 48, density: 76, falloff: 54, atmosphericHaze: 78, edgeFeather: 54, noiseAmount: 98, noiseScale: 80, occlusionGaps: 92, dustAmount: 86, driftSpeed: 28, atmosphereMode: 'foggy', rayColor: '#a8b8cc', hazeColor: '#4c6070', glowColor: '#c0d0e0', colorBlend: 42, streakSoftness: 28, motionAmount: 50, flickerAmount: 34, drift: 18, breathing: 5, turbulenceSpeed: 44 },
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
