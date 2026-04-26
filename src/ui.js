import { PIECE_DEFS, PIECE_ORDER } from './pieces.js';

export class UI {
  constructor(state) {
    this.state = state;
    this.hud = document.getElementById('hud');
    this.panel = document.getElementById('piece-panel');
    this.phaseLabel = document.getElementById('phase-label');
    this.statusLine = document.getElementById('status-line');
    this.overlay = document.getElementById('screen-overlay');
    this.titleCard = document.getElementById('title-card');
    this.successCard = document.getElementById('success-card');
    this.scoreDetails = document.getElementById('score-details');
  }

  bindActionHandlers(actions) {
    document.getElementById('start-game').onclick = actions.startGame;
    document.getElementById('start-run').onclick = actions.startRun;
    document.getElementById('restart-run').onclick = actions.restartRun;
    document.getElementById('next-level').onclick = actions.nextLevel;
    document.getElementById('next-level-overlay').onclick = actions.nextLevel;
  }

  renderPieceList() {
    const canEdit = this.state.canEdit();
    this.panel.innerHTML = `<h3 style="margin-top:0;">Inventory</h3>`;
    PIECE_ORDER.forEach((k) => {
      const count = this.state.inventory[k] || 0;
      const def = PIECE_DEFS[k];
      const btn = document.createElement('button');
      btn.className = `piece-btn ${this.state.selectedPiece === k ? 'active' : ''}`;
      btn.disabled = !canEdit || count <= 0;
      btn.innerHTML = `<span>${def.name}<div class="tiny">${def.type} • Cost ${def.cost}</div></span><span>x${count}</span>`;
      btn.onclick = () => { this.state.selectedPiece = k; this.renderPieceList(); };
      this.panel.appendChild(btn);
    });
  }

  updateHUD() {
    this.phaseLabel.textContent = this.state.phase;
    this.hud.innerHTML = [
      `Level: ${this.state.levelIndex + 1}`,
      `Attempts: ${this.state.attempts}`,
      `Build Cost: ${this.state.totalCost} / ${this.state.budget}`,
      `Time: ${this.state.elapsed.toFixed(1)}s`,
    ].map((s) => `<div>${s}</div>`).join('');

    document.getElementById('next-level').classList.toggle('hidden', this.state.phase !== 'SUCCESS');
  }

  setStatus(message) {
    this.statusLine.textContent = message;
  }

  showTitle() {
    this.overlay.classList.remove('hidden');
    this.titleCard.classList.remove('hidden');
    this.successCard.classList.add('hidden');
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  showSuccess({ score, attempts, totalCost, elapsed, remainingBudget }) {
    this.overlay.classList.remove('hidden');
    this.titleCard.classList.add('hidden');
    this.successCard.classList.remove('hidden');
    this.scoreDetails.innerHTML = `
      <div>Final Score: <strong>${score}</strong></div>
      <div>Total Cost Used: ${totalCost}</div>
      <div>Remaining Budget: ${remainingBudget}</div>
      <div>Attempts: ${attempts}</div>
      <div>Time: ${elapsed.toFixed(2)}s</div>
    `;
  }
}
