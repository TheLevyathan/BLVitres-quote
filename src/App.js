import React, { useState, useRef, useCallback, useEffect } from 'react';

// ── Storage keys ──────────────────────────────────────────────────────────────
const STORAGE_KEY     = 'window-quote-data-v2';
const INV_STORAGE_KEY = 'window-quote-inventory';

// ── Quote defaults ─────────────────────────────────────────────────────────────
const defaultConditions = [
  { id: 'int_ext', name: 'Int/ext' },
  { id: 'ext',     name: 'Ext seulement' },
];

const p0 = { int_ext: 0, ext: 0 };

const defaultProductTypes = [
  { id: 101, name: 'Fixe', subtypes: [
    { id: 1, name: 'TP', quantity: 0, prices: { ...p0 } },
    { id: 2, name: 'P',  quantity: 0, prices: { ...p0 } },
    { id: 3, name: 'M',  quantity: 0, prices: { ...p0 } },
    { id: 4, name: 'G',  quantity: 0, prices: { ...p0 } },
    { id: 5, name: 'TG', quantity: 0, prices: { ...p0 } },
  ]},
  { id: 102, name: 'Manivelle', subtypes: [
    { id: 6, name: 'P', quantity: 0, prices: { ...p0 } },
    { id: 7, name: 'M', quantity: 0, prices: { ...p0 } },
    { id: 8, name: 'G', quantity: 0, prices: { ...p0 } },
  ]},
  { id: 103, name: 'Guil. Simple', subtypes: [
    { id: 9,  name: 'P', quantity: 0, prices: { ...p0 } },
    { id: 10, name: 'M', quantity: 0, prices: { ...p0 } },
    { id: 11, name: 'G', quantity: 0, prices: { ...p0 } },
  ]},
  { id: 104, name: 'Guil. Double', subtypes: [
    { id: 12, name: 'P', quantity: 0, prices: { ...p0 } },
    { id: 13, name: 'M', quantity: 0, prices: { ...p0 } },
    { id: 14, name: 'G', quantity: 0, prices: { ...p0 } },
  ]},
  { id: 105, name: 'Coul. Simple (par vitre)', subtypes: [
    { id: 15, name: 'P',  quantity: 0, prices: { ...p0 } },
    { id: 16, name: 'M',  quantity: 0, prices: { ...p0 } },
    { id: 17, name: 'G',  quantity: 0, prices: { ...p0 } },
    { id: 18, name: 'SS', quantity: 0, prices: { ...p0 } },
  ]},
  { id: 106, name: 'Coul. Double (par vitre)', subtypes: [
    { id: 19, name: 'P',  quantity: 0, prices: { ...p0 } },
    { id: 20, name: 'M',  quantity: 0, prices: { ...p0 } },
    { id: 21, name: 'G',  quantity: 0, prices: { ...p0 } },
    { id: 22, name: 'SS', quantity: 0, prices: { ...p0 } },
  ]},
  { id: 107, name: 'Porte-P.', subtypes: [
    { id: 23, name: 'Française', quantity: 0, prices: { ...p0 } },
    { id: 24, name: 'S',         quantity: 0, prices: { ...p0 } },
    { id: 25, name: 'D',         quantity: 0, prices: { ...p0 } },
  ]},
];

const defaultAdjustments = {
  discountType: '%', discountValue: 0,
  transport: 0, commission: 0,
  customName: 'Ajustement', customValue: 0,
};

// ── Inventory defaults ─────────────────────────────────────────────────────────
const defaultInventoryGroups = [
  { id: 1, name: 'Camion',    items: [] },
  { id: 2, name: 'Entrepôt',  items: [] },
];

// ── Load helpers ───────────────────────────────────────────────────────────────
function loadSaved() {
  try { const r = localStorage.getItem(STORAGE_KEY);   if (r) return JSON.parse(r); } catch {}
  return null;
}
function loadInv() {
  try { const r = localStorage.getItem(INV_STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const saved    = useRef(loadSaved());
  const savedInv = useRef(loadInv());

  // ── Quote state ──
  const [tab, setTab]               = useState(0);
  const [productTypes, setProductTypes] = useState(saved.current?.productTypes || defaultProductTypes);
  const [conditions, setConditions]     = useState(saved.current?.conditions   || defaultConditions);
  const [adjustments, setAdjustments]   = useState(saved.current?.adjustments  || defaultAdjustments);
  const nextId = useRef(saved.current?.nextId || 200);

  // ── Inventory state ──
  const [invGroups, setInvGroups]       = useState(savedInv.current?.groups  || defaultInventoryGroups);
  const invNextId = useRef(savedInv.current?.nextId || 1);

  // ── UI state ──
  const [newTypeName, setNewTypeName]         = useState('');
  const [newSubtypeNames, setNewSubtypeNames] = useState({});
  const [newConditionName, setNewConditionName] = useState('');
  const [editingType, setEditingType]         = useState(null);
  const [editingSubtype, setEditingSubtype]   = useState(null);
  const [editingCondition, setEditingCondition] = useState(null);

  // inventory UI
  const [newGroupName, setNewGroupName]       = useState('');
  const [newItemNames, setNewItemNames]       = useState({});
  const [editingGroup, setEditingGroup]       = useState(null);
  const [editingItem, setEditingItem]         = useState(null);
  const [transfer, setTransfer]               = useState(null);
  // transfer = { groupId, itemId, toGroupId: null, qty: 1 }

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ productTypes, conditions, adjustments, nextId: nextId.current }));
  }, [productTypes, conditions, adjustments]);

  useEffect(() => {
    localStorage.setItem(INV_STORAGE_KEY, JSON.stringify({ groups: invGroups, nextId: invNextId.current }));
  }, [invGroups]);

  // ── Quote helpers ─────────────────────────────────────────────────────────
  const updateQty = (typeId, subId, delta) =>
    setProductTypes(pt => pt.map(t => t.id !== typeId ? t : {
      ...t, subtypes: t.subtypes.map(s => s.id !== subId ? s : { ...s, quantity: Math.max(0, s.quantity + delta) }),
    }));
  const setQty = (typeId, subId, val) =>
    setProductTypes(pt => pt.map(t => t.id !== typeId ? t : {
      ...t, subtypes: t.subtypes.map(s => s.id !== subId ? s : { ...s, quantity: Math.max(0, val) }),
    }));
  const updatePrice = (typeId, subId, condId, val) =>
    setProductTypes(pt => pt.map(t => t.id !== typeId ? t : {
      ...t, subtypes: t.subtypes.map(s => s.id !== subId ? s : { ...s, prices: { ...s.prices, [condId]: val } }),
    }));
  const renameType    = (typeId, name) => setProductTypes(pt => pt.map(t => t.id !== typeId ? t : { ...t, name }));
  const renameSubtype = (typeId, subId, name) =>
    setProductTypes(pt => pt.map(t => t.id !== typeId ? t : {
      ...t, subtypes: t.subtypes.map(s => s.id !== subId ? s : { ...s, name }),
    }));
  const removeType    = (typeId) => setProductTypes(pt => pt.filter(t => t.id !== typeId));
  const removeSubtype = (typeId, subId) =>
    setProductTypes(pt => pt.map(t => t.id !== typeId ? t : { ...t, subtypes: t.subtypes.filter(s => s.id !== subId) }));
  const addType = () => {
    if (!newTypeName.trim()) return;
    const prices = {}; conditions.forEach(c => { prices[c.id] = 0; });
    setProductTypes(pt => [...pt, { id: nextId.current++, name: newTypeName.trim(), subtypes: [] }]);
    setNewTypeName('');
  };
  const addSubtype = (typeId) => {
    const name = (newSubtypeNames[typeId] || '').trim();
    if (!name) return;
    const prices = {}; conditions.forEach(c => { prices[c.id] = 0; });
    setProductTypes(pt => pt.map(t => t.id !== typeId ? t : {
      ...t, subtypes: [...t.subtypes, { id: nextId.current++, name, quantity: 0, prices }],
    }));
    setNewSubtypeNames(prev => ({ ...prev, [typeId]: '' }));
  };
  const addCondition = () => {
    if (!newConditionName.trim()) return;
    const id = 'c' + Date.now();
    setConditions(c => [...c, { id, name: newConditionName.trim() }]);
    setProductTypes(pt => pt.map(t => ({ ...t, subtypes: t.subtypes.map(s => ({ ...s, prices: { ...s.prices, [id]: 0 } })) })));
    setNewConditionName('');
  };
  const removeCondition = (condId) => {
    if (conditions.length <= 1) return;
    setConditions(c => c.filter(x => x.id !== condId));
    setProductTypes(pt => pt.map(t => ({
      ...t, subtypes: t.subtypes.map(s => { const np = { ...s.prices }; delete np[condId]; return { ...s, prices: np }; }),
    })));
  };
  const renameCondition = (condId, name) => setConditions(c => c.map(x => x.id === condId ? { ...x, name } : x));
  const resetQuantities = () => setProductTypes(pt => pt.map(t => ({ ...t, subtypes: t.subtypes.map(s => ({ ...s, quantity: 0 })) })));

  // ── Inventory helpers ─────────────────────────────────────────────────────
  const addGroup = () => {
    if (!newGroupName.trim()) return;
    setInvGroups(gs => [...gs, { id: invNextId.current++, name: newGroupName.trim(), items: [] }]);
    setNewGroupName('');
  };
  const removeGroup   = (gid) => setInvGroups(gs => gs.filter(g => g.id !== gid));
  const renameGroup   = (gid, name) => setInvGroups(gs => gs.map(g => g.id !== gid ? g : { ...g, name }));
  const addItem = (gid) => {
    const name = (newItemNames[gid] || '').trim();
    if (!name) return;
    setInvGroups(gs => gs.map(g => g.id !== gid ? g : {
      ...g, items: [...g.items, { id: invNextId.current++, name, quantity: 1 }],
    }));
    setNewItemNames(prev => ({ ...prev, [gid]: '' }));
  };
  const removeItem    = (gid, iid) => setInvGroups(gs => gs.map(g => g.id !== gid ? g : { ...g, items: g.items.filter(i => i.id !== iid) }));
  const renameItem    = (gid, iid, name) => setInvGroups(gs => gs.map(g => g.id !== gid ? g : { ...g, items: g.items.map(i => i.id !== iid ? i : { ...i, name }) }));
  const updateInvQty  = (gid, iid, delta) =>
    setInvGroups(gs => gs.map(g => g.id !== gid ? g : {
      ...g, items: g.items.map(i => i.id !== iid ? i : { ...i, quantity: Math.max(0, i.quantity + delta) }),
    }));
  const setInvQty     = (gid, iid, val) =>
    setInvGroups(gs => gs.map(g => g.id !== gid ? g : {
      ...g, items: g.items.map(i => i.id !== iid ? i : { ...i, quantity: Math.max(0, val) }),
    }));

  const doTransfer = () => {
    if (!transfer || !transfer.toGroupId) return;
    const { groupId, itemId, toGroupId, qty } = transfer;
    const srcGroup = invGroups.find(g => g.id === groupId);
    const srcItem  = srcGroup?.items.find(i => i.id === itemId);
    if (!srcItem) return;
    const actual = Math.min(Math.max(1, qty), srcItem.quantity);

    setInvGroups(gs => gs.map(g => {
      if (g.id === groupId) {
        const newItems = g.items
          .map(i => i.id === itemId ? { ...i, quantity: i.quantity - actual } : i)
          .filter(i => i.quantity > 0);
        return { ...g, items: newItems };
      }
      if (g.id === toGroupId) {
        const existing = g.items.find(i => i.name === srcItem.name);
        if (existing) {
          return { ...g, items: g.items.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + actual } : i) };
        }
        return { ...g, items: [...g.items, { id: invNextId.current++, name: srcItem.name, quantity: actual }] };
      }
      return g;
    }));
    setTransfer(null);
  };

  // ── Calculations ──────────────────────────────────────────────────────────
  const calcForCondition = useCallback((condId) => {
    const lines = [];
    productTypes.forEach(t => t.subtypes.forEach(sub => {
      if (sub.quantity > 0) {
        const unit = sub.prices[condId] || 0;
        lines.push({ name: `${t.name} — ${sub.name}`, qty: sub.quantity, unit, total: sub.quantity * unit });
      }
    }));
    const subtotal    = lines.reduce((sum, l) => sum + l.total, 0);
    const disc        = adjustments.discountType === '%' ? subtotal * (adjustments.discountValue / 100) : Number(adjustments.discountValue) || 0;
    const afterDiscount = subtotal - disc;
    const transport   = Number(adjustments.transport)    || 0;
    const commission  = Number(adjustments.commission)   || 0;
    const custom      = Number(adjustments.customValue)  || 0;
    const beforeTax   = afterDiscount + transport + commission + custom;
    const tps  = beforeTax * 0.05;
    const tvq  = beforeTax * 0.09975;
    const grand = beforeTax + tps + tvq;
    return { lines, subtotal, disc, afterDiscount, transport, commission, custom, beforeTax, tps, tvq, grand };
  }, [productTypes, adjustments]);

  const fmt = (v) => v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    app:    { minHeight: '100vh', background: '#121212', color: '#e0e0e0', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '0 0 40px' },
    header: { background: '#1e1e2e', padding: '20px 24px 0', borderBottom: '1px solid #333' },
    title:  { margin: '0 0 16px', fontSize: 22, fontWeight: 600, color: '#7dd3fc' },
    tabs:   { display: 'flex', gap: 0, overflowX: 'auto' },
    tab: (active) => ({
      padding: '10px 20px', cursor: 'pointer', background: active ? '#2a2a3e' : 'transparent',
      color: active ? '#7dd3fc' : '#999', border: 'none', borderBottom: active ? '2px solid #7dd3fc' : '2px solid transparent',
      fontSize: 14, fontWeight: active ? 600 : 400, transition: 'all .15s', whiteSpace: 'nowrap',
    }),
    body:    { maxWidth: 820, margin: '0 auto', padding: '24px 16px' },
    card:    { background: '#1e1e2e', borderRadius: 10, padding: '16px 20px', marginBottom: 12, border: '1px solid #2a2a3e' },
    row:     { display: 'flex', alignItems: 'center', gap: 12 },
    btn: (color = '#7dd3fc') => ({
      background: 'none', border: `1px solid ${color}`, color, borderRadius: 6,
      padding: '4px 12px', cursor: 'pointer', fontSize: 16, fontWeight: 600, lineHeight: '1.2',
    }),
    btnFill: (color = '#7dd3fc') => ({
      background: color, border: 'none', color: '#121212', borderRadius: 8,
      padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
    }),
    btnSm: (color = '#7dd3fc') => ({
      background: 'none', border: `1px solid ${color}`, color, borderRadius: 6,
      padding: '3px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600, lineHeight: '1.4', whiteSpace: 'nowrap',
    }),
    input:   { background: '#2a2a3e', border: '1px solid #444', borderRadius: 6, padding: '8px 12px', color: '#e0e0e0', fontSize: 14, width: '100%', boxSizing: 'border-box' },
    inputSm: { background: '#2a2a3e', border: '1px solid #444', borderRadius: 6, padding: '6px 8px', color: '#e0e0e0', fontSize: 14, width: 80, textAlign: 'right' },
    label:   { fontSize: 12, color: '#888', marginBottom: 4 },
    del:     { background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18, padding: '2px 6px' },
    divider: { borderTop: '1px solid #333', margin: '16px 0' },
    condTag: () => ({
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20,
      background: '#7dd3fc22', border: '1px solid #7dd3fc', color: '#7dd3fc', fontSize: 13,
    }),
  };

  // ════════════════════════════════════════════════════════════════════════════
  // TAB 1 — PRODUITS
  // ════════════════════════════════════════════════════════════════════════════
  const renderProduits = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>Cliquez sur un nom pour le modifier.</p>
        <button style={{ ...s.btn('#f87171'), fontSize: 13, padding: '6px 14px' }} onClick={resetQuantities}>
          Réinitialiser quantités
        </button>
      </div>

      {productTypes.map(t => (
        <div key={t.id} style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #333' }}>
            {editingType === t.id ? (
              <input autoFocus style={{ ...s.inputSm, width: 220, textAlign: 'left', fontSize: 15, fontWeight: 600, padding: '4px 8px' }}
                value={t.name} onChange={e => renameType(t.id, e.target.value)}
                onBlur={() => setEditingType(null)} onKeyDown={e => e.key === 'Enter' && setEditingType(null)} />
            ) : (
              <span style={{ fontSize: 15, fontWeight: 600, color: '#a78bfa', cursor: 'text' }} onClick={() => setEditingType(t.id)}>{t.name}</span>
            )}
            <button onClick={() => removeType(t.id)} style={s.del} title="Supprimer">🗑</button>
          </div>

          {t.subtypes.map(sub => (
            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0 5px 12px', borderBottom: '1px solid #1a1a2a' }}>
              <div style={{ flex: 1 }}>
                {editingSubtype === sub.id ? (
                  <input autoFocus style={{ ...s.inputSm, width: 140, textAlign: 'left', fontSize: 14, padding: '3px 8px' }}
                    value={sub.name} onChange={e => renameSubtype(t.id, sub.id, e.target.value)}
                    onBlur={() => setEditingSubtype(null)} onKeyDown={e => e.key === 'Enter' && setEditingSubtype(null)} />
                ) : (
                  <span style={{ fontSize: 14, color: '#ccc', cursor: 'text' }} onClick={() => setEditingSubtype(sub.id)}>{sub.name}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button style={s.btn()} onClick={() => updateQty(t.id, sub.id, -1)}>−</button>
                <input type="number" min="0" value={sub.quantity}
                  onChange={e => setQty(t.id, sub.id, parseInt(e.target.value) || 0)}
                  style={{ ...s.inputSm, width: 56, textAlign: 'center' }} />
                <button style={s.btn()} onClick={() => updateQty(t.id, sub.id, 1)}>+</button>
                <button onClick={() => removeSubtype(t.id, sub.id)} style={{ ...s.del, fontSize: 14, padding: '2px 4px' }}>✕</button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingLeft: 12 }}>
            <input style={{ ...s.input, fontSize: 13, padding: '6px 10px' }} placeholder="Nouveau sous-type..."
              value={newSubtypeNames[t.id] || ''}
              onChange={e => setNewSubtypeNames(prev => ({ ...prev, [t.id]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addSubtype(t.id)} />
            <button style={s.btnFill('#a78bfa')} onClick={() => addSubtype(t.id)}>+ Sous-type</button>
          </div>
        </div>
      ))}

      <div style={{ ...s.card, display: 'flex', gap: 8 }}>
        <input style={{ ...s.input, flex: 1 }} placeholder="Nouveau type de fenêtre..."
          value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addType()} />
        <button style={s.btnFill()} onClick={addType}>+ Type</button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // TAB 2 — PRIX & AJUSTEMENTS
  // ════════════════════════════════════════════════════════════════════════════
  const renderPrix = () => (
    <div>
      <div style={s.card}>
        <div style={{ ...s.label, marginBottom: 10 }}>CONDITIONS DE PRIX</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {conditions.map(c => (
            <div key={c.id} style={s.condTag()}>
              {editingCondition === c.id ? (
                <input autoFocus style={{ ...s.inputSm, width: 140, textAlign: 'left', padding: '2px 6px', fontSize: 13 }}
                  value={c.name} onChange={e => renameCondition(c.id, e.target.value)}
                  onBlur={() => setEditingCondition(null)} onKeyDown={e => e.key === 'Enter' && setEditingCondition(null)} />
              ) : (
                <span onClick={() => setEditingCondition(c.id)} style={{ cursor: 'text' }}>{c.name}</span>
              )}
              {conditions.length > 1 && (
                <button onClick={() => removeCondition(c.id)} style={{ ...s.del, fontSize: 14, padding: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...s.input, flex: 1 }} placeholder="Nouvelle condition..."
            value={newConditionName} onChange={e => setNewConditionName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCondition()} />
          <button style={s.btnFill('#a78bfa')} onClick={addCondition}>+ Condition</button>
        </div>
      </div>

      {productTypes.map(t => (
        <div key={t.id} style={{ ...s.card, overflowX: 'auto', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: '#a78bfa', fontSize: 14, marginBottom: 10 }}>{t.name}</div>
          {t.subtypes.length === 0 ? (
            <div style={{ color: '#555', fontSize: 13 }}>Aucun sous-type.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid #333', color: '#888', fontSize: 12 }}>Sous-type</th>
                  {conditions.map(c => (
                    <th key={c.id} style={{ textAlign: 'right', padding: '6px 10px', borderBottom: '1px solid #333', color: '#7dd3fc', fontSize: 12 }}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.subtypes.map(sub => (
                  <tr key={sub.id}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #222', fontSize: 14 }}>{sub.name}</td>
                    {conditions.map(c => (
                      <td key={c.id} style={{ padding: '4px 6px', borderBottom: '1px solid #222', textAlign: 'right' }}>
                        <input type="number" min="0" step="0.01" value={sub.prices[c.id] ?? 0}
                          onChange={e => updatePrice(t.id, sub.id, c.id, parseFloat(e.target.value) || 0)}
                          style={{ ...s.inputSm, width: 80 }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <div style={s.card}>
        <div style={{ ...s.label, marginBottom: 12 }}>AJUSTEMENTS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={s.label}>Rabais</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" min="0" step="0.01" value={adjustments.discountValue}
                onChange={e => setAdjustments({ ...adjustments, discountValue: parseFloat(e.target.value) || 0 })}
                style={{ ...s.inputSm, flex: 1 }} />
              <select value={adjustments.discountType}
                onChange={e => setAdjustments({ ...adjustments, discountType: e.target.value })}
                style={{ ...s.inputSm, width: 56, textAlign: 'center', cursor: 'pointer' }}>
                <option value="%">%</option>
                <option value="$">$</option>
              </select>
            </div>
          </div>
          <div>
            <div style={s.label}>Transport ($)</div>
            <input type="number" min="0" step="0.01" value={adjustments.transport}
              onChange={e => setAdjustments({ ...adjustments, transport: parseFloat(e.target.value) || 0 })}
              style={s.inputSm} />
          </div>
          <div>
            <div style={s.label}>Commission ($)</div>
            <input type="number" min="0" step="0.01" value={adjustments.commission}
              onChange={e => setAdjustments({ ...adjustments, commission: parseFloat(e.target.value) || 0 })}
              style={s.inputSm} />
          </div>
          <div>
            <div style={s.label}>
              <input value={adjustments.customName} onChange={e => setAdjustments({ ...adjustments, customName: e.target.value })}
                style={{ ...s.input, padding: '2px 6px', fontSize: 12, width: 140, marginBottom: 4 }} /> ($)
            </div>
            <input type="number" step="0.01" value={adjustments.customValue}
              onChange={e => setAdjustments({ ...adjustments, customValue: parseFloat(e.target.value) || 0 })}
              style={s.inputSm} />
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // TAB 3 — SOUMISSION
  // ════════════════════════════════════════════════════════════════════════════
  const renderSoumission = () => {
    const hasItems = productTypes.some(t => t.subtypes.some(s => s.quantity > 0));
    if (!hasItems) return (
      <div style={{ ...s.card, textAlign: 'center', padding: 40, color: '#666' }}>
        Aucun produit sélectionné. Retournez à l'onglet <strong>Produits</strong>.
      </div>
    );
    return (
      <div>
        {conditions.map(cond => {
          const c = calcForCondition(cond.id);
          return (
            <div key={cond.id} style={{ ...s.card, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 14px', color: '#a78bfa', fontSize: 16, fontWeight: 600 }}>{cond.name}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ textAlign: 'left',  padding: '6px 8px', color: '#888', fontSize: 12 }}>Produit</th>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 20px', fontSize: 14 }}>
                <span>Sous-total</span><span style={{ textAlign: 'right' }}>{fmt(c.subtotal)}</span>
                {c.disc > 0 && <>
                  <span style={{ color: '#f87171' }}>Rabais ({adjustments.discountType === '%' ? `${adjustments.discountValue}%` : fmt(adjustments.discountValue)})</span>
                  <span style={{ textAlign: 'right', color: '#f87171' }}>− {fmt(c.disc)}</span>
                </>}
                {c.transport > 0 && <><span>Transport</span><span style={{ textAlign: 'right' }}>{fmt(c.transport)}</span></>}
                {c.commission > 0 && <><span>Commission</span><span style={{ textAlign: 'right' }}>{fmt(c.commission)}</span></>}
                {c.custom !== 0 && <>
                  <span>{adjustments.customName || 'Ajustement'}</span>
                  <span style={{ textAlign: 'right' }}>{c.custom < 0 ? '− ' + fmt(Math.abs(c.custom)) : fmt(c.custom)}</span>
                </>}
                <div style={{ gridColumn: '1 / -1', ...s.divider, margin: '4px 0' }} />
                <span>Total avant taxes</span><span style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.beforeTax)}</span>
                <span style={{ color: '#888' }}>TPS (5%)</span><span style={{ textAlign: 'right', color: '#888' }}>{fmt(c.tps)}</span>
                <span style={{ color: '#888' }}>TVQ (9,975%)</span><span style={{ textAlign: 'right', color: '#888' }}>{fmt(c.tvq)}</span>
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

  // ════════════════════════════════════════════════════════════════════════════
  // TAB 4 — INVENTAIRE
  // ════════════════════════════════════════════════════════════════════════════
  const renderInventaire = () => (
    <div>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>
        Cliquez sur un nom pour le modifier. Utilisez <strong style={{ color: '#34d399' }}>Transférer</strong> pour déplacer un item entre emplacements.
      </p>

      {invGroups.map(g => (
        <div key={g.id} style={s.card}>
          {/* Group header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #333' }}>
            {editingGroup === g.id ? (
              <input autoFocus style={{ ...s.inputSm, width: 220, textAlign: 'left', fontSize: 15, fontWeight: 600, padding: '4px 8px' }}
                value={g.name} onChange={e => renameGroup(g.id, e.target.value)}
                onBlur={() => setEditingGroup(null)} onKeyDown={e => e.key === 'Enter' && setEditingGroup(null)} />
            ) : (
              <span style={{ fontSize: 15, fontWeight: 600, color: '#34d399', cursor: 'text' }} onClick={() => setEditingGroup(g.id)}>{g.name}</span>
            )}
            <button onClick={() => removeGroup(g.id)} style={s.del} title="Supprimer ce groupe">🗑</button>
          </div>

          {g.items.length === 0 && (
            <div style={{ color: '#555', fontSize: 13, paddingLeft: 12, paddingBottom: 8 }}>Aucun item.</div>
          )}

          {g.items.map(item => {
            const isTransferring = transfer?.groupId === g.id && transfer?.itemId === item.id;
            return (
              <div key={item.id}>
                {/* Item row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 6px 12px', borderBottom: '1px solid #1a1a2a' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingItem === item.id ? (
                      <input autoFocus style={{ ...s.inputSm, width: 160, textAlign: 'left', fontSize: 14, padding: '3px 8px' }}
                        value={item.name} onChange={e => renameItem(g.id, item.id, e.target.value)}
                        onBlur={() => setEditingItem(null)} onKeyDown={e => e.key === 'Enter' && setEditingItem(null)} />
                    ) : (
                      <span style={{ fontSize: 14, color: '#ccc', cursor: 'text' }} onClick={() => setEditingItem(item.id)}>{item.name}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <button style={s.btn()} onClick={() => updateInvQty(g.id, item.id, -1)}>−</button>
                    <input type="number" min="0" value={item.quantity}
                      onChange={e => setInvQty(g.id, item.id, parseInt(e.target.value) || 0)}
                      style={{ ...s.inputSm, width: 52, textAlign: 'center' }} />
                    <button style={s.btn()} onClick={() => updateInvQty(g.id, item.id, 1)}>+</button>
                    <button
                      style={s.btnSm(isTransferring ? '#f87171' : '#34d399')}
                      onClick={() => isTransferring ? setTransfer(null) : setTransfer({ groupId: g.id, itemId: item.id, toGroupId: null, qty: 1 })}
                    >{isTransferring ? '✕' : '⇄'}</button>
                    <button onClick={() => removeItem(g.id, item.id)} style={{ ...s.del, fontSize: 14, padding: '2px 4px' }}>✕</button>
                  </div>
                </div>

                {/* Transfer panel */}
                {isTransferring && (
                  <div style={{ background: '#16213a', border: '1px solid #34d39944', borderRadius: 8, margin: '4px 0 4px 12px', padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, color: '#34d399', marginBottom: 8, fontWeight: 600 }}>
                      Transférer « {item.name} »
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 11, color: '#888' }}>Vers</span>
                        <select
                          value={transfer.toGroupId || ''}
                          onChange={e => setTransfer(prev => ({ ...prev, toGroupId: parseInt(e.target.value) || null }))}
                          style={{ ...s.inputSm, width: 'auto', minWidth: 130, textAlign: 'left', cursor: 'pointer' }}
                        >
                          <option value="">-- Choisir --</option>
                          {invGroups.filter(og => og.id !== g.id).map(og => (
                            <option key={og.id} value={og.id}>{og.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 11, color: '#888' }}>Quantité (max {item.quantity})</span>
                        <input type="number" min="1" max={item.quantity}
                          value={transfer.qty}
                          onChange={e => setTransfer(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                          style={{ ...s.inputSm, width: 70, textAlign: 'center' }} />
                      </div>
                      <button
                        style={{ ...s.btnFill('#34d399'), alignSelf: 'flex-end', opacity: transfer.toGroupId ? 1 : 0.4 }}
                        onClick={doTransfer}
                        disabled={!transfer.toGroupId}
                      >Confirmer</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add item */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingLeft: 12 }}>
            <input style={{ ...s.input, fontSize: 13, padding: '6px 10px' }} placeholder="Nouvel item..."
              value={newItemNames[g.id] || ''}
              onChange={e => setNewItemNames(prev => ({ ...prev, [g.id]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addItem(g.id)} />
            <button style={s.btnFill('#34d399')} onClick={() => addItem(g.id)}>+ Item</button>
          </div>
        </div>
      ))}

      {/* Add group */}
      <div style={{ ...s.card, display: 'flex', gap: 8 }}>
        <input style={{ ...s.input, flex: 1 }} placeholder="Nouveau groupe (ex: Camion 2)..."
          value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addGroup()} />
        <button style={s.btnFill('#34d399')} onClick={addGroup}>+ Groupe</button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  const tabLabels = ['Produits', 'Prix & Ajust.', 'Soumission', 'Inventaire'];

  return (
    <div style={s.app}>
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
        select { appearance: none; }
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
        {tab === 3 && renderInventaire()}
      </div>
    </div>
  );
}
