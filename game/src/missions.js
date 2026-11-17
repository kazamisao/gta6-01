// Missions and story for Solara Bay. Pure state machine: no DOM, no canvas.
// Nia Reyes, getaway driver, is pulled into a waterfront redevelopment conspiracy
// run by developer Marlo Venn. Three story missions, then free-roam contracts.
export const MISSION_DEFS = [
  {
    id: 'borrowed-wheels',
    title: 'Borrowed Wheels',
    reward: 500,
    briefing: 'Rosa needs a witness moved across town before Venn\'s men find her. Steal a car — any car — and bring the witness to the safehouse.',
    steps: [
      { id: 'steal', text: 'Steal a car (walk up to one and press E)', target: 'car' },
      { id: 'pickup', text: 'Pick up the witness at Crescent Park', target: 'park' },
      { id: 'deliver', text: 'Deliver her to Rosa\'s Garage — avoid the police', target: 'safehouse' },
    ],
  },
  {
    id: 'night-shift',
    title: 'Night Shift',
    reward: 1200,
    briefing: 'Venn\'s Harbor Depot hides the proof: the forged land deeds. Get in on foot, grab the deeds, and get out before the guards call it in.',
    steps: [
      { id: 'infiltrate', text: 'Reach the Harbor Depot on foot', target: 'depot' },
      { id: 'grab', text: 'Grab the deeds (press E at the depot office)', target: 'depot-office' },
      { id: 'escape', text: 'Escape to the marina with the deeds', target: 'marina' },
    ],
  },
  {
    id: 'high-tide',
    title: 'High Tide',
    reward: 2500,
    briefing: 'Venn\'s convoy is moving the money along Bay Boulevard. Ram the lead car off the road, grab the ledger, and expose the deal.',
    steps: [
      { id: 'chase', text: 'Catch Venn\'s convoy on Bay Boulevard', target: 'convoy' },
      { id: 'ram', text: 'Ram the lead car until it stops', target: 'convoy-lead' },
      { id: 'ledger', text: 'Grab the ledger and reach the radio tower', target: 'tower' },
    ],
  },
];

export function createMissions() {
  let index = 0;
  let stepIndex = 0;
  let cash = 0;
  let active = false;
  return {
    get cash() { return cash; },
    get index() { return index; },
    get stepIndex() { return stepIndex; },
    get active() { return active; },
    available() {
      return index < MISSION_DEFS.length ? MISSION_DEFS[index] : null;
    },
    currentStep() {
      const def = this.available();
      return def ? def.steps[stepIndex] : null;
    },
    start() {
      if (this.available()) { active = true; stepIndex = 0; return true; }
      return false;
    },
    advanceStep() {
      const def = this.available();
      if (!def) return false;
      stepIndex += 1;
      if (stepIndex >= def.steps.length) {
        cash += def.reward;
        index += 1;
        stepIndex = 0;
        active = false;
        return 'completed';
      }
      return 'advanced';
    },
    completeCurrent() {
      const def = this.available();
      if (!def) return false;
      cash += def.reward;
      index += 1;
      stepIndex = 0;
      active = false;
      return true;
    },
    completedCount() { return index; },
    isDone() { return index >= MISSION_DEFS.length; },
    serialize() { return { index, cash }; },
    restore(data) {
      if (!data) return;
      index = Math.min(Math.max(0, data.index | 0), MISSION_DEFS.length);
      cash = Math.max(0, data.cash | 0);
      stepIndex = 0;
      active = false;
    },
  };
}
