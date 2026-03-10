import { parseAttr, fmtVal, computeBlockAttrs, evalFormula, uid } from '../utils';
import { AttrEditor } from './FormulaEditor';

function BlockRow({ block, depth, allBlocks, templateMode, onUpdate, onDelete, onAddAfter, onAddChild, onIndent, onDeindent, onMoveUp, onMoveDown }) {
  const hasChildren = (block.children || []).length > 0;
  const attrs = computeBlockAttrs(block, allBlocks);
  const aggregated = attrs.find(a => a.computed);
  const formulaAttrs = (block.attrs || []).filter(a => a.formula);
  const ownLeafAttrs = (block.attrs || []).filter(a => !a.formula && a.value);

  const updateAttr = (key, updated) =>
    onUpdate(block.id, b => ({ ...b, attrs: (b.attrs || []).map(a => a.key === key ? updated : a) }));
  const removeAttr = (key) =>
    onUpdate(block.id, b => ({ ...b, attrs: (b.attrs || []).filter(a => a.key !== key) }));
  const addAttr = (isFormula = false) => {
    const na = {
      key: uid(), label: isFormula ? 'resultado' : 'valor', value: '', type: 'number',
      ...(isFormula ? { formula: { op: 'subtract', aId: '', bId: '' } } : {})
    };
    onUpdate(block.id, b => ({ ...b, attrs: [...(b.attrs || []), na] }));
  };

  const pad = Math.min(depth, 5) * 20;

  return (
    <div className="fade-in" style={{ borderTop: '1px solid transparent' }}>

      {/* MAIN ROW */}
      <div className="hov-row"
        style={{ display: 'flex', alignItems: 'center', minHeight: 52, paddingLeft: pad }}
      >
        {/* expander */}
        <button
          onClick={() => onUpdate(block.id, b => ({ ...b, collapsed: !b.collapsed }))}
          style={{ width: 28, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasChildren ? 'var(--g4)' : 'transparent', fontSize: 9, flexShrink: 0, transition: 'transform .15s', transform: (hasChildren && block.collapsed) ? 'rotate(-90deg)' : 'none' }}
        >▾</button>

        {/* name */}
        <input
          value={block.name}
          placeholder="Bloque…"
          onChange={e => onUpdate(block.id, b => ({ ...b, name: e.target.value }))}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onAddAfter(block.id); }
            if (e.key === 'Tab')   { e.preventDefault(); e.shiftKey ? onDeindent(block.id) : onIndent(block.id); }
          }}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 16, color: 'var(--k)', padding: '10px 6px', minWidth: 0 }}
        />

        {/* values — normal mode */}
        {!templateMode && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, paddingRight: 6, flexShrink: 0 }}>
            {aggregated && (
              <span style={{ fontSize: 14, color: 'var(--green)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {fmtVal(aggregated)}
              </span>
            )}
            {formulaAttrs.map(a => {
              const r = evalFormula(a.formula, allBlocks);
              if (!r) return null;
              const isNeg = r.value < 0;
              return (
                <span key={a.key} style={{ fontSize: 13, whiteSpace: 'nowrap', color: isNeg ? 'var(--red)' : 'var(--green)' }}>
                  {a.label}: {fmtVal(r, true)}
                </span>
              );
            })}
            {!hasChildren && !formulaAttrs.length && ownLeafAttrs.map(a => {
              const p = parseAttr(a.value);
              return (p.valid && !p.empty) ? (
                <span key={a.key} style={{ fontSize: 14, color: 'var(--k)', whiteSpace: 'nowrap' }}>{fmtVal(p)}</span>
              ) : null;
            })}
          </div>
        )}

        {/* action buttons */}
        <div style={{ display: 'flex', gap: 0, paddingRight: 4, flexShrink: 0 }}>
          {[
            { l: '↑', t: 'Subir',     a: () => onMoveUp(block.id) },
            { l: '↓', t: 'Bajar',     a: () => onMoveDown(block.id) },
            { l: '⤷', t: 'Indentar',  a: () => onIndent(block.id) },
            { l: '⤶', t: 'Desindentar', a: () => onDeindent(block.id), hide: depth === 0 },
            { l: '✎', t: 'Nota',      a: () => onUpdate(block.id, b => ({ ...b, noteOpen: !b.noteOpen })) },
            { l: '+', t: 'Hijo',      a: () => onAddChild(block.id) },
            { l: '✕', t: 'Eliminar',  a: () => onDelete(block.id), d: true },
          ].filter(btn => !btn.hide).map(({ l, t, a, d }) => (
            <button key={l} title={t} onClick={a}
              style={{ minWidth: 36, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--g4)', borderRadius: 3, transition: 'all .1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = d ? '#fde8e6' : 'var(--g1)'; e.currentTarget.style.color = d ? 'var(--red)' : 'var(--k)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--g4)'; }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* TEMPLATE MODE: attr editors */}
      {templateMode && (
        <div style={{ paddingLeft: pad + 28, paddingBottom: 10 }}>
          <div style={{ borderLeft: '1px solid var(--g2)', paddingLeft: 12, paddingTop: 4 }}>
            {(block.attrs || []).map(attr => (
              <AttrEditor
                key={attr.key} attr={attr} allBlocks={allBlocks}
                onUpdate={updated => updateAttr(attr.key, updated)}
                onRemove={() => removeAttr(attr.key)}
              />
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
              <button onClick={() => addAttr(false)}
                style={{ fontSize: 10, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >+ atributo</button>
              <button onClick={() => addAttr(true)}
                style={{ fontSize: 10, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >∑ fórmula</button>
            </div>
          </div>
        </div>
      )}

      {/* NOTE */}
      {block.noteOpen && (
        <div style={{ paddingLeft: pad + 28 }}>
          <textarea
            value={block.note || ''} placeholder="Nota…" rows={2}
            onChange={e => onUpdate(block.id, b => ({ ...b, note: e.target.value }))}
            style={{ width: '100%', border: 'none', borderLeft: '2px solid var(--g2)', background: 'transparent', fontSize: 13, fontStyle: 'italic', color: 'var(--g6)', padding: '6px 10px', lineHeight: 1.7, marginBottom: 4 }}
          />
        </div>
      )}

      {/* CHILDREN */}
      {!block.collapsed && hasChildren && (
        <BlockList
          blocks={block.children} depth={depth + 1} allBlocks={allBlocks} templateMode={templateMode}
          onUpdate={onUpdate} onDelete={onDelete} onAddAfter={onAddAfter} onAddChild={onAddChild}
          onIndent={onIndent} onDeindent={onDeindent} onMoveUp={onMoveUp} onMoveDown={onMoveDown}
        />
      )}
    </div>
  );
}

export function BlockList({ blocks, depth = 0, allBlocks, templateMode, onUpdate, onDelete, onAddAfter, onAddChild, onIndent, onDeindent, onMoveUp, onMoveDown }) {
  return (
    <div>
      {blocks.map(b => (
        <BlockRow
          key={b.id} block={b} depth={depth} allBlocks={allBlocks} templateMode={templateMode}
          onUpdate={onUpdate} onDelete={onDelete} onAddAfter={onAddAfter} onAddChild={onAddChild}
          onIndent={onIndent} onDeindent={onDeindent} onMoveUp={onMoveUp} onMoveDown={onMoveDown}
        />
      ))}
    </div>
  );
}
