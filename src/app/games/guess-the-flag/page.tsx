"use client";

import GuessTheFlag from "@/components/games/GuessTheFlag";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function GuessTheFlagPage() {
  return (
    <GamePageWrapper
      title="Guess the Flag"
      description="Identify World Cup 2026 team flags. One wrong answer ends the game. Build streaks for combo multipliers."
      controls="Click or tap the correct country name."
    >
      <GuessTheFlag />
    </GamePageWrapper>
  );
}
