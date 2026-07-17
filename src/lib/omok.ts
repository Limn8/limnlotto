export type Player = "black" | "white";

export type Cell = { q: number; r: number };

export type CellKey = string;

export type Stack = Player[];

export const RADIUS = 4;
export const STONES_PER_PLAYER = 25;
export const MAX_HEIGHT = 3;
export const CENTER_KEY = "0,0";

// 기본 배치 순서: 선(흑) 1개 → 후(백) 2개 → 선(흑) 2개 → 후(백) 1개
export const SETUP_ORDER: Player[] = [
  "black",
  "white",
  "white",
  "black",
  "black",
  "white",
];

export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
];

// 삼각 격자의 세 직선 축 (오목 판정용)
export const AXES: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, -1],
];

export function cellKey(q: number, r: number): CellKey {
  return `${q},${r}`;
}

export function parseKey(key: CellKey): Cell {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

function buildBoard(): Cell[] {
  const cells: Cell[] = [];
  for (let q = -RADIUS; q <= RADIUS; q += 1) {
    for (let r = -RADIUS; r <= RADIUS; r += 1) {
      if (Math.abs(q + r) <= RADIUS) cells.push({ q, r });
    }
  }
  return cells;
}

export const BOARD_CELLS: ReadonlyArray<Cell> = buildBoard();
export const BOARD_KEYS: ReadonlySet<CellKey> = new Set(
  BOARD_CELLS.map((cell) => cellKey(cell.q, cell.r)),
);

export function neighborsOf(key: CellKey): CellKey[] {
  const { q, r } = parseKey(key);
  const result: CellKey[] = [];
  for (const [dq, dr] of DIRECTIONS) {
    const next = cellKey(q + dq, r + dr);
    if (BOARD_KEYS.has(next)) result.push(next);
  }
  return result;
}

export type WinReason = "omok" | "fiveOnTop" | "threeAdjacentOnTop";

export interface WinInfo {
  player: Player;
  reason: WinReason;
  cells: CellKey[];
}

export type Phase = "setup" | "main" | "over";

export type Action =
  | { type: "place"; cell: CellKey }
  | { type: "move"; from: CellKey; to: CellKey };

export interface GameState {
  stacks: Record<CellKey, Stack>;
  phase: Phase;
  turn: Player;
  setupIndex: number;
  reserves: Record<Player, number>;
  win: WinInfo | null;
  lastCells: CellKey[];
  moveCount: number;
}

export function opponent(player: Player): Player {
  return player === "black" ? "white" : "black";
}

export function createGame(): GameState {
  return {
    stacks: {},
    phase: "setup",
    turn: SETUP_ORDER[0],
    setupIndex: 0,
    reserves: { black: STONES_PER_PLAYER, white: STONES_PER_PLAYER },
    win: null,
    lastCells: [],
    moveCount: 0,
  };
}

export function heightOf(state: GameState, key: CellKey): number {
  return state.stacks[key]?.length ?? 0;
}

export function topOf(state: GameState, key: CellKey): Player | null {
  const stack = state.stacks[key];
  return stack && stack.length > 0 ? stack[stack.length - 1] : null;
}

/** 기본 배치 단계에서 현재 플레이어가 놓을 수 있는 칸 */
export function legalSetupCells(state: GameState): CellKey[] {
  const player = state.turn;
  const result: CellKey[] = [];
  for (const key of BOARD_KEYS) {
    if (key === CENTER_KEY) continue;
    if (heightOf(state, key) > 0) continue;
    const nearOwn = neighborsOf(key).some(
      (n) => topOf(state, n) === player,
    );
    if (!nearOwn) result.push(key);
  }
  return result;
}

export function canPlace(state: GameState, key: CellKey): boolean {
  if (!BOARD_KEYS.has(key)) return false;
  if (state.phase === "setup") return legalSetupCells(state).includes(key);
  if (state.phase !== "main") return false;
  if (state.reserves[state.turn] <= 0) return false;
  return heightOf(state, key) === 0;
}

/** 자신의 돌(스택 맨 위)인지 — 이동을 위해 선택 가능한지 */
export function canSelect(state: GameState, key: CellKey): boolean {
  return state.phase === "main" && topOf(state, key) === state.turn;
}

/**
 * 돌 이동 규칙: 인접 칸으로만, 최대 3층까지,
 * 원래 있던 칸보다 더 높은 칸(스택)으로는 이동 불가.
 */
export function legalMoveTargets(state: GameState, from: CellKey): CellKey[] {
  if (!canSelect(state, from)) return [];
  const srcHeight = heightOf(state, from);
  return neighborsOf(from).filter((to) => {
    const destHeight = heightOf(state, to);
    return destHeight < MAX_HEIGHT && destHeight <= srcHeight;
  });
}

function topColorAt(stacks: Record<CellKey, Stack>, key: CellKey): Player | null {
  const stack = stacks[key];
  return stack && stack.length > 0 ? stack[stack.length - 1] : null;
}

/** 위에서 봤을 때 정확히 5개가 일렬 (6개 이상은 무효) */
function findOmok(stacks: Record<CellKey, Stack>, player: Player): CellKey[] | null {
  for (const [dq, dr] of AXES) {
    for (const cell of BOARD_CELLS) {
      const key = cellKey(cell.q, cell.r);
      if (topColorAt(stacks, key) !== player) continue;
      const prev = cellKey(cell.q - dq, cell.r - dr);
      if (BOARD_KEYS.has(prev) && topColorAt(stacks, prev) === player) continue;
      const run: CellKey[] = [];
      let q = cell.q;
      let r = cell.r;
      while (true) {
        const cur = cellKey(q, r);
        if (!BOARD_KEYS.has(cur) || topColorAt(stacks, cur) !== player) break;
        run.push(cur);
        q += dq;
        r += dr;
      }
      if (run.length === 5) return run;
    }
  }
  return null;
}

function levelThreeCells(stacks: Record<CellKey, Stack>, player: Player): CellKey[] {
  const result: CellKey[] = [];
  for (const [key, stack] of Object.entries(stacks)) {
    if (stack.length === MAX_HEIGHT && stack[stack.length - 1] === player) {
      result.push(key);
    }
  }
  return result;
}

/** 3층에 자신의 돌 5개 */
function findFiveOnTop(stacks: Record<CellKey, Stack>, player: Player): CellKey[] | null {
  const cells = levelThreeCells(stacks, player);
  return cells.length >= 5 ? cells : null;
}

/** 인접한 세 곳에서 자신의 돌이 3층에 위치 (연결된 3칸) */
function findThreeAdjacentOnTop(
  stacks: Record<CellKey, Stack>,
  player: Player,
): CellKey[] | null {
  const cells = new Set(levelThreeCells(stacks, player));
  const visited = new Set<CellKey>();
  for (const start of cells) {
    if (visited.has(start)) continue;
    const component: CellKey[] = [];
    const queue = [start];
    visited.add(start);
    while (queue.length > 0) {
      const cur = queue.pop() as CellKey;
      component.push(cur);
      for (const n of neighborsOf(cur)) {
        if (cells.has(n) && !visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    if (component.length >= 3) return component;
  }
  return null;
}

function findWinFor(stacks: Record<CellKey, Stack>, player: Player): WinInfo | null {
  const omok = findOmok(stacks, player);
  if (omok) return { player, reason: "omok", cells: omok };
  const five = findFiveOnTop(stacks, player);
  if (five) return { player, reason: "fiveOnTop", cells: five };
  const three = findThreeAdjacentOnTop(stacks, player);
  if (three) return { player, reason: "threeAdjacentOnTop", cells: three };
  return null;
}

/** 두 플레이어 모두 충족 시 이번 차례를 진행한 플레이어가 승리 */
function evaluateWin(stacks: Record<CellKey, Stack>, actor: Player): WinInfo | null {
  return findWinFor(stacks, actor) ?? findWinFor(stacks, opponent(actor));
}

function advance(state: GameState, actor: Player, lastCells: CellKey[]): GameState {
  const win = state.phase === "setup" ? null : evaluateWin(state.stacks, actor);
  if (win) {
    return { ...state, phase: "over", win, lastCells, moveCount: state.moveCount + 1 };
  }
  if (state.phase === "setup") {
    const nextIndex = state.setupIndex + 1;
    if (nextIndex >= SETUP_ORDER.length) {
      return {
        ...state,
        phase: "main",
        setupIndex: nextIndex,
        turn: "black",
        lastCells,
        moveCount: state.moveCount + 1,
      };
    }
    return {
      ...state,
      setupIndex: nextIndex,
      turn: SETUP_ORDER[nextIndex],
      lastCells,
      moveCount: state.moveCount + 1,
    };
  }
  return {
    ...state,
    turn: opponent(actor),
    lastCells,
    moveCount: state.moveCount + 1,
  };
}

export function applyPlace(state: GameState, key: CellKey): GameState {
  if (!canPlace(state, key)) return state;
  const actor = state.turn;
  const stacks = { ...state.stacks, [key]: [actor] };
  const next: GameState = {
    ...state,
    stacks,
    reserves: { ...state.reserves, [actor]: state.reserves[actor] - 1 },
  };
  return advance(next, actor, [key]);
}

export function applyMove(state: GameState, from: CellKey, to: CellKey): GameState {
  if (!legalMoveTargets(state, from).includes(to)) return state;
  const actor = state.turn;
  const source = state.stacks[from];
  const stacks = { ...state.stacks };
  const remaining = source.slice(0, -1);
  if (remaining.length === 0) {
    delete stacks[from];
  } else {
    stacks[from] = remaining;
  }
  stacks[to] = [...(state.stacks[to] ?? []), actor];
  const next: GameState = { ...state, stacks };
  return advance(next, actor, [from, to]);
}

export function applyAction(state: GameState, action: Action): GameState {
  if (action.type === "place") return applyPlace(state, action.cell);
  return applyMove(state, action.from, action.to);
}

export const WIN_REASON_LABEL: Record<WinReason, string> = {
  omok: "오목 (일렬 5개)",
  fiveOnTop: "3층 돌 5개",
  threeAdjacentOnTop: "인접한 3층 돌 3개",
};

export const PLAYER_LABEL: Record<Player, string> = {
  black: "흑 (선)",
  white: "백 (후)",
};
