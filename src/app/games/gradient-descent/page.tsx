"use client";

import GradientDescentGame from "@/components/games/GradientDescentGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function GradientDescentPage() {
  return (
    <GamePageWrapper
      title="Gradient Descent"
      description="Guide a ball down a loss landscape to find the global minimum. Avoid local minima traps."
      controls="Click or tap to nudge the ball toward that point. 50 nudges per level, 3 lives."
    >
      <GradientDescentGame />
    </GamePageWrapper>
  );
}
