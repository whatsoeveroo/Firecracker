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
      name: 'Breathing Glow',
      params: {
        lensStyle: 'breathingGlow',
        breathingMode: 'breathingGlow', breathingSpeed: 10, pulseStrength: 30, peakBrightness: 56, coreTightness: 42, bloomExpansion: 44,
        intensity: 74, size: 56, softness: 80, colorMode: 'naturalWarm', warmth: 62, saturation: 42, colorSpread: 18, fringeAmount: 14,
        haloAmount: 42, haloShape: 'round', burstAmount: 28, burstSize: 44, burstIntensity: 48, burstDensity: 48, burstShape: 'softStar', burstSoftness: 62, burstSharpness: 34,
        starburstAmount: 14, starburstShape: 'softDiffraction', patternComplexity: 46,
        glareDirection: 'radial', angleStrength: 24, layerCount: 2, sourceShape: 'round',
        sourceX: 50, sourceY: 50, sourceColor: '#ffe6aa', haloEdgeTint: '#9fe5ff', spikeTint: '#fff1bf', coatingColor: '#8fd8ff',
        frameFitMode: 'safe', globalScale: 76, safeMargin: 20,
        attack: 52, peakHold: 8, decay: 58, brightnessCurve: 42, bloomLag: 24, haloLag: 34, starburstLag: 12, microFlicker: 2,
        sourceSize: 42, coreClip: 78, innerBloom: 76, outerBloom: 70, haloRadius: 52, haloSoftness: 68,
        spikeLength: 52, spikeSharpness: 38, spikeGlow: 52, secondarySpikes: 18, bloomPassStrength: 76, blurRadius: 72, thresholdFeel: 52,
        opticalImperfection: 34, glassScatter: 22, dustAmount: 8, scratchAmount: 2, qualityScale: 84, imperfectionSeed: 311,
      },
    },
    {
      name: 'Hot Core Pulse',
      params: {
        lensStyle: 'hotCore',
        breathingMode: 'slowPulse', breathingSpeed: 34, pulseStrength: 84, peakBrightness: 96, coreTightness: 88, bloomExpansion: 82,
        intensity: 92, size: 48, softness: 58, colorMode: 'golden', warmth: 70, saturation: 54, colorSpread: 24, fringeAmount: 18,
        haloAmount: 34, haloShape: 'doubleHalo', burstAmount: 50, burstSize: 44, burstIntensity: 70, burstDensity: 52, burstShape: 'sixPoint', burstSoftness: 44, burstSharpness: 62,
        starburstAmount: 24, starburstShape: 'sixPoint', patternComplexity: 42,
        glareDirection: 'radial', angleStrength: 30, layerCount: 2, sourceShape: 'star',
        sourceX: 50, sourceY: 50, sourceColor: '#fff0b8', haloEdgeTint: '#94d9ff', spikeTint: '#ffe6a8', coatingColor: '#92d4ff',
        frameFitMode: 'safe', globalScale: 72, safeMargin: 18,
        sourceSize: 22, coreClip: 96, coreFalloff: 42, innerBloom: 86, outerBloom: 74, bloomPassStrength: 94, blurRadius: 62,
        haloRadius: 48, haloCount: 2, ringSeparation: 38, spikeLength: 72, spikeSharpness: 66,
        spectralSplit: 18, opticalImperfection: 28, glassScatter: 18, scratchAmount: 1, qualityScale: 88, imperfectionSeed: 1886,
      },
    },
    {
      name: 'Soft Halo',
      params: {
        lensStyle: 'softBloom',
        breathingMode: 'breathingGlow', breathingSpeed: 16, pulseStrength: 42, peakBrightness: 66, coreTightness: 32, bloomExpansion: 74,
        intensity: 62, size: 78, softness: 96, colorMode: 'neutralWhite', warmth: 56, saturation: 20, colorSpread: 10, fringeAmount: 8,
        haloAmount: 78, haloShape: 'round', burstAmount: 8, burstSize: 34, burstIntensity: 24, burstDensity: 22, burstShape: 'diffractionBloom', burstSoftness: 88, burstSharpness: 16,
        starburstAmount: 0, starburstShape: 'none', patternComplexity: 18,
        glareDirection: 'radial', angleStrength: 12, layerCount: 1, sourceShape: 'softBlob',
        sourceX: 50, sourceY: 50, sourceColor: '#ffe7be', haloEdgeTint: '#d8ebff', spikeTint: '#fff5df', coatingColor: '#b8ddff',
        frameFitMode: 'safe', globalScale: 68, safeMargin: 24,
        sourceSize: 58, innerBloom: 76, outerBloom: 94, haloRadius: 78, haloOpacity: 76, haloSoftness: 92,
        bloomPassStrength: 86, blurRadius: 94, blackLift: 34, opticalImperfection: 24, glassScatter: 14, scratchAmount: 0, qualityScale: 84, imperfectionSeed: 420,
      },
    },
    {
      name: 'Aperture Star',
      params: {
        lensStyle: 'apertureStar',
        breathingMode: 'breathingGlow', breathingSpeed: 22, pulseStrength: 58, peakBrightness: 86, coreTightness: 72, bloomExpansion: 54,
        intensity: 84, size: 50, softness: 62, colorMode: 'golden', warmth: 66, saturation: 48, colorSpread: 30, fringeAmount: 22,
        haloAmount: 64, haloShape: 'apertureRing', burstAmount: 76, burstSize: 66, burstIntensity: 76, burstDensity: 70, burstShape: 'eightPoint', burstSoftness: 36, burstSharpness: 68,
        starburstAmount: 42, starburstShape: 'eightPoint', patternComplexity: 72,
        glareDirection: 'cross', angleStrength: 58, layerCount: 3, sourceShape: 'star',
        sourceX: 50, sourceY: 50, sourceColor: '#fff2c6', haloEdgeTint: '#9fe6ff', spikeTint: '#ffe7a6', coatingColor: '#a5e2ff',
        frameFitMode: 'safe', globalScale: 72, safeMargin: 18,
        haloRadius: 58, haloThickness: 46, haloBreakup: 42, petalCount: 8,
        spikeLength: 78, spikeThickness: 24, spikeSharpness: 70, spikeTaper: 72, spikeGlow: 68, secondarySpikes: 32,
        spectralSplit: 24, haloFringing: 32, bloomPassStrength: 84, blurRadius: 58, opticalImperfection: 32, scratchAmount: 1, qualityScale: 88, imperfectionSeed: 806,
      },
    },
    {
      name: 'Anamorphic Cross',
      params: {
        lensStyle: 'anamorphicCross',
        breathingMode: 'slowPulse', breathingSpeed: 20, pulseStrength: 62, peakBrightness: 86, coreTightness: 66, bloomExpansion: 58,
        intensity: 82, size: 48, softness: 66, colorMode: 'coolBlue', warmth: 30, saturation: 58, colorSpread: 48, fringeAmount: 32,
        haloAmount: 42, haloShape: 'ellipse', burstAmount: 74, burstSize: 62, burstIntensity: 76, burstDensity: 44, burstShape: 'anamorphicCross', burstSoftness: 42, burstSharpness: 52,
        starburstAmount: 46, starburstShape: 'anamorphicCross', patternComplexity: 56,
        glareDirection: 'anamorphic', angleStrength: 96, layerCount: 5, sourceShape: 'anamorphicPoint',
        sourceX: 50, sourceY: 50, sourceColor: '#bcefff', haloEdgeTint: '#5deaff', spikeTint: '#aef8ff', coatingColor: '#55baff',
        frameFitMode: 'safe', globalScale: 72, safeMargin: 18,
        haloEllipticity: 64, haloRotation: 0, spikeLength: 88, spikeThickness: 20, spikeSharpness: 58, spikeGlow: 78,
        chromaticAberration: 34, spectralSplit: 52, bloomPassStrength: 82, blurRadius: 64, glassScatter: 16, scratchAmount: 1, qualityScale: 90, imperfectionSeed: 204,
      },
    },
    {
      name: 'Solar Corona',
      params: {
        lensStyle: 'solarHalo',
        breathingMode: 'breathingGlow', breathingSpeed: 18, pulseStrength: 64, peakBrightness: 80, coreTightness: 44, bloomExpansion: 82,
        intensity: 78, size: 70, softness: 86, colorMode: 'sunset', warmth: 84, saturation: 76, colorSpread: 72, fringeAmount: 38,
        haloAmount: 76, haloShape: 'corona', burstAmount: 36, burstSize: 66, burstIntensity: 44, burstDensity: 72, burstShape: 'flowerBurst', burstSoftness: 78, burstSharpness: 24,
        starburstAmount: 18, starburstShape: 'softDiffraction', patternComplexity: 78,
        glareDirection: 'diag45', angleStrength: 54, layerCount: 3, sourceShape: 'diffraction',
        sourceX: 50, sourceY: 50, sourceColor: '#ff955f', haloEdgeTint: '#79efbd', spikeTint: '#ffd174', coatingColor: '#8df2cf',
        frameFitMode: 'safe', globalScale: 64, safeMargin: 24,
        haloRadius: 68, coronaAmount: 82, petalCount: 14, haloBreakup: 64, spikeCount: 12, spikeLength: 54, spikeSharpness: 34,
        outerBloom: 92, bloomPassStrength: 92, blurRadius: 86, blackLift: 28, spectralSplit: 30, opticalImperfection: 56, glassScatter: 32, scratchAmount: 1, qualityScale: 86, imperfectionSeed: 1618,
      },
    },
    {
      name: 'Electric Blue Core',
      params: {
        lensStyle: 'electricCore',
        breathingMode: 'breathingGlow', breathingSpeed: 28, pulseStrength: 72, peakBrightness: 90, coreTightness: 78, bloomExpansion: 58,
        intensity: 86, size: 46, softness: 62, colorMode: 'electric', warmth: 18, saturation: 78, colorSpread: 72, fringeAmount: 64,
        haloAmount: 54, haloShape: 'doubleHalo', burstAmount: 58, burstSize: 48, burstIntensity: 72, burstDensity: 62, burstShape: 'diffractionBloom', burstSoftness: 44, burstSharpness: 48,
        starburstAmount: 28, starburstShape: 'softDiffraction', patternComplexity: 66,
        glareDirection: 'cross', angleStrength: 58, layerCount: 3, sourceShape: 'diffraction',
        sourceX: 50, sourceY: 50, sourceColor: '#88f6ff', haloEdgeTint: '#b06cff', spikeTint: '#a7ffff', coatingColor: '#5f8cff',
        frameFitMode: 'safe', globalScale: 74, safeMargin: 18,
        sourceSize: 28, coreClip: 92, innerBloom: 82, outerBloom: 58, haloCount: 2, haloFringing: 66,
        spectralSplit: 78, chromaticAberration: 46, spikeLength: 62, spikeSharpness: 48, spikeGlow: 66, bloomPassStrength: 84, blurRadius: 60, opticalImperfection: 42, qualityScale: 90, imperfectionSeed: 724,
      },
    },
    {
      name: 'Vintage Warm Bulb',
      params: {
        lensStyle: 'vintageBulb',
        breathingMode: 'flickeringBulb', breathingSpeed: 18, pulseStrength: 46, peakBrightness: 72, coreTightness: 38, bloomExpansion: 64,
        intensity: 72, size: 64, softness: 84, colorMode: 'vintageAmber', warmth: 92, saturation: 58, colorSpread: 36, fringeAmount: 14,
        haloAmount: 62, haloShape: 'apertureRing', burstAmount: 18, burstSize: 42, burstIntensity: 34, burstDensity: 28, burstShape: 'softStar', burstSoftness: 78, burstSharpness: 22,
        starburstAmount: 8, starburstShape: 'fourPoint', patternComplexity: 34,
        glareDirection: 'radial', angleStrength: 18, layerCount: 2, sourceShape: 'softBlob',
        sourceX: 50, sourceY: 50, sourceColor: '#ffbd6d', haloEdgeTint: '#ffc46f', spikeTint: '#ffd891', coatingColor: '#ffd09a',
        frameFitMode: 'safe', globalScale: 72, safeMargin: 22,
        sourceSize: 52, coreClip: 72, outerBloom: 86, haloRadius: 60, haloSoftness: 78,
        microFlicker: 34, opticalImperfection: 54, glassScatter: 42, dustAmount: 38, scratchAmount: 8, blackLift: 28, qualityScale: 84, imperfectionSeed: 1928,
      },
    },
    {
      name: 'Needle Star',
      params: {
        lensStyle: 'needleStar',
        breathingMode: 'slowPulse', breathingSpeed: 20, pulseStrength: 54, peakBrightness: 92, coreTightness: 92, bloomExpansion: 42,
        intensity: 90, size: 38, softness: 42, colorMode: 'neutralWhite', warmth: 66, saturation: 34, colorSpread: 24, fringeAmount: 18,
        haloAmount: 28, haloShape: 'apertureRing', burstAmount: 70, burstSize: 70, burstIntensity: 74, burstDensity: 48, burstShape: 'needleStar', burstSoftness: 24, burstSharpness: 82,
        starburstAmount: 32, starburstShape: 'needleStar', patternComplexity: 62,
        glareDirection: 'radial', angleStrength: 24, layerCount: 1, sourceShape: 'needle',
        sourceX: 50, sourceY: 50, sourceColor: '#fff6d0', haloEdgeTint: '#b7d8ff', spikeTint: '#fff2c0', coatingColor: '#abd4ff',
        frameFitMode: 'safe', globalScale: 78, safeMargin: 16,
        sourceSize: 16, coreClip: 98, innerBloom: 82, outerBloom: 36,
        haloRadius: 42, spikeLength: 100, spikeThickness: 10, spikeSharpness: 92, spikeTaper: 92, spikeBreakup: 34,
        secondarySpikes: 14, glintAmount: 32, bloomPassStrength: 76, blurRadius: 46, opticalImperfection: 22, scratchAmount: 1, qualityScale: 88, imperfectionSeed: 1208,
      },
    },
    {
      name: 'Static Photographic Bloom',
      params: {
        lensStyle: 'photographicBloom',
        breathingMode: 'static', breathingSpeed: 0, pulseStrength: 0, peakBrightness: 70, coreTightness: 54, bloomExpansion: 48,
        intensity: 76, size: 56, softness: 76, colorMode: 'neutralWhite', warmth: 58, saturation: 28, colorSpread: 18, fringeAmount: 14,
        haloAmount: 42, haloShape: 'round', burstAmount: 32, burstSize: 46, burstIntensity: 52, burstDensity: 42, burstShape: 'sixPoint', burstSoftness: 48, burstSharpness: 48,
        starburstAmount: 16, starburstShape: 'sixPoint', patternComplexity: 42,
        glareDirection: 'radial', angleStrength: 16, layerCount: 1, sourceShape: 'round',
        sourceX: 50, sourceY: 50, sourceColor: '#ffe8b8', haloEdgeTint: '#c7e5ff', spikeTint: '#fff4d7', coatingColor: '#9cd9ff',
        frameFitMode: 'safe', globalScale: 76, safeMargin: 18,
        sourceSize: 34, innerBloom: 76, outerBloom: 66, haloRadius: 52, spikeLength: 54, spikeSharpness: 54,
        chromaticAberration: 18, spectralSplit: 18, bloomPassStrength: 78, blurRadius: 62, qualityScale: 86, imperfectionSeed: 744,
      },
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
      // Gentle rising campfire smoke — wide, lazy, warm-toned
      name: 'Campfire',
      params: {
        amount: 55, scale: 68, length: 72, direction: 275, spread: 42,
        speed: 28, drift: 38, lift: 65, expansion: 52, dissipation: 35,
        turbulence: 48, breakup: 42, wisps: 38, detail: 32,
        opacity: 68, tone: 48, temperature: 62, backlight: 22, softness: 74,
      },
    },
    {
      // Narrow tall chimney column — straight up, low drift
      name: 'Chimney',
      params: {
        amount: 40, scale: 55, length: 88, direction: 272, spread: 16,
        speed: 38, drift: 12, lift: 88, expansion: 38, dissipation: 28,
        turbulence: 24, breakup: 32, wisps: 52, detail: 24,
        opacity: 62, tone: 36, temperature: 38, backlight: 10, softness: 76,
      },
    },
    {
      // Horizontal trailing smoke plume — fast, wind-blown, dissipating
      name: 'Smoke Trail',
      params: {
        amount: 38, scale: 58, length: 58, direction: 8, spread: 20,
        speed: 62, drift: 78, lift: 28, expansion: 55, dissipation: 72,
        turbulence: 62, breakup: 55, wisps: 65, detail: 40,
        opacity: 55, tone: 40, temperature: 30, backlight: 8, softness: 70,
      },
    },
    {
      // High-pressure steam — bright white, fast rising, billowy
      name: 'Steam Vent',
      params: {
        amount: 62, scale: 48, length: 70, direction: 270, spread: 22,
        speed: 82, drift: 8, lift: 92, expansion: 68, dissipation: 82,
        turbulence: 55, breakup: 22, wisps: 72, detail: 28,
        opacity: 52, tone: 82, temperature: 58, backlight: 30, softness: 80,
      },
    },
    {
      // Gun blast — fast burst, dark gunpowder, quick dissipation
      name: 'Muzzle Smoke',
      params: {
        amount: 72, scale: 52, length: 44, direction: 295, spread: 32,
        speed: 88, drift: 28, lift: 52, expansion: 72, dissipation: 92,
        turbulence: 58, breakup: 68, wisps: 44, detail: 45,
        opacity: 62, tone: 32, temperature: 28, backlight: 6, softness: 62,
      },
    },
    {
      // Dense rubber tire smoke — low, heavy, flat-spreading, cool gray
      name: 'Tire Smoke',
      params: {
        amount: 85, scale: 85, length: 50, direction: 358, spread: 58,
        speed: 45, drift: 55, lift: 18, expansion: 62, dissipation: 48,
        turbulence: 38, breakup: 35, wisps: 22, detail: 20,
        opacity: 80, tone: 28, temperature: 18, backlight: 5, softness: 68,
      },
    },
  ],

  mist: [
    {
      name: 'Morning Mist',
      params: {
        coverage: 58, height: 22,
        speed: 10, direction: 8,  turbulence: 8,
        density: 28, softness: 92, tone: 80, temperature: 22,
      },
    },
    {
      name: 'Ground Fog',
      params: {
        coverage: 88, height: 40,
        speed: 16, direction: 0,  turbulence: 14,
        density: 58, softness: 86, tone: 68, temperature: 32,
      },
    },
    {
      name: 'Creeping Fog',
      params: {
        coverage: 95, height: 28,
        speed: 7,  direction: 355, turbulence: 10,
        density: 82, softness: 90, tone: 56, temperature: 26,
      },
    },
    {
      name: 'Valley Haze',
      params: {
        coverage: 95, height: 58,
        speed: 22, direction: 12, turbulence: 20,
        density: 62, softness: 82, tone: 64, temperature: 68,
      },
    },
    {
      name: 'Sea Mist',
      params: {
        coverage: 80, height: 45,
        speed: 32, direction: 350, turbulence: 38,
        density: 45, softness: 88, tone: 74, temperature: 12,
      },
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
      // Fast hard-hitting sci-fi blast — single front, big flash, heavy distortion
      name: 'Sci-Fi Shockwave',
      params: {
        intensity: 92, rate: 30, waveCount: 1, chargeUp: 40, flash: 90,
        speed: 85, range: 95, thickness: 10, deceleration: 70, sharpness: 85, afterglow: 55,
        distortion: 45, breakup: 35, shimmer: 30, motes: 35, sparks: 80,
        color: '#3dc8ff', coreColor: '#eaffff', edgeHeat: 85, haze: 40,
        posX: 50, posY: 50, coreSize: 45,
      },
    },
    {
      // Slow dramatic build-up, long charge, triple release — reactor going critical
      name: 'Reactor Charge',
      params: {
        intensity: 88, rate: 14, waveCount: 3, chargeUp: 95, flash: 80,
        speed: 45, range: 85, thickness: 8, deceleration: 40, sharpness: 55, afterglow: 70,
        distortion: 25, breakup: 15, shimmer: 55, motes: 75, sparks: 55,
        color: '#22ccff', coreColor: '#d8fbff', edgeHeat: 60, haze: 55,
        posX: 50, posY: 50, coreSize: 55,
      },
    },
    {
      // Violent violet EMP — ragged, breaking apart, electric shimmer
      name: 'EMP Blast',
      params: {
        intensity: 95, rate: 22, waveCount: 2, chargeUp: 60, flash: 100,
        speed: 75, range: 100, thickness: 6, deceleration: 55, sharpness: 70, afterglow: 40,
        distortion: 70, breakup: 65, shimmer: 80, motes: 50, sparks: 70,
        color: '#9a5cff', coreColor: '#f2eaff', edgeHeat: 75, haze: 30,
        posX: 50, posY: 50, coreSize: 40,
      },
    },
    {
      // Clean thin sweep — no charge drama, steady cadence, instrument look
      name: 'Radar Sweep',
      params: {
        intensity: 60, rate: 55, waveCount: 1, chargeUp: 0, flash: 12,
        speed: 35, range: 100, thickness: 3, deceleration: 0, sharpness: 90, afterglow: 15,
        distortion: 0, breakup: 0, shimmer: 8, motes: 12, sparks: 0,
        color: '#00ff88', coreColor: '#ccffe8', edgeHeat: 30, haze: 12,
        posX: 50, posY: 50, coreSize: 25,
      },
    },
    {
      // Soft golden ripple — gentle, glowing trails, floating motes
      name: 'Mystic Ripple',
      params: {
        intensity: 75, rate: 26, waveCount: 2, chargeUp: 70, flash: 35,
        speed: 28, range: 75, thickness: 9, deceleration: 30, sharpness: 25, afterglow: 90,
        distortion: 35, breakup: 20, shimmer: 45, motes: 90, sparks: 25,
        color: '#ffc04d', coreColor: '#fff3d6', edgeHeat: 40, haze: 60,
        posX: 50, posY: 50, coreSize: 50,
      },
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
