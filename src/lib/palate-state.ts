/**
 * Palate Dynamic State Engine: Psychophysical Modeling & Extended Kalman Filter (EKF)
 *
 * Implements recursive preference tracking and biological normalization based on:
 * "A Computational and Psychophysical Model for Decentralized Longitudinal Tracking
 * of Human Beverage Preferences".
 *
 * Latent State Vector x_k in R^5:
 *   [0] x_crisp: Rich (-10) to Crisp (+10)
 *   [1] y_sweet: Savory (-10) to Sweet (+10)
 *   [2] theta_bitter: Acquired bitterness tolerance / affinity [0, 10]
 *   [3] theta_tannin: Structural astringency / tactile friction tolerance [0, 10]
 *   [4] theta_complexity: Cognitive chunking / volatile complexity appreciation [0, 10]
 */

import type { Drink } from './data';
import type { DynamicState, Phenotypes, PourContext, PerceivedIntensities } from './atproto/records';

export interface StateVector {
  crisp: number;      // x: -10 to 10
  sweet: number;      // y: -10 to 10
  bitter: number;     // theta_bitter: 0 to 10
  tannin: number;     // theta_tannin: 0 to 10
  complexity: number; // theta_complexity: 0 to 10
}

export type Matrix5x5 = number[][];

export interface PalateState {
  vector: StateVector;
  covariance: Matrix5x5;
  eventCount: number;
  lastUpdate: string;
}

export interface TastingObservation {
  hedonic: number;                    // 1-9 hedonic or derived from gLMS
  glmsValence?: number;               // -100 to +100
  perceivedIntensities?: PerceivedIntensities;
  cata?: string[];                    // Check-All-That-Apply descriptors
  context?: PourContext;
}

// Default initial covariance diagonal: high initial uncertainty
const INITIAL_VARIANCES = [25.0, 25.0, 16.0, 16.0, 16.0];

// Natural background drift / process noise Q per tasting interval
const PROCESS_NOISE = [0.02, 0.02, 0.01, 0.01, 0.01];

// Base measurement noise variances R
const BASE_MEASUREMENT_NOISE = 4.0;

/**
 * Creates an identity matrix of size n.
 */
export function eye(n: number): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    m.push(row);
  }
  return m;
}

/**
 * Creates a diagonal 5x5 matrix from an array.
 */
export function diag(d: number[]): Matrix5x5 {
  const m = eye(5);
  for (let i = 0; i < 5; i++) {
    m[i][i] = d[i];
  }
  return m;
}

/**
 * Extracts diagonal elements of a square matrix.
 */
export function getDiagonal(m: Matrix5x5): number[] {
  return [m[0][0], m[1][1], m[2][2], m[3][3], m[4][4]];
}

/**
 * Ensures symmetry and positive variances.
 */
export function regularizeCovariance(P: Matrix5x5): Matrix5x5 {
  const result: Matrix5x5 = [];
  for (let i = 0; i < 5; i++) {
    result[i] = [];
    for (let j = 0; j < 5; j++) {
      const sym = (P[i][j] + P[j][i]) / 2;
      result[i][j] = i === j ? Math.max(0.01, sym) : sym;
    }
  }
  return result;
}

/**
 * Initializes a new PalateState from initial quiz coordinates or defaults.
 */
export function createInitialPalateState(initial?: {
  x?: number;
  y?: number;
  dislikesBitter?: boolean;
  phenotypes?: Phenotypes;
}): PalateState {
  const crisp = Math.max(-10, Math.min(10, initial?.x ?? 0));
  const sweet = Math.max(-10, Math.min(10, initial?.y ?? 0));
  const bitter = initial?.dislikesBitter ? 2.0 : 5.0;
  const tannin = 5.0;
  const complexity = 4.0;

  return {
    vector: { crisp, sweet, bitter, tannin, complexity },
    covariance: diag(INITIAL_VARIANCES),
    eventCount: 0,
    lastUpdate: new Date().toISOString(),
  };
}

/**
 * Converts a DynamicState record from AT Protocol into an internal PalateState.
 */
export function fromDynamicRecord(rec: DynamicState): PalateState {
  const v = rec.latentVector;
  const vector: StateVector = {
    crisp: v[0] ?? 0,
    sweet: v[1] ?? 0,
    bitter: v[2] ?? 5,
    tannin: v[3] ?? 5,
    complexity: v[4] ?? 5,
  };
  const covDiag = rec.covarianceDiagonal ?? INITIAL_VARIANCES;
  return {
    vector,
    covariance: diag(covDiag),
    eventCount: rec.eventCount ?? 0,
    lastUpdate: rec.lastUpdate ?? new Date().toISOString(),
  };
}

/**
 * Converts an internal PalateState into an AT Protocol DynamicState record.
 */
export function toDynamicRecord(state: PalateState): DynamicState {
  return {
    latentVector: [
      Math.round(state.vector.crisp * 100) / 100,
      Math.round(state.vector.sweet * 100) / 100,
      Math.round(state.vector.bitter * 100) / 100,
      Math.round(state.vector.tannin * 100) / 100,
      Math.round(state.vector.complexity * 100) / 100,
    ],
    covarianceDiagonal: getDiagonal(state.covariance).map((v) => Math.round(v * 100) / 100),
    eventCount: state.eventCount,
    lastUpdate: state.lastUpdate,
  };
}

/**
 * Biological & Transitory Normalization:
 * Corrects raw hedonic scores for:
 * 1. Sensory-Specific Satiety (SSS) as volume increases.
 * 2. Circadian / fasting ghrelin amplification of sweet reward.
 */
export function normalizeObservation(
  obs: TastingObservation,
  drink: Drink
): { normalizedHedonic: number; measurementVariance: number } {
  let rawScore: number;
  if (typeof obs.glmsValence === 'number') {
    // Convert -100..100 to 1..9 scale
    rawScore = 5 + (obs.glmsValence / 100) * 4;
  } else {
    rawScore = obs.hedonic;
  }

  const volume = obs.context?.volumeConsumedMl ?? 150;
  const fasting = obs.context?.fastingDurationHours ?? 2.0;

  // 1. SSS volume decay normalization:
  // Sweetness satiates significantly faster than structural astringency.
  const lambda = drink.y > 0 ? 0.002 : 0.0008;
  const volumeDelta = volume - 150;
  const sssFactor = Math.exp(lambda * volumeDelta);
  let normalized = (rawScore - 5) * sssFactor + 5;

  // 2. Fasting / Prandial ghrelin normalization:
  // Fasting (>3 hours) elevates sweet reward; postprandial (<1 hr) blunts it.
  if (drink.y > 0) {
    if (fasting >= 3.5) {
      normalized = (normalized - 5) * 0.88 + 5; // Attenuate fasting boost
    } else if (fasting < 1.0) {
      normalized = (normalized - 5) * 1.12 + 5; // Reinvigorate postprandial drop
    }
  }

  // Calculate measurement noise R:
  // Providing CATA and gLMS perceived intensities increases observation fidelity (reduces R).
  let r = BASE_MEASUREMENT_NOISE;
  if (obs.cata && obs.cata.length > 0) r *= 0.8;
  if (obs.perceivedIntensities) r *= 0.8;
  if (typeof obs.glmsValence === 'number') r *= 0.85;

  return {
    normalizedHedonic: Math.max(1, Math.min(9, normalized)),
    measurementVariance: r,
  };
}

/**
 * Evaluates the non-linear measurement function h(x) predicting expected hedonic response (1-9).
 */
function predictHedonic(x: StateVector, drink: Drink): number {
  const dx = x.crisp - drink.x;
  const dy = x.sweet - drink.y;
  const euclideanDist = Math.sqrt(dx * dx + dy * dy);

  // Maximum distance on 20x20 plane is ~28.28
  const baseMatch = Math.max(0, 1 - euclideanDist / 28.28);

  // Bitterness penalty if drink is bitter and user has low tolerance
  let bitterPenalty = 0;
  if (drink.isBitter && x.bitter < 5) {
    bitterPenalty = ((5 - x.bitter) / 5) * 0.25;
  }

  // Astringency / Smoke penalty
  let tanninPenalty = 0;
  if (drink.hasSmoke && x.tannin < 4) {
    tanninPenalty = ((4 - x.tannin) / 4) * 0.2;
  }

  const affinity = Math.max(0, Math.min(1, baseMatch - bitterPenalty - tanninPenalty));
  // Map 0..1 affinity to 1..9 hedonic scale
  return 1 + 8 * affinity;
}

/**
 * Calculates numerical Jacobian H = dh/dx for state vector x.
 */
function calculateJacobian(x: StateVector, drink: Drink): number[] {
  const eps = 1e-4;
  const base = predictHedonic(x, drink);

  const dh_dcrisp = (predictHedonic({ ...x, crisp: x.crisp + eps }, drink) - base) / eps;
  const dh_dsweet = (predictHedonic({ ...x, sweet: x.sweet + eps }, drink) - base) / eps;
  const dh_dbitter = (predictHedonic({ ...x, bitter: x.bitter + eps }, drink) - base) / eps;
  const dh_dtannin = (predictHedonic({ ...x, tannin: x.tannin + eps }, drink) - base) / eps;
  const dh_dcomplexity = (predictHedonic({ ...x, complexity: x.complexity + eps }, drink) - base) / eps;

  return [dh_dcrisp, dh_dsweet, dh_dbitter, dh_dtannin, dh_dcomplexity];
}

/**
 * Vector/Matrix helper: matrix * vector (5x5 * 5x1 -> 5x1)
 */
function matVecMul(M: Matrix5x5, v: number[]): number[] {
  const res = new Array(5).fill(0);
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      res[i] += M[i][j] * v[j];
    }
  }
  return res;
}

/**
 * Matrix multiplication: 5x5 * 5x5 -> 5x5
 */
function matMul(A: Matrix5x5, B: Matrix5x5): Matrix5x5 {
  const C: Matrix5x5 = [];
  for (let i = 0; i < 5; i++) {
    C[i] = new Array(5).fill(0);
    for (let j = 0; j < 5; j++) {
      for (let k = 0; k < 5; k++) {
        C[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return C;
}

/**
 * Outer product: 5x1 * 1x5 -> 5x5
 */
function outerProduct(a: number[], b: number[]): Matrix5x5 {
  const M: Matrix5x5 = [];
  for (let i = 0; i < 5; i++) {
    M[i] = [];
    for (let j = 0; j < 5; j++) {
      M[i][j] = a[i] * b[j];
    }
  }
  return M;
}

/**
 * Extended Kalman Filter (EKF) Recursive Update
 *
 * Updates latent state estimate and error covariance following a tasting observation.
 */
export function updatePalateEKF(
  prior: PalateState,
  drink: Drink,
  observation: TastingObservation
): {
  nextState: PalateState;
  innovation: number;
  kalmanGain: number[];
} {
  // 1. Predict step: add background drift process noise
  const P_prior = regularizeCovariance(prior.covariance);
  for (let i = 0; i < 5; i++) {
    P_prior[i][i] += PROCESS_NOISE[i];
  }
  const x_prior = { ...prior.vector };

  // 2. Transitory normalization: obtain clean scalar observation z
  const { normalizedHedonic: z, measurementVariance: R } = normalizeObservation(observation, drink);

  // 3. Measurement prediction h(x) and Jacobian H
  const z_hat = predictHedonic(x_prior, drink);
  const innovation = z - z_hat;
  const H = calculateJacobian(x_prior, drink);

  // 4. Innovation covariance S = H * P * H^T + R (scalar for 1D hedonic measurement)
  const P_HT = matVecMul(P_prior, H); // 5x1
  let H_P_HT = 0;
  for (let i = 0; i < 5; i++) {
    H_P_HT += H[i] * P_HT[i];
  }
  const S = Math.max(0.1, H_P_HT + R);

  // 5. Kalman Gain K = P * H^T * S^(-1) (5x1)
  const K = P_HT.map((val) => val / S);

  // 6. Direct CATA volatile complexity update if user recognized specific notes
  if (observation.cata && observation.cata.length >= 3) {
    x_prior.complexity = Math.min(10, x_prior.complexity + 0.15);
  }

  // 7. State update: x_post = x_prior + K * innovation
  const crispPost = Math.max(-10, Math.min(10, x_prior.crisp + K[0] * innovation));
  const sweetPost = Math.max(-10, Math.min(10, x_prior.sweet + K[1] * innovation));
  const bitterPost = Math.max(0, Math.min(10, x_prior.bitter + K[2] * innovation));
  const tanninPost = Math.max(0, Math.min(10, x_prior.tannin + K[3] * innovation));
  const compPost = Math.max(0, Math.min(10, x_prior.complexity + K[4] * innovation));

  const x_post: StateVector = {
    crisp: crispPost,
    sweet: sweetPost,
    bitter: bitterPost,
    tannin: tanninPost,
    complexity: compPost,
  };

  // 8. Joseph-form covariance update:
  // P_post = (I - K*H) * P * (I - K*H)^T + K * R * K^T
  const I = eye(5);
  const KH = outerProduct(K, H);
  const I_minus_KH: Matrix5x5 = [];
  for (let i = 0; i < 5; i++) {
    I_minus_KH[i] = [];
    for (let j = 0; j < 5; j++) {
      I_minus_KH[i][j] = I[i][j] - KH[i][j];
    }
  }

  const P_inter = matMul(I_minus_KH, matMul(P_prior, transpose(I_minus_KH)));
  const KRKT = outerProduct(K, K);
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      P_inter[i][j] += KRKT[i][j] * R;
    }
  }

  const P_post = regularizeCovariance(P_inter);

  return {
    nextState: {
      vector: x_post,
      covariance: P_post,
      eventCount: prior.eventCount + 1,
      lastUpdate: new Date().toISOString(),
    },
    innovation,
    kalmanGain: K,
  };
}

// How far "what was off" nudges the dot, on (crisp, sweet). These are the
// fixed nudges the app used before the EKF; they stay because the pour form
// asks for them, and an answer that moves nothing reads as ignored.
const DEVIATION_NUDGES: Record<string, [number, number]> = {
  'too-sweet': [0, -1.2],
  'not-sweet-enough': [0, 1.2],
  'too-sour': [0.6, 0],
  'not-sour-enough': [-0.6, 0],
  'too-rich': [1.2, 0],
  'too-crisp': [-1.2, 0],
};

/** The furthest one pour may move the dot, in map units. */
export const MAX_POUR_STEP = 2;

/**
 * Applies one pour to the state.
 *
 * The EKF still owns the latent axes, the covariance and the event count. The
 * dot itself moves by a simpler rule, because the EKF's hedonic prediction is
 * near 9 for any drink close to you, which made a 7 for your own usual push
 * you away from it:
 *
 * - liked (7+) steps toward the drink, disliked (3 or less) steps away, and the
 *   middle of the scale does not move the dot;
 * - the step scales with the current positional uncertainty, so it shrinks as
 *   pours accumulate;
 * - "what was off" adds its fixed nudge;
 * - the whole move is capped at MAX_POUR_STEP.
 *
 * A drink that is not on the map has no position to learn from, so only the
 * nudges apply to it.
 */
export function applyPour(
  prior: PalateState,
  drink: Drink | undefined,
  observation: TastingObservation,
  deviations: readonly string[] = []
): PalateState {
  const next = drink
    ? updatePalateEKF(prior, drink, observation).nextState
    : { ...prior, vector: { ...prior.vector } };

  let dx = 0;
  let dy = 0;

  if (drink) {
    const tx = drink.x - prior.vector.crisp;
    const ty = drink.y - prior.vector.sweet;
    const dist = Math.hypot(tx, ty);
    const h = observation.hedonic;
    const pull = h >= 7 ? (h - 6) / 3 : h <= 3 ? -(4 - h) / 3 : 0;
    if (pull !== 0 && dist > 0.5) {
      const p = (prior.covariance[0][0] + prior.covariance[1][1]) / 2;
      const gain = 0.3 * (p / (p + BASE_MEASUREMENT_NOISE));
      dx += pull * gain * tx;
      dy += pull * gain * ty;
    }
  }

  for (const dev of deviations) {
    const nudge = DEVIATION_NUDGES[dev];
    if (nudge) {
      dx += nudge[0];
      dy += nudge[1];
    }
  }

  const step = Math.hypot(dx, dy);
  if (step > MAX_POUR_STEP) {
    dx *= MAX_POUR_STEP / step;
    dy *= MAX_POUR_STEP / step;
  }

  next.vector.crisp = Math.max(-10, Math.min(10, prior.vector.crisp + dx));
  next.vector.sweet = Math.max(-10, Math.min(10, prior.vector.sweet + dy));
  return next;
}

function transpose(M: Matrix5x5): Matrix5x5 {
  const T: Matrix5x5 = [];
  for (let i = 0; i < 5; i++) {
    T[i] = [];
    for (let j = 0; j < 5; j++) {
      T[i][j] = M[j][i];
    }
  }
  return T;
}

/**
 * Projects the 5D state vector onto the primary 2D user map coordinates.
 */
export function projectTo2D(state: PalateState): { x: number; y: number } {
  return {
    x: Math.round(state.vector.crisp * 10) / 10,
    y: Math.round(state.vector.sweet * 10) / 10,
  };
}

/**
 * Computes overall confidence percentage based on the trace of covariance matrix P.
 * Initial trace: 25 + 25 + 16 + 16 + 16 = 98.
 */
export function getPalateConfidence(state: PalateState): number {
  const diagP = getDiagonal(state.covariance);
  const trace = diagP.reduce((sum, v) => sum + v, 0);
  const maxTrace = 98.0;
  const progress = (1 - Math.min(maxTrace, trace) / maxTrace) * 100;
  return Math.round(Math.max(0, Math.min(100, progress)));
}
