// Elden Ring Nightreign — Build Calculator
// State
let state = {
  character: null,
  level: 1,
  talismans: [null, null],    // up to 2 talisman IDs
  relics: [[], [], [], []],   // 4 slots, each an array of relic effect IDs
};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildCharGrid();
  buildTalismanSelects();
  buildRelicSlots();

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
  document.getElementById('levelSlider').value = 1;
  document.getElementById('levelDisplay').textContent = 1;

  // Highlight selected button
  document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.char-btn[data-id="${id}"]`).classList.add('active');

  // Show level slider
  document.getElementById('levelRow').style.display = 'flex';

  // Show character info
  renderCharInfo(id);

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

// ── Talisman Selects ─────────────────────────────────────────────────────────
function buildTalismanSelects() {
  [0, 1].forEach(slot => {
    const sel = document.getElementById(`talismanSelect${slot}`);
    TALISMANS.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      sel.appendChild(opt);
    });
  });
}

function onTalismanChange(slot) {
  const id = document.getElementById(`talismanSelect${slot}`).value || null;
  state.talismans[slot] = id;

  // Prevent equipping same talisman twice
  const other = slot === 0 ? 1 : 0;
  const otherSel = document.getElementById(`talismanSelect${other}`);
  if (id && otherSel.value === id) {
    otherSel.value = '';
    state.talismans[other] = null;
  }

  // Show effects
  const effDiv = document.getElementById(`talismanEffects${slot}`);
  if (id) {
    const talisman = TALISMANS.find(t => t.id === id);
    effDiv.innerHTML = talisman.effects.map(e => `<span class="eff-tag">${e.label}</span>`).join('');
  } else {
    effDiv.innerHTML = '';
  }

  recalculate();
}

// ── Relic Slots ───────────────────────────────────────────────────────────────
function buildRelicSlots() {
  const container = document.getElementById('relicSlots');
  container.innerHTML = VESSEL_SLOTS.map((color, i) => `
    <div class="relic-slot relic-slot-${color}">
      <div class="relic-slot-header">
        <span class="relic-dot relic-dot-${color}"></span>
        <span>${capitalize(color)} Vessel</span>
        <select class="relic-tier-sel" id="relicTier${i}" onchange="onRelicTierChange(${i})">
          <option value="">— Empty —</option>
          ${RELIC_TIERS.map(t => `<option value="${t.id}">${t.name} (${t.effects} effect${t.effects > 1 ? 's' : ''})</option>`).join('')}
        </select>
      </div>
      <div class="relic-effects-list" id="relicEffectRows${i}"></div>
    </div>
  `).join('');
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
        ${RELIC_EFFECTS.map(e => `<option value="${e.id}" ${state.relics[slotIndex][effIdx] === e.id ? 'selected' : ''}>${e.label}</option>`).join('')}
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
  const bonuses = {
    hp: 0, fp: 0, stamina: 0,
    physAtk: 0, magicAtk: 0, fireAtk: 0, lightningAtk: 0, holyAtk: 0, rangedAtk: 0, skillAtk: 0,
    physNeg: 0, magicNeg: 0, fireNeg: 0, lightningNeg: 0, holyNeg: 0, nonPhysNeg: 0, allNeg: 0, damageNeg: 0,
    poise: 0, staminaRegen: 0, fpRegen: 0, hpRegen: 0, itemDiscovery: 0, runes: 0,
    skillFpCost: 0, spellFpCost: 0, criticalAtk: 0,
    chargeAtk: 0, jumpAtk: 0, guardAbility: 0, spellSpeed: 0,
    cooldown: 0, ultimateAtk: 0,
  };

  const modifiers = []; // Human-readable list

  // Collect talisman effects
  state.talismans.forEach(tid => {
    if (!tid) return;
    const t = TALISMANS.find(t => t.id === tid);
    if (!t) return;
    t.effects.forEach(e => {
      if (e.type === 'percent' && bonuses[e.stat] !== undefined) {
        bonuses[e.stat] += e.value;
        modifiers.push({ source: t.name, label: e.label });
      } else if (e.type === 'flat' && bonuses[e.stat] !== undefined) {
        bonuses[e.stat] += e.value;
        modifiers.push({ source: t.name, label: e.label });
      } else {
        modifiers.push({ source: t.name, label: e.label });
      }
    });
  });

  // Collect relic effects
  state.relics.forEach((slot, si) => {
    slot.forEach(effId => {
      if (!effId) return;
      const eff = RELIC_EFFECTS.find(e => e.id === effId);
      if (!eff) return;
      if (eff.type === 'percent' && bonuses[eff.stat] !== undefined) {
        bonuses[eff.stat] += eff.value;
      } else if (eff.type === 'flat' && bonuses[eff.stat] !== undefined) {
        bonuses[eff.stat] += eff.value;
      } else if (eff.type === 'multiplier' && bonuses[eff.stat] !== undefined) {
        bonuses[eff.stat] += (eff.value - 1) * 100;
      }
      modifiers.push({ source: `${capitalize(VESSEL_SLOTS[si])} Relic`, label: eff.label });
    });
  });

  // Final computed stats
  const final = {
    hp:      applyPct(base.hp, bonuses.hp),
    fp:      applyPct(base.fp, bonuses.fp),
    stamina: applyPct(base.stamina, bonuses.stamina),
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

  // Resources
  document.getElementById('resourceStats').innerHTML = [
    statBar('HP',      final.hp,      2000, 'hp',      base.hp,      bonuses.hp),
    statBar('FP',      final.fp,      300,  'fp',      base.fp,      bonuses.fp),
    statBar('Stamina', final.stamina, 180,  'stamina', base.stamina, bonuses.stamina),
  ].join('');

  // Attributes
  document.getElementById('attributeStats').innerHTML = [
    attrBar('Vigor',        base.vig,  char.lvl15.vig,  80),
    attrBar('Mind',         base.mnd,  char.lvl15.mnd,  40),
    attrBar('Endurance',    base.end,  char.lvl15.end,  50),
    attrBar('Strength',     base.str,  char.lvl15.str,  80),
    attrBar('Dexterity',    base.dex,  char.lvl15.dex,  80),
    attrBar('Intelligence', base.int,  char.lvl15.int,  80),
    attrBar('Faith',        base.fai,  char.lvl15.fai,  80),
    attrBar('Arcane',       base.arc,  char.lvl15.arc,  40),
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

function statBar(label, value, max, stat, base, bonusPct) {
  const pct = Math.min((value / max) * 100, 100);
  const changed = bonusPct !== 0;
  const sign = bonusPct > 0 ? '+' : '';
  return `
    <div class="stat-row">
      <div class="stat-label">${label}</div>
      <div class="stat-bar-wrap">
        <div class="stat-bar stat-bar-${stat}" style="width:${pct}%"></div>
      </div>
      <div class="stat-value ${changed ? (bonusPct > 0 ? 'stat-up' : 'stat-down') : ''}">
        ${value}${changed ? `<span class="stat-delta">(${sign}${bonusPct}%)</span>` : ''}
      </div>
    </div>`;
}

function attrBar(label, value, max, capMax) {
  const pct = Math.min((value / capMax) * 100, 100);
  const maxPct = Math.min((max / capMax) * 100, 100);
  return `
    <div class="stat-row">
      <div class="stat-label">${label}</div>
      <div class="stat-bar-wrap">
        <div class="stat-bar stat-bar-attr" style="width:${pct}%"></div>
        <div class="stat-bar-max" style="width:${maxPct}%" title="Level 15 max"></div>
      </div>
      <div class="stat-value">${value}<span class="stat-max">/ ${max}</span></div>
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
