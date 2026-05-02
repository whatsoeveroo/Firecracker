// Render quality presets — consumed by fire.js (and future effects) via renderOpts.quality
// Each effect can read these flags and scale its work accordingly.
export const QUALITY_LEVELS = {
  draft: {
    id:                'draft',
    label:             'Draft',
    spawnScale:        0.18,   // fraction of base spawn rate
    capScale:          0.18,   // fraction of base particle caps
    gradientStops:     2,      // gradient complexity per particle
    enableBloom:       false,
    enableDistortion:  false,
    enableSmoke:       false,
    enableEmbers:      false,
    enableSparks:      false,
    corePass:          false,
  },
  preview: {
    id:                'preview',
    label:             'Preview',
    spawnScale:        0.48,
    capScale:          0.48,
    gradientStops:     3,
    enableBloom:       true,
    enableDistortion:  false,
    enableSmoke:       true,
    enableEmbers:      true,
    enableSparks:      true,
    corePass:          false,
  },
  high: {
    id:                'high',
    label:             'High',
    spawnScale:        1.0,
    capScale:          1.0,
    gradientStops:     4,
    enableBloom:       true,
    enableDistortion:  true,
    enableSmoke:       true,
    enableEmbers:      true,
    enableSparks:      true,
    corePass:          true,
  },
  ultra: {
    id:                'ultra',
    label:             'Ultra',
    spawnScale:        1.55,
    capScale:          1.55,
    gradientStops:     4,
    enableBloom:       true,
    enableDistortion:  true,
    enableSmoke:       true,
    enableEmbers:      true,
    enableSparks:      true,
    corePass:          true,
  },
};

// Convenience: returns the quality config, defaulting to 'high' for unknown keys
export function getQuality(id) {
  return QUALITY_LEVELS[id] ?? QUALITY_LEVELS.high;
}
