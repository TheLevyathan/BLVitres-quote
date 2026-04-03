import React, { useState, useRef, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'window-quote-data';

const defaultConditions = [
  { id: 'res', name: 'Résidentiel' },
  { id: 'com', name: 'Commercial' },
];

const defaultProducts = [
  { id: 1, name: 'Fenêtre simple', quantity: 0, prices: { res: 12, com: 10 } },
  { id: 2, name: 'Fenêtre double', quantity: 0, prices: { res: 20, com: 16 } },
  { id: 3, name: 'Fenêtre panoramique', quantity: 0, prices: { res: 35, com: 28 } },
  { id: 4, name: 'Porte-patio', quantity: 0, prices: { res: 25, com: 20 } },
  { id: 5, name: 'Lucarne / Puits de lumière', quantity: 0, prices: { res: 40, com: 32 } },
  { id: 6, name: 'Vitrine commerciale', quantity: 0, prices: { res: 30, com: 24 } },
];

const defaultAdjustments = {
  discountType: '%',
  discountValue: 0,
  transport: 0,
  commission: 0,
  customName: 'Ajustement',
  customValue: 0,
};

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function App() {
  const saved = useRef(loadSaved());
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState(saved.current?.products || defaultProducts);
  const [conditions, setConditions] = useState(saved.current?.conditions || defaultConditions);
  const [adjustments, setAdjustments] = useState(saved.current?.adjustments || defaultAdjustments);
  const [newProductName, setNewProductName] = useState('');
  const [newConditionName, setNewConditionName] = useState('');
  const dragItem = useRef(null);
  const dragOver = useRef(null);
  const nextId = useRef(saved.current?.nextId || 7);

  // --- Persist to localStorage ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, conditions, adjustments, nextId: nextId.current }));
  }, [products, conditions, adjustments]);

  // --- Drag & Drop ---
  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { dragOver.current = idx; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const copy = [...products];
    const dragged = copy.splice(dragItem.current, 1)[0];
    copy.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    setProducts(copy);
  };

  // --- Product helpers ---
  const updateQty = (id, delta) =>
    setProducts((p) => p.map((x) => x.id === id ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x));
  const setQty = (id, val) =>
    setProducts((p) => p.map((x) => x.id === id ? { ...x, quantity: Math.max(0, val) } : x));
  const updatePrice = (id, condId, val) =>
    setProducts((p) => p.map((x) => x.id === id ? { ...x, prices: { ...x.prices, [condId]: val } } : x));
  const removeProduct = (id) => setProducts((p) => p.filter((x) => x.id !== id));

  const addProduct = () => {
    if (!newProductName.trim()) return;
    const prices = {};
    conditions.forEach((c) => { prices[c.id] = 0; });
    setProducts((p) => [...p, { id: nextId.current++, name: newProductName.trim(), quantity: 0, prices }]);
    setNewProductName('');
  };

  const addCondition = () => {
    if (!newConditionName.trim()) return;
    const id = 'c' + Date.now();
    setConditions((c) => [...c, { id, name: newConditionName.trim() }]);
    setProducts((p) => p.map((x) => ({ ...x, prices: { ...x.prices, [id]: 0 } })));
    setNewConditionName('');
  };

  const removeCondition = (condId) => {
    if (conditions.length <= 1) return;
    setConditions((c) => c.filter((x) => x.id !== condId));
    setProducts((p) => p.map((x) => {
      const np = { ...x.prices };
      delete np[condId];
      return { ...x, prices: np };
    }));
  };

  const renameCondition = (condId, name) =>
    setConditions((c) => c.map((x) => x.id === condId ? { ...x, name } : x));

  // --- Calculations ---
  const calcForCondition = useCallback((condId) => {
    const lines = products.filter((p) => p.quantity > 0).map((p) => ({
      name: p.name,
      qty: p.quantity,
      unit: p.prices[condId] || 0,
      total: p.quantity * (p.prices[condId] || 0),
    }));
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const disc = adjustments.discountType === '%'
      ? subtotal * (adjustments.discountValue / 100)
      : Number(adjustments.discountValue) || 0;
    const afterDiscount = subtotal - disc;
    const transport = Number(adjustments.transport) || 0;
    const commission = Number(adjustments.commission) || 0;
    const custom = Number(adjustments.customValue) || 0;
    const beforeTax = afterDiscount + transport + commission + custom;
    const tps = beforeTax * 0.05;
    const tvq = beforeTax * 0.09975;
    const grand = beforeTax + tps + tvq;
    return { lines, subtotal, disc, afterDiscount, transport, commission, custom, beforeTax, tps, tvq, grand };
  }, [products, adjustments]);

  const fmt = (v) => v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';

  // --- Styles ---
  const s = {
    app: { minHeight: '100vh', background: '#121212', color: '#e0e0e0', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '0 0 40px' },
    header: { background: '#1e1e2e', padding: '20px 24px 0', borderBottom: '1px solid #333' },
    title: { margin: '0 0 16px', fontSize: 22, fontWeight: 600, color: '#7dd3fc' },
    tabs: { display: 'flex', gap: 0 },
    tab: (active) => ({
      padding: '10px 24px', cursor: 'pointer', background: active ? '#2a2a3e' : 'transparent',
      color: active ? '#7dd3fc' : '#999', border: 'none', borderBottom: active ? '2px solid #7dd3fc' : '2px solid transparent',
      fontSize: 14, fontWeight: active ? 600 : 400, transition: 'all .15s',
    }),
    body: { maxWidth: 800, margin: '0 auto', padding: '24px 16px' },
    card: { background: '#1e1e2e', borderRadius: 10, padding: '16px 20px', marginBottom: 12, border: '1px solid #2a2a3e' },
    row: { display: 'flex', alignItems: 'center', gap: 12 },
    btn: (color = '#7dd3fc') => ({
      background: 'none', border: `1px solid ${color}`, color, borderRadius: 6,
      padding: '4px 12px', cursor: 'pointer', fontSize: 16, fontWeight: 600, lineHeight: '1.2',
    }),
    btnFill: (color = '#7dd3fc') => ({
      background: color, border: 'none', color: '#121212', borderRadius: 8,
      padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
    }),
    input: { background: '#2a2a3e', border: '1px solid #444', borderRadius: 6, padding: '8px 12px', color: '#e0e0e0', fontSize: 14, width: '100%', boxSizing: 'border-box' },
    inputSm: { background: '#2a2a3e', border: '1px solid #444', borderRadius: 6, padding: '6px 8px', color: '#e0e0e0', fontSize: 14, width: 80, textAlign: 'right', MozAppearance: 'textfield' },
    label: { fontSize: 12, color: '#888', marginBottom: 4 },
    grip: { cursor: 'grab', color: '#555', fontSize: 18, userSelect: 'none', padding: '0 4px' },
    del: { background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18, padding: '2px 6px' },
    divider: { borderTop: '1px solid #333', margin: '16px 0' },
    condTag: (active) => ({
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20,
      background: active ? '#7dd3fc22' : '#2a2a3e', border: `1px solid ${active ? '#7dd3fc' : '#444'}`,
      color: active ? '#7dd3fc' : '#ccc', cursor: 'pointer', fontSize: 13,
    }),
  };

  const resetQuantities = () =>
    setProducts((p) => p.map((x) => ({ ...x, quantity: 0 })));

  // ===================== TAB 1: PRODUITS =====================
  const renderProduits = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
          Sélectionnez les quantités. Glissez ⠿ pour réordonner.
        </p>
        <button
          style={{ ...s.btn('#f87171'), fontSize: 13, padding: '6px 14px', whiteSpace: 'nowrap' }}
          onClick={resetQuantities}
        >
          Réinitialiser quantités
        </button>
      </div>
      {products.map((p, idx) => (
        <div
          key={p.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragEnter={() => handleDragEnter(idx)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          style={{ ...s.card, ...s.row, justifyContent: 'space-between' }}
        >
          <div style={{ ...s.row, flex: 1 }}>
            <span style={s.grip}>⠿</span>
            <span style={{ fontSize: 15 }}>{p.name}</span>
          </div>
          <div style={{ ...s.row, gap: 8 }}>
            <button style={s.btn()} onClick={() => updateQty(p.id, -1)}>−</button>
            <input
              type="number"
              min="0"
              value={p.quantity}
              onChange={(e) => setQty(p.id, parseInt(e.target.value) || 0)}
              style={{ ...s.inputSm, width: 56, textAlign: 'center', MozAppearance: 'textfield', WebkitAppearance: 'none' }}
            />
            <button style={s.btn()} onClick={() => updateQty(p.id, 1)}>+</button>
          </div>
        </div>
      ))}
      <div style={{ ...s.card, ...s.row, gap: 8 }}>
        <input
          style={{ ...s.input, flex: 1 }}
          placeholder="Nouveau produit..."
          value={newProductName}
          onChange={(e) => setNewProductName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addProduct()}
        />
        <button style={s.btnFill()} onClick={addProduct}>+ Ajouter</button>
      </div>
    </div>
  );

  // ===================== TAB 2: PRIX & AJUSTEMENTS =====================
  const [editingCondition, setEditingCondition] = useState(null);

  const renderPrix = () => (
    <div>
      {/* Conditions */}
      <div style={{ ...s.card }}>
        <div style={{ ...s.label, marginBottom: 10 }}>CONDITIONS DE PRIX</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {conditions.map((c) => (
            <div key={c.id} style={s.condTag(true)}>
              {editingCondition === c.id ? (
                <input
                  autoFocus
                  style={{ ...s.inputSm, width: 120, textAlign: 'left', padding: '2px 6px', fontSize: 13 }}
                  value={c.name}
                  onChange={(e) => renameCondition(c.id, e.target.value)}
                  onBlur={() => setEditingCondition(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingCondition(null)}
                />
              ) : (
                <span onClick={() => setEditingCondition(c.id)} style={{ cursor: 'text' }}>{c.name}</span>
              )}
              {conditions.length > 1 && (
                <button onClick={() => removeCondition(c.id)} style={{ ...s.del, fontSize: 14, padding: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ ...s.row, gap: 8 }}>
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder="Nouvelle condition (ex: Extérieur seulement)..."
            value={newConditionName}
            onChange={(e) => setNewConditionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCondition()}
          />
          <button style={s.btnFill('#a78bfa')} onClick={addCondition}>+ Condition</button>
        </div>
      </div>

      {/* Price table */}
      <div style={{ ...s.card, overflowX: 'auto' }}>
        <div style={{ ...s.label, marginBottom: 10 }}>PRIX UNITAIRES PAR CONDITION</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #333', color: '#888', fontSize: 12 }}>Produit</th>
              {conditions.map((c) => (
                <th key={c.id} style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid #333', color: '#a78bfa', fontSize: 12 }}>{c.name}</th>
              ))}
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #222', fontSize: 14 }}>{p.name}</td>
                {conditions.map((c) => (
                  <td key={c.id} style={{ padding: '6px 8px', borderBottom: '1px solid #222', textAlign: 'right' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.prices[c.id] ?? 0}
                      onChange={(e) => updatePrice(p.id, c.id, parseFloat(e.target.value) || 0)}
                      style={{ ...s.inputSm, width: 80 }}
                    />
                  </td>
                ))}
                <td style={{ borderBottom: '1px solid #222', textAlign: 'center' }}>
                  <button onClick={() => removeProduct(p.id)} style={s.del} title="Supprimer">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adjustments */}
      <div style={s.card}>
        <div style={{ ...s.label, marginBottom: 12 }}>AJUSTEMENTS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={s.label}>Rabais</div>
            <div style={{ ...s.row, gap: 6 }}>
              <input
                type="number" min="0" step="0.01"
                value={adjustments.discountValue}
                onChange={(e) => setAdjustments({ ...adjustments, discountValue: parseFloat(e.target.value) || 0 })}
                style={{ ...s.inputSm, flex: 1 }}
              />
              <select
                value={adjustments.discountType}
                onChange={(e) => setAdjustments({ ...adjustments, discountType: e.target.value })}
                style={{ ...s.inputSm, width: 56, textAlign: 'center', cursor: 'pointer' }}
              >
                <option value="%">%</option>
                <option value="$">$</option>
              </select>
            </div>
          </div>
          <div>
            <div style={s.label}>Transport ($)</div>
            <input
              type="number" min="0" step="0.01"
              value={adjustments.transport}
              onChange={(e) => setAdjustments({ ...adjustments, transport: parseFloat(e.target.value) || 0 })}
              style={s.inputSm}
            />
          </div>
          <div>
            <div style={s.label}>Commission ($)</div>
            <input
              type="number" min="0" step="0.01"
              value={adjustments.commission}
              onChange={(e) => setAdjustments({ ...adjustments, commission: parseFloat(e.target.value) || 0 })}
              style={s.inputSm}
            />
          </div>
          <div>
            <div style={s.label}>
              <input
                value={adjustments.customName}
                onChange={(e) => setAdjustments({ ...adjustments, customName: e.target.value })}
                style={{ ...s.input, padding: '2px 6px', fontSize: 12, width: 140, marginBottom: 4 }}
              /> ($)
            </div>
            <input
              type="number" step="0.01"
              value={adjustments.customValue}
              onChange={(e) => setAdjustments({ ...adjustments, customValue: parseFloat(e.target.value) || 0 })}
              style={s.inputSm}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ===================== TAB 3: SOUMISSION =====================
  const renderSoumission = () => {
    const hasItems = products.some((p) => p.quantity > 0);
    if (!hasItems) {
      return (
        <div style={{ ...s.card, textAlign: 'center', padding: 40, color: '#666' }}>
          Aucun produit sélectionné. Retournez à l'onglet <strong>Produits</strong> pour ajouter des quantités.
        </div>
      );
    }

    return (
      <div>
        {conditions.map((cond) => {
          const c = calcForCondition(cond.id);
          return (
            <div key={cond.id} style={{ ...s.card, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 14px', color: '#a78bfa', fontSize: 16, fontWeight: 600 }}>
                {cond.name}
              </h3>

              {/* Line items */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#888', fontSize: 12 }}>Produit</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#888', fontSize: 12 }}>Qté</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#888', fontSize: 12 }}>Prix unit.</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#888', fontSize: 12 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {c.lines.map((l, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '8px', fontSize: 14 }}>{l.name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontSize: 14 }}>{l.qty}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontSize: 14 }}>{fmt(l.unit)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontSize: 14, fontWeight: 500 }}>{fmt(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={s.divider} />

              {/* Totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 20px', fontSize: 14 }}>
                <span>Sous-total</span>
                <span style={{ textAlign: 'right' }}>{fmt(c.subtotal)}</span>

                {c.disc > 0 && <>
                  <span style={{ color: '#f87171' }}>
                    Rabais ({adjustments.discountType === '%' ? `${adjustments.discountValue}%` : fmt(adjustments.discountValue)})
                  </span>
                  <span style={{ textAlign: 'right', color: '#f87171' }}>− {fmt(c.disc)}</span>
                </>}

                {c.transport > 0 && <>
                  <span>Transport</span>
                  <span style={{ textAlign: 'right' }}>{fmt(c.transport)}</span>
                </>}

                {c.commission > 0 && <>
                  <span>Commission</span>
                  <span style={{ textAlign: 'right' }}>{fmt(c.commission)}</span>
                </>}

                {c.custom !== 0 && <>
                  <span>{adjustments.customName || 'Ajustement'}</span>
                  <span style={{ textAlign: 'right' }}>{c.custom < 0 ? '− ' + fmt(Math.abs(c.custom)) : fmt(c.custom)}</span>
                </>}

                <div style={{ gridColumn: '1 / -1', ...s.divider, margin: '4px 0' }} />

                <span>Total avant taxes</span>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.beforeTax)}</span>

                <span style={{ color: '#888' }}>TPS (5%)</span>
                <span style={{ textAlign: 'right', color: '#888' }}>{fmt(c.tps)}</span>

                <span style={{ color: '#888' }}>TVQ (9,975%)</span>
                <span style={{ textAlign: 'right', color: '#888' }}>{fmt(c.tvq)}</span>

                <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #7dd3fc', margin: '4px 0' }} />

                <span style={{ fontSize: 18, fontWeight: 700, color: '#7dd3fc' }}>TOTAL</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#7dd3fc', textAlign: 'right' }}>{fmt(c.grand)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const tabLabels = ['Produits', 'Prix & Ajustements', 'Soumission'];

  return (
    <div style={s.app}>
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>
      <div style={s.header}>
        <h1 style={s.title}>Soumission — Nettoyage de vitres</h1>
        <div style={s.tabs}>
          {tabLabels.map((l, i) => (
            <button key={i} style={s.tab(tab === i)} onClick={() => setTab(i)}>{l}</button>
          ))}
        </div>
      </div>
      <div style={s.body}>
        {tab === 0 && renderProduits()}
        {tab === 1 && renderPrix()}
        {tab === 2 && renderSoumission()}
      </div>
    </div>
  );
}
