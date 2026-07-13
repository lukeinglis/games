"use client";

import WikiRaceGame from "@/components/games/WikiRaceGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function WikiRacePage() {
  return (
    <GamePageWrapper
      title="Wiki Race"
      description="Spin the wheels to get two random Wikipedia articles. Navigate from start to target using only internal links."
      controls="Click links in the Wikipedia article to navigate. Fewest hops wins."
    >
      <WikiRaceGame />
    </GamePageWrapper>
  );
}
