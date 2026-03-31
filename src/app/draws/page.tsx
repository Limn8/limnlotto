import Link from "next/link";

import { analyzeDraw, formatCompactNumber, formatKoreanDate, getLottoDataset } from "@/lib/lotto";

function colorClass(number: number) {
  if (number <= 10) return "ball-yellow";
  if (number <= 20) return "ball-blue";
  if (number <= 30) return "ball-red";
  if (number <= 40) return "ball-gray";
  return "ball-green";
}

export default function DrawsPage() {
  const dataset = getLottoDataset();
  const draws = [...dataset.draws].reverse();

  return (
    <div className="page-shell">
      <section className="hero-panel small">
        <div className="hero-copy">
          <p className="eyebrow">회차 순 조회</p>
          <h1>최신 회차부터 1회까지, 로또번호를 회차 순으로 살펴보세요</h1>
          <p>
            각 회차를 클릭하면 합계, 홀짝 비율, 구간 분포, 연속수 여부, 1등 당첨금과
            당첨자수까지 함께 볼 수 있습니다.
          </p>
        </div>
        <div className="hero-side">
          <Link href="/" className="inline-link">
            메인 대시보드로 돌아가기
          </Link>
        </div>
      </section>

      <section className="surface-panel">
        <div className="draw-list">
          {draws.map((draw) => {
            const shape = analyzeDraw(draw);

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
                    <span>
                      1등 {formatCompactNumber(draw.divisions[0]?.prize ?? 0)}원
                    </span>
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
          })}
        </div>
      </section>
    </div>
  );
}
