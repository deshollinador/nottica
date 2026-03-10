import { useState, useCallback } from 'react';
import './styles.css';
import { uid, makeBlock, updateInTree, removeFromTree, insertAfterInTree, indentInTree, deindentInTree, moveUpInTree, moveDownInTree, docSummary, computeBlockAttrs, fmtVal, parseAttr, evalFormula } from './utils';
import { TEMPLATE_MAKERS } from './templates';
import { BlockList } from './components/BlockRow';
import { AttrEditor } from './components/FormulaEditor';

// ─── LOGO ────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect x="1" y="1" width="11" height="11" fill="var(--k)" />
      <rect x="14" y="1" width="11" height="11" fill="var(--k)" opacity="0.35" />
      <rect x="1" y="14" width="11" height="11" fill="var(--k)" opacity="0.35" />
      <rect x="14" y="14" width="11" height="11" fill="var(--k)" />
    </svg>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ docs, onOpen, onNew, onTemplate }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--g2)' }}>
        <Logo />
      </div>

      <div className="home-wrap" style={{ flex: 1, maxWidth: 560, width: '100%', margin: '0 auto', padding: '28px 24px 120px' }}>
        {docs.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--g4)', marginBottom: 14 }}>Mis documentos</div>
            {docs.map(doc => {
              const s = docSummary(doc);
              const title = doc.blocks[0]?.name;
              return (
                <div key={doc.id} onClick={() => onOpen(doc.id)}
                  style={{ padding: '16px 0', borderBottom: '1px solid var(--g2)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '.5'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <span style={{ fontSize: 17 }}>{title || <span style={{ color: 'var(--g4)' }}>Sin título</span>}</span>
                  {s && <span style={{ fontSize: 13, color: 'var(--g4)', flexShrink: 0 }}>{s}</span>}
                </div>
              );
            })}
          </div>
        )}

        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--g4)', marginBottom: 14 }}>Plantillas</div>
          {[
            { k: 'budget',  l: 'Presupuesto' },
            { k: 'song',    l: 'Estructura de canción' },
            { k: 'project', l: 'Viabilidad de proyecto' },
          ].map(({ k, l }) => (
            <div key={k} onClick={() => onTemplate(k)}
              style={{ padding: '16px 0', borderBottom: '1px solid var(--g2)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--g6)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--k)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--g6)'}
            >
              <span style={{ fontSize: 17 }}>{l}</span>
              <span style={{ color: 'var(--g2)', fontSize: 16 }}>→</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: 'var(--w)', borderTop: '1px solid var(--g2)' }}>
        <button onClick={onNew}
          style={{ width: '100%', padding: '18px', background: 'var(--k)', color: 'var(--w)', fontSize: 15, letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}
        >+ Nuevo documento</button>
      </div>
    </div>
  );
}

// ─── ROOT BLOCK (title area) ──────────────────────────────────────────────────
function RootBlock({ block, allBlocks, templateMode, onUpdate }) {
  const attrs = computeBlockAttrs(block, allBlocks);
  const ownAttrs = block.attrs || [];

  return (
    <div style={{ padding: '24px 24px 16px' }}>
      <input
        value={block.name}
        placeholder="Título…"
        onChange={e => onUpdate(block.id, b => ({ ...b, name: e.target.value }))}
        style={{ fontSize: 26, fontWeight: 300, border: 'none', background: 'transparent', color: 'var(--k)', width: '100%', letterSpacing: '-0.02em', marginBottom: 10 }}
      />

      {/* attrs display */}
      {!templateMode && attrs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          {attrs.map((a, i) => {
            const isNeg = a.value < 0;
            return (
              <span key={a.key || i} style={{ fontSize: 14, color: a.isFormula ? (isNeg ? 'var(--red)' : 'var(--green)') : 'var(--g6)' }}>
                {a.label && <span style={{ color: 'var(--g4)', marginRight: 4, fontSize: 12 }}>{a.label}:</span>}
                {fmtVal(a, true)}
              </span>
            );
          })}
        </div>
      )}

      {/* template mode: edit attrs */}
      {templateMode && (
        <div style={{ borderTop: '1px solid var(--g2)', paddingTop: 10, marginTop: 4 }}>
          {ownAttrs.map(attr => (
            <AttrEditor key={attr.key} attr={attr} allBlocks={allBlocks}
              onUpdate={updated => onUpdate(block.id, b => ({ ...b, attrs: b.attrs.map(a => a.key === attr.key ? updated : a) }))}
              onRemove={() => onUpdate(block.id, b => ({ ...b, attrs: b.attrs.filter(a => a.key !== attr.key) }))}
            />
          ))}
          <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
            <button onClick={() => {
              const na = { key: uid(), label: 'valor', value: '', type: 'number' };
              onUpdate(block.id, b => ({ ...b, attrs: [...(b.attrs || []), na] }));
            }} style={{ fontSize: 10, color: 'var(--g4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>+ atributo</button>
            <button onClick={() => {
              const na = { key: uid(), label: 'resultado', value: '', formula: { op: 'subtract', aId: '', bId: '' }, type: 'computed' };
              onUpdate(block.id, b => ({ ...b, attrs: [...(b.attrs || []), na] }));
            }} style={{ fontSize: 10, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>∑ fórmula</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DOC SCREEN ───────────────────────────────────────────────────────────────
function DocScreen({ doc, onBack, onUpdateDoc }) {
  const [templateMode, setTemplateMode] = useState(false);

  const allBlocks = [];
  const collect = (blocks) => blocks.forEach(b => { allBlocks.push(b); collect(b.children || []); });
  collect(doc.blocks);

  const updateBlock = useCallback((id, fn) => {
    onUpdateDoc(d => ({ ...d, blocks: updateInTree(d.blocks, id, fn) }));
  }, [onUpdateDoc]);

  const deleteBlock = useCallback((id) => {
    onUpdateDoc(d => ({ ...d, blocks: removeFromTree(d.blocks, id) }));
  }, [onUpdateDoc]);

  const addAfter = useCallback((id) => {
    const nb = makeBlock();
    onUpdateDoc(d => ({ ...d, blocks: insertAfterInTree(d.blocks, id, nb) }));
  }, [onUpdateDoc]);

  const addChild = useCallback((parentId) => {
    const nb = makeBlock();
    onUpdateDoc(d => ({
      ...d,
      blocks: updateInTree(d.blocks, parentId, b => ({ ...b, collapsed: false, children: [...(b.children || []), nb] }))
    }));
  }, [onUpdateDoc]);

  const indent = useCallback((id) => {
    onUpdateDoc(d => ({ ...d, blocks: indentInTree(d.blocks, id) }));
  }, [onUpdateDoc]);

  const deindent = useCallback((id) => {
    onUpdateDoc(d => ({ ...d, blocks: deindentInTree(d.blocks, id) }));
  }, [onUpdateDoc]);

  const moveUp = useCallback((id) => {
    onUpdateDoc(d => ({ ...d, blocks: moveUpInTree(d.blocks, id) }));
  }, [onUpdateDoc]);

  const moveDown = useCallback((id) => {
    onUpdateDoc(d => ({ ...d, blocks: moveDownInTree(d.blocks, id) }));
  }, [onUpdateDoc]);

  const rootBlock = doc.blocks[0] || null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <div className="doc-header" style={{ padding: '14px 24px', borderBottom: '1px solid var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--w)', zIndex: 10 }}>
        <button onClick={onBack}
          style={{ fontSize: 22, color: 'var(--g4)', lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--k)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--g4)'}
        >←</button>
        <button onClick={() => setTemplateMode(s => !s)}
          style={{ fontSize: 11, padding: '5px 10px', border: '1px solid', borderColor: templateMode ? 'var(--k)' : 'var(--g2)', color: templateMode ? 'var(--k)' : 'var(--g4)', background: 'transparent', letterSpacing: '0.06em' }}
        >{templateMode ? '✓ plantilla' : '···'}</button>
      </div>

      {/* BODY */}
      <div className="doc-wrap" style={{ flex: 1, overflowY: 'auto', padding: '0 0 80px', maxWidth: 680, width: '100%', margin: '0 auto' }}>

        {rootBlock && (
          <>
            <RootBlock block={rootBlock} allBlocks={allBlocks} templateMode={templateMode} onUpdate={updateBlock} />
            <div style={{ borderBottom: '1px solid var(--g2)', margin: '0 24px 4px' }} />
          </>
        )}

        <BlockList
          blocks={doc.blocks}
          depth={0}
          allBlocks={allBlocks}
          templateMode={templateMode}
          onUpdate={updateBlock}
          onDelete={deleteBlock}
          onAddAfter={addAfter}
          onAddChild={addChild}
          onIndent={indent}
          onDeindent={deindent}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />

        <button onClick={() => { const nb = makeBlock(); onUpdateDoc(d => ({ ...d, blocks: [...d.blocks, nb] })); }}
          style={{ margin: '8px 24px', fontSize: 15, color: 'var(--g4)', padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--k)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--g4)'}
        >+ bloque</button>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('home');
  const [docs, setDocs] = useState(() => [TEMPLATE_MAKERS.song(), TEMPLATE_MAKERS.budget()]);
  const [activeId, setActiveId] = useState(null);

  const openDoc = (id) => { setActiveId(id); setScreen('doc'); };
  const newDoc = () => {
    const nb = makeBlock('');
    const d = { id: uid(), blocks: [nb] };
    setDocs(ds => [d, ...ds]);
    setActiveId(d.id);
    setScreen('doc');
  };
  const loadTemplate = (key) => {
    const d = TEMPLATE_MAKERS[key]();
    setDocs(ds => [d, ...ds]);
    setActiveId(d.id);
    setScreen('doc');
  };
  const updateDoc = (fn) => setDocs(ds => ds.map(d => d.id === activeId ? fn(d) : d));
  const activeDoc = docs.find(d => d.id === activeId);

  if (screen === 'doc' && activeDoc) {
    return <DocScreen doc={activeDoc} onBack={() => setScreen('home')} onUpdateDoc={updateDoc} />;
  }
  return <HomeScreen docs={docs} onOpen={openDoc} onNew={newDoc} onTemplate={loadTemplate} />;
}
