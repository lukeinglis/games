"use client";

import HallucinationHunterGame from "@/components/games/HallucinationHunterGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function HallucinationHunterPage() {
  return (
    <GamePageWrapper title="Hallucination Hunter">
      <HallucinationHunterGame />
    </GamePageWrapper>
  );
}
