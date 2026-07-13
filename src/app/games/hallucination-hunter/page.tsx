"use client";

import HallucinationHunterGame from "@/components/games/HallucinationHunterGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function HallucinationHunterPage() {
  return (
    <GamePageWrapper
      title="Hallucination Hunter"
      description="Read paragraphs with hidden fabrications. Click sentences you think are hallucinated, then submit."
      controls="Click sentences to flag them, then press Submit."
    >
      <HallucinationHunterGame />
    </GamePageWrapper>
  );
}
