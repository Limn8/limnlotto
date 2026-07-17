"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BOARD_CELLS,
  BOARD_KEYS,
  CellKey,
  GameState,
  PLAYER_LABEL,
  Player,
  SETUP_ORDER,
  WIN_REASON_LABEL,
  applyMove,
  applyPlace,
  canPlace,
  canSelect,
  cellKey,
  createGame,
  heightOf,
  legalMoveTargets,
  legalSetupCells,
  parseKey,
  topOf,
} from "@/lib/omok";

const SPACING = 58;
const STONE_RADIUS = 19;

function cellX(key: CellKey) {
  const { q, r } = parseKey(key);
  return SPACING * (q + r / 2);
}

function cellY(key: CellKey) {
  const { r } = parseKey(key);
  return SPACING * r * (Math.sqrt(3) / 2);
}

const GRID_EDGES: Array<[CellKey, CellKey]> = (() => {
  const edges: Array<[CellKey, CellKey]> = [];
  const halfDirs = [
    [1, 0],
    [0, 1],
    [1, -1],
  ] as const;
  for (const cell of BOARD_CELLS) {
    const from = cellKey(cell.q, cell.r);
    for (const [dq, dr] of halfDirs) {
      const to = cellKey(cell.q + dq, cell.r + dr);
      if (BOARD_KEYS.has(to)) edges.push([from, to]);
    }
  }
  return edges;
})();

const STONE_FILL: Record<Player, string> = {
  black: "#181a20",
  white: "#f4eddd",
};

const STONE_RIM: Record<Player, string> = {
  black: "#8d7250",
  white: "#bda079",
};

function onBoardCount(state: GameState, player: Player) {
  return Object.values(state.stacks).reduce(
    (sum, stack) => sum + stack.filter((stone) => stone === player).length,
    0,
  );
}

function StoneGlyph({
  x,
  y,
  player,
  height,
}: {
  x: number;
  y: number;
  player: Player;
  height: number;
}) {
  return (
    <g>
      {height >= 2 ? (
        <circle
          cx={x}
          cy={y}
          r={STONE_RADIUS + 4.5}
          fill="none"
          stroke={STONE_RIM[player]}
          strokeOpacity={0.85}
          strokeWidth={2}
        />
      ) : null}
      {height >= 3 ? (
        <circle
          cx={x}
          cy={y}
          r={STONE_RADIUS + 8.5}
          fill="none"
          stroke={STONE_RIM[player]}
          strokeOpacity={0.7}
          strokeWidth={2}
        />
      ) : null}
      <circle
        cx={x}
        cy={y}
        r={STONE_RADIUS}
        fill={STONE_FILL[player]}
        stroke={STONE_RIM[player]}
        strokeWidth={3.2}
      />
      {height >= 2 ? (
        <>
          <circle
            cx={x + STONE_RADIUS * 0.62}
            cy={y - STONE_RADIUS * 0.62}
            r={8}
            fill="#c84c24"
            stroke="#f4f3ea"
            strokeWidth={1.5}
          />
          <text
            x={x + STONE_RADIUS * 0.62}
            y={y - STONE_RADIUS * 0.62 + 3.5}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="#fff"
          >
            {height}
          </text>
        </>
      ) : null}
    </g>
  );
}

export function ThreeLayerOmok() {
  const [history, setHistory] = useState<GameState[]>([createGame()]);
  const [selected, setSelected] = useState<CellKey | null>(null);
  const [revealStacks, setRevealStacks] = useState(false);

  const state = history[history.length - 1];

  const setupCells = useMemo(
    () => (state.phase === "setup" ? new Set(legalSetupCells(state)) : new Set<CellKey>()),
    [state],
  );

  const moveTargets = useMemo(
    () => (selected ? new Set(legalMoveTargets(state, selected)) : new Set<CellKey>()),
    [state, selected],
  );

  const winCells = useMemo(
    () => new Set(state.win?.cells ?? []),
    [state.win],
  );

  const lastCells = useMemo(() => new Set(state.lastCells), [state.lastCells]);

  function push(next: GameState) {
    if (next === state) return;
    setHistory((prev) => [...prev, next]);
    setSelected(null);
  }

  function handleCellClick(key: CellKey) {
    if (state.phase === "over") return;

    if (state.phase === "setup") {
      push(applyPlace(state, key));
      return;
    }

    if (selected) {
      if (key === selected) {
        setSelected(null);
        return;
      }
      if (moveTargets.has(key)) {
        push(applyMove(state, selected, key));
        return;
      }
    }

    if (canSelect(state, key)) {
      setSelected(key);
      return;
    }

    if (canPlace(state, key)) {
      push(applyPlace(state, key));
      return;
    }

    setSelected(null);
  }

  function undo() {
    setSelected(null);
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  function restart() {
    setSelected(null);
    setHistory([createGame()]);
  }

  const turnLabel = PLAYER_LABEL[state.turn];

  let statusText: string;
  if (state.phase === "over" && state.win) {
    statusText = `${PLAYER_LABEL[state.win.player]} 승리! — ${WIN_REASON_LABEL[state.win.reason]}`;
  } else if (state.phase === "setup") {
    statusText = `기본 배치 (선1→후2→선2→후1) ${state.setupIndex + 1}/${SETUP_ORDER.length} — ${turnLabel} 돌 1개 배치`;
  } else if (selected) {
    statusText = `${turnLabel} 차례 — 이동할 칸을 선택하세요`;
  } else {
    statusText = `${turnLabel} 차례 — 빈 칸에 돌을 놓거나, 자신의 돌을 눌러 이동`;
  }

  const boardExtentX = SPACING * 4 + 46;
  const boardExtentY = SPACING * 4 * (Math.sqrt(3) / 2) + 46;

  return (
    <div className="page-shell" style={{ gap: 24 }}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Limn Board Game
          </p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">삼층 오목</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--ink-soft)]">
            돌을 3층까지 쌓을 수 있는 오목. 위에서 보이는 돌만이 진실 — 아래에 깔린
            돌을 기억하는 암기력과 수읽기로 승리 조건을 완성하세요.
          </p>
        </div>
        <Link href="/" className="text-sm font-semibold underline underline-offset-4">
          ← 로또 분석으로 돌아가기
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden border-none bg-[#1c2440] text-[#e8e4d8] shadow-xl">
          <CardContent className="p-3 sm:p-5">
            <div
              className={`mb-3 rounded-lg px-4 py-2 text-center text-sm font-semibold ${
                state.phase === "over"
                  ? "bg-[#c84c24] text-white"
                  : "bg-white/10"
              }`}
            >
              {statusText}
            </div>
            <svg
              viewBox={`${-boardExtentX} ${-boardExtentY} ${boardExtentX * 2} ${boardExtentY * 2}`}
              className="mx-auto block w-full max-w-[640px]"
              role="img"
              aria-label="삼층 오목 게임판"
            >
              {GRID_EDGES.map(([a, b]) => (
                <line
                  key={`${a}|${b}`}
                  x1={cellX(a)}
                  y1={cellY(a)}
                  x2={cellX(b)}
                  y2={cellY(b)}
                  stroke="#f4f3ea"
                  strokeOpacity={0.42}
                  strokeWidth={1.1}
                />
              ))}

              {BOARD_CELLS.map((cell) => {
                const key = cellKey(cell.q, cell.r);
                const x = cellX(key);
                const y = cellY(key);
                const top = topOf(state, key);
                const height = heightOf(state, key);
                const isSetupTarget = state.phase === "setup" && setupCells.has(key);
                const isMoveTarget = moveTargets.has(key);
                const isSelected = selected === key;
                const isWinCell = winCells.has(key);
                const isLastCell = lastCells.has(key) && state.phase !== "over";
                const stack = state.stacks[key];

                return (
                  <g
                    key={key}
                    data-cell={key}
                    onClick={() => handleCellClick(key)}
                    style={{ cursor: state.phase === "over" ? "default" : "pointer" }}
                  >
                    {isLastCell ? (
                      <circle cx={x} cy={y} r={STONE_RADIUS + 6} fill="#c84c24" opacity={0.25} />
                    ) : null}
                    {isWinCell ? (
                      <circle
                        cx={x}
                        cy={y}
                        r={STONE_RADIUS + 7}
                        fill="none"
                        stroke="#ffb14e"
                        strokeWidth={3}
                      />
                    ) : null}

                    {top ? (
                      <StoneGlyph x={x} y={y} player={top} height={height} />
                    ) : (
                      <circle cx={x} cy={y} r={4} fill="#f4f3ea" fillOpacity={0.5} />
                    )}

                    {revealStacks && stack && stack.length >= 2 ? (
                      <g>
                        {stack.map((stone, index) => (
                          <circle
                            key={index}
                            cx={x - ((stack.length - 1) * 9) / 2 + index * 9}
                            cy={y + STONE_RADIUS + 8}
                            r={4}
                            fill={STONE_FILL[stone]}
                            stroke="#bda079"
                            strokeWidth={1.2}
                          />
                        ))}
                      </g>
                    ) : null}

                    {isSelected ? (
                      <circle
                        cx={x}
                        cy={y}
                        r={STONE_RADIUS + 4}
                        fill="none"
                        stroke="#6fe3a5"
                        strokeWidth={3}
                      />
                    ) : null}
                    {isSetupTarget || isMoveTarget ? (
                      <circle
                        cx={x}
                        cy={y}
                        r={isMoveTarget && top ? STONE_RADIUS + 4 : 10}
                        fill={isMoveTarget && top ? "none" : "#6fe3a5"}
                        fillOpacity={isMoveTarget && top ? 1 : 0.55}
                        stroke="#6fe3a5"
                        strokeWidth={2.4}
                        strokeDasharray="5 4"
                      />
                    ) : null}

                    <circle cx={x} cy={y} r={SPACING / 2} fill="transparent" />
                  </g>
                );
              })}
            </svg>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">대국 현황</CardTitle>
              <CardDescription>각 플레이어에게 돌 25개가 제공됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {(["black", "white"] as Player[]).map((player) => {
                const active = state.phase !== "over" && state.turn === player;
                return (
                  <div
                    key={player}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      active
                        ? "border-[var(--accent)] bg-[rgba(200,76,36,0.08)]"
                        : "border-[var(--line)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <span
                        className="inline-block h-4 w-4 rounded-full border"
                        style={{
                          background: STONE_FILL[player],
                          borderColor: STONE_RIM[player],
                        }}
                      />
                      {PLAYER_LABEL[player]}
                      {active ? <Badge>차례</Badge> : null}
                    </span>
                    <span className="text-[var(--ink-soft)]">
                      손에 {state.reserves[player]} · 판 위 {onBoardCount(state, player)}
                    </span>
                  </div>
                );
              })}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={undo} disabled={history.length <= 1}>
                  무르기
                </Button>
                <Button size="sm" variant="outline" onClick={restart}>
                  새 게임
                </Button>
                <Button
                  size="sm"
                  variant={revealStacks ? "default" : "outline"}
                  onClick={() => setRevealStacks((prev) => !prev)}
                >
                  {revealStacks ? "쌓인 돌 숨기기" : "쌓인 돌 보기"}
                </Button>
              </div>
              <p className="text-xs text-[var(--ink-soft)]">
                기본은 실물처럼 맨 위 돌만 보입니다. 연습할 때만 “쌓인 돌 보기”를
                켜세요. 숫자 배지는 스택 높이(층)입니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">규칙 요약</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-xs leading-relaxed text-[var(--ink-soft)]">
              <p>
                <strong className="text-[var(--foreground)]">기본 배치</strong> — 선 1개 →
                후 2개 → 선 2개 → 후 1개 순서로 배치. 정중앙 칸과 자신의 돌과 인접한
                칸에는 놓을 수 없습니다.
              </p>
              <p>
                <strong className="text-[var(--foreground)]">돌 놓기</strong> — 빈 칸에
                손에 든 돌 1개를 새로 놓습니다.
              </p>
              <p>
                <strong className="text-[var(--foreground)]">돌 이동</strong> — 자신의
                돌(맨 위) 1개를 인접 칸으로 이동. 다른 돌 위에 쌓을 수 있으나 최대
                3층까지, 출발 칸보다 더 높이 쌓인 칸으로는 이동할 수 없습니다.
              </p>
              <p>
                <strong className="text-[var(--foreground)]">승리 조건</strong> — ① 위에서
                봤을 때 한 방향으로 정확히 5개 일렬(6개 이상은 무효) ② 자신의 돌 5개가
                3층에 위치 ③ 인접한 세 곳에서 자신의 돌 3개가 3층에 위치. 두 플레이어가
                동시에 충족하면 그 차례를 진행한 쪽이 승리합니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
