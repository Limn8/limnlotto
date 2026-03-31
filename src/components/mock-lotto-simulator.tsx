"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LottoDraw, NumberStat, formatKoreanDate } from "@/lib/lotto";

type Ticket = {
  id: string;
  createdAt: string;
  targetDrawNo: number;
  numbers: number[];
};

type EvaluatedTicket = Ticket & {
  matchedNumbers: number[];
  matchedBonus: boolean;
  resultLabel: string;
};

const STORAGE_KEY = "lottostat.mockTickets";

function buildSuggestedTicket(stats: NumberStat[]) {
  return [...stats]
    .sort((left, right) => {
      const leftScore =
        left.totalAppearances + left.momentumScore * 100 + left.currentMissStreak * 0.8;
      const rightScore =
        right.totalAppearances +
        right.momentumScore * 100 +
        right.currentMissStreak * 0.8;
      return rightScore - leftScore;
    })
    .slice(0, 6)
    .map((stat) => stat.number)
    .sort((left, right) => left - right);
}

function evaluateTicket(ticket: Ticket, draw: LottoDraw | undefined): EvaluatedTicket | null {
  if (!draw) return null;
  const matchedNumbers = ticket.numbers.filter((number) => draw.numbers.includes(number));
  const matchedBonus = ticket.numbers.includes(draw.bonusNo);
  const matchCount = matchedNumbers.length;

  let resultLabel = "낙첨";
  if (matchCount === 6) resultLabel = "1등 당첨! 상금은 없습니다.";
  else if (matchCount === 5 && matchedBonus) resultLabel = "2등 당첨! 상금은 없습니다.";
  else if (matchCount === 5) resultLabel = "3등 당첨! 상금은 없습니다.";
  else if (matchCount === 4) resultLabel = "4등 당첨! 상금은 없습니다.";
  else if (matchCount === 3) resultLabel = "5등 당첨! 상금은 없습니다.";

  return { ...ticket, matchedNumbers, matchedBonus, resultLabel };
}

type MockLottoSimulatorProps = {
  stats: NumberStat[];
  draws: LottoDraw[];
};

export function MockLottoSimulator({
  stats,
  draws,
}: MockLottoSimulatorProps) {
  const latestDrawNo = draws.at(-1)?.drawNo ?? 0;
  const nextDrawNo = latestDrawNo + 1;
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>(
    buildSuggestedTicket(stats),
  );
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved) as Ticket[];
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }, [tickets]);

  const toggleNumber = (value: number) => {
    setSelectedNumbers((current) => {
      if (current.includes(value)) {
        return current.filter((number) => number !== value);
      }
      if (current.length >= 6) return current;
      return [...current, value].sort((left, right) => left - right);
    });
  };

  const saveTicket = () => {
    if (selectedNumbers.length !== 6) return;
    const ticket: Ticket = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      targetDrawNo: nextDrawNo,
      numbers: [...selectedNumbers].sort((left, right) => left - right),
    };
    setTickets((current) => [ticket, ...current].slice(0, 20));
  };

  const fillSuggested = () => setSelectedNumbers(buildSuggestedTicket(stats));
  const clearSelection = () => setSelectedNumbers([]);

  const ticketViews = tickets.map((ticket) => {
    const targetDraw = draws.find((draw) => draw.drawNo === ticket.targetDrawNo);
    return { ticket, evaluated: evaluateTicket(ticket, targetDraw), targetDraw };
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-stone-200/80 bg-gradient-to-r from-stone-100 via-white to-orange-50">
        <Badge className="w-fit">모의 구매</Badge>
        <CardTitle className="font-[var(--font-display)] text-3xl">
          다음 회차용 가상 티켓을 저장해두고 실제 결과가 나오면 자동 채점하세요
        </CardTitle>
        <CardDescription>
          브라우저 로컬 저장소에만 보관합니다. 다음 회차 데이터가 들어오면 자동으로
          비교해 몇 등인지 알려줍니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 p-6 lg:grid-cols-2">
        <Card className="border-stone-200/80 shadow-none">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              목표 회차 {nextDrawNo}회
            </Badge>
            <CardTitle className="text-xl">번호 선택</CardTitle>
            <CardDescription>
              통계 기반 추천 수를 기본값으로 넣어두었습니다. 원하는 숫자를 눌러 수정할 수
              있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 45 }, (_, index) => index + 1).map((value) => {
                const active = selectedNumbers.includes(value);
                return (
                  <Button
                    key={value}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleNumber(value)}
                  >
                    {value}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={fillSuggested}>
                통계 추천으로 채우기
              </Button>
              <Button type="button" variant="outline" onClick={clearSelection}>
                비우기
              </Button>
              <Button type="button" onClick={saveTicket}>
                모의 구매 저장
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedNumbers.map((value) => (
                <span key={value} className="lotto-ball">
                  {value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 shadow-none">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              저장된 티켓 {tickets.length}장
            </Badge>
            <CardTitle className="text-xl">자동 채점 결과</CardTitle>
            <CardDescription>
              다음 회차가 아직 없으면 대기 상태로 남아 있고, 회차가 생기면 자동 채점됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticketViews.length ? (
              ticketViews.map(({ ticket, evaluated, targetDraw }) => {
                const waiting = evaluated === null;
                return (
                  <div
                    key={ticket.id}
                    className="rounded-3xl border border-dashed border-stone-300 bg-stone-50/80 p-4"
                  >
                    <Badge variant={waiting ? "outline" : "default"}>
                      {waiting ? `${ticket.targetDrawNo}회 대기 중` : evaluated.resultLabel}
                    </Badge>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ticket.numbers.map((value) => (
                        <span key={value} className="lotto-ball">
                          {value}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-stone-500">
                      구매일 {formatKoreanDate(ticket.createdAt)}
                    </p>
                    {waiting ? null : (
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        실제 당첨번호: {targetDraw?.numbers.join(", ")} + {targetDraw?.bonusNo}
                        {" / "}맞춘 개수 {evaluated.matchedNumbers.length}
                        {evaluated.matchedBonus ? " + 보너스" : ""}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-stone-500">아직 저장한 모의 티켓이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
