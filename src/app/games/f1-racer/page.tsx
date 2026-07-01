"use client";

import F1Game from "@/components/games/F1Game";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function F1RacerPage() {
  return (
    <GamePageWrapper title="F1 Racer">
      <F1Game />
    </GamePageWrapper>
  );
}
