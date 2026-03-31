"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DrawListEntry = {
  drawNo: number;
  date: string;
  numbers: number[];
  bonusNo: number;
  firstPrize: number;
};

type DrawSearchListProps = {
  draws: DrawListEntry[];
};

function colorClass(number: number) {
  if (number <= 10) return "ball-yellow";
  if (number <= 20) return "ball-blue";
  if (number <= 30) return "ball-red";
  if (number <= 40) return "ball-gray";
  return "ball-green";
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatKoreanDate(isoDate: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(isoDate));
}

function analyzeDraw(numbers: number[]) {
  const sum = numbers.reduce((total, value) => total + value, 0);
  const oddCount = numbers.filter((value) => value % 2 === 1).length;
  const evenCount = numbers.length - oddCount;

  return { sum, oddCount, evenCount };
}

export function DrawSearchList({ draws }: DrawSearchListProps) {
  const [query, setQuery] = useState("");
  const [minDraw, setMinDraw] = useState("");
  const [maxDraw, setMaxDraw] = useState("");
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  const newestDrawNo = draws[0]?.drawNo ?? 0;
  const oldestDrawNo = draws.at(-1)?.drawNo ?? 0;

  const filteredDraws = useMemo(() => {
    const normalizedQuery = query.trim();
    const minValue = minDraw ? Number(minDraw) : null;
    const maxValue = maxDraw ? Number(maxDraw) : null;

    return draws.filter((draw) => {
      const matchesQuery = normalizedQuery ? String(draw.drawNo).includes(normalizedQuery) : true;
      const matchesMin = minValue !== null ? draw.drawNo >= minValue : true;
      const matchesMax = maxValue !== null ? draw.drawNo <= maxValue : true;
      const matchesNumbers = selectedNumbers.length
        ? selectedNumbers.every((number) => draw.numbers.includes(number) || draw.bonusNo === number)
        : true;

      return matchesQuery && matchesMin && matchesMax && matchesNumbers;
    });
  }, [draws, maxDraw, minDraw, query, selectedNumbers]);

  function toggleNumber(target: number) {
    setSelectedNumbers((current) =>
      current.includes(target)
        ? current.filter((value) => value !== target)
        : [...current, target].sort((left, right) => left - right),
    );
  }

  return (
    <>
      <div className="draw-search-bar">
        <div className="draw-search-input-wrap">
          <label htmlFor="draw-search" className="draw-search-label">
            회차 검색
          </label>
          <input
            id="draw-search"
            type="search"
            inputMode="numeric"
            placeholder="예: 1217"
            value={query}
            onChange={(event) => setQuery(event.target.value.replace(/[^\d]/g, ""))}
            className="draw-search-input"
          />
        </div>
        <div className="draw-range-group">
          <div className="draw-search-input-wrap">
            <label htmlFor="draw-min" className="draw-search-label">
              시작 회차
            </label>
            <input
              id="draw-min"
              type="search"
              inputMode="numeric"
              placeholder={`${oldestDrawNo}`}
              value={minDraw}
              onChange={(event) => setMinDraw(event.target.value.replace(/[^\d]/g, ""))}
              className="draw-search-input"
            />
          </div>
          <span className="draw-range-divider">~</span>
          <div className="draw-search-input-wrap">
            <label htmlFor="draw-max" className="draw-search-label">
              끝 회차
            </label>
            <input
              id="draw-max"
              type="search"
              inputMode="numeric"
              placeholder={`${newestDrawNo}`}
              value={maxDraw}
              onChange={(event) => setMaxDraw(event.target.value.replace(/[^\d]/g, ""))}
              className="draw-search-input"
            />
          </div>
        </div>
        <div className="draw-search-meta">
          <span>{filteredDraws.length}개 결과</span>
          {query || minDraw || maxDraw || selectedNumbers.length ? (
            <button
              type="button"
              className="draw-search-clear"
              onClick={() => {
                setQuery("");
                setMinDraw("");
                setMaxDraw("");
                setSelectedNumbers([]);
              }}
            >
              전체 보기
            </button>
          ) : null}
        </div>
      </div>

      <div className="draw-number-filter">
        <div className="draw-number-filter-head">
          <strong>번호 포함 필터</strong>
          <p>공 번호를 누르면 그 번호가 포함된 당첨 회차만 보입니다.</p>
        </div>
        <div className="draw-number-grid">
          {Array.from({ length: 45 }, (_, index) => {
            const value = index + 1;
            const active = selectedNumbers.includes(value);

            return (
              <button
                key={value}
                type="button"
                className={`lotto-ball draw-filter-ball ${colorClass(value)} ${active ? "active" : ""}`}
                onClick={() => toggleNumber(value)}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      <div className="draw-list">
        {filteredDraws.length ? (
          filteredDraws.map((draw) => {
            const shape = analyzeDraw(draw.numbers);

            return (
              <Link key={draw.drawNo} href={`/draws/${draw.drawNo}`} className="draw-list-item">
                <div className="draw-list-head">
                  <div>
                    <strong>{draw.drawNo}회</strong>
                    <p>{formatKoreanDate(draw.date)}</p>
                  </div>
                  <div className="draw-metrics">
                    <span>합계 {shape.sum}</span>
                    <span>
                      홀짝 {shape.oddCount}:{shape.evenCount}
                    </span>
                    <span>1등 {formatCompactNumber(draw.firstPrize)}원</span>
                  </div>
                </div>
                <div className="ball-row">
                  {draw.numbers.map((value) => (
                    <span key={value} className={`lotto-ball ${colorClass(value)}`}>
                      {value}
                    </span>
                  ))}
                  <span className="ball-plus">+</span>
                  <span className={`lotto-ball ${colorClass(draw.bonusNo)} bonus-ball`}>
                    {draw.bonusNo}
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="draw-empty-state">
            <strong>검색 결과가 없어요</strong>
            <p>회차 번호를 다시 입력하거나 `전체 보기`로 돌아가 보세요.</p>
          </div>
        )}
      </div>
    </>
  );
}
