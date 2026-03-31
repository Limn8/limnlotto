import rawLottoData from "@/data/lotto-data.json";

export type LottoDivision = {
  rank: number;
  prize: number;
  winners: number;
};

export type WinnersCombination = {
  auto: number;
  semiAuto: number;
  manual: number;
};

export type LottoDraw = {
  drawNo: number;
  date: string;
  numbers: number[];
  bonusNo: number;
  totalSalesAmount: number;
  divisions: LottoDivision[];
  winnersCombination: WinnersCombination;
  source: string;
};

export type LottoDataset = {
  generatedAt: string;
  latestDrawNo: number;
  draws: LottoDraw[];
};

export type NumberSortKey =
  | "number"
  | "totalAppearances"
  | "mainAppearances"
  | "bonusAppearances"
  | "recent10"
  | "recent30"
  | "recent50"
  | "lastSeenDraw"
  | "firstSeenDraw"
  | "currentMissStreak"
  | "maxMissStreak"
  | "currentHitStreak"
  | "maxHitStreak"
  | "averageGap"
  | "gapStdDev"
  | "momentumScore"
  | "stabilityScore"
  | "bonusBias";

export type NumberStat = {
  number: number;
  totalAppearances: number;
  mainAppearances: number;
  bonusAppearances: number;
  recent10: number;
  recent30: number;
  recent50: number;
  lastSeenDraw: number | null;
  firstSeenDraw: number | null;
  currentMissStreak: number;
  maxMissStreak: number;
  currentHitStreak: number;
  maxHitStreak: number;
  averageGap: number;
  gapStdDev: number;
  momentumScore: number;
  stabilityScore: number;
  bonusBias: number;
  section: string;
  parity: "odd" | "even";
  currentTrendLabel: string;
};

export type DrawShape = {
  sum: number;
  oddCount: number;
  evenCount: number;
  lowCount: number;
  highCount: number;
  consecutivePairs: [number, number][];
  endDigitSpread: number;
  rangeWidth: number;
};

export type NumberConnection = {
  source: number;
  target: number;
  count: number;
  normalizedWeight: number;
};

export type NumberNeighborhood = {
  number: number;
  totalConnectionCount: number;
  strongestLinks: NumberConnection[];
};

export const sortOptions: Array<{
  key: NumberSortKey;
  label: string;
  description: string;
}> = [
  {
    key: "totalAppearances",
    label: "총 출현 횟수",
    description: "메인 번호와 보너스를 합친 등장 횟수",
  },
  {
    key: "mainAppearances",
    label: "메인 번호 횟수",
    description: "보너스를 제외한 본번호 출현 횟수",
  },
  {
    key: "bonusAppearances",
    label: "보너스 횟수",
    description: "보너스 번호로 등장한 횟수",
  },
  { key: "recent10", label: "최근 10회", description: "최근 10회 출현 횟수" },
  { key: "recent30", label: "최근 30회", description: "최근 30회 출현 횟수" },
  { key: "recent50", label: "최근 50회", description: "최근 50회 출현 횟수" },
  {
    key: "currentMissStreak",
    label: "현재 미출현 연속",
    description: "지금까지 안 나온 연속 회차 수",
  },
  {
    key: "maxMissStreak",
    label: "최대 미출현 연속",
    description: "가장 오래 쉬었던 기록",
  },
  {
    key: "currentHitStreak",
    label: "현재 연속 출현",
    description: "최근 연속으로 등장한 회차 수",
  },
  {
    key: "maxHitStreak",
    label: "최대 연속 출현",
    description: "가장 길게 연속 등장한 기록",
  },
  {
    key: "lastSeenDraw",
    label: "최근 출현 회차",
    description: "가장 최근에 등장한 회차 기준",
  },
  {
    key: "firstSeenDraw",
    label: "최초 출현 회차",
    description: "처음 등장한 회차 기준",
  },
  {
    key: "averageGap",
    label: "평균 등장 간격",
    description: "다시 나올 때까지 걸리는 평균 회차 수",
  },
  {
    key: "gapStdDev",
    label: "간격 변동성",
    description: "등장 간격이 얼마나 들쭉날쭉한지",
  },
  {
    key: "momentumScore",
    label: "추세 점수",
    description: "최근 빈도가 장기 평균보다 얼마나 강한지",
  },
  {
    key: "stabilityScore",
    label: "안정성 점수",
    description: "간격 변화가 비교적 고른 번호",
  },
  {
    key: "bonusBias",
    label: "보너스 편향",
    description: "등장 중 보너스 비중이 큰 번호",
  },
];

const dataset = rawLottoData as LottoDataset;

export function getLottoDataset() {
  return dataset;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getSectionLabel(number: number) {
  if (number <= 10) return "1-10";
  if (number <= 20) return "11-20";
  if (number <= 30) return "21-30";
  if (number <= 40) return "31-40";
  return "41-45";
}

function getTrendLabel(momentumScore: number, currentMissStreak: number) {
  if (momentumScore >= 0.22) return "상승";
  if (currentMissStreak >= 18) return "장기 미출현";
  if (momentumScore <= -0.15) return "하락";
  return "보합";
}

export function buildNumberStats(draws: LottoDraw[]) {
  const totalDraws = draws.length;

  return Array.from({ length: 45 }, (_, index) => {
    const number = index + 1;
    const hitHistory = draws.map((draw) =>
      draw.numbers.includes(number) || draw.bonusNo === number ? 1 : 0,
    );
    const mainHitHistory = draws.map((draw) =>
      draw.numbers.includes(number) ? 1 : 0,
    );
    const hitIndexes = hitHistory.flatMap((hit, hitIndex) =>
      hit ? [hitIndex] : [],
    );

    const totalAppearances = hitHistory.reduce<number>((sum, hit) => sum + hit, 0);
    const mainAppearances = mainHitHistory.reduce<number>(
      (sum, hit) => sum + hit,
      0,
    );
    const bonusAppearances = totalAppearances - mainAppearances;
    const recent10 = hitHistory
      .slice(-10)
      .reduce<number>((sum, hit) => sum + hit, 0);
    const recent30 = hitHistory
      .slice(-30)
      .reduce<number>((sum, hit) => sum + hit, 0);
    const recent50 = hitHistory
      .slice(-50)
      .reduce<number>((sum, hit) => sum + hit, 0);
    const firstSeenIndex = hitIndexes[0];
    const lastSeenIndex = hitIndexes.at(-1);
    const firstSeenDraw =
      firstSeenIndex === undefined ? null : draws[firstSeenIndex]?.drawNo ?? null;
    const lastSeenDraw =
      lastSeenIndex === undefined ? null : draws[lastSeenIndex]?.drawNo ?? null;

    let currentHitStreak = 0;
    for (let pointer = hitHistory.length - 1; pointer >= 0; pointer -= 1) {
      if (hitHistory[pointer] === 0) break;
      currentHitStreak += 1;
    }

    let currentMissStreak = 0;
    for (let pointer = hitHistory.length - 1; pointer >= 0; pointer -= 1) {
      if (hitHistory[pointer] === 1) break;
      currentMissStreak += 1;
    }

    let maxHitStreak = 0;
    let maxMissStreak = 0;
    let streak = 0;
    let miss = 0;

    hitHistory.forEach((hit) => {
      if (hit) {
        streak += 1;
        miss = 0;
        maxHitStreak = Math.max(maxHitStreak, streak);
      } else {
        miss += 1;
        streak = 0;
        maxMissStreak = Math.max(maxMissStreak, miss);
      }
    });

    const gaps = hitIndexes.slice(1).map((hitIndex, gapIndex) => {
      return hitIndex - hitIndexes[gapIndex];
    });
    const averageGap = average(gaps);
    const gapStdDev = stdDev(gaps);
    const longTermRate = totalDraws ? totalAppearances / totalDraws : 0;
    const recentRate10 = recent10 / Math.min(totalDraws || 1, 10);
    const recentRate30 = recent30 / Math.min(totalDraws || 1, 30);
    const momentumScore = recentRate10 * 0.6 + recentRate30 * 0.4 - longTermRate;
    const stabilityScore = Number(
      (
        Math.max(0, 100 - gapStdDev * 12 - Math.abs(momentumScore) * 100) +
        Math.min(12, totalAppearances)
      ).toFixed(2),
    );
    const bonusBias = totalAppearances
      ? Number((bonusAppearances / totalAppearances).toFixed(3))
      : 0;

    return {
      number,
      totalAppearances,
      mainAppearances,
      bonusAppearances,
      recent10,
      recent30,
      recent50,
      lastSeenDraw,
      firstSeenDraw,
      currentMissStreak,
      maxMissStreak,
      currentHitStreak,
      maxHitStreak,
      averageGap: Number(averageGap.toFixed(2)),
      gapStdDev: Number(gapStdDev.toFixed(2)),
      momentumScore: Number(momentumScore.toFixed(3)),
      stabilityScore,
      bonusBias,
      section: getSectionLabel(number),
      parity: number % 2 === 0 ? "even" : "odd",
      currentTrendLabel: getTrendLabel(momentumScore, currentMissStreak),
    } satisfies NumberStat;
  });
}

export function sortNumberStats(
  stats: NumberStat[],
  sortKey: NumberSortKey,
  descending: boolean,
) {
  return [...stats].sort((left, right) => {
    const leftValue = left[sortKey] ?? 0;
    const rightValue = right[sortKey] ?? 0;
    const difference = Number(rightValue) - Number(leftValue);
    return descending ? difference : -difference;
  });
}

export function analyzeDraw(draw: LottoDraw): DrawShape {
  const sorted = [...draw.numbers].sort((a, b) => a - b);
  const consecutivePairs = sorted.flatMap((value, index) => {
    const next = sorted[index + 1];
    return next === value + 1 ? ([[value, next]] as [number, number][]) : [];
  });
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const oddCount = sorted.filter((value) => value % 2 === 1).length;
  const lowCount = sorted.filter((value) => value <= 22).length;

  return {
    sum,
    oddCount,
    evenCount: sorted.length - oddCount,
    lowCount,
    highCount: sorted.length - lowCount,
    consecutivePairs,
    endDigitSpread: new Set(sorted.map((value) => value % 10)).size,
    rangeWidth: sorted.at(-1)! - sorted[0],
  };
}

export function buildDrawStats(draws: LottoDraw[]) {
  const rankedByPrize = [...draws]
    .filter((draw) => draw.divisions[0]?.prize)
    .sort((left, right) => right.divisions[0].prize - left.divisions[0].prize);

  const rankedByWinners = [...draws]
    .filter((draw) => draw.divisions[0]?.winners)
    .sort((left, right) => right.divisions[0].winners - left.divisions[0].winners);

  const salesAverage = average(draws.map((draw) => draw.totalSalesAmount));
  const autoAverage = average(
    draws.map((draw) => draw.winnersCombination.auto ?? 0),
  );
  const manualAverage = average(
    draws.map((draw) => draw.winnersCombination.manual ?? 0),
  );
  const semiAutoAverage = average(
    draws.map((draw) => draw.winnersCombination.semiAuto ?? 0),
  );

  return {
    highestFirstPrizeDraw: rankedByPrize[0] ?? null,
    mostFirstWinnersDraw: rankedByWinners[0] ?? null,
    averageSalesAmount: Math.round(salesAverage),
    averageAutoWinners: Number(autoAverage.toFixed(2)),
    averageManualWinners: Number(manualAverage.toFixed(2)),
    averageSemiAutoWinners: Number(semiAutoAverage.toFixed(2)),
  };
}

export function buildCoOccurrenceMap(draws: LottoDraw[]) {
  const counts = Array.from({ length: 46 }, () => Array<number>(46).fill(0));

  draws.forEach((draw) => {
    const included = [...draw.numbers, draw.bonusNo].sort((a, b) => a - b);
    for (let leftIndex = 0; leftIndex < included.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < included.length; rightIndex += 1) {
        const left = included[leftIndex];
        const right = included[rightIndex];
        counts[left][right] += 1;
        counts[right][left] += 1;
      }
    }
  });

  let maxCount = 1;
  const connections: NumberConnection[] = [];

  for (let source = 1; source <= 45; source += 1) {
    for (let target = source + 1; target <= 45; target += 1) {
      const count = counts[source][target];
      maxCount = Math.max(maxCount, count);
      connections.push({
        source,
        target,
        count,
        normalizedWeight: 0,
      });
    }
  }

  const normalizedConnections = connections.map((connection) => ({
    ...connection,
    normalizedWeight: connection.count / maxCount,
  }));

  const neighborhoods: NumberNeighborhood[] = Array.from(
    { length: 45 },
    (_, index) => {
      const number = index + 1;
      const strongestLinks = normalizedConnections
        .filter(
          (connection) =>
            connection.source === number || connection.target === number,
        )
        .sort((left, right) => right.count - left.count)
        .slice(0, 10);

      return {
        number,
        totalConnectionCount: strongestLinks.reduce(
          (sum, connection) => sum + connection.count,
          0,
        ),
        strongestLinks,
      };
    },
  );

  return {
    connections: normalizedConnections,
    neighborhoods,
    maxCount,
  };
}

export function formatKoreanDate(isoDate: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(isoDate));
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
