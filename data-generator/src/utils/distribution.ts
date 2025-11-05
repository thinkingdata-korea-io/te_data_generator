/**
 * 통계 분포 유틸리티
 */

/**
 * 정규 분포 (Box-Muller transform)
 */
export function normalDistribution(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * 포아송 분포 근사
 */
export function poissonDistribution(lambda: number): number {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}

/**
 * 지수 분포 (이벤트 간 시간 간격에 유용)
 */
export function exponentialDistribution(rate: number): number {
  return -Math.log(1 - Math.random()) / rate;
}

/**
 * 로그 정규 분포 (가격, 수익 등에 유용)
 */
export function logNormalDistribution(mean: number, stdDev: number): number {
  const normal = normalDistribution(mean, stdDev);
  return Math.exp(normal);
}

/**
 * 베타 분포 근사 (전환율 등에 유용)
 */
export function betaDistribution(alpha: number, beta: number): number {
  // 간단한 근사
  const x = gammaDistribution(alpha, 1);
  const y = gammaDistribution(beta, 1);
  return x / (x + y);
}

/**
 * 감마 분포 (베타 분포 계산용)
 */
function gammaDistribution(shape: number, scale: number): number {
  // Marsaglia and Tsang method
  if (shape < 1) {
    return gammaDistribution(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number;
    let v: number;

    do {
      x = normalDistribution(0, 1);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * x * x * x * x) {
      return d * v * scale;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
}

/**
 * 파레토 분포 (80-20 법칙)
 */
export function paretoDistribution(scale: number, shape: number): number {
  return scale / Math.pow(Math.random(), 1 / shape);
}
