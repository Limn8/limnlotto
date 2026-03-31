"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NumberConnection, NumberNeighborhood } from "@/lib/lotto";

type NumberNetworkMapProps = {
  connections: NumberConnection[];
  neighborhoods: NumberNeighborhood[];
};

type Point = {
  number: number;
  x: number;
  y: number;
  strength: number;
  related: boolean;
};

function ballTone(number: number) {
  if (number <= 10) return "ball-yellow";
  if (number <= 20) return "ball-blue";
  if (number <= 30) return "ball-red";
  if (number <= 40) return "ball-gray";
  return "ball-green";
}

function seeded(number: number, offset: number) {
  const value = Math.sin(number * 12.9898 + offset * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function NumberNetworkMap({
  connections,
  neighborhoods,
}: NumberNetworkMapProps) {
  const [selectedNumber, setSelectedNumber] = useState(7);

  const selectedNeighborhood = neighborhoods.find(
    (item) => item.number === selectedNumber,
  );

  const selectedConnections = useMemo(
    () =>
      connections
        .filter(
          (connection) =>
            connection.source === selectedNumber ||
            connection.target === selectedNumber,
        )
        .sort((left, right) => right.count - left.count),
    [connections, selectedNumber],
  );

  const strengthMap = useMemo(() => {
    const entries: Array<[number, number]> = selectedConnections.map((connection) => [
      connection.source === selectedNumber ? connection.target : connection.source,
      connection.normalizedWeight,
    ]);
    return new Map<number, number>(entries);
  }, [selectedConnections, selectedNumber]);

  const points = useMemo<Point[]>(() => {
    return Array.from({ length: 45 }, (_, index) => {
      const number = index + 1;
      const strength = number === selectedNumber ? 1 : strengthMap.get(number) ?? 0;
      const related = strength > 0;
      const sectionIndex = Math.min(Math.floor((number - 1) / 10), 4);
      const sectionCenters = [
        { x: 34, y: 31 },
        { x: 64, y: 28 },
        { x: 71, y: 54 },
        { x: 48, y: 70 },
        { x: 25, y: 58 },
      ];
      const cluster = sectionCenters[sectionIndex];
      const baseAngle = seeded(number, 1) * Math.PI * 2;
      const sway = selectedNumber * 0.055 + seeded(number, 6) * 0.8;

      if (number === selectedNumber) {
        return {
          number,
          x: 50,
          y: 48,
          strength,
          related: true,
        };
      }

      if (related) {
        const ring = 12 + (1 - strength) * 24;
        const angle = baseAngle + sway;
        const jitterX = (seeded(number, 2) - 0.5) * 4.5;
        const jitterY = (seeded(number, 3) - 0.5) * 5;

        return {
          number,
          x: clamp(50 + Math.cos(angle) * ring + jitterX, 10, 90),
          y: clamp(48 + Math.sin(angle) * ring * 0.84 + jitterY, 12, 88),
          strength,
          related,
        };
      }

      const driftAngle = baseAngle + sway * 0.6;
      const push = 30 + seeded(number, 4) * 18;
      const orbitX = Math.cos(driftAngle) * push;
      const orbitY = Math.sin(driftAngle) * push * 0.82;
      const settleX = (cluster.x - 50) * 0.34;
      const settleY = (cluster.y - 48) * 0.34;

      return {
        number,
        x: clamp(50 + orbitX + settleX, 7, 93),
        y: clamp(48 + orbitY + settleY, 9, 91),
        strength,
        related,
      };
    });
  }, [selectedNumber, strengthMap]);

  const pointMap = useMemo(
    () => new Map(points.map((point) => [point.number, point])),
    [points],
  );

  const visibleConnections = useMemo(
    () => selectedConnections.slice(0, 12),
    [selectedConnections],
  );

  const strongestLink = selectedNeighborhood?.strongestLinks[0];
  const averageStrength =
    visibleConnections.reduce((sum, connection) => sum + connection.normalizedWeight, 0) /
    Math.max(visibleConnections.length, 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-stone-200/80 bg-gradient-to-r from-sky-50 via-white to-orange-50">
        <Badge className="w-fit">연관 번호 네트워크</Badge>
        <CardTitle className="font-[var(--font-display)] text-3xl">
          이 번호는 어떤 번호와 관계가 깊을까요?
        </CardTitle>
        <CardDescription>
          공을 누르면 연관이 강한 번호는 더 가까이 뭉치고, 덜 관련된 번호는 바깥으로
          밀려납니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <div className="network-stage">
          <div className="network-haze network-haze-left" />
          <div className="network-haze network-haze-right" />
          <svg viewBox="0 0 100 100" className="network-svg" role="img" aria-label="로또 번호 연관 맵">
            <circle cx="50" cy="48" r="17" className="network-field-ring strong" />
            <circle cx="50" cy="48" r="29" className="network-field-ring" />
            <circle cx="50" cy="48" r="42" className="network-field-ring faint" />
            {visibleConnections.map((connection) => {
              const source = pointMap.get(connection.source);
              const target = pointMap.get(connection.target);

              if (!source || !target) return null;

              const partner =
                connection.source === selectedNumber
                  ? connection.target
                  : connection.source;
              const activeStrength = strengthMap.get(partner) ?? 0;

              return (
                <line
                  key={`${connection.source}-${connection.target}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className="network-link selected"
                  style={{
                    strokeWidth: `${1.5 + activeStrength * 3.8}px`,
                    opacity: `${0.28 + activeStrength * 0.64}`,
                  }}
                />
              );
            })}
          </svg>

          <div className="network-node-layer">
            {points.map((point) => {
              const active = point.number === selectedNumber;
              const strength = active ? 1 : point.strength;
              const size = active
                ? 3.8
                : point.related
                  ? 2.95 + strength * 1.25
                  : 2.35;

              return (
                <button
                  key={point.number}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${point.number}번 연관 번호 보기`}
                  className={`network-node-button ${active ? "active" : point.related ? "related" : "muted"}`}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    width: `${size}rem`,
                    height: `${size}rem`,
                    "--drift-x": `${(seeded(point.number, 8) - 0.5) * 8}px`,
                    "--drift-y": `${(seeded(point.number, 9) - 0.5) * 9}px`,
                    "--float-delay": `${seeded(point.number, 10) * -4.8}s`,
                    "--float-duration": `${5.4 + seeded(point.number, 11) * 3.6}s`,
                  } as CSSProperties}
                  onClick={() => setSelectedNumber(point.number)}
                >
                  <span className={`network-node-glow ${ballTone(point.number)}`} />
                  <span className={`lotto-ball ${ballTone(point.number)} network-node-ball`}>
                    {point.number}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-stone-200/80 shadow-none">
            <CardHeader className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                선택 번호 {selectedNumber}번
              </Badge>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4">
                  <p className="text-sm text-stone-500">최강 파트너</p>
                  <strong className="mt-2 block text-2xl">
                    {strongestLink
                      ? strongestLink.source === selectedNumber
                        ? `${strongestLink.target}번`
                        : `${strongestLink.source}번`
                      : "-"}
                  </strong>
                </div>
                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4">
                  <p className="text-sm text-stone-500">누적 연결 수</p>
                  <strong className="mt-2 block text-2xl">
                    {selectedNeighborhood?.totalConnectionCount ?? 0}회
                  </strong>
                </div>
                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4">
                  <p className="text-sm text-stone-500">상위 평균 강도</p>
                  <strong className="mt-2 block text-2xl">
                    {(averageStrength * 100).toFixed(1)}%
                  </strong>
                </div>
              </div>
              <CardTitle className="text-2xl">가장 강한 연관 번호</CardTitle>
              <CardDescription>
                같은 회차에 함께 포함된 횟수 기준 상위 연결입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedNeighborhood?.strongestLinks.map((connection) => {
                const partner =
                  connection.source === selectedNumber
                    ? connection.target
                    : connection.source;
                return (
                  <button
                    key={`${selectedNumber}-${partner}`}
                    type="button"
                    className="network-side-item"
                    onClick={() => setSelectedNumber(partner)}
                  >
                    <span className={`bar-badge ${ballTone(partner)}`}>{partner}</span>
                    <div className="network-side-copy">
                      <strong>{partner}번</strong>
                      <p>{connection.count}회 함께 등장</p>
                    </div>
                    <Badge variant="outline">
                      {(connection.normalizedWeight * 100).toFixed(1)}%
                    </Badge>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-stone-200/80 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">맵 읽는 법</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-stone-600">
              <p>선택한 번호는 중심으로 이동하고 자주 함께 나온 번호일수록 가까이 붙습니다.</p>
              <p>선이 굵을수록 같은 회차에 함께 들어온 횟수가 더 많습니다.</p>
              <p>연관이 약한 번호는 바깥으로 밀려나서 묶음과 주변부가 한눈에 구분됩니다.</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
