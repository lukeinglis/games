"use client";

import GuessTheFlag from "@/components/games/GuessTheFlag";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function GuessTheFlagPage() {
  return (
    <GamePageWrapper title="Guess the Flag">
      <GuessTheFlag />
    </GamePageWrapper>
  );
}
