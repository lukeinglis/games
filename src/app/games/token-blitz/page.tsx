"use client";

import TokenBlitzGame from "@/components/games/TokenBlitzGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function TokenBlitzPage() {
  return (
    <GamePageWrapper
      title="Token Blitz"
      description="Guess how many BPE tokens each sentence splits into. 15 seconds per question."
      controls="Click the token count you think is correct."
    >
      <TokenBlitzGame />
    </GamePageWrapper>
  );
}
