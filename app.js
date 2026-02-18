// Elden Ring Nightreign — Build Calculator
// State
let state = {
  character: null,
  level: 1,
  vessel: null,          // vessel ID
  talismans: [null, null],
  relics: [[], [], []],  // 3 slots (vessel has 3 relic slots)
  compareOpen: false,
  deepOfNight: false,    // Deep of Night relic mode
};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildCharGrid();
  buildTalismanSelects();

  document.getElementById('levelSlider').addEventListener('input', e => {
    state.level = parseInt(e.target.value);
    document.getElementById('levelDisplay').textContent = state.level;
    recalculate();
  });
});

// ── Character Grid ────────────────────────────────────────────────────────────
function buildCharGrid() {
  const grid = document.getElementById('charGrid');
  grid.innerHTML = Object.values(CHARACTERS).map(c => `
    <button class="char-btn ${c.isDLC ? 'dlc' : ''}" data-id="${c.id}" onclick="selectCharacter('${c.id}')">
      <span class="char-btn-name">${c.name}</span>
      ${c.isDLC ? '<span class="dlc-tag">DLC</span>' : ''}
    </button>
  `).join('');
}

function selectCharacter(id) {
  state.character = id;
  state.level = 1;
  state.vessel = null;
  state.relics = state.deepOfNight ? [[], [], [], [], [], []] : [[], [], []];
  document.getElementById('levelSlider').value = 1;
  document.getElementById('levelDisplay').textContent = 1;

  // Highlight selected button
  document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.char-btn[data-id="${id}"]`).classList.add('active');

  // Show level slider
  document.getElementById('levelRow').style.display = 'flex';

  // Show character info
  renderCharInfo(id);

  // Populate vessel dropdown for this character
  populateVesselSelect(id);

  // Clear relic slots
  document.getElementById('relicSlots').innerHTML = '';
  document.getElementById('vesselSlotPreview').innerHTML = '';

  // Update comparison dropdowns if open
  if (state.compareOpen) {
    populateCompareSelects(id);
  }

  recalculate();
}

function renderCharInfo(id) {
  const c = CHARACTERS[id];
  const info = document.getElementById('char-info');
  info.style.display = 'block';

  document.getElementById('charName').textContent = c.name;
  document.getElementById('charDesc').textContent = c.description;

  // Scaling badges
  document.getElementById('scalingBadges').innerHTML =
    Object.entries(c.scaling).map(([attr, grade]) =>
      `<span class="badge badge-${grade.toLowerCase()}" title="${attrLabel(attr)} Scaling">${attr.toUpperCase()} <strong>${grade}</strong></span>`
    ).join('');

  // Abilities
  document.getElementById('abilitiesRow').innerHTML = `
    <div class="ability">
      <div class="ability-type">Passive</div>
      <div class="ability-name">${c.passive.name}</div>
      <div class="ability-desc">${c.passive.desc}</div>
    </div>
    <div class="ability">
      <div class="ability-type">Skill${c.skill.cooldown ? ` · ${c.skill.cooldown}` : ''}</div>
      <div class="ability-name">${c.skill.name}</div>
      <div class="ability-desc">${c.skill.desc}</div>
    </div>
    <div class="ability">
      <div class="ability-type">Ultimate</div>
      <div class="ability-name">${c.ultimate.name}</div>
      <div class="ability-desc">${c.ultimate.desc}</div>
    </div>
  `;
}

function attrLabel(attr) {
  const map = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence', fai: 'Faith', arc: 'Arcane' };
  return map[attr] || attr;
}

// ── Custom Dropdown Logic ────────────────────────────────────────────────────
function toggleDrop(dropId) {
  const drop = document.getElementById(dropId);
  const wasOpen = drop.classList.contains('open');
  // Close all dropdowns first
  document.querySelectorAll('.custom-select.open').forEach(d => d.classList.remove('open'));
  if (!wasOpen) drop.classList.add('open');
}

// Close dropdowns when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.custom-select')) {
    document.querySelectorAll('.custom-select.open').forEach(d => d.classList.remove('open'));
  }
});

// ── Talisman Selects ─────────────────────────────────────────────────────────
function buildTalismanSelects() {
  [0, 1].forEach(slot => {
    const list = document.getElementById(`talismanList${slot}`);
    // None option
    list.innerHTML = `<div class="custom-option" data-value="" onclick="event.stopPropagation(); selectTalisman(${slot}, '')">
      <div class="custom-option-name">— None —</div>
    </div>` +
    TALISMANS.map(t => `
      <div class="custom-option" data-value="${t.id}" onclick="event.stopPropagation(); selectTalisman(${slot}, '${t.id}')">
        <div class="custom-option-name">${t.name}</div>
        <div class="custom-option-effects">${t.effects.map(e => `<span class="eff-tag-mini ${e.value > 0 ? 'eff-pos' : 'eff-neg'}">${e.label}</span>`).join('')}</div>
      </div>
    `).join('');
  });
}

function selectTalisman(slot, id) {
  state.talismans[slot] = id || null;

  // Update display
  const display = document.getElementById(`talismanDisplay${slot}`);
  if (id) {
    const t = TALISMANS.find(t => t.id === id);
    display.textContent = t.name;
    display.classList.add('has-value');
  } else {
    display.textContent = '— None —';
    display.classList.remove('has-value');
  }

  // Prevent equipping same talisman twice
  const other = slot === 0 ? 1 : 0;
  if (id && state.talismans[other] === id) {
    state.talismans[other] = null;
    const otherDisplay = document.getElementById(`talismanDisplay${other}`);
    otherDisplay.textContent = '— None —';
    otherDisplay.classList.remove('has-value');
    document.getElementById(`talismanEffects${other}`).innerHTML = '';
  }

  // Show effects below
  const effDiv = document.getElementById(`talismanEffects${slot}`);
  if (id) {
    const talisman = TALISMANS.find(t => t.id === id);
    effDiv.innerHTML = talisman.effects.map(e => `<span class="eff-tag">${e.label}</span>`).join('');
  } else {
    effDiv.innerHTML = '';
  }

  // Close dropdown
  document.getElementById(`talismanDrop${slot}`).classList.remove('open');

  recalculate();
}

// ── Vessel Selection ─────────────────────────────────────────────────────────
function populateVesselSelect(charId) {
  const list = document.getElementById('vesselList');
  const vessels = VESSELS[charId] || [];

  // Close dropdown and reset display
  document.getElementById('vesselDrop').classList.remove('open');
  document.getElementById('vesselDisplay').innerHTML = '— Select a Vessel —';
  document.getElementById('vesselDisplay').classList.remove('has-value');

  list.innerHTML = `<div class="custom-option" data-value="" onclick="event.stopPropagation(); selectVessel('')">
    <div class="custom-option-name">— None —</div>
  </div>` +
  vessels.map(v => `
    <div class="custom-option" data-value="${v.id}" onclick="event.stopPropagation(); selectVessel('${v.id}')">
      <div class="custom-option-name">${v.name}</div>
      <div class="custom-option-slots">${v.slots.map(c => `<span class="slot-dot slot-dot-${c}"></span>`).join('')}</div>
    </div>
  `).join('');
}

function selectVessel(vesselId) {
  document.getElementById('vesselDrop').classList.remove('open');
  state.vessel = vesselId || null;
  state.relics = [[], [], []];

  const display = document.getElementById('vesselDisplay');
  if (vesselId) {
    const vessel = getVessel(vesselId);
    if (vessel) {
      display.innerHTML = `${vessel.name} ${vessel.slots.map(c => `<span class="slot-dot slot-dot-${c}"></span>`).join('')}`;
      display.classList.add('has-value');
      document.getElementById('vesselSlotPreview').innerHTML = vessel.slots.map(color =>
        `<span class="slot-pip slot-pip-${color}" title="${slotLabel(color)}"></span>`
      ).join('');
      renderRelicSlots(vessel);
    }
  } else {
    display.innerHTML = '— Select a Vessel —';
    display.classList.remove('has-value');
    document.getElementById('relicSlots').innerHTML = '';
    document.getElementById('vesselSlotPreview').innerHTML = '';
  }

  recalculate();
}

function slotLabel(color) {
  const scene = RELIC_SCENES[color];
  return scene ? scene.name : capitalize(color);
}

// onVesselChange replaced by selectVessel()

function getVessel(vesselId) {
  if (!state.character) return null;
  const vessels = VESSELS[state.character] || [];
  return vessels.find(v => v.id === vesselId) || null;
}

function renderRelicSlots(vessel) {
  const container = document.getElementById('relicSlots');
  const standardSlots = vessel.slots;
  const deepSlots = (state.deepOfNight && vessel.deepSlots) ? vessel.deepSlots : [];
  const allSlots = [...standardSlots, ...deepSlots];

  container.innerHTML = allSlots.map((color, i) => {
    const isDeep = i >= 3;
    return `
      <div class="relic-slot relic-slot-${color}${isDeep ? ' relic-slot-deep' : ''}">
        ${isDeep ? '<div class="relic-deep-label">Deep of Night</div>' : ''}
        <div class="relic-slot-header">
          <span class="relic-dot relic-dot-${color}"></span>
          <span>${slotLabel(color)} Slot</span>
          <select class="relic-tier-sel" id="relicTier${i}" onchange="onRelicTierChange(${i})">
            <option value="">— Empty —</option>
            ${RELIC_TIERS.map(t => `<option value="${t.id}">${t.name} (${t.effects} effect${t.effects > 1 ? 's' : ''})</option>`).join('')}
          </select>
        </div>
        <div class="relic-effects-list" id="relicEffectRows${i}"></div>
      </div>
    `;
  }).join('');
}

function onRelicTierChange(slotIndex) {
  const tierSel = document.getElementById(`relicTier${slotIndex}`);
  const tier = RELIC_TIERS.find(t => t.id === tierSel.value);
  const container = document.getElementById(`relicEffectRows${slotIndex}`);

  if (!tier) {
    state.relics[slotIndex] = [];
    container.innerHTML = '';
    recalculate();
    return;
  }

  // Build N effect dropdowns
  const existing = state.relics[slotIndex] || [];
  state.relics[slotIndex] = Array(tier.effects).fill(null).map((_, i) => existing[i] || null);

  container.innerHTML = Array(tier.effects).fill(0).map((_, effIdx) => `
    <div class="relic-effect-row">
      <label>Effect ${effIdx + 1}</label>
      <select id="relicEff${slotIndex}_${effIdx}" onchange="onRelicEffectChange(${slotIndex}, ${effIdx})">
        <option value="">— None —</option>
        ${getRelicEffects(state.deepOfNight).map(e => `<option value="${e.id}" ${state.relics[slotIndex][effIdx] === e.id ? 'selected' : ''}>${e.label}</option>`).join('')}
      </select>
    </div>
  `).join('');

  recalculate();
}

function onRelicEffectChange(slotIndex, effIdx) {
  const val = document.getElementById(`relicEff${slotIndex}_${effIdx}`).value || null;
  state.relics[slotIndex][effIdx] = val;
  recalculate();
}

// ── Vessel Comparison ────────────────────────────────────────────────────────
function toggleComparison() {
  state.compareOpen = !state.compareOpen;
  const panel = document.getElementById('vesselCompare');
  const btn = document.getElementById('compareBtn');

  if (state.compareOpen) {
    panel.style.display = 'block';
    btn.classList.add('active');
    if (state.character) {
      populateCompareSelects(state.character);
    }
  } else {
    panel.style.display = 'none';
    btn.classList.remove('active');
  }
}

// Compare state — full relic config per side: array of 3 slots, each with effects array
let compareState = {
  A: { vessel: null, relics: [[], [], []] },
  B: { vessel: null, relics: [[], [], []] },
};

function populateCompareSelects(charId) {
  const vessels = VESSELS[charId] || [];
  const options = '<option value="">— Select —</option>' +
    vessels.map(v => `<option value="${v.id}">${v.name} (${v.slots.map(c => slotLabel(c)[0]).join('/')})</option>`).join('');

  document.getElementById('compareVesselA').innerHTML = options;
  document.getElementById('compareVesselB').innerHTML = options;
  document.getElementById('compareSlotsA').innerHTML = '';
  document.getElementById('compareSlotsB').innerHTML = '';
  document.getElementById('compareRelicsA').innerHTML = '';
  document.getElementById('compareRelicsB').innerHTML = '';
  document.getElementById('compareStatsDiff').style.display = 'none';
  compareState = {
    A: { vessel: null, relics: [[], [], []] },
    B: { vessel: null, relics: [[], [], []] },
  };
}

function renderComparison() {
  renderCompareColumn('A');
  renderCompareColumn('B');
  renderCompareStatsDiff();
}

function getCompareVessel(side) {
  const vesselId = document.getElementById(`compareVessel${side}`).value;
  if (!vesselId || !state.character) return null;
  const vessels = VESSELS[state.character] || [];
  return vessels.find(v => v.id === vesselId) || null;
}

function renderCompareColumn(side) {
  const vessel = getCompareVessel(side);
  const slotsContainer = document.getElementById(`compareSlots${side}`);
  const relicsContainer = document.getElementById(`compareRelics${side}`);

  if (!vessel) {
    slotsContainer.innerHTML = '<p class="empty-stat">Select a vessel</p>';
    relicsContainer.innerHTML = '';
    compareState[side] = { vessel: null, relics: [[], [], []] };
    return;
  }

  compareState[side].vessel = vessel.id;
  compareState[side].relics = [[], [], []];

  // Slot color chips
  slotsContainer.innerHTML = `
    <div class="compare-vessel-name">${vessel.name}</div>
    <div class="compare-slot-row">
      ${vessel.slots.map(color => `
        <div class="compare-slot-chip compare-slot-chip-${color}">
          <span class="relic-dot relic-dot-${color}"></span>
          <span>${slotLabel(color)}</span>
        </div>
      `).join('')}
    </div>
  `;

  // Full relic slots with tier + effects (mirrors main builder)
  relicsContainer.innerHTML = vessel.slots.map((color, i) => `
    <div class="compare-relic-slot relic-slot relic-slot-${color}">
      <div class="relic-slot-header">
        <span class="relic-dot relic-dot-${color}"></span>
        <span>${slotLabel(color)}</span>
        <select class="relic-tier-sel" id="cmpTier${side}${i}" onchange="onCompareTierChange('${side}', ${i})">
          <option value="">— Empty —</option>
          ${RELIC_TIERS.map(t => `<option value="${t.id}">${t.name} (${t.effects} effect${t.effects > 1 ? 's' : ''})</option>`).join('')}
        </select>
      </div>
      <div class="relic-effects-list" id="cmpEffects${side}${i}"></div>
    </div>
  `).join('');
}

function onCompareTierChange(side, slotIdx) {
  const tierSel = document.getElementById(`cmpTier${side}${slotIdx}`);
  const tier = RELIC_TIERS.find(t => t.id === tierSel.value);
  const container = document.getElementById(`cmpEffects${side}${slotIdx}`);

  if (!tier) {
    compareState[side].relics[slotIdx] = [];
    container.innerHTML = '';
    renderCompareStatsDiff();
    return;
  }

  const existing = compareState[side].relics[slotIdx] || [];
  compareState[side].relics[slotIdx] = Array(tier.effects).fill(null).map((_, i) => existing[i] || null);

  container.innerHTML = Array(tier.effects).fill(0).map((_, effIdx) => `
    <div class="relic-effect-row">
      <label>Effect ${effIdx + 1}</label>
      <select id="cmpEff${side}${slotIdx}_${effIdx}" onchange="onCompareEffectChange('${side}', ${slotIdx}, ${effIdx})">
        <option value="">— None —</option>
        ${getRelicEffects(state.deepOfNight).map(e => `<option value="${e.id}" ${compareState[side].relics[slotIdx][effIdx] === e.id ? 'selected' : ''}>${e.label}</option>`).join('')}
      </select>
    </div>
  `).join('');

  renderCompareStatsDiff();
}

function onCompareEffectChange(side, slotIdx, effIdx) {
  const val = document.getElementById(`cmpEff${side}${slotIdx}_${effIdx}`).value || null;
  compareState[side].relics[slotIdx][effIdx] = val;
  renderCompareStatsDiff();
}

function calcCompareBonus(side) {
  const bonuses = {};
  compareState[side].relics.forEach(slot => {
    slot.forEach(effId => {
      if (!effId) return;
      const eff = getRelicEffects(state.deepOfNight).find(e => e.id === effId);
      if (!eff) return;
      if (eff.type === 'percent') {
        bonuses[eff.stat] = (bonuses[eff.stat] || 0) + eff.value;
      } else if (eff.type === 'flat') {
        bonuses[eff.stat] = (bonuses[eff.stat] || 0) + eff.value;
      } else if (eff.type === 'multiplier') {
        bonuses[eff.stat] = (bonuses[eff.stat] || 0) + (eff.value - 1) * 100;
      }
    });
  });
  return bonuses;
}

function renderCompareStatsDiff() {
  const vesselA = getCompareVessel('A');
  const vesselB = getCompareVessel('B');
  const diffPanel = document.getElementById('compareStatsDiff');
  const diffBody = document.getElementById('compareStatsBody');

  if (!vesselA || !vesselB || !state.character) {
    diffPanel.style.display = 'none';
    return;
  }

  const bonusA = calcCompareBonus('A');
  const bonusB = calcCompareBonus('B');

  // Collect all stat keys
  const allStats = new Set([...Object.keys(bonusA), ...Object.keys(bonusB)]);

  // Always show the diff panel when both vessels are selected, even with no relics
  diffPanel.style.display = 'block';

  const statLabels = {
    physAtk: 'Physical Atk', magicAtk: 'Magic Atk', fireAtk: 'Fire Atk',
    lightningAtk: 'Lightning Atk', holyAtk: 'Holy Atk', rangedAtk: 'Ranged Atk',
    skillAtk: 'Skill Atk', ultimateAtk: 'Ultimate Art', criticalAtk: 'Critical Dmg',
    hp: 'HP', fp: 'FP', stamina: 'Stamina',
    physNeg: 'Phys. Neg.', magicNeg: 'Magic Neg.', fireNeg: 'Fire Neg.',
    lightningNeg: 'Lightning Neg.', holyNeg: 'Holy Neg.', nonPhysNeg: 'Elemental Neg.',
    allNeg: 'All Dmg. Neg.', poise: 'Poise',
    hpRegen: 'HP Regen', fpRegen: 'FP Regen', staminaRegen: 'Stamina Regen',
    cooldown: 'Skill CD', runes: 'Rune Gain', itemDiscovery: 'Item Discovery',
    guardCounter: 'Guard Counter', roarAtk: 'Roar/Breath',
    str: 'Strength', dex: 'Dexterity', int: 'Intelligence', fai: 'Faith', arc: 'Arcane',
    vig: 'Vigor', mnd: 'Mind', end: 'Endurance',
  };

  // Skip non-numeric/special effect stats
  const skipStats = new Set(['chargeProc', 'atkProc', 'startAffinity', 'spellDuration', 'flaskAlly', 'flaskHp', 'stanceBreak', 'thrustCounter', 'statusRes', 'poisonRes', 'bleedRes', 'frostRes', 'skillFpCost']);

  let rows = '';
  allStats.forEach(stat => {
    if (skipStats.has(stat)) return;
    const a = bonusA[stat] || 0;
    const b = bonusB[stat] || 0;
    const diff = b - a;
    const label = statLabels[stat] || stat;
    const aSign = a > 0 ? '+' : '';
    const bSign = b > 0 ? '+' : '';
    const diffSign = diff > 0 ? '+' : '';
    const diffCls = diff > 0 ? 'bonus-pos' : diff < 0 ? 'bonus-neg' : '';
    rows += `
      <div class="compare-stat-row">
        <span class="compare-stat-label">${label}</span>
        <span class="compare-stat-val">${aSign}${a.toFixed(1)}</span>
        <span class="compare-stat-val">${bSign}${b.toFixed(1)}</span>
        <span class="compare-stat-val ${diffCls}">${diff !== 0 ? diffSign + diff.toFixed(1) : '—'}</span>
      </div>`;
  });

  if (allStats.size === 0 || rows === '') {
    diffBody.innerHTML = '<p class="empty-stat">Add relics to both vessels to see stat comparison</p>';
    return;
  }

  diffBody.innerHTML = `
    <div class="compare-stat-row compare-stat-header">
      <span class="compare-stat-label">Stat</span>
      <span class="compare-stat-val">A</span>
      <span class="compare-stat-val">B</span>
      <span class="compare-stat-val">Diff</span>
    </div>
    ${rows}`;
}

// ── Deep of Night Toggle ─────────────────────────────────────────────────────
function onDeepToggle() {
  state.deepOfNight = document.getElementById('deepToggle').checked;

  if (state.deepOfNight) {
    // Expand to 6 slots, preserving existing standard slot selections
    while (state.relics.length < 6) state.relics.push([]);
  } else {
    // Shrink back to 3 slots
    state.relics = state.relics.slice(0, 3);
  }

  // Fully re-render relic slots (adds/removes Deep of Night slots)
  if (state.vessel) {
    const vessel = getVessel(state.vessel);
    if (vessel) {
      renderRelicSlots(vessel);
    }
  }

  recalculate();
}

// ── Stat Calculation ─────────────────────────────────────────────────────────
function interpolateStat(lvl1val, lvl15val, level) {
  if (level <= 1) return lvl1val;
  if (level >= 15) return lvl15val;
  const t = (level - 1) / 14;
  return Math.round(lvl1val + t * (lvl15val - lvl1val));
}

function recalculate() {
  if (!state.character) return;

  const c = CHARACTERS[state.character];
  const lvl = state.level;

  // Base stats at current level (linear interpolation between lvl1 and lvl15)
  const base = {
    hp:      interpolateStat(c.lvl1.hp,      c.lvl15.hp,      lvl),
    fp:      interpolateStat(c.lvl1.fp,      c.lvl15.fp,      lvl),
    stamina: interpolateStat(c.lvl1.stamina, c.lvl15.stamina, lvl),
    vig:     interpolateStat(c.lvl1.vig,     c.lvl15.vig,     lvl),
    mnd:     interpolateStat(c.lvl1.mnd,     c.lvl15.mnd,     lvl),
    end:     interpolateStat(c.lvl1.end,     c.lvl15.end,     lvl),
    str:     interpolateStat(c.lvl1.str,     c.lvl15.str,     lvl),
    dex:     interpolateStat(c.lvl1.dex,     c.lvl15.dex,     lvl),
    int:     interpolateStat(c.lvl1.int,     c.lvl15.int,     lvl),
    fai:     interpolateStat(c.lvl1.fai,     c.lvl15.fai,     lvl),
    arc:     interpolateStat(c.lvl1.arc,     c.lvl15.arc,     lvl),
  };

  // Bonus accumulator
  // Resource stats (hp/fp/stamina): percent and flat tracked separately
  // so they can be applied correctly: base * (1 + pct/100) + flat
  // Attribute stats: percent bonus only (e.g. Millicent's +5% DEX)
  // All other stats: combined numeric bonus for display in damage/defense/utility sections
  const bonuses = {
    // Resources — percent bonuses only
    hp: 0, fp: 0, stamina: 0,
    // Resources — flat additions (kept separate to avoid mixing with %)
    hpFlat: 0, fpFlat: 0, staminaFlat: 0,
    // Attribute percent bonuses
    vig: 0, mnd: 0, end: 0, str: 0, dex: 0, int: 0, fai: 0, arc: 0,
    // Damage
    physAtk: 0, magicAtk: 0, fireAtk: 0, lightningAtk: 0, holyAtk: 0, rangedAtk: 0, skillAtk: 0,
    // Defense
    physNeg: 0, magicNeg: 0, fireNeg: 0, lightningNeg: 0, holyNeg: 0, nonPhysNeg: 0, allNeg: 0, damageNeg: 0,
    // Utility
    poise: 0, staminaRegen: 0, fpRegen: 0, hpRegen: 0, itemDiscovery: 0, runes: 0,
    skillFpCost: 0, spellFpCost: 0, criticalAtk: 0,
    chargeAtk: 0, jumpAtk: 0, guardAbility: 0, spellSpeed: 0,
    cooldown: 0, ultimateAtk: 0,
  };

  const RESOURCE_STATS = new Set(['hp', 'fp', 'stamina']);
  const ATTR_STATS     = new Set(['vig', 'mnd', 'end', 'str', 'dex', 'int', 'fai', 'arc']);

  const modifiers = []; // All active effects shown in the Active Modifiers panel

  function applyEffect(effect, sourceName) {
    const { stat, type, value, label } = effect;
    modifiers.push({ source: sourceName, label });

    if (RESOURCE_STATS.has(stat)) {
      // Stats block — apply to HP/FP/Stamina bars directly
      if (type === 'percent') bonuses[stat] += value;
      else if (type === 'flat') bonuses[stat + 'Flat'] += value;
      else if (type === 'multiplier') bonuses[stat] += (value - 1) * 100;
    } else if (ATTR_STATS.has(stat)) {
      // Stats block — apply to attribute bars
      if (type === 'percent') bonuses[stat] += value;
      else if (type === 'flat') bonuses[stat] += value; // treat flat attr bonus as points
    } else if (bonuses[stat] !== undefined) {
      // Damage / defense / utility — listed in sections below
      if (type === 'percent' || type === 'flat') bonuses[stat] += value;
      else if (type === 'multiplier') bonuses[stat] += (value - 1) * 100;
    }
    // Special/proc/conditional effects: captured in modifiers only
  }

  // Collect talisman effects
  state.talismans.forEach(tid => {
    if (!tid) return;
    const t = TALISMANS.find(t => t.id === tid);
    if (!t) return;
    t.effects.forEach(e => applyEffect(e, t.name));
  });

  // Collect relic effects
  const vessel = state.vessel ? getVessel(state.vessel) : null;
  state.relics.forEach((slot, si) => {
    slot.forEach(effId => {
      if (!effId) return;
      const eff = getRelicEffects(state.deepOfNight).find(e => e.id === effId);
      if (!eff) return;
      const slotColor = vessel ? vessel.slots[si] : 'unknown';
      applyEffect(eff, `${slotLabel(slotColor)} Relic`);
    });
  });

  // Final computed stats
  const final = {
    // Resources: percent applied to base, then flat added on top
    hp:      Math.round(base.hp      * (1 + bonuses.hp      / 100)) + bonuses.hpFlat,
    fp:      Math.round(base.fp      * (1 + bonuses.fp      / 100)) + bonuses.fpFlat,
    stamina: Math.round(base.stamina * (1 + bonuses.stamina / 100)) + bonuses.staminaFlat,
    // Attributes: percent bonus applied
    vig: Math.round(base.vig * (1 + bonuses.vig / 100)),
    mnd: Math.round(base.mnd * (1 + bonuses.mnd / 100)),
    end: Math.round(base.end * (1 + bonuses.end / 100)),
    str: Math.round(base.str * (1 + bonuses.str / 100)),
    dex: Math.round(base.dex * (1 + bonuses.dex / 100)),
    int: Math.round(base.int * (1 + bonuses.int / 100)),
    fai: Math.round(base.fai * (1 + bonuses.fai / 100)),
    arc: Math.round(base.arc * (1 + bonuses.arc / 100)),
  };

  renderStats(base, final, bonuses, modifiers, lvl);
}

function applyPct(base, pct) {
  return Math.round(base * (1 + pct / 100));
}

// ── Stat Rendering ────────────────────────────────────────────────────────────
function renderStats(base, final, bonuses, modifiers, level) {
  document.getElementById('noCharMsg').style.display = 'none';
  document.getElementById('statLevelLabel').textContent = `at Level ${level}`;

  const char = CHARACTERS[state.character];

  // Resources — normalize bar widths to the largest value in the group
  const resMax = Math.max(final.hp, final.fp, final.stamina, 1);
  document.getElementById('resourceStats').innerHTML = [
    statBar('HP',      final.hp,      resMax, 'hp',      base.hp),
    statBar('FP',      final.fp,      resMax, 'fp',      base.fp),
    statBar('Stamina', final.stamina, resMax, 'stamina', base.stamina),
  ].join('');

  // Attributes — normalize to the largest value across current + lvl15 + any bonuses
  const attrVals = [final.vig, final.mnd, final.end, final.str, final.dex, final.int, final.fai, final.arc];
  const attrMax15 = [char.lvl15.vig, char.lvl15.mnd, char.lvl15.end, char.lvl15.str, char.lvl15.dex, char.lvl15.int, char.lvl15.fai, char.lvl15.arc];
  const attrCap = Math.max(...attrVals, ...attrMax15, 1);
  document.getElementById('attributeStats').innerHTML = [
    attrBar('Vigor',        base.vig,  final.vig,  char.lvl15.vig,  attrCap),
    attrBar('Mind',         base.mnd,  final.mnd,  char.lvl15.mnd,  attrCap),
    attrBar('Endurance',    base.end,  final.end,  char.lvl15.end,  attrCap),
    attrBar('Strength',     base.str,  final.str,  char.lvl15.str,  attrCap),
    attrBar('Dexterity',    base.dex,  final.dex,  char.lvl15.dex,  attrCap),
    attrBar('Intelligence', base.int,  final.int,  char.lvl15.int,  attrCap),
    attrBar('Faith',        base.fai,  final.fai,  char.lvl15.fai,  attrCap),
    attrBar('Arcane',       base.arc,  final.arc,  char.lvl15.arc,  attrCap),
  ].join('');

  // Damage bonuses
  const dmgStats = [
    ['Physical Atk', bonuses.physAtk],
    ['Magic Atk', bonuses.magicAtk],
    ['Fire Atk', bonuses.fireAtk],
    ['Lightning Atk', bonuses.lightningAtk],
    ['Holy Atk', bonuses.holyAtk],
    ['Ranged Atk', bonuses.rangedAtk],
    ['Skill Atk', bonuses.skillAtk],
    ['Charged Atk', bonuses.chargeAtk],
    ['Jump Atk', bonuses.jumpAtk],
    ['Critical Hits', bonuses.criticalAtk],
    ['Ultimate Art', bonuses.ultimateAtk],
  ].filter(([, v]) => v !== 0);
  document.getElementById('damageStats').innerHTML = dmgStats.length > 0
    ? dmgStats.map(([label, val]) => bonusRow(label, val, '%')).join('')
    : '<p class="empty-stat">No damage bonuses active</p>';

  // Defense bonuses
  const defStats = [
    ['Phys. Negation', bonuses.physNeg],
    ['Magic Negation', bonuses.magicNeg],
    ['Fire Negation', bonuses.fireNeg],
    ['Lightning Neg.', bonuses.lightningNeg],
    ['Holy Negation', bonuses.holyNeg],
    ['Non-Phys. Neg.', bonuses.nonPhysNeg],
    ['All Dmg. Neg.', bonuses.allNeg],
    ['Poise', bonuses.poise],
  ].filter(([, v]) => v !== 0);
  document.getElementById('defenseStats').innerHTML = defStats.length > 0
    ? defStats.map(([label, val]) => bonusRow(label, val, '%')).join('')
    : '<p class="empty-stat">No defense bonuses active</p>';

  // Utility
  const utilStats = [
    ['Stamina Regen', bonuses.staminaRegen, '/s'],
    ['FP Regen', bonuses.fpRegen, '/s'],
    ['HP Regen', bonuses.hpRegen, '/s'],
    ['Item Discovery', bonuses.itemDiscovery, ''],
    ['Rune Gain', bonuses.runes, '%'],
    ['Skill FP Cost', bonuses.skillFpCost, '%'],
    ['Spell FP Cost', bonuses.spellFpCost, ''],
    ['Cast Speed', bonuses.spellSpeed, ''],
    ['Skill Cooldown', bonuses.cooldown, '%'],
    ['Guard Ability', bonuses.guardAbility, '%'],
  ].filter(([, v]) => v !== 0);
  document.getElementById('utilityStats').innerHTML = utilStats.length > 0
    ? utilStats.map(([label, val, unit]) => bonusRow(label, val, unit)).join('')
    : '<p class="empty-stat">No utility bonuses active</p>';

  // Modifiers panel
  const modPanel = document.getElementById('modifiers-section');
  const modList = document.getElementById('modifierList');
  if (modifiers.length > 0) {
    modPanel.style.display = 'block';
    modList.innerHTML = modifiers.map(m =>
      `<li><span class="mod-source">${m.source}</span> <span class="mod-label">${m.label}</span></li>`
    ).join('');
  } else {
    modPanel.style.display = 'none';
  }
}

// statBar: shows resource (HP/FP/Stamina) with absolute delta when modified
function statBar(label, value, max, stat, base) {
  const pct = Math.min((value / max) * 100, 100);
  const delta = value - base;
  const changed = delta !== 0;
  const sign = delta > 0 ? '+' : '';
  return `
    <div class="stat-row">
      <div class="stat-label">${label}</div>
      <div class="stat-bar-wrap">
        <div class="stat-bar stat-bar-${stat}" style="width:${pct}%"></div>
      </div>
      <div class="stat-value ${changed ? (delta > 0 ? 'stat-up' : 'stat-down') : ''}">
        ${value}${changed ? `<span class="stat-delta">(${sign}${delta})</span>` : ''}
      </div>
    </div>`;
}

// attrBar: shows attribute value with optional modifier delta and level 15 cap marker
function attrBar(label, base, modified, max, capMax) {
  const displayVal = modified;
  const pct = Math.min((displayVal / capMax) * 100, 100);
  const maxPct = Math.min((max / capMax) * 100, 100);
  const delta = modified - base;
  const changed = delta !== 0;
  const sign = delta > 0 ? '+' : '';
  return `
    <div class="stat-row">
      <div class="stat-label">${label}</div>
      <div class="stat-bar-wrap">
        <div class="stat-bar stat-bar-attr" style="width:${pct}%"></div>
        <div class="stat-bar-max" style="width:${maxPct}%" title="Level 15 max"></div>
      </div>
      <div class="stat-value ${changed ? (delta > 0 ? 'stat-up' : 'stat-down') : ''}">
        ${displayVal}${changed ? `<span class="stat-delta">(${sign}${delta})</span>` : ''}<span class="stat-max">/ ${max}</span>
      </div>
    </div>`;
}

function bonusRow(label, value, unit) {
  const sign = value > 0 ? '+' : '';
  const cls = value > 0 ? 'bonus-pos' : 'bonus-neg';
  return `
    <div class="bonus-row">
      <span class="bonus-label">${label}</span>
      <span class="bonus-value ${cls}">${sign}${value}${unit}</span>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
