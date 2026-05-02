/* eslint-disable react-refresh/only-export-components */
/* Custom icon set — bold geometric angular style */

const Ico = ({ size = 16, children, viewBox = "0 0 16 16", style, className }) => (
  <svg
    width={size} height={size}
    viewBox={viewBox}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', flexShrink: 0, ...style }}
    className={className}
  >
    {children}
  </svg>
);

/* ─── Effect Icons ──────────────────────────────────────────────────── */

/* Fire: 3-pronged angular flame — tall center spike, two angled wings */
export const IconFire = (p) => (
  <Ico {...p}>
    <path d="M8 0L10.5 5.5L14.5 3.5L12 9L15.5 8L10.5 14L8 16L5.5 14L0.5 8L4 9L1.5 3.5L5.5 5.5Z"/>
  </Ico>
);

/* Sparks: directional comet burst — angled mass of sparks firing upward-right */
export const IconSparks = (p) => (
  <Ico {...p}>
    <path d="M11 0L16 5L13 6L16 8L12 8.5L14.5 12L10.5 10L10 16L8 11L5.5 14L6 10L2 12L4.5 8L0 8L3.5 5.5L1 2L5 5L6 0L8 5Z"/>
  </Ico>
);

/* Glare / Bloom: 4-point elongated star — clean lens flare cross */
export const IconGlare = (p) => (
  <Ico {...p}>
    <path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5Z"/>
  </Ico>
);

/* Rays / God Rays: 8-point sun with fat triangular rays */
export const IconRays = (p) => (
  <Ico {...p}>
    <path d="M8 1L9.5 4.5L13 3L11.5 6.5L15 8L11.5 9.5L13 13L9.5 11.5L8 15L6.5 11.5L3 13L4.5 9.5L1 8L4.5 6.5L3 3L6.5 4.5Z"/>
  </Ico>
);

/* Smoke / Mist: rising asymmetric column — zigzag profile wisp */
export const IconSmoke = (p) => (
  <Ico {...p}>
    <path d="M5 16L4 13L2 10.5L4.5 8L3 5.5L5.5 3.5L7 1.5L9 1.5L11 3.5L9.5 6L12 8.5L10 11L11.5 13L11 16Z"/>
  </Ico>
);

/* Embers: 5 scattered angular diamond sparks */
export const IconEmbers = (p) => (
  <Ico {...p}>
    <path d="M4 0L5.5 2.5L4 5L2.5 2.5ZM12 0.5L13.5 3L12 5.5L10.5 3ZM14 8L15.5 10.5L14 13L12.5 10.5ZM1.5 10L3 12.5L1.5 15L0 12.5ZM8 9L9.5 11.5L8 14L6.5 11.5Z"/>
  </Ico>
);

/* Energy Pulse: hexagonal ring — outer hex minus inner hex via evenodd */
export const IconEnergyPulse = (p) => (
  <Ico {...p}>
    <path
      fillRule="evenodd"
      d="M8 0.5L14.2 4L14.2 12L8 15.5L1.8 12L1.8 4ZM8 4.5L11.4 6.5L11.4 10.5L8 12.5L4.6 10.5L4.6 6.5Z"
    />
  </Ico>
);

/* Explosion Ring: 8-pointed starburst with wide base — ring-blast silhouette */
export const IconExplosionRing = (p) => (
  <Ico {...p}>
    <path d="M8 0L9.8 4.5L13.7 1.5L12 6L16.5 5.5L13 8.5L16.5 11L12 10.5L13.7 15L9.8 12.5L8 17L6.2 12.5L2.3 15L4 10.5L-0.5 11L3 8.5L-0.5 5.5L4 6L2.3 1.5L6.2 4.5Z" transform="translate(0,-0.5)"/>
  </Ico>
);

/* Electric Arc: sharp angular zigzag lightning bolt */
export const IconElectricArc = (p) => (
  <Ico {...p}>
    <path d="M10.5 0.5L4 9H8.5L5 15.5L14.5 6.5H10L10.5 0.5Z"/>
  </Ico>
);

/* Dust Burst: 6 fat chunky rays — wide asterisk explosion */
export const IconDustBurst = (p) => (
  <Ico {...p}>
    <path d="M8 0L10 5.5L14.5 1.5L12 6.5L16 8L12 9.5L14.5 14.5L10 10.5L8 16L6 10.5L1.5 14.5L4 9.5L0 8L4 6.5L1.5 1.5L6 5.5Z"/>
  </Ico>
);

/* Map for effect selector lookup */
export const EFFECT_ICONS = {
  fire:          IconFire,
  sparks:        IconSparks,
  glare:         IconGlare,
  rays:          IconRays,
  smoke:         IconSmoke,
  embers:        IconEmbers,
  energyPulse:   IconEnergyPulse,
  explosionRing: IconExplosionRing,
  electricArc:   IconElectricArc,
  dustBurst:     IconDustBurst,
};

/* ─── Logo Mark ─────────────────────────────────────────────────────── */

/*
  V1 "Spark Crown" — CHOSEN
  Three upward tines (crown/flame) + single sharp downward ignition spike.
  10-vertex polygon. Reads immediately as fire+ignition at any size.
  Path: center tine (10,0) flanked by two outer tines (1.5,5) and (18.5,5),
  connected by valleys, body narrows to ignition spike at (10,20).

  V2 "Radiant Shard" (not used):
  M10,0.5 L11.5,6.3 L16.7,3.3 L13.7,8.5 L19.5,10 L13.7,11.5 L16.7,16.7
  L11.5,13.7 L10,19.5 L8.5,13.7 L3.3,16.7 L6.3,11.5 L0.5,10 L6.3,8.5
  L3.3,3.3 L8.5,6.3Z  — clean 8-pt starburst, too generic as a logo mark.

  V3 "Ignition Core" (not used):
  fillRule="evenodd"
  M10,0.5 L12.5,5.7 L18.2,5.2 L15,10 L18.2,14.8 L12.5,14.3 L10,19.5
  L7.5,14.3 L1.8,14.8 L5,10 L1.8,5.2 L7.5,5.7Z M10,7 L13,10 L10,13 L7,10Z
  — 6-pt star with diamond eye cutout, reads more as badge/gem than ignition.
*/
export const IconLogoMark = ({ size = 20, style, className }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', flexShrink: 0, ...style }}
    className={className}
  >
    <path d="M10,0 L14,8.5 L18.5,5 L15,13 L11.5,13.5 L10,20 L8.5,13.5 L5,13 L1.5,5 L6,8.5Z"/>
  </svg>
);

/* ─── Playback Icons ─────────────────────────────────────────────────── */

export const IconPlay = (p) => (
  <Ico {...p}>
    <path d="M4 1L14 8L4 15Z"/>
  </Ico>
);

export const IconPause = (p) => (
  <Ico {...p}>
    <path d="M3 1H7V15H3ZM9 1H13V15H9Z"/>
  </Ico>
);

export const IconRestart = (p) => (
  <Ico {...p}>
    <path d="M8 1.5C5 1.5 2.5 4 2.5 7C2.5 10 5 12.5 8 12.5C10.2 12.5 12 11.3 13 9.5H15.2C14 12.5 11.2 14.5 8 14.5C3.9 14.5 0.5 11.1 0.5 7C0.5 2.9 3.9 -0.5 8 -0.5C10.4 -0.5 12.5 0.6 14 2.2V0H16V6H10V4H12.8C11.7 2.5 10 1.5 8 1.5Z"/>
  </Ico>
);

export const IconLoop = (p) => (
  <Ico {...p}>
    <path d="M12 2L15.5 5H13C12.5 3.8 11 3 9.5 3C7.5 3 5.8 4.3 5.2 6H3.1C3.8 3.2 6.4 1 9.5 1C10.5 1 11.4 1.2 12.2 1.6ZM4 11H6.5L3 14L3 14L-0.5 11H2C2.5 12.2 4 13 5.5 13C7.5 13 9.2 11.7 9.8 10H11.9C11.2 12.8 8.6 15 5.5 15C4.5 15 3.6 14.8 2.8 14.4L4 11Z"/>
  </Ico>
);

/* ─── Action Button Icons ────────────────────────────────────────────── */

/* Randomize: 4-way shuffle arrows */
export const IconRandomize = (p) => (
  <Ico {...p}>
    <path d="M10.5 1H15V5.5H13V3.5L10 6.5L9 5.5L12 2.5H10.5V1ZM6.5 9.5L3.5 12.5V10.5H1V9H5.5V7.5H7V9.5H6.5ZM10 9.5L13 12.5H10.5V14H15V9H13V11L10 8ZM7 6.5L5.5 5L3.5 3H5V1H1V5.5H2.5V3.5L4.5 5.5L6 7L7 6.5Z"/>
  </Ico>
);

/* Reset: counter-clockwise arc arrow */
export const IconReset = (p) => (
  <Ico {...p}>
    <path d="M8 2.5C5.2 2.5 3 4.7 3 7.5C3 10.3 5.2 12.5 8 12.5C10.5 12.5 12.5 10.8 12.9 8.5H14.9C14.4 11.9 11.5 14.5 8 14.5C4.1 14.5 1 11.4 1 7.5C1 3.6 4.1 0.5 8 0.5C10.1 0.5 12 1.4 13.3 2.9L11.7 4.1C10.8 3.1 9.5 2.5 8 2.5ZM8 3.5L10.5 6H8.5V8H6.5V5.5L5 7L3.5 5.5L8 3.5Z"/>
  </Ico>
);

/* Export / Download: downward arrow into tray */
export const IconExport = (p) => (
  <Ico {...p}>
    <path d="M8.5 0.5H7.5V9.5L4.5 6.5L3.5 7.5L8 12L12.5 7.5L11.5 6.5L8.5 9.5V0.5ZM1 12V14.5H15V12H13V13H3V12H1Z"/>
  </Ico>
);
