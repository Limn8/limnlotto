"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, CalendarRange, ChartColumnBig, Trophy } from "lucide-react";

import { MockLottoSimulator } from "@/components/mock-lotto-simulator";
import { NumberNetworkMap } from "@/components/number-network-map";
import { RecommendationLab } from "@/components/recommendation-lab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LottoDraw,
  NumberSortKey,
  NumberStat,
  buildDrawStats,
  buildCoOccurrenceMap,
  formatCompactNumber,
  formatKoreanDate,
  sortNumberStats,
  sortOptions,
} from "@/lib/lotto";

type LottoDashboardProps = {
  draws: LottoDraw[];
  stats: NumberStat[];
  generatedAt: string;
};

function formatMetric(sortKey: NumberSortKey, stat: NumberStat) {
  const value = stat[sortKey];
  if (value === null || value === undefined) return "-";
  if (sortKey === "bonusBias" || sortKey === "momentumScore") {
    return Number(value).toFixed(3);
  }
  if (sortKey === "averageGap" || sortKey === "gapStdDev") {
    return `${Number(value).toFixed(2)}회`;
  }
  return `${value}`;
}

function ballTone(number: number) {
  if (number <= 10) return "ball-yellow";
  if (number <= 20) return "ball-blue";
  if (number <= 30) return "ball-red";
  if (number <= 40) return "ball-gray";
  return "ball-green";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function LottoDashboard({
  draws,
  stats,
  generatedAt,
}: LottoDashboardProps) {
  const [sortKey, setSortKey] = useState<NumberSortKey>("number");
  const [descending, setDescending] = useState(false);
  const [tab, setTab] = useState("numbers");
  const [showDetailBars, setShowDetailBars] = useState(false);
  const sortedStats = sortNumberStats(stats, sortKey, descending);
  const numericValues = sortedStats.map((stat) =>
    typeof stat[sortKey] === "number" ? Number(stat[sortKey]) : 0,
  );
  const rawMaxValue = Math.max(...numericValues, 1);
  const rawMinValue = Math.min(...numericValues);
  const rawRange = Math.max(rawMaxValue - rawMinValue, 1);
  const spreadRatio = (rawMaxValue - rawMinValue) / Math.max(Math.abs(rawMaxValue), 1);
  const lowerPaddingRatio = spreadRatio < 0.2 ? 0.88 : spreadRatio < 0.35 ? 0.7 : 0;
  const minValue = Math.max(0, rawMinValue - (rawMaxValue - rawMinValue) * lowerPaddingRatio);
  const maxValue = rawMaxValue;
  const valueRange = Math.max(maxValue - minValue, 1);
  const verticalMinValue =
    spreadRatio < 0.4
      ? rawMaxValue - rawRange * 1.12
      : rawMinValue - rawRange * 0.08;
  const verticalRange = Math.max(rawMaxValue - verticalMinValue, 1);
  const latestDraw = draws.at(-1);
  const recentDraws = [...draws].reverse().slice(0, 8);
  const topByFrequency = [...stats]
    .sort((left, right) => right.totalAppearances - left.totalAppearances)
    .slice(0, 5);
  const topByMomentum = [...stats]
    .sort((left, right) => right.momentumScore - left.momentumScore)
    .slice(0, 5);
  const mostOverdue = [...stats]
    .sort((left, right) => right.currentMissStreak - left.currentMissStreak)
    .slice(0, 5);
  const drawStats = buildDrawStats(draws);
  const coOccurrenceMap = buildCoOccurrenceMap(draws);

  return (
    <div className="page-shell">
      <Card className="overflow-hidden border-red-300 bg-red-50/95">
        <CardHeader className="border-b border-red-200/80 bg-gradient-to-r from-red-100 via-red-50 to-orange-50">
          <Badge className="w-fit bg-red-600 text-white hover:bg-red-600">
            중요 안내
          </Badge>
          <CardTitle className="font-[var(--font-display)] text-2xl text-red-900">
            교육용 통계 실험 안내문
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-6 text-sm leading-7 text-red-950 md:text-base">
          <p>
            아시다시피 로또의 각 회차는 독립 시행이며 각 공이 뽑힐 확률은 수학적으로
            동일하고 이 사이트는 수학 수업 교육용 흥미 유발을 위한 사이트일뿐 투기나
            도박성 복권 구매를 권유하는 사이트가 절대 아닙니다.
          </p>
          <p>
            본 사이트의 정보를 활용하여 발생하는 모든 결과의 책임은 본인에게 있으며,
            이런저런 분석을 해도 실제 당첨으로 이어지지는 않는다는 사실을 체험하는 것이
            이 사이트의 궁극적인 목표입니다.
          </p>
          <p>
            그래도 혹시나 당첨이 되시면 인증샷 하나 정도는 보내주십시오. 로또 번호 및
            정보 크롤링은 <strong>smok95.github.io/lotto</strong>에서 가져왔기 때문에
            다소 자료가 부정확할 수 있습니다.
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="grid gap-8 p-8 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="space-y-5">
            <Badge className="w-fit">인공지능 수학</Badge>
            <div className="space-y-4">
              <h1 className="font-[var(--font-display)] text-5xl leading-none tracking-[-0.06em] text-stone-950 md:text-7xl">
                림팔라 로또분석 놀이터(이상한사이트아님;)
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600 md:text-lg">
                번호순 막대그래프부터 최대 연속 출현, 최근 추세, 미출현 구간, 1등
                당첨금과 자동·수동 비중, 조건 기반 추천 조합, 모의 구매 자동 채점까지
                모두 한 곳에 모았습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary">최신 회차 {latestDraw?.drawNo ?? "-"}</Badge>
              <Badge variant="secondary">업데이트 {formatKoreanDate(generatedAt)}</Badge>
              <Badge variant="secondary">보너스 번호 포함 통계</Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="text-white">
                <Link href="/draws" className="text-white">
                  회차 순 번호 보기
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="#recommendation">추천 조합으로 이동</a>
              </Button>
            </div>
          </div>

          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-white text-stone-900 shadow-none">
            <CardHeader>
              <Badge variant="outline" className="w-fit border-orange-200 text-orange-900">
                직전 회차 하이라이트
              </Badge>
              <CardTitle className="font-[var(--font-display)] text-4xl text-stone-950">
                {latestDraw?.drawNo ?? "-"}회
              </CardTitle>
              <CardDescription className="text-stone-600">
                {latestDraw ? formatKoreanDate(latestDraw.date) : "-"} 추첨
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {latestDraw?.numbers.map((value) => (
                  <span key={value} className={`lotto-ball ${ballTone(value)}`}>
                    {value}
                  </span>
                ))}
                {latestDraw ? (
                  <>
                    <span className="flex items-center text-stone-500">+</span>
                    <span className={`lotto-ball ${ballTone(latestDraw.bonusNo)} bonus-ball`}>
                      {latestDraw.bonusNo}
                    </span>
                  </>
                ) : null}
              </div>
              <Separator className="bg-orange-150" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-orange-100 bg-white/90 p-4">
                  <p className="text-sm text-stone-500">1등 당첨금</p>
                  <strong className="mt-2 block font-[var(--font-display)] text-2xl text-stone-950">
                    {formatCompactNumber(latestDraw?.divisions[0]?.prize ?? 0)}원
                  </strong>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-white/90 p-4">
                  <p className="text-sm text-stone-500">1등 당첨자수</p>
                  <strong className="mt-2 block font-[var(--font-display)] text-2xl text-stone-950">
                    {formatCompactNumber(latestDraw?.divisions[0]?.winners ?? 0)}명
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <NumberNetworkMap
        connections={coOccurrenceMap.connections}
        neighborhoods={coOccurrenceMap.neighborhoods}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-orange-100 p-3 text-orange-900">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <p className="text-sm text-stone-500">누적 상위 번호</p>
              <strong className="font-[var(--font-display)] text-3xl">{topByFrequency[0]?.number}번</strong>
              <p className="text-sm text-stone-500">{topByFrequency[0]?.totalAppearances}회 등장</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-900">
              <ChartColumnBig className="size-5" />
            </div>
            <div>
              <p className="text-sm text-stone-500">최근 상승 추세</p>
              <strong className="font-[var(--font-display)] text-3xl">{topByMomentum[0]?.number}번</strong>
              <p className="text-sm text-stone-500">추세 점수 {topByMomentum[0]?.momentumScore.toFixed(3)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-stone-200 p-3 text-stone-900">
              <CalendarRange className="size-5" />
            </div>
            <div>
              <p className="text-sm text-stone-500">가장 오래 쉰 번호</p>
              <strong className="font-[var(--font-display)] text-3xl">{mostOverdue[0]?.number}번</strong>
              <p className="text-sm text-stone-500">{mostOverdue[0]?.currentMissStreak}회 미등장</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-900">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="text-sm text-stone-500">최고 1등 당첨금</p>
              <strong className="font-[var(--font-display)] text-3xl">
                {drawStats.highestFirstPrizeDraw?.drawNo ?? "-"}회
              </strong>
              <p className="text-sm text-stone-500">
                {formatCompactNumber(drawStats.highestFirstPrizeDraw?.divisions[0]?.prize ?? 0)}원
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="numbers">번호 통계</TabsTrigger>
          <TabsTrigger value="draws">회차 통계</TabsTrigger>
        </TabsList>

        <TabsContent value="numbers">
          <Card>
            <CardHeader className="gap-4 border-b border-stone-200/80">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <Badge className="mb-3 w-fit">번호별 통계</Badge>
                  <CardTitle className="font-[var(--font-display)] text-3xl">
                    정렬 기준을 바꾸며 막대그래프를 직접 비교해보세요
                  </CardTitle>
                  <CardDescription>
                    같은 데이터라도 정렬 기준이 달라지면 전혀 다른 패턴이 보입니다.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-56">
                    <Select value={sortKey} onValueChange={(value) => setSortKey(value as NumberSortKey)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" onClick={() => setDescending((current) => !current)}>
                    {descending ? "내림차순" : "오름차순"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="rounded-3xl border border-stone-200/80 bg-stone-50/80 p-4">
                <div className="number-bar-scroll">
                  <div className="number-bar-chart">
                    {sortedStats.map((stat) => {
                      const numericValue =
                        typeof stat[sortKey] === "number" ? Number(stat[sortKey]) : 0;
                      const normalized = (numericValue - verticalMinValue) / verticalRange;
                      const emphasized = clamp(Math.pow(normalized, 0.45), 0, 1);
                      const height = 38 + emphasized * 62;

                      return (
                        <div key={`column-${stat.number}`} className="number-bar-column">
                          <div className="number-bar-value">
                            {formatMetric(sortKey, stat)}
                          </div>
                          <div className="number-bar-track">
                            <div
                              className={`number-bar-fill ${ballTone(stat.number)}`}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <div className="number-bar-label">{stat.number}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm leading-6 text-stone-500">
                  세로 막대형 도표라서 번호별 상대적인 차이를 한 화면에서 빠르게 읽기
                  좋습니다. 아래 목록은 같은 값을 카드형으로 다시 보여줘서 정확한 수치를
                  확인하기 쉽게 둔 영역입니다.
                </p>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowDetailBars((current) => !current)}
                >
                  {showDetailBars ? "아래 목록 접기" : "아래 목록 펼치기"}
                </Button>
              </div>

              {showDetailBars
                ? sortedStats.map((stat) => {
                    const numericValue =
                      typeof stat[sortKey] === "number" ? Number(stat[sortKey]) : 0;
                    const normalized = (numericValue - minValue) / valueRange;
                    const emphasized = clamp(Math.pow(normalized, 0.42), 0, 1);
                    const width = 42 + emphasized * 58;
                    return (
                      <div key={stat.number} className="grid gap-3 rounded-2xl border border-stone-200/70 bg-stone-50/70 p-3 md:grid-cols-[140px_minmax(0,1fr)_88px] md:items-center">
                        <div className="flex items-center gap-3">
                          <span className={`bar-badge ${ballTone(stat.number)}`}>{stat.number}</span>
                          <div>
                            <strong>{stat.number}번</strong>
                            <p className="text-sm text-stone-500">{stat.currentTrendLabel}</p>
                          </div>
                        </div>
                        <div className="relative h-4 overflow-hidden rounded-full bg-stone-200">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="text-sm font-semibold text-stone-700">
                          {formatMetric(sortKey, stat)}
                        </div>
                      </div>
                    );
                  })
                : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="draws">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">최고 1등 당첨금</Badge>
                <CardTitle className="font-[var(--font-display)] text-3xl">
                  {drawStats.highestFirstPrizeDraw?.drawNo ?? "-"}회
                </CardTitle>
                <CardDescription>
                  {formatCompactNumber(drawStats.highestFirstPrizeDraw?.divisions[0]?.prize ?? 0)}원
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">1등 당첨자 최다</Badge>
                <CardTitle className="font-[var(--font-display)] text-3xl">
                  {drawStats.mostFirstWinnersDraw?.divisions[0]?.winners ?? 0}명
                </CardTitle>
                <CardDescription>
                  {drawStats.mostFirstWinnersDraw?.drawNo ?? "-"}회
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">평균 자동 당첨자</Badge>
                <CardTitle className="font-[var(--font-display)] text-3xl">
                  {drawStats.averageAutoWinners}명
                </CardTitle>
                <CardDescription>회차당 평균</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">수동 / 반자동</Badge>
                <CardTitle className="font-[var(--font-display)] text-3xl">
                  {drawStats.averageManualWinners} / {drawStats.averageSemiAutoWinners}
                </CardTitle>
                <CardDescription>1등 평균 당첨자 수</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <Badge className="w-fit">많이 나온 번호</Badge>
            <CardTitle>누적 상위 5개</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topByFrequency.map((stat) => (
              <div key={stat.number} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>{stat.number}번</span>
                <Badge variant="outline">{stat.totalAppearances}회</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Badge className="w-fit">최근 추세</Badge>
            <CardTitle>상승세 상위 5개</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topByMomentum.map((stat) => (
              <div key={stat.number} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>{stat.number}번</span>
                <Badge variant="outline">{stat.momentumScore.toFixed(3)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Badge className="w-fit">미출현 길이</Badge>
            <CardTitle>오랫동안 안 나온 5개</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mostOverdue.map((stat) => (
              <div key={stat.number} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span>{stat.number}번</span>
                <Badge variant="outline">{stat.currentMissStreak}회</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div id="recommendation">
        <RecommendationLab
          stats={stats}
          latestWinningNumbers={latestDraw?.numbers ?? []}
          connections={coOccurrenceMap.connections}
        />
      </div>

      <MockLottoSimulator stats={stats} draws={draws} />

      <Card>
        <CardHeader className="border-b border-stone-200/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-3 w-fit">회차 순 조회</Badge>
              <CardTitle className="font-[var(--font-display)] text-3xl">
                최신 회차부터 과거 회차까지 번호를 바로 확인할 수 있습니다
              </CardTitle>
            </div>
            <Button variant="outline" asChild>
              <Link href="/draws">전체 회차 목록 보기</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          {recentDraws.map((draw) => (
            <Link key={draw.drawNo} href={`/draws/${draw.drawNo}`}>
              <Card className="h-full border-stone-200/80 transition-transform hover:-translate-y-1">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit">
                    {draw.drawNo}회
                  </Badge>
                  <CardDescription>{formatKoreanDate(draw.date)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {draw.numbers.map((value) => (
                      <span key={value} className={`lotto-ball ${ballTone(value)}`}>
                        {value}
                      </span>
                    ))}
                    <span className="flex items-center text-stone-400">+</span>
                    <span className={`lotto-ball ${ballTone(draw.bonusNo)} bonus-ball`}>
                      {draw.bonusNo}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500">
                    1등 {formatCompactNumber(draw.divisions[0]?.prize ?? 0)}원
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </CardContent>
      </Card>

      <p className="pb-4 text-center text-sm text-stone-500">
        제작:
        <a
          href="https://litt.ly/limn8"
          target="_blank"
          rel="noreferrer"
          className="ml-1 font-semibold text-stone-700 underline underline-offset-4"
        >
          경기이음온학교 임현우
        </a>
      </p>
    </div>
  );
}
