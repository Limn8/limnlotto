import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_PATH = path.join(process.cwd(), "src/data/lotto-data.json");
const OFFICIAL_ENDPOINT =
  "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
const FALLBACK_ALL_ENDPOINT = "https://smok95.github.io/lotto/results/all.json";
const FALLBACK_LATEST_ENDPOINT =
  "https://smok95.github.io/lotto/results/latest.json";

function normalizeDraw(record, source) {
  if (!record) {
    return null;
  }

  const drawNo = Number(record.draw_no ?? record.drwNo);
  const numbers =
    record.numbers ??
    [
      record.drwtNo1,
      record.drwtNo2,
      record.drwtNo3,
      record.drwtNo4,
      record.drwtNo5,
      record.drwtNo6,
    ];
  const bonusNo = Number(record.bonus_no ?? record.bnusNo);
  const date = record.date ?? record.drwNoDate;

  if (!drawNo || !Array.isArray(numbers) || numbers.length !== 6 || !bonusNo) {
    return null;
  }

  const divisions = Array.isArray(record.divisions)
    ? record.divisions.map((division = {}, index) => ({
        rank: index + 1,
        prize: Number(division.prize ?? 0),
        winners: Number(division.winners ?? 0),
      }))
    : [];

  const winnersCombination = {
    auto: Number(record.winners_combination?.auto ?? 0),
    semiAuto: Number(record.winners_combination?.semi_auto ?? 0),
    manual: Number(record.winners_combination?.manual ?? 0),
  };

  const normalizedNumbers = numbers
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b);

  if (normalizedNumbers.length !== 6) {
    return null;
  }

  return {
    drawNo,
    date: new Date(date).toISOString(),
    numbers: normalizedNumbers,
    bonusNo,
    totalSalesAmount: Number(
      record.total_sales_amount ?? record.totSellamnt ?? 0,
    ),
    divisions,
    winnersCombination,
    source,
  };
}

async function safeReadCurrentData() {
  try {
    const text = await readFile(DATA_PATH, "utf8");
    return JSON.parse(text);
  } catch {
    return { generatedAt: null, latestDrawNo: 0, draws: [] };
  }
}

async function fetchJson(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": "Mozilla/5.0 Codex LottoStat",
      Accept: "application/json,text/plain,*/*",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }

  return response.json();
}

async function fetchOfficialDraw(drawNo) {
  try {
    const response = await fetch(`${OFFICIAL_ENDPOINT}${drawNo}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 Codex LottoStat",
        Accept: "application/json,text/plain,*/*",
        Referer: "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
      },
      cache: "no-store",
    });

    const text = await response.text();
    const parsed = JSON.parse(text);

    if (parsed.returnValue !== "success") {
      return null;
    }

    return normalizeDraw(parsed, "official-api");
  } catch {
    return null;
  }
}

async function fetchFallbackAll() {
  const records = await fetchJson(FALLBACK_ALL_ENDPOINT);
  return records
    .map((record) => normalizeDraw(record, "backup-smok95"))
    .filter(Boolean)
    .sort((a, b) => a.drawNo - b.drawNo);
}

async function fetchFallbackLatest() {
  const record = await fetchJson(FALLBACK_LATEST_ENDPOINT);
  return normalizeDraw(record, "backup-smok95");
}

function validateDraws(draws) {
  for (let index = 0; index < draws.length; index += 1) {
    const draw = draws[index];
    const expectedDrawNo = index + 1;

    if (draw.drawNo !== expectedDrawNo) {
      throw new Error(
        `Missing or duplicated draw sequence at index ${index}: ${draw.drawNo}`,
      );
    }

    if (draw.numbers.some((number) => number < 1 || number > 45)) {
      throw new Error(`Invalid main number range in draw ${draw.drawNo}`);
    }

    if (draw.bonusNo < 1 || draw.bonusNo > 45) {
      throw new Error(`Invalid bonus number range in draw ${draw.drawNo}`);
    }

    if (new Set(draw.numbers).size !== 6) {
      throw new Error(`Duplicated main numbers in draw ${draw.drawNo}`);
    }
  }
}

async function main() {
  const current = await safeReadCurrentData();
  const fallbackLatest = await fetchFallbackLatest();

  if (!fallbackLatest) {
    throw new Error("Could not fetch the latest fallback draw");
  }

  let draws = Array.isArray(current.draws) ? [...current.draws] : [];

  if (!draws.length) {
    draws = await fetchFallbackAll();
  } else if (fallbackLatest.drawNo > current.latestDrawNo) {
    const fallbackAll = await fetchFallbackAll();
    const fallbackMap = new Map(
      fallbackAll.map((draw) => [draw.drawNo, draw]),
    );

    for (
      let drawNo = current.latestDrawNo + 1;
      drawNo <= fallbackLatest.drawNo;
      drawNo += 1
    ) {
      const official = await fetchOfficialDraw(drawNo);
      const resolved = official ?? fallbackMap.get(drawNo);

      if (!resolved) {
        throw new Error(`No dataset available for draw ${drawNo}`);
      }

      draws.push(resolved);
    }
  }

  draws.sort((a, b) => a.drawNo - b.drawNo);
  validateDraws(draws);

  const payload = {
    generatedAt: new Date().toISOString(),
    latestDrawNo: draws.at(-1)?.drawNo ?? 0,
    draws,
  };

  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(
    `Updated lotto dataset through draw ${payload.latestDrawNo} (${payload.draws.length} draws)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
