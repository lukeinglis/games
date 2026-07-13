"use client";

import WikiRaceGame from "@/components/games/WikiRaceGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function WikiRacePage() {
  return (
    <GamePageWrapper title="Wiki Race">
      <WikiRaceGame />
    </GamePageWrapper>
  );
}
