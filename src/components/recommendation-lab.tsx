"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { NumberStat, formatCompactNumber } from "@/lib/lotto";

type RuleKey =
  | "frequency"
  | "overdue"
  | "momentum"
  | "stability"
  | "quietRebound"
  | "bonusBias";

const rules: Array<{ key: RuleKey; label: string; description: string }> = [
  { key: "frequency", label: "장기 빈도", description: "누적 출현이 많은 번호" },
  { key: "overdue", label: "미출현 길이", description: "오랫동안 쉬는 번호" },
  { key: "momentum", label: "최근 추세", description: "최근 상승세가 강한 번호" },
  { key: "stability", label: "안정성", description: "간격이 비교적 일정한 번호" },
  {
    key: "quietRebound",
    label: "조용한 반등",
    description: "최근은 잠잠하지만 누적 기록은 있는 번호",
  },
  {
    key: "bonusBias",
    label: "보너스 편향",
    description: "보너스 등장 비중이 큰 번호",
  },
];

function mulberry32(seed: number) {
  return function random() {
    let value = seed + 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: T[], seed: number) {
  const copy = [...items];
  const random = mulberry32(seed);
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildRuleScore(stat: NumberStat, selectedRules: RuleKey[]) {
  let score = 0;
  selectedRules.forEach((rule) => {
    if (rule === "frequency") score += stat.totalAppearances;
    if (rule === "overdue") score += stat.currentMissStreak * 1.35;
    if (rule === "momentum") score += stat.momentumScore * 140;
    if (rule === "stability") score += stat.stabilityScore;
    if (rule === "quietRebound") {
      score += Math.max(0, stat.currentMissStreak * 1.1 - stat.recent10 * 4);
    }
    if (rule === "bonusBias") score += stat.bonusBias * 100;
  });
  return score;
}

function hasConsecutive(numbers: number[]) {
  return numbers.some((value, index) => numbers[index + 1] === value + 1);
}

type RecommendationLabProps = {
  stats: NumberStat[];
  latestWinningNumbers: number[];
};

export function RecommendationLab({
  stats,
  latestWinningNumbers,
}: RecommendationLabProps) {
  const [selectedRules, setSelectedRules] = useState<RuleKey[]>([
    "frequency",
    "momentum",
  ]);
  const [candidatePoolSize, setCandidatePoolSize] = useState(18);
  const [oddRange, setOddRange] = useState<[number, number]>([2, 4]);
  const [sumRange, setSumRange] = useState<[number, number]>([95, 185]);
  const [allowConsecutive, setAllowConsecutive] = useState(true);
  const [excludeLatestWinners, setExcludeLatestWinners] = useState(false);
  const [recentMode, setRecentMode] = useState<"all" | "active" | "quiet">("all");

  const toggleRule = (rule: RuleKey) => {
    setSelectedRules((current) =>
      current.includes(rule)
        ? current.filter((value) => value !== rule)
        : [...current, rule],
    );
  };

  const rankedPool = [...stats]
    .filter((stat) => {
      if (excludeLatestWinners && latestWinningNumbers.includes(stat.number)) return false;
      if (recentMode === "active") return stat.recent10 >= 1;
      if (recentMode === "quiet") return stat.recent10 === 0;
      return true;
    })
    .sort((left, right) => buildRuleScore(right, selectedRules) - buildRuleScore(left, selectedRules))
    .slice(0, candidatePoolSize);

  const combinations: number[][] = [];
  const poolNumbers = rankedPool.map((stat) => stat.number);
  for (let attempt = 1; attempt <= 240 && combinations.length < 5; attempt += 1) {
    const candidate = shuffleWithSeed(poolNumbers, attempt + candidatePoolSize)
      .slice(0, 6)
      .sort((left, right) => left - right);
    const oddCount = candidate.filter((value) => value % 2 === 1).length;
    const total = candidate.reduce((sum, value) => sum + value, 0);
    const bands = new Set(candidate.map((value) => Math.floor((value - 1) / 10)));
    if (oddCount < oddRange[0] || oddCount > oddRange[1]) continue;
    if (total < sumRange[0] || total > sumRange[1]) continue;
    if (!allowConsecutive && hasConsecutive(candidate)) continue;
    if (bands.size < 3) continue;
    const signature = candidate.join(",");
    if (combinations.some((combo) => combo.join(",") === signature)) continue;
    combinations.push(candidate);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-stone-200/80 bg-gradient-to-r from-orange-50 via-white to-emerald-50">
        <Badge className="w-fit">조건 기반 추천</Badge>
        <CardTitle className="font-[var(--font-display)] text-3xl">
          필터를 조합해서 추천 번호 묶음을 만들어보세요
        </CardTitle>
        <CardDescription>
          선택한 통계 규칙을 점수화해 후보군을 만든 뒤, 홀짝 비율과 합계 범위까지
          통과한 조합만 보여줍니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-stone-200/80 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">점수 규칙</CardTitle>
              <CardDescription>
                여러 기준을 함께 켜서 후보군을 섞어보세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {rules.map((rule) => (
                  <Button
                    key={rule.key}
                    type="button"
                    variant={selectedRules.includes(rule.key) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleRule(rule.key)}
                  >
                    {rule.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>후보군 크기</Label>
                  <Badge variant="secondary">{candidatePoolSize}개</Badge>
                </div>
                <Slider
                  min={10}
                  max={24}
                  step={1}
                  value={[candidatePoolSize]}
                  onValueChange={(value) => setCandidatePoolSize(value[0] ?? 18)}
                />
              </div>

              <div className="space-y-3">
                <Label>최근 출현 필터</Label>
                <Select value={recentMode} onValueChange={(value) => setRecentMode(value as "all" | "active" | "quiet")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 허용</SelectItem>
                    <SelectItem value="active">최근 10회 등장 번호만</SelectItem>
                    <SelectItem value="quiet">최근 10회 미등장 번호만</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>직전 회차 당첨번호 제외</Label>
                    <p className="text-sm text-stone-500">
                      바로 전 회차 번호를 후보군에서 뺍니다.
                    </p>
                  </div>
                  <Switch
                    checked={excludeLatestWinners}
                    onCheckedChange={setExcludeLatestWinners}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>연속수 허용</Label>
                    <p className="text-sm text-stone-500">
                      연속된 숫자가 포함된 조합을 허용합니다.
                    </p>
                  </div>
                  <Switch checked={allowConsecutive} onCheckedChange={setAllowConsecutive} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200/80 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">조합 제약</CardTitle>
              <CardDescription>
                홀짝 비율과 합계 범위를 바꿔가며 조건을 실험할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>홀수 최소 개수</Label>
                  <Badge variant="secondary">{oddRange[0]}개</Badge>
                </div>
                <Slider
                  min={0}
                  max={6}
                  step={1}
                  value={[oddRange[0]]}
                  onValueChange={(value) =>
                    setOddRange([Math.min(value[0] ?? 0, oddRange[1]), oddRange[1]])
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>홀수 최대 개수</Label>
                  <Badge variant="secondary">{oddRange[1]}개</Badge>
                </div>
                <Slider
                  min={0}
                  max={6}
                  step={1}
                  value={[oddRange[1]]}
                  onValueChange={(value) =>
                    setOddRange([oddRange[0], Math.max(value[0] ?? oddRange[0], oddRange[0])])
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>합계 최소값</Label>
                  <Badge variant="secondary">{sumRange[0]}</Badge>
                </div>
                <Slider
                  min={40}
                  max={180}
                  step={1}
                  value={[sumRange[0]]}
                  onValueChange={(value) =>
                    setSumRange([Math.min(value[0] ?? 40, sumRange[1]), sumRange[1]])
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>합계 최대값</Label>
                  <Badge variant="secondary">{sumRange[1]}</Badge>
                </div>
                <Slider
                  min={80}
                  max={220}
                  step={1}
                  value={[sumRange[1]]}
                  onValueChange={(value) =>
                    setSumRange([sumRange[0], Math.max(value[0] ?? sumRange[0], sumRange[0])])
                  }
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>후보군 상위 6개</Label>
                <div className="space-y-2">
                  {rankedPool.slice(0, 6).map((stat) => (
                    <div key={stat.number} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                      <span className="font-semibold text-stone-800">{stat.number}번</span>
                      <Badge variant="outline">
                        {formatCompactNumber(buildRuleScore(stat, selectedRules))}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {combinations.length ? (
            combinations.map((combo, index) => (
              <Card key={combo.join(",")} className="border-stone-200/80 shadow-none">
                <CardHeader className="pb-4">
                  <Badge variant="secondary" className="w-fit">
                    추천 조합 {index + 1}
                  </Badge>
                  <CardDescription>
                    합계 {combo.reduce((sum, value) => sum + value, 0)} / 홀수{" "}
                    {combo.filter((value) => value % 2 === 1).length}개
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {combo.map((value) => (
                      <span key={value} className="lotto-ball">
                        {value}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="md:col-span-2 xl:col-span-5">
              <CardContent className="p-6 text-sm text-stone-600">
                현재 조건을 모두 만족하는 조합이 없습니다. 후보군을 넓히거나 합계/홀짝
                범위를 조금 완화해보세요.
              </CardContent>
            </Card>
          )}
        </div>

        <p className="text-sm text-stone-500">
          추천 조합은 통계 조건을 만족하는 수를 골라낸 결과일 뿐, 당첨 확률 향상을
          보장하지 않습니다.
        </p>
      </CardContent>
    </Card>
  );
}
