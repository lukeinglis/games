"use client";

import OverfitGame from "@/components/games/OverfitGame";
import GamePageWrapper from "@/components/games/GamePageWrapper";

export default function OverfitPage() {
  return (
    <GamePageWrapper
      title="Overfit!"
      description="Draw a curve through noisy data points. Too simple is underfit, too wiggly is overfit. Find the sweet spot."
      controls="Click and drag to draw your curve. Submit Fit to score."
    >
      <OverfitGame />
    </GamePageWrapper>
  );
}
