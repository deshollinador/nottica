import { useRef } from 'react';
import { parseAttr, fmtVal, computeBlockAttrs, evalFormula, uid, updateInTree, removeFromTree, insertAfterInTree, indentInTree } from '../utils';
import { AttrEditor } from './FormulaEditor';

function BlockRow({ block, depth, allBlocks, templateMode, onUpdate, onDelete, onAddAfter, onAddChild, onIndent, onDragStart, onDragOver, onDrop }) {
  const rowRef = useRef();
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

  const pad = Math.min(depth, 5) * 18;

  return (
    <div ref={rowRef} className='fade-in' style={{ borderTop: '2px solid transparent', borderBottom: '2px solid transparent' }}>

      {/* MAIN ROW */}
      <div
        className='hov-row'
        draggable
        onDragStart={e => { e.dataTransfer.setData('text/plain', block.id); onDragStart(block.id); rowRef.current?.classList.add('dragging'); }}
        onDragEnd={() => rowRef.current?.classList.remove('dragging')}
        onDragOver={e => { e.preventDefault(); onDragOver(e, block.id, rowRef.current); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); onDrop(e, block.id, rowRef.current); }}
        style={{ display: 'flex', alignItems: 'center', minHeight: 44, paddingLeft: pad, borderTop: '2px solid transparent', borderBottom: '2px solid transparent' }}
      >
        {/* drag handle */}
        <span style={{ color: 'var(--g2)', fontSize: 11, padding: '0 4px', cursor: 'grab', flexShrink: 0, userSelect: 'none' }}>⠿</span>

        {/* expander */}
        <button
          onClick={() => onUpdate(block.id, b => ({ ...b, collapsed: !b.collapsed }))}
          style={{ width: 22, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasChildren ? 'var(--g4)' : 'transparent', fontSize: 8, flexShrink: 0, transition: 'transform .15s', transform: (hasChildren && block.collapsed) ? 'rotate(-90deg)' : 'none' }}
        >▾</button>

        {/* name */}
        <input
          value={block.name}
          placeholder='Bloque…'
          onChange={e => onUpdate(block.id, b => ({ ...b, name: e.target.value }))}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onAddAfter(block.id); }
            if (e.key === 'Tab')   { e.preventDefault(); onIndent(block.id); }
          }}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: 'var(--k)', padding: '10px 6px', minWidth: 0 }}
        />

        {/* values display — normal mode */}
        {!templateMode && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, paddingRight: 4, flexShrink: 0 }}>
            {aggregated && (
              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {fmtVal(aggregated)}
              </span>
            )}
            {formulaAttrs.map(a => {
              const r = evalFormula(a.formula, allBlocks);
              if (!r) return null;
              const isNeg = r.value < 0;
              return (
                <span key={a.key} style={{ fontSize: 11, whiteSpace: 'nowrap', color: isNeg ? 'var(--red)' : 'var(--green)' }}>
                  {a.label}: {fmtVal(r, true)}
                </span>
              );
            })}
            {!hasChildren && !formulaAttrs.length && ownLeafAttrs.map(a => {
              const p = parseAttr(a.value);
              return (p.valid && !p.empty) ? (
                <span key={a.key} style={{ fontSize: 12, color: 'var(--k)', whiteSpace: 'nowrap' }}>{fmtVal(p)}</span>
              ) : null;
            })}
          </div>
        )}

        {/* action buttons */}
        <div style={{ display: 'flex', gap: 1, paddingRight: 2, flexShrink: 0 }}>
          {[
            { l: '✎', t: 'Nota',     a: () => onUpdate(block.id, b => ({ ...b, noteOpen: !b.noteOpen })) },
            { l: '⤷', t: 'Hijo',     a: () => onAddChild(block.id) },
            { l: '✕', t: 'Eliminar', a: () => onDelete(block.id), d: true },
          ].map(({ l, t, a, d }) => (
            <button key={l} title={t} onClick={a}
              style={{ minWidth: 34, minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--g4)', borderRadius: 3, transition: 'all .1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = d ? '#fde8e6' : 'var(--g2)'; e.currentTarget.style.color = d ? 'var(--red)' : 'var(--k)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--g4)'; }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* TEMPLATE MODE: attr editors */}
      {templateMode && (
        <div style={{ paddingLeft: pad + 36, paddingBottom: 8 }}>
          <div style={{ borderLeft: '1px solid var(--g2)', paddingLeft: 10, paddingTop: 4 }}>
            {(block.attrs || []).map(attr => (
              <AttrEditor
                key={attr.key} attr={attr} allBlocks={allBlocks}
                onUpdate={updated => updateAttr(attr.key, updated)}
                onRemove={() => removeAttr(attr.key)}
              />
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button onClick={() => addAttr(false)}
                style={{ fontSize: 9, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--k)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--g4)'}
              >+ atributo</button>
              <button onClick={() => addAttr(true)}
                style={{ fontSize: 9, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--k)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--blue)'}
              >∑ fórmula</button>
            </div>
          </div>
        </div>
      )}

      {/* NOTE */}
      {block.noteOpen && (
        <div style={{ paddingLeft: pad + 36 }}>
          <textarea
            value={block.note || ''} placeholder='Nota…' rows={2}
            onChange={e => onUpdate(block.id, b => ({ ...b, note: e.target.value }))}
            style={{ width: '100%', border: 'none', borderLeft: '1px solid var(--g2)', background: 'transparent', fontSize: 11, fontStyle: 'italic', color: 'var(--g6)', padding: '6px 8px 6px 12px', lineHeight: 1.7, marginBottom: 4 }}
          />
        </div>
      )}

      {/* CHILDREN */}
      {!block.collapsed && hasChildren && (
        <BlockList
          blocks={block.children} depth={depth + 1} allBlocks={allBlocks} templateMode={templateMode}
          onUpdate={onUpdate} onDelete={onDelete} onAddAfter={onAddAfter} onAddChild={onAddChild} onIndent={onIndent}
          onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
        />
      )}
    </div>
  );
}

export function BlockList({ blocks, depth = 0, allBlocks, templateMode, onUpdate, onDelete, onAddAfter, onAddChild, onIndent, onDragStart, onDragOver, onDrop }) {
  return (
    <div>
      {blocks.map(b => (
        <BlockRow
          key={b.id} block={b} depth={depth} allBlocks={allBlocks} templateMode={templateMode}
          onUpdate={onUpdate} onDelete={onDelete} onAddAfter={onAddAfter} onAddChild={onAddChild} onIndent={onIndent}
          onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
        />
      ))}
    </div>
  );
}
