"use client";

import PenaltyKick from "@/components/games/PenaltyKick";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function PenaltyKickPage() {
  return (
    <GamePageWrapper
      title="Penalty Kick"
      description="Pick your spot in the goal and fire. The keeper gets smarter as your streak grows. One save and it is game over."
      controls="Click or tap on the goal to shoot."
    >
      <PenaltyKick />
    </GamePageWrapper>
  );
}
