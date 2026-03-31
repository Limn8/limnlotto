import Link from "next/link";

import { DrawSearchList } from "@/components/draw-search-list";
import { getLottoDataset } from "@/lib/lotto";

export default function DrawsPage() {
  const dataset = getLottoDataset();
  const draws = [...dataset.draws]
    .reverse()
    .map((draw) => ({
      drawNo: draw.drawNo,
      date: draw.date,
      numbers: draw.numbers,
      bonusNo: draw.bonusNo,
      firstPrize: draw.divisions[0]?.prize ?? 0,
    }));

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
          <Link href="/stores" className="inline-link">
            명당 지도 보기
          </Link>
        </div>
      </section>

      <section className="surface-panel">
        <DrawSearchList draws={draws} />
      </section>
    </div>
  );
}
