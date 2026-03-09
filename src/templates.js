import { uid, makeBlock, cloneBlock } from './utils';

export function makeSongDoc() {
  const root = {
    id: uid(), name: 'Nueva canción',
    attrs: [
      { key: uid(), label: 'BPM', value: '120 BPM', type: 'bpm' },
    ],
    note: '', noteOpen: false, collapsed: false,
    children: [
      makeBlock('Intro',  '4 comp'),
      makeBlock('Verse',  '8 comp'),
      makeBlock('Chorus', '8 comp'),
    ]
  };
  // duration formula: sum children bars / BPM of root
  root.attrs.push({
    key: uid(), label: 'Duración', value: '',
    formula: { op: 'duration', aId: root.id, bId: root.id, beatsPerBar: 4 },
    type: 'computed'
  });
  return { id: uid(), title: 'Nueva canción', blocks: [root] };
}

export function makeBudgetDoc() {
  const incomes  = { id: uid(), name: 'Ingresos', attrs: [], note: '', noteOpen: false, collapsed: false, children: [makeBlock('Concepto', '0 €')] };
  const expenses = { id: uid(), name: 'Gastos',   attrs: [], note: '', noteOpen: false, collapsed: false, children: [makeBlock('Concepto', '0 €')] };
  const saldo    = { key: uid(), label: 'Saldo', value: '', formula: { op: 'subtract', aId: incomes.id, bId: expenses.id }, type: 'computed' };
  const root = { id: uid(), name: 'Presupuesto', attrs: [saldo], note: '', noteOpen: false, collapsed: false, children: [incomes, expenses] };
  return { id: uid(), title: 'Presupuesto', blocks: [root] };
}

export function makeProjectDoc() {
  const costs    = { id: uid(), name: 'Costes',   attrs: [], note: '', noteOpen: false, collapsed: false, children: [makeBlock('Concepto', '0 €')] };
  const revenues = { id: uid(), name: 'Ingresos', attrs: [], note: '', noteOpen: false, collapsed: false, children: [makeBlock('Concepto', '0 €')] };
  const saldo    = { key: uid(), label: 'Saldo', value: '', formula: { op: 'subtract', aId: revenues.id, bId: costs.id }, type: 'computed' };
  const root = { id: uid(), name: 'Viabilidad', attrs: [saldo], note: '', noteOpen: false, collapsed: false, children: [costs, revenues] };
  return { id: uid(), title: 'Viabilidad de proyecto', blocks: [root] };
}

export const TEMPLATE_MAKERS = {
  song:    makeSongDoc,
  budget:  makeBudgetDoc,
  project: makeProjectDoc,
};
