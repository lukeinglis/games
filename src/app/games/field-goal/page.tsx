"use client";

import FieldGoalGame from "@/components/games/FieldGoalGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function FieldGoalPage() {
  return (
    <GamePageWrapper title="Field Goal Frenzy">
      <FieldGoalGame />
    </GamePageWrapper>
  );
}
