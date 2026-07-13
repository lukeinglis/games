"use client";

import FieldGoalGame from "@/components/games/FieldGoalGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function FieldGoalPage() {
  return (
    <GamePageWrapper
      title="Field Goal Frenzy"
      description="Set your power and aim to kick field goals from increasing distances. Three misses and you are done."
      controls="Click to start the power meter, click again to set aim."
    >
      <FieldGoalGame />
    </GamePageWrapper>
  );
}
