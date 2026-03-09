import { useState } from 'react';
import { evalFormula, fmtVal } from '../utils';

const OPS = [
  { v: 'sum',      l: '+',  label: 'Suma'         },
  { v: 'subtract', l: '−',  label: 'Resta'        },
  { v: 'multiply', l: '×',  label: 'Multiplica'   },
  { v: 'divide',   l: '÷',  label: 'Divide'       },
  { v: 'duration', l: '⏱', label: 'Duración'     },
];

export function FormulaEditor({ formula, allBlocks, onChange }) {
  return (
    <div style={{ width: '100%', padding: '10px 12px', background: 'var(--g1)', border: '1px solid var(--g2)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--g4)' }}>Fórmula</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {OPS.map(o => (
          <button key={o.v} onClick={() => onChange({ ...formula, op: o.v })}
            title={o.label}
            style={{
              padding: '4px 9px', fontSize: 12, border: '1px solid',
              borderColor: formula?.op === o.v ? 'var(--k)' : 'var(--g2)',
              background: formula?.op === o.v ? 'var(--k)' : 'transparent',
              color: formula?.op === o.v ? 'var(--w)' : 'var(--g4)',
              transition: 'all .1s',
            }}
          >{o.l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={formula?.aId || ''} onChange={e => onChange({ ...formula, aId: e.target.value })}
          style={{ flex: 1, minWidth: 100, fontSize: 11, border: '1px solid var(--g2)', padding: '5px 7px', background: 'var(--w)', fontFamily: 'var(--font)' }}>
          <option value=''>Bloque A…</option>
          {allBlocks.map(b => <option key={b.id} value={b.id}>{b.name || '(sin nombre)'}</option>)}
        </select>
        <span style={{ color: 'var(--g4)', fontSize: 13 }}>{OPS.find(o => o.v === formula?.op)?.l || '?'}</span>
        <select value={formula?.bId || ''} onChange={e => onChange({ ...formula, bId: e.target.value })}
          style={{ flex: 1, minWidth: 100, fontSize: 11, border: '1px solid var(--g2)', padding: '5px 7px', background: 'var(--w)', fontFamily: 'var(--font)' }}>
          <option value=''>Bloque B…</option>
          {allBlocks.map(b => <option key={b.id} value={b.id}>{b.name || '(sin nombre)'}</option>)}
        </select>
      </div>
    </div>
  );
}

export function AttrEditor({ attr, allBlocks, onUpdate, onRemove }) {
  const [editingFormula, setEditingFormula] = useState(false);
  const isFormula = !!attr.formula;
  const computed = isFormula ? evalFormula(attr.formula, allBlocks) : null;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 0', flexWrap: 'wrap' }}>
      <input
        value={attr.label || ''}
        placeholder='etiqueta'
        onChange={e => onUpdate({ ...attr, label: e.target.value })}
        style={{ width: 72, fontSize: 10, border: 'none', borderBottom: '1px solid var(--g2)', background: 'transparent', color: 'var(--g6)', padding: '2px 3px' }}
      />
      <span style={{ color: 'var(--g4)', fontSize: 10, paddingTop: 2 }}>:</span>

      {isFormula ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--blue)', fontStyle: 'italic' }}>
            {computed ? fmtVal(computed, true) : '—'}
          </span>
          <button onClick={() => setEditingFormula(s => !s)}
            style={{ fontSize: 9, color: 'var(--blue)', textDecoration: 'underline' }}>
            {editingFormula ? 'cerrar' : 'editar'}
          </button>
        </div>
      ) : (
        <input
          value={attr.value || ''}
          placeholder='valor'
          onChange={e => onUpdate({ ...attr, value: e.target.value })}
          style={{
            width: 88, fontSize: 11, border: 'none', borderBottom: '1px solid var(--g2)',
            background: 'transparent', padding: '2px 3px', textAlign: 'right',
            color: 'var(--k)', fontFamily: 'var(--font)',
          }}
        />
      )}

      <button onClick={onRemove}
        style={{ fontSize: 11, color: 'var(--g4)', paddingTop: 1 }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--g4)'}
      >✕</button>

      {editingFormula && (
        <FormulaEditor
          formula={attr.formula}
          allBlocks={allBlocks}
          onChange={f => onUpdate({ ...attr, formula: f })}
        />
      )}
    </div>
  );
}
