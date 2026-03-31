import Link from "next/link";
import { notFound } from "next/navigation";

import {
  analyzeDraw,
  formatCompactNumber,
  formatKoreanDate,
  getLottoDataset,
} from "@/lib/lotto";

function colorClass(number: number) {
  if (number <= 10) return "ball-yellow";
  if (number <= 20) return "ball-blue";
  if (number <= 30) return "ball-red";
  if (number <= 40) return "ball-gray";
  return "ball-green";
}

export function generateStaticParams() {
  const dataset = getLottoDataset();
  return dataset.draws.map((draw) => ({ drawNo: `${draw.drawNo}` }));
}

export default async function DrawDetailPage({
  params,
}: {
  params: Promise<{ drawNo: string }>;
}) {
  const { drawNo } = await params;
  const dataset = getLottoDataset();
  const draw = dataset.draws.find((entry) => entry.drawNo === Number(drawNo));

  if (!draw) notFound();

  const shape = analyzeDraw(draw);
  const previousDraw = dataset.draws.find((entry) => entry.drawNo === draw.drawNo - 1);
  const nextDraw = dataset.draws.find((entry) => entry.drawNo === draw.drawNo + 1);

  return (
    <div className="page-shell">
      <section className="hero-panel small">
        <div className="hero-copy">
          <p className="eyebrow">회차 상세</p>
          <h1>{draw.drawNo}회 로또 6/45 당첨번호</h1>
          <p>{formatKoreanDate(draw.date)} 추첨</p>
        </div>
        <div className="hero-side link-stack">
          <Link href="/draws" className="inline-link">
            전체 회차 목록
          </Link>
          <Link href="/" className="inline-link">
            메인 대시보드
          </Link>
        </div>
      </section>

      <section className="surface-panel">
        <div className="ball-row hero-balls">
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

        <div className="detail-grid">
          <article className="detail-card">
            <p>번호 합계</p>
            <strong>{shape.sum}</strong>
          </article>
          <article className="detail-card">
            <p>홀짝 비율</p>
            <strong>
              {shape.oddCount}:{shape.evenCount}
            </strong>
          </article>
          <article className="detail-card">
            <p>저·고번호 비율</p>
            <strong>
              {shape.lowCount}:{shape.highCount}
            </strong>
          </article>
          <article className="detail-card">
            <p>1등 당첨금</p>
            <strong>{formatCompactNumber(draw.divisions[0]?.prize ?? 0)}원</strong>
          </article>
          <article className="detail-card">
            <p>1등 당첨자수</p>
            <strong>{formatCompactNumber(draw.divisions[0]?.winners ?? 0)}명</strong>
          </article>
          <article className="detail-card">
            <p>자동/반자동/수동</p>
            <strong>
              {draw.winnersCombination.auto}/{draw.winnersCombination.semiAuto}/
              {draw.winnersCombination.manual}
            </strong>
          </article>
        </div>

        <div className="analysis-box">
          <h2>회차 해석</h2>
          <ul className="analysis-list">
            <li>
              연속수:{" "}
              {shape.consecutivePairs.length
                ? shape.consecutivePairs.map((pair) => `${pair[0]}-${pair[1]}`).join(", ")
                : "없음"}
            </li>
            <li>끝수 다양성은 {shape.endDigitSpread}개입니다.</li>
            <li>
              1등 당첨자 중 자동 {draw.winnersCombination.auto}명, 반자동{" "}
              {draw.winnersCombination.semiAuto}명, 수동 {draw.winnersCombination.manual}명입니다.
            </li>
          </ul>
        </div>

        <div className="nav-row">
          {previousDraw ? (
            <Link href={`/draws/${previousDraw.drawNo}`} className="nav-card">
              <span>이전 회차</span>
              <strong>{previousDraw.drawNo}회</strong>
            </Link>
          ) : (
            <div className="nav-card disabled">
              <span>이전 회차</span>
              <strong>없음</strong>
            </div>
          )}
          {nextDraw ? (
            <Link href={`/draws/${nextDraw.drawNo}`} className="nav-card">
              <span>다음 회차</span>
              <strong>{nextDraw.drawNo}회</strong>
            </Link>
          ) : (
            <div className="nav-card disabled">
              <span>다음 회차</span>
              <strong>없음</strong>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
