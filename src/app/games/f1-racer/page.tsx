"use client";

import F1Game from "@/components/games/F1Game";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function F1RacerPage() {
  return (
    <GamePageWrapper
      title="F1 Racer"
      description="Hold to fly up, release to fall. Thread through barriers across Grand Prix circuits."
      controls="Hold click, spacebar, or tap to fly. Release to drop."
    >
      <F1Game />
    </GamePageWrapper>
  );
}
