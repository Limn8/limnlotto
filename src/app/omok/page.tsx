import type { Metadata } from "next";

import { ThreeLayerOmok } from "@/components/omok/three-layer-omok";

export const metadata: Metadata = {
  title: "삼층 오목",
  description:
    "돌을 3층까지 쌓을 수 있는 삼각 격자 오목. 암기력과 수읽기로 오목·3층 5개·인접한 3층 3개 승리 조건을 달성하세요.",
};

export default function OmokPage() {
  return <ThreeLayerOmok />;
}
