"use client";

import BreakawayGame from "@/components/games/BreakawayGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function BreakawayPage() {
  return (
    <GamePageWrapper
      title="Breakaway"
      description="Dodge tacklers and sprint for the end zone. Score touchdowns to earn points with streak multipliers."
      controls="Arrow keys or swipe to change lanes. Tap left/right side on mobile."
    >
      <BreakawayGame />
    </GamePageWrapper>
  );
}
