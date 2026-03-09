import { useState, useCallback, useRef } from 'react';
import './styles.css';
import { uid, makeBlock, updateInTree, removeFromTree, insertAfterInTree, indentInTree, moveInTree, docSummary } from './utils';
import { makeSongDoc, makeBudgetDoc, makeProjectDoc, TEMPLATE_MAKERS } from './templates';
import { BlockList } from './components/BlockRow';

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ docs, onOpen, onNew, onTemplate }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ padding: '22px 40px 18px', borderBottom: '1px solid var(--k)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Blocks</span>
        <button
          onClick={onNew}
          style={{ fontSize: 11, padding: '8px 16px', background: 'var(--k)', color: 'var(--w)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >+ Nuevo</button>
      </div>

      <div className='home-wrap' style={{ maxWidth: 520, margin: '0 auto', padding: '36px 40px' }}>

        {docs.length > 0 && (
          <div style={{ marginBottom: 44 }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--g4)', marginBottom: 12 }}>
              Mis documentos
            </div>
            {docs.map(doc => {
              const s = docSummary(doc);
              return (
                <div
                  key={doc.id}
                  onClick={() => onOpen(doc.id)}
                  style={{ padding: '13px 0', borderBottom: '1px solid var(--g2)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, transition: 'opacity .1s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '.55'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <span style={{ fontSize: 13 }}>{doc.title || <span style={{ color: 'var(--g4)' }}>Sin título</span>}</span>
                  {s && <span style={{ fontSize: 11, color: 'var(--g4)', flexShrink: 0 }}>{s}</span>}
                </div>
              );
            })}
          </div>
        )}

        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--g4)', marginBottom: 12 }}>
            Plantillas
          </div>
          {[
            { k: 'budget',  l: 'Presupuesto' },
            { k: 'song',    l: 'Estructura de canción' },
            { k: 'project', l: 'Viabilidad de proyecto' },
          ].map(({ k, l }) => (
            <div
              key={k}
              onClick={() => onTemplate(k)}
              style={{ padding: '13px 0', borderBottom: '1px solid var(--g2)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--g6)', transition: 'color .1s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--k)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--g6)'}
            >
              <span style={{ fontSize: 13 }}>{l}</span>
              <span style={{ color: 'var(--g2)', fontSize: 11 }}>→</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── DOC SCREEN ───────────────────────────────────────────────────────────────
function DocScreen({ doc, onBack, onUpdateDoc }) {
  const [templateMode, setTemplateMode] = useState(false);
  const dragIdRef = useRef(null);

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

  const addRootBlock = () => {
    const nb = makeBlock();
    onUpdateDoc(d => ({ ...d, blocks: [...d.blocks, nb] }));
  };

  const handleDragStart = (id) => { dragIdRef.current = id; };

  const handleDragOver = (e, targetId, el) => {
    document.querySelectorAll('.drag-top, .drag-bot').forEach(x => x.classList.remove('drag-top', 'drag-bot'));
    if (!el) return;
    const { top, height } = el.getBoundingClientRect();
    el.classList.add(e.clientY < top + height / 2 ? 'drag-top' : 'drag-bot');
  };

  const handleDrop = (e, targetId, el) => {
    document.querySelectorAll('.drag-top, .drag-bot').forEach(x => x.classList.remove('drag-top', 'drag-bot'));
    const dragId = dragIdRef.current;
    if (!dragId || dragId === targetId) return;
    const { top, height } = el?.getBoundingClientRect() || { top: 0, height: 0 };
    const pos = e.clientY < top + height / 2 ? 'before' : 'after';
    onUpdateDoc(d => ({ ...d, blocks: moveInTree(d.blocks, dragId, targetId, pos) }));
    dragIdRef.current = null;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div
        className='doc-header'
        style={{ padding: '13px 40px', borderBottom: '1px solid var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--w)', zIndex: 10, flexWrap: 'wrap', gap: 8 }}
      >
        <button
          onClick={onBack}
          style={{ fontSize: 11, color: 'var(--g4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--k)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--g4)'}
        >← Docs</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {templateMode && (
            <span style={{ fontSize: 9, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Modo plantilla activo
            </span>
          )}
          <button
            onClick={() => setTemplateMode(s => !s)}
            style={{
              fontSize: 10, padding: '6px 12px', border: '1px solid',
              borderColor: templateMode ? 'var(--blue)' : 'var(--g2)',
              color: templateMode ? 'var(--blue)' : 'var(--g4)',
              background: templateMode ? '#eef2f8' : 'transparent',
              letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all .15s',
            }}
          >{templateMode ? '✓ Plantilla' : 'Modo plantilla'}</button>
        </div>
      </div>

      {/* BODY */}
      <div
        className='doc-wrap'
        style={{ flex: 1, overflowY: 'auto', padding: '26px 40px 80px', maxWidth: 680, width: '100%', margin: '0 auto' }}
      >
        <input
          value={doc.title}
          placeholder='Título…'
          onChange={e => onUpdateDoc(d => ({ ...d, title: e.target.value }))}
          style={{ fontSize: 20, fontWeight: 300, border: 'none', background: 'transparent', color: 'var(--k)', width: '100%', marginBottom: 22, borderBottom: '1px solid var(--g2)', paddingBottom: 12, letterSpacing: '-0.02em' }}
        />

        {doc.blocks.length === 0 ? (
          <div style={{ padding: '40px 0', color: 'var(--g2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Vacío — pulsa + bloque
          </div>
        ) : (
          <BlockList
            blocks={doc.blocks} depth={0} allBlocks={allBlocks} templateMode={templateMode}
            onUpdate={updateBlock} onDelete={deleteBlock} onAddAfter={addAfter}
            onAddChild={addChild} onIndent={indent}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
          />
        )}

        <button
          onClick={addRootBlock}
          style={{ marginTop: 10, fontSize: 11, color: 'var(--g4)', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.04em', transition: 'color .1s' }}
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
  const [docs, setDocs] = useState(() => [makeSongDoc(), makeBudgetDoc()]);
  const [activeId, setActiveId] = useState(null);

  const openDoc = (id) => { setActiveId(id); setScreen('doc'); };

  const newDoc = () => {
    const d = { id: uid(), title: '', blocks: [] };
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
