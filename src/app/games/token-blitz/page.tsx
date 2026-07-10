"use client";

import TokenBlitzGame from "@/components/games/TokenBlitzGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function TokenBlitzPage() {
  return (
    <GamePageWrapper title="Token Blitz">
      <TokenBlitzGame />
    </GamePageWrapper>
  );
}
