// ─── ATTR VALIDATION ─────────────────────────────────────────────────────────
const PATTERNS = [
  { re: /^-?\d+(\.\d{1,2})?\s*€$/,                 unit: '€',     sumable: true,  type: 'currency' },
  { re: /^-?\d+(\.\d{1,2})?\s*\$$/,                unit: '$',     sumable: true,  type: 'currency' },
  { re: /^\d+(\.\d+)?\s*(bpm|BPM)$/,               unit: 'BPM',   sumable: false, type: 'bpm'      },
  { re: /^\d+\s*(compases?|bars?|comp\.?)$/i,       unit: 'comp',  sumable: true,  type: 'bars'     },
  { re: /^\d+\/\d+$/,                               unit: 'meter', sumable: false, type: 'meter'    },
  { re: /^-?\d+(\.\d+)?\s*(min|mins|minutos?)$/i,  unit: 'min',   sumable: true,  type: 'time'     },
  { re: /^-?\d+(\.\d+)?\s*(h|hr|horas?)$/i,        unit: 'h',     sumable: true,  type: 'time'     },
  { re: /^-?\d+(\.\d+)?\s*(u|ud|uds|unidades?)$/i, unit: 'u',     sumable: true,  type: 'unit'     },
  { re: /^-?\d+(\.\d+)?\s*%$/,                      unit: '%',     sumable: false, type: 'pct'      },
  { re: /^-?\d+(\.\d+)?$/,                          unit: '',      sumable: true,  type: 'number'   },
];

export function parseAttr(raw) {
  if (!raw?.trim()) return { empty: true, valid: true };
  const t = raw.trim();
  for (const p of PATTERNS) {
    if (p.re.test(t)) {
      const n = parseFloat(t.match(/-?\d+(\.\d+)?/)[0]);
      return { valid: true, value: n, unit: p.unit, sumable: p.sumable, type: p.type, raw: t };
    }
  }
  return { valid: false, raw: t };
}

export function fmtVal(r, forceSign = false) {
  if (!r || r.empty || !r.valid) return '';
  const abs = Math.abs(r.value);
  const v = abs % 1 === 0 ? String(abs) : abs.toFixed(2);
  const sign = forceSign && r.value < 0 ? '−' : '';
  if (r.unit === '€') return sign + v + ' €';
  if (r.unit === '$') return sign + '$ ' + v;
  if (r.unit === 'min') {
    const tot = Math.round(Math.abs(r.value));
    const m = Math.floor(tot / 60), s = tot % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')} min` : `${s} s`;
  }
  return r.unit ? sign + v + ' ' + r.unit : sign + v;
}

// ─── ID ──────────────────────────────────────────────────────────────────────
let _id = 100;
export const uid = () => 'b' + (_id++);

// ─── BLOCK FACTORY ───────────────────────────────────────────────────────────
export function makeBlock(name = '', attrValue = '', attrLabel = '') {
  const attrs = attrValue ? [{
    key: uid(), label: attrLabel || 'valor',
    value: attrValue, type: parseAttr(attrValue).type || 'number'
  }] : [];
  return { id: uid(), name, attrs, note: '', noteOpen: false, collapsed: false, children: [] };
}

export function cloneBlock(b) {
  return {
    ...b, id: uid(),
    attrs: (b.attrs || []).map(a => ({ ...a, key: uid() })),
    children: (b.children || []).map(cloneBlock)
  };
}

// ─── TREE HELPERS ─────────────────────────────────────────────────────────────
export function findBlockById(blocks, id) {
  for (const b of blocks) {
    if (b.id === id) return b;
    const f = findBlockById(b.children || [], id);
    if (f) return f;
  }
}

export function updateInTree(blocks, id, fn) {
  return blocks.map(b =>
    b.id === id ? fn(b) : { ...b, children: updateInTree(b.children || [], id, fn) }
  );
}

export function removeFromTree(blocks, id) {
  return blocks
    .filter(b => b.id !== id)
    .map(b => ({ ...b, children: removeFromTree(b.children || [], id) }));
}

export function insertAfterInTree(blocks, afterId, nb) {
  const idx = blocks.findIndex(b => b.id === afterId);
  if (idx !== -1) { const a = [...blocks]; a.splice(idx + 1, 0, nb); return a; }
  return blocks.map(b => ({ ...b, children: insertAfterInTree(b.children || [], afterId, nb) }));
}

export function indentInTree(blocks, id) {
  const idx = blocks.findIndex(b => b.id === id);
  if (idx > 0) {
    const b = blocks[idx];
    const next = blocks.filter((_, i) => i !== idx);
    next[idx - 1] = { ...next[idx - 1], children: [...(next[idx - 1].children || []), b], collapsed: false };
    return next;
  }
  return blocks.map(b => ({ ...b, children: indentInTree(b.children || [], id) }));
}

function insertRelative(blocks, targetId, block, pos) {
  const idx = blocks.findIndex(b => b.id === targetId);
  if (idx !== -1) { const a = [...blocks]; a.splice(pos === 'before' ? idx : idx + 1, 0, block); return a; }
  return blocks.map(b => ({ ...b, children: insertRelative(b.children || [], targetId, block, pos) }));
}

export function moveInTree(blocks, dragId, targetId, pos) {
  const dragged = JSON.parse(JSON.stringify(findBlockById(blocks, dragId)));
  if (!dragged) return blocks;
  const r = removeFromTree(blocks, dragId);
  return insertRelative(r, targetId, dragged, pos);
}

// ─── COMPUTE (split to avoid circular recursion) ──────────────────────────────

// Only own attrs + child aggregation — never calls evalFormula
export function computeOwnAttrs(block, allBlocks) {
  const results = [];

  (block.attrs || []).forEach(attr => {
    if (!attr.formula && attr.value) {
      const p = parseAttr(attr.value);
      if (p.valid && !p.empty) {
        results.push({ key: attr.key, label: attr.label, ...p, isOwn: true });
      }
    }
  });

  if (block.children?.length) {
    const groups = {};
    block.children.forEach(child => {
      computeOwnAttrs(child, allBlocks)
        .filter(a => a.sumable)
        .forEach(a => {
          if (!groups[a.unit]) groups[a.unit] = { value: 0, unit: a.unit, sumable: true, label: a.label, type: a.type };
          groups[a.unit].value += a.value;
        });
    });
    Object.values(groups).forEach(g => {
      const already = results.find(r => r.unit === g.unit);
      if (!already) results.push({ ...g, computed: true });
    });
  }

  return results;
}

// Full attrs including formula results — for rendering only
export function computeBlockAttrs(block, allBlocks) {
  const results = computeOwnAttrs(block, allBlocks);
  (block.attrs || []).forEach(attr => {
    if (attr.formula) {
      const fr = evalFormula(attr.formula, allBlocks);
      if (fr) results.push({ key: attr.key, label: attr.label, ...fr, isFormula: true });
    }
  });
  return results;
}

function sumChildBars(block) {
  if (!block.children?.length) {
    const attrs = computeOwnAttrs(block, []);
    const bars = attrs.find(a => a.type === 'bars');
    return bars ? bars.value : 0;
  }
  return block.children.reduce((s, c) => s + sumChildBars(c), 0);
}

// evalFormula uses computeOwnAttrs to avoid circular calls
export function evalFormula(formula, allBlocks) {
  if (!formula?.op || !formula?.aId || !formula?.bId) return null;
  const aBlock = findBlockById(allBlocks, formula.aId);
  const bBlock = findBlockById(allBlocks, formula.bId);
  if (!aBlock || !bBlock) return null;

  if (formula.op === 'duration') {
    const bpmAttr = computeOwnAttrs(bBlock, allBlocks).find(a => a.type === 'bpm');
    if (!bpmAttr?.value) return null;
    const totalBars = sumChildBars(aBlock);
    if (!totalBars) return null;
    const beatsPerBar = formula.beatsPerBar || 4;
    const seconds = (totalBars * beatsPerBar / bpmAttr.value) * 60;
    return { valid: true, value: seconds, unit: 'min', sumable: false, type: 'time' };
  }

  const aAttrs = computeOwnAttrs(aBlock, allBlocks);
  const bAttrs = computeOwnAttrs(bBlock, allBlocks);
  const aMain = aAttrs.find(a => a.sumable) || aAttrs[0];
  const bMain = bAttrs.find(a => a.sumable) || bAttrs[0];
  if (!aMain || !bMain) return null;

  let val;
  if (formula.op === 'sum')      val = aMain.value + bMain.value;
  if (formula.op === 'subtract') val = aMain.value - bMain.value;
  if (formula.op === 'multiply') val = aMain.value * bMain.value;
  if (formula.op === 'divide')   val = bMain.value !== 0 ? aMain.value / bMain.value : null;
  if (val === null || val === undefined) return null;

  return { valid: true, value: val, unit: aMain.unit, sumable: false };
}

export function docSummary(doc) {
  const groups = {};
  doc.blocks.forEach(b => {
    computeBlockAttrs(b, doc.blocks)
      .filter(a => a.sumable)
      .forEach(a => { groups[a.unit] = (groups[a.unit] || 0) + a.value; });
  });
  return Object.entries(groups).map(([u, v]) => {
    const fmt = v % 1 === 0 ? String(v) : v.toFixed(2);
    return u === '€' ? fmt + ' €' : u === '$' ? '$ ' + fmt : fmt + (u ? ' ' + u : '');
  }).join(' · ');
}

// ─── DEINDENT (sube un nivel en la jerarquía) ─────────────────────────────────
export function deindentInTree(blocks, id, parentChildren = null, parentId = null) {
  // Check if block is a direct child of current level
  const idx = blocks.findIndex(b => b.id === id);
  if (idx !== -1 && parentChildren !== null) {
    const block = blocks[idx];
    const newParentChildren = blocks.filter((_, i) => i !== idx);
    // Insert after parent in grandparent's list
    const parentIdx = parentChildren.findIndex(b => b.id === parentId);
    const newGrandChildren = [...parentChildren];
    newGrandChildren[parentIdx] = { ...newGrandChildren[parentIdx], children: newParentChildren };
    newGrandChildren.splice(parentIdx + 1, 0, block);
    return newGrandChildren;
  }
  return blocks.map(b => {
    const childIdx = (b.children || []).findIndex(c => c.id === id);
    if (childIdx !== -1) {
      const child = b.children[childIdx];
      const newChildren = b.children.filter((_, i) => i !== childIdx);
      const siblings = blocks;
      const bIdx = siblings.findIndex(s => s.id === b.id);
      const result = [...siblings];
      result[bIdx] = { ...b, children: newChildren };
      result.splice(bIdx + 1, 0, child);
      return null; // mark for removal, handled below
    }
    return { ...b, children: deindentInTree(b.children || [], id, b.children, b.id) };
  }).filter(Boolean);
}

// ─── MOVE UP / DOWN within same level ────────────────────────────────────────
export function moveUpInTree(blocks, id) {
  const idx = blocks.findIndex(b => b.id === id);
  if (idx > 0) {
    const a = [...blocks];
    [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
    return a;
  }
  return blocks.map(b => ({ ...b, children: moveUpInTree(b.children || [], id) }));
}

export function moveDownInTree(blocks, id) {
  const idx = blocks.findIndex(b => b.id === id);
  if (idx !== -1 && idx < blocks.length - 1) {
    const a = [...blocks];
    [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
    return a;
  }
  return blocks.map(b => ({ ...b, children: moveDownInTree(b.children || [], id) }));
}
