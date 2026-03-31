"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
} from "d3-force";

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

type GraphNode = {
  number: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  radius: number;
  related: boolean;
  connectionCount: number;
};

type GraphLink = {
  source: number | GraphNode;
  target: number | GraphNode;
  count: number;
  normalizedWeight: number;
};

const WIDTH = 760;
const HEIGHT = 760;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

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

function linkBucket(count: number) {
  if (count >= 30) return "tier-30";
  if (count >= 20) return "tier-20";
  if (count >= 10) return "tier-10";
  return "tier-base";
}

function createInitialNodes(
  selectedNumber: number,
  selectedConnections: NumberConnection[],
): GraphNode[] {
  const connectionMap = new Map<number, NumberConnection>();

  selectedConnections.forEach((connection) => {
    const partner =
      connection.source === selectedNumber ? connection.target : connection.source;
    connectionMap.set(partner, connection);
  });

  return Array.from({ length: 45 }, (_, index) => {
    const number = index + 1;
    const angle = ((Math.PI * 2) / 45) * index - Math.PI / 2;
    const connection = connectionMap.get(number);
    const count = connection?.count ?? 0;
    const related = number === selectedNumber || count > 0;

    const radius =
      number === selectedNumber
        ? 24
        : count >= 30
          ? 18
          : count >= 20
            ? 16
            : count >= 10
              ? 14
              : 12;

    const orbit =
      number === selectedNumber
        ? 0
        : related
          ? count >= 30
            ? 120
            : count >= 20
              ? 190
              : count >= 10
                ? 265
                : 335
          : 440 + seeded(number, 1) * 60;

    return {
      number,
      x: CENTER_X + Math.cos(angle) * orbit,
      y: CENTER_Y + Math.sin(angle) * orbit * 0.84,
      radius,
      related,
      connectionCount: count,
    };
  });
}

function projectToEdge(source: GraphNode, target: GraphNode) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const padding = 2;

  return {
    x1: source.x + (dx / distance) * (source.radius + padding),
    y1: source.y + (dy / distance) * (source.radius + padding),
    x2: target.x - (dx / distance) * (target.radius + padding),
    y2: target.y - (dy / distance) * (target.radius + padding),
  };
}

export function NumberNetworkMap({
  connections,
  neighborhoods,
}: NumberNetworkMapProps) {
  const [selectedNumber, setSelectedNumber] = useState(7);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(
    null,
  );
  const nodesRef = useRef<GraphNode[]>([]);
  const dragNodeRef = useRef<GraphNode | null>(null);
  const frameRef = useRef<number | null>(null);

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

  const graphLinks = useMemo<GraphLink[]>(
    () =>
      selectedConnections.map((connection) => ({
        source: connection.source,
        target: connection.target,
        count: connection.count,
        normalizedWeight: connection.normalizedWeight,
      })),
    [selectedConnections],
  );

  const topPartners = useMemo(
    () =>
      selectedConnections.slice(0, 10).map((connection) =>
        connection.source === selectedNumber ? connection.target : connection.source,
      ),
    [selectedConnections, selectedNumber],
  );
  const topPartnerSet = useMemo(() => new Set(topPartners), [topPartners]);

  useEffect(() => {
    const initialNodes: GraphNode[] = createInitialNodes(
      selectedNumber,
      selectedConnections,
    );
    nodesRef.current = initialNodes;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      setNodes([...initialNodes]);
    });

    const simulation = forceSimulation<GraphNode>(initialNodes)
      .alpha(0.9)
      .alphaDecay(0.08)
      .velocityDecay(0.28)
      .force("charge", forceManyBody<GraphNode>().strength((node) => (node.related ? -145 : -80)))
      .force("center", forceCenter(CENTER_X, CENTER_Y))
      .force(
        "radial",
        forceRadial<GraphNode>(
          (node) =>
            node.number === selectedNumber
              ? 0
              : node.related
                ? node.connectionCount >= 30
                  ? 95
                  : node.connectionCount >= 20
                    ? 150
                    : node.connectionCount >= 10
                      ? 220
                      : 285
                : 360,
          CENTER_X,
          CENTER_Y,
        ).strength((node) => (node.related ? 0.34 : 0.18)),
      )
      .force(
        "collision",
        forceCollide<GraphNode>().radius((node) => node.radius + 8).strength(0.92),
      )
      .force(
        "links",
        forceLink<GraphNode, GraphLink>(graphLinks)
          .id((node) => node.number)
          .distance((link) => {
            if (link.count >= 30) return 95;
            if (link.count >= 20) return 150;
            if (link.count >= 10) return 220;
            return 300;
          })
          .strength((link) => {
            if (link.count >= 30) return 0.78;
            if (link.count >= 20) return 0.5;
            if (link.count >= 10) return 0.3;
            return 0.18;
          }),
      )
      .on("tick", () => {
        if (frameRef.current !== null) return;

        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null;
          setNodes([...nodesRef.current]);
        });
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [graphLinks, selectedConnections, selectedNumber]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragNodeRef.current || !stageRef.current) return;

      const bounds = stageRef.current.getBoundingClientRect();
      const ratioX = WIDTH / bounds.width;
      const ratioY = HEIGHT / bounds.height;

      dragNodeRef.current.fx = (event.clientX - bounds.left) * ratioX;
      dragNodeRef.current.fy = (event.clientY - bounds.top) * ratioY;
      simulationRef.current?.alphaTarget(0.22).restart();
    };

    const handlePointerUp = () => {
      if (!dragNodeRef.current) return;

      dragNodeRef.current.fx = null;
      dragNodeRef.current.fy = null;
      dragNodeRef.current = null;
      simulationRef.current?.alphaTarget(0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    nodeNumber: number,
  ) => {
    const node = nodesRef.current.find((item) => item.number === nodeNumber);
    if (!node) return;

    dragNodeRef.current = node;
    node.fx = node.x;
    node.fy = node.y;
    simulationRef.current?.alphaTarget(0.24).restart();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.number, node])),
    [nodes],
  );

  const strongestLink = selectedNeighborhood?.strongestLinks[0];
  const averageStrength =
    selectedConnections.reduce((sum, connection) => sum + connection.normalizedWeight, 0) /
    Math.max(selectedConnections.length, 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-stone-200/80 bg-gradient-to-r from-sky-50 via-white to-orange-50">
        <Badge className="w-fit">연관 번호 네트워크</Badge>
        <CardTitle className="font-[var(--font-display)] text-3xl">
          이 번호는 어떤 번호와 관계가 깊을까요?
        </CardTitle>
        <CardDescription>
          공을 끌어볼 수 있고, 번호를 선택하면 관련 공은 가까이 모이고 관련 없는 공은
          바깥으로 밀려납니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)]">
        <div className="space-y-4">
          <div ref={stageRef} className="network-stage interactive">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="network-svg"
              role="img"
              aria-label="로또 번호 연관 네트워크"
            >
              {graphLinks.map((link) => {
                const sourceNumber =
                  typeof link.source === "number" ? link.source : link.source.number;
                const targetNumber =
                  typeof link.target === "number" ? link.target : link.target.number;
                const source = nodeMap.get(sourceNumber);
                const target = nodeMap.get(targetNumber);

                if (!source || !target) return null;

                const line = projectToEdge(source, target);
                const partner =
                  sourceNumber === selectedNumber ? targetNumber : sourceNumber;

                return (
                  <line
                    key={`${sourceNumber}-${targetNumber}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    className={`network-link selected ${linkBucket(link.count)} ${topPartnerSet.has(partner) ? "top-10" : ""}`}
                  />
                );
              })}
            </svg>

            <div className="network-node-layer">
              {nodes.map((node) => {
                const active = node.number === selectedNumber;
                const size = `${node.radius * 2}px`;

                return (
                  <button
                    key={node.number}
                    type="button"
                    draggable={false}
                    aria-pressed={active}
                    aria-label={`${node.number}번 연관 번호 보기`}
                    className={`network-node-button ${active ? "active" : node.related ? "related" : "muted"}`}
                    style={
                      {
                        left: `${(node.x / WIDTH) * 100}%`,
                        top: `${(node.y / HEIGHT) * 100}%`,
                        width: size,
                        height: size,
                      } as CSSProperties
                    }
                    onClick={() => setSelectedNumber(node.number)}
                    onPointerDown={(event) => handlePointerDown(event, node.number)}
                    onDragStart={(event) => event.preventDefault()}
                  >
                    <span
                      draggable={false}
                      className={`lotto-ball ${ballTone(node.number)} network-node-disc`}
                    >
                      {node.number}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Card className="border-stone-200/80 shadow-none">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4">
                <p className="text-sm text-stone-500">선택 번호</p>
                <strong className="mt-2 block text-2xl">{selectedNumber}번</strong>
              </div>
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
                <p className="text-sm text-stone-500">평균 연결 강도</p>
                <strong className="mt-2 block text-2xl">
                  {(averageStrength * 100).toFixed(1)}%
                </strong>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-stone-200/80 shadow-none">
            <CardHeader className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                선택 번호 {selectedNumber}번
              </Badge>
              <CardTitle className="text-2xl">가장 강한 연관 번호</CardTitle>
              <CardDescription>
                상위 10개 연관 번호를 바로 눌러서 네트워크를 다시 볼 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="network-top-balls network-top-balls-prominent">
                {selectedNeighborhood?.strongestLinks.slice(0, 10).map((connection) => {
                  const partner =
                    connection.source === selectedNumber
                      ? connection.target
                      : connection.source;

                  return (
                    <button
                      key={`top-ball-${partner}`}
                      type="button"
                      className="network-top-ball-chip"
                      onClick={() => setSelectedNumber(partner)}
                    >
                      <span className={`lotto-ball ${ballTone(partner)}`}>{partner}</span>
                      <span className="network-top-ball-meta">{connection.count}회</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-sm leading-6 text-stone-500">
                보라색으로 더 굵게 보이는 선이 현재 번호와의 상위 10개 연관입니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
