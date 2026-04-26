export const Phase = {
  TITLE: 'TITLE',
  BUILD: 'BUILD',
  RUN: 'RUN',
  SUCCESS: 'SUCCESS',
};

export class GameState {
  constructor() {
    this.phase = Phase.TITLE;
    this.levelIndex = 0;
    this.attempts = 0;
    this.runStartTime = 0;
    this.elapsed = 0;
    this.selectedPiece = 'straightHalf';
    this.rotation = 0;
    this.inventory = {};
    this.placed = [];
    this.totalCost = 0;
    this.budget = 0;
  }

  canEdit() {
    return this.phase === Phase.BUILD;
  }

  resetForLevel(level) {
    this.phase = Phase.BUILD;
    this.attempts = 0;
    this.elapsed = 0;
    this.rotation = 0;
    this.inventory = { ...level.inventory };
    this.placed = [];
    this.totalCost = 0;
    this.budget = level.budget;
  }
}
