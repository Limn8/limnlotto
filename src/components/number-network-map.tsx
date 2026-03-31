"use client";

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

const SIZE = 760;
const CENTER = SIZE / 2;
const RADIUS = 280;

function ballTone(number: number) {
  if (number <= 10) return "ball-yellow";
  if (number <= 20) return "ball-blue";
  if (number <= 30) return "ball-red";
  if (number <= 40) return "ball-gray";
  return "ball-green";
}

export function NumberNetworkMap({
  connections,
  neighborhoods,
}: NumberNetworkMapProps) {
  const [selectedNumber, setSelectedNumber] = useState(7);

  const positions = useMemo(() => {
    return Array.from({ length: 45 }, (_, index) => {
      const number = index + 1;
      const angle = (Math.PI * 2 * index) / 45 - Math.PI / 2;
      return {
        number,
        x: CENTER + Math.cos(angle) * RADIUS,
        y: CENTER + Math.sin(angle) * RADIUS,
      };
    });
  }, []);

  const selectedNeighborhood = neighborhoods.find(
    (item) => item.number === selectedNumber,
  );
  const highlightedPairs = new Set(
    (selectedNeighborhood?.strongestLinks ?? []).map((connection) =>
      `${Math.min(connection.source, connection.target)}-${Math.max(connection.source, connection.target)}`,
    ),
  );

  const visibleConnections = connections.filter((connection) =>
    highlightedPairs.has(
      `${Math.min(connection.source, connection.target)}-${Math.max(connection.source, connection.target)}`,
    ),
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-stone-200/80 bg-gradient-to-r from-sky-50 via-white to-orange-50">
        <Badge className="w-fit">연관 번호 네트워크</Badge>
        <CardTitle className="font-[var(--font-display)] text-3xl">
          같이 자주 나오는 번호를 숫자 맵으로 한눈에 보세요
        </CardTitle>
        <CardDescription>
          번호를 누르면 그 번호와 같은 회차에 자주 함께 등장한 번호들이 더 굵은 링크로
          강조됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 p-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="network-stage">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="network-svg" role="img">
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS + 36}
              className="network-orbit"
            />
            {visibleConnections.map((connection) => {
              const source = positions[connection.source - 1];
              const target = positions[connection.target - 1];
              const isSelectedLink =
                connection.source === selectedNumber ||
                connection.target === selectedNumber;
              return (
                <line
                  key={`${connection.source}-${connection.target}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className={isSelectedLink ? "network-link selected" : "network-link"}
                  style={{
                    strokeWidth: `${1 + connection.normalizedWeight * 9}px`,
                    opacity: isSelectedLink ? 0.88 : 0.36,
                  }}
                />
              );
            })}
            {positions.map((point) => {
              const active = point.number === selectedNumber;
              const related = highlightedPairs.size
                ? [...highlightedPairs].some((pair) => pair.includes(`${point.number}`))
                : false;
              return (
                <g
                  key={point.number}
                  onClick={() => setSelectedNumber(point.number)}
                  className="network-node-group"
                >
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={active ? 24 : related ? 19 : 16}
                    className={`network-node ${ballTone(point.number)} ${active ? "active" : ""}`}
                  />
                  <text
                    x={point.x}
                    y={point.y + 5}
                    textAnchor="middle"
                    className="network-node-label"
                  >
                    {point.number}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-4">
          <Card className="border-stone-200/80 shadow-none">
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                선택 번호 {selectedNumber}번
              </Badge>
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
              <p>링크가 굵을수록 같은 회차에 더 자주 같이 나온 번호쌍입니다.</p>
              <p>선택한 번호는 크게 강조되고, 상위 연관 번호들도 함께 도드라집니다.</p>
              <p>전체 45개 번호를 같은 원형 궤도 위에 두어 관계망을 한 화면에서 보게 했습니다.</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
