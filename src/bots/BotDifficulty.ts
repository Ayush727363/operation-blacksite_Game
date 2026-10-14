export interface BotDifficultyProfile {
  level: number; // 1 to 10
  label: string;
  description: string;
  reactionTimeSeconds: number;
  reactionVarianceSeconds: number;
  fovDegrees: number;
  maxDetectionRange: number;
  targetAcquisitionSeconds: number;
  aimErrorDegrees: number;
  trackingSpeedRadPerSec: number;
  burstLengthShots: number;
  burstPauseSeconds: number;
  recoilCompensationFactor: number;
  coverSeekThresholdHealth: number;
  coverUsageProbability: number;
  flankProbability: number;
  searchDurationSeconds: number;
  squadShareRadius: number;
  headshotPreferenceRatio: number;
  objectiveCompetence: number;
}

const DIFFICULTY_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: '1 — Recruit', desc: 'Slow reactions, wide aim error, minimal cover usage or squad calls.' },
  2: { label: '2 — Cadet', desc: 'Basic patrol and engagement with generous reaction windows.' },
  3: { label: '3 — Trooper', desc: 'Moderate target tracking and short burst discipline.' },
  4: { label: '4 — Regular', desc: 'Balanced reaction times, basic cover seeking when wounded.' },
  5: { label: '5 — Hardened', desc: 'Standard tactical AI: checks angles, investigates gunfire, uses cover.' },
  6: { label: '6 — Veteran', desc: 'Controlled rifle bursts, active flank pathing, squad target sharing.' },
  7: { label: '7 — Specialist', desc: 'Crisp target acquisition, strong recoil control, coordinated pushes.' },
  8: { label: '8 — Commander', desc: 'Fast reactions, disciplined cover peeking, aggressive flank routes.' },
  9: { label: '9 — Operative', desc: 'High precision, upper-chest/head aim bias, tight squad coordination.' },
  10: { label: '10 — Blacksite Elite', desc: 'Peak human-bounded tactical competence, rapid reaction, lethal crossfire.' }
};

/**
 * Generates deterministic, human-bounded AI parameters for difficulty levels 1 through 10.
 * Never alters bot HP or grants omniscient vision through walls.
 */
export function getBotDifficultyProfile(level: number): BotDifficultyProfile {
  const clamped = Math.max(1, Math.min(10, Math.round(level || 5)));
  const t = (clamped - 1) / 9; // Normalized 0.0 (Level 1) to 1.0 (Level 10)
  const meta = DIFFICULTY_LABELS[clamped] || DIFFICULTY_LABELS[5];

  const lerp = (a: number, b: number) => Number((a + (b - a) * t).toFixed(4));

  return {
    level: clamped,
    label: meta.label,
    description: meta.desc,
    reactionTimeSeconds: lerp(0.68, 0.15),
    reactionVarianceSeconds: lerp(0.18, 0.03),
    fovDegrees: lerp(95, 148),
    maxDetectionRange: lerp(45, 95),
    targetAcquisitionSeconds: lerp(0.55, 0.12),
    aimErrorDegrees: lerp(5.8, 0.55),
    trackingSpeedRadPerSec: lerp(2.2, 9.5),
    burstLengthShots: Math.round(lerp(2, 6)),
    burstPauseSeconds: lerp(0.52, 0.14),
    recoilCompensationFactor: lerp(0.15, 0.9),
    coverSeekThresholdHealth: Math.round(lerp(25, 65)),
    coverUsageProbability: lerp(0.18, 0.92),
    flankProbability: lerp(0.1, 0.85),
    searchDurationSeconds: lerp(3.5, 11.0),
    squadShareRadius: lerp(12, 55),
    headshotPreferenceRatio: lerp(0.05, 0.65),
    objectiveCompetence: lerp(0.35, 0.98)
  };
}
