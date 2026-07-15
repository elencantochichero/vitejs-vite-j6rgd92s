import { useState, useEffect, useMemo, useCallback } from 'react';

// === DATOS DE INICIALIZACIÓN ===
const INITIAL_PRODUCTS = [
  { id: "PRD-001", name: "Whisky JW Black Label", type: "Caja", unitsPerPackage: 12, cost: 1200.00, price: 150.00 },
  { id: "PRD-002", name: "Ron Cartavio Selecto 750ml", type: "Caja", unitsPerPackage: 12, cost: 480.00, price: 70.00 },
  { id: "PRD-003", name: "Cerveza Corona Extra", type: "Paquete", unitsPerPackage: 24, cost: 120.00, price: 15.00 },
  { id: "PRD-004", name: "Red Bull Energy Drink", type: "Paquete", unitsPerPackage: 24, cost: 180.00, price: 18.00 },
  { id: "PRD-005", name: "Agua San Mateo 500ml", type: "Paquete", unitsPerPackage: 24, cost: 36.00, price: 6.00 },
];

const INITIAL_INVENTORY = [
  { id: "PRD-001", stockUnits: 45, totalEntered: 60 },
  { id: "PRD-002", stockUnits: 10, totalEntered: 36 },
  { id: "PRD-003", stockUnits: 120, totalEntered: 144 },
  { id: "PRD-004", stockUnits: 80, totalEntered: 120 },
  { id: "PRD-005", stockUnits: 150, totalEntered: 240 },
];

const INITIAL_EXPENSES = [
  { id: "G-1718841600000", date: new Date().toISOString(), category: "Seguridad", type: "Directo", description: "Personal de puerta (2 turnos)", amount: 350.00 },
  { id: "G-1718845200000", date: new Date().toISOString(), category: "Cantantes/Músicos", type: "Directo", description: "Orquesta principal", amount: 1200.00 },
  { id: "G-1718848800000", date: new Date().toISOString(), category: "Luz", type: "Fijo", description: "Recibo de luz mensual", amount: 850.00 },
];

const INITIAL_SALES = [];

// Helper para vibración
const vibrate = (pattern) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
};

export default function App() {
  // === INYECCIÓN DE TAILWIND ===
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // === ESTADOS PRINCIPALES ===
  const [products, setProducts] = useState(() => JSON.parse(localStorage.getItem('disco_products')) || INITIAL_PRODUCTS);
  const [inventory, setInventory] = useState(() => JSON.parse(localStorage.getItem('disco_inventory')) || INITIAL_INVENTORY);
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem('disco_expenses')) || INITIAL_EXPENSES);
  const [sales, setSales] = useState(() => JSON.parse(localStorage.getItem('disco_sales')) || INITIAL_SALES);

  // === ESTADOS DE UI ===
  const [activeTab, setActiveTab] = useState('dashboard'); // Cambiado el default al dashboard
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [screenFlash, setScreenFlash] = useState('');

  // === ESTADOS DE FORMULARIOS ===
  const [newProduct, setNewProduct] = useState({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
  const [isEditingProduct, setIsEditingProduct] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ id: null, category: 'Seguridad', type: 'Directo', description: '', amount: '' });
  const [quickStockAdd, setQuickStockAdd] = useState({ productId: '', packages: '' });
  
  // === ESTADOS DE FILTROS (DASHBOARD) ===
  const [filterProductId, setFilterProductId] = useState('');

  // === PERSISTENCIA ===
  useEffect(() => localStorage.setItem('disco_products', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('disco_inventory', JSON.stringify(inventory)), [inventory]);
  useEffect(() => localStorage.setItem('disco_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('disco_sales', JSON.stringify(sales)), [sales]);

  // === UTILIDADES DE UI ===
  const triggerNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const triggerFlash = (type) => {
    setScreenFlash(type);
    setTimeout(() => setScreenFlash(''), 300);
  };

  // ==========================================
  // LÓGICA DE VENTAS (POS)
  // ==========================================
  const addToCart = (product) => {
    const invItem = inventory.find(i => i.id === product.id);
    const currentQty = cart.find(item => item.productId === product.id)?.qty || 0;
    
    if (!invItem || invItem.stockUnits <= currentQty) {
      vibrate([50, 100, 50]); triggerFlash('error');
      triggerNotification(`¡Stock agotado de ${product.name}!`, 'error');
      return;
    }

    vibrate(30);
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) return prev.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { productId: product.id, name: product.name, qty: 1, price: product.price }];
    });
  };

  const updateCartQty = (productId, change) => {
    const invItem = inventory.find(i => i.id === productId);
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = item.qty + change;
        if (newQty <= 0) return null;
        if (change > 0 && invItem && invItem.stockUnits < newQty) {
          vibrate([50, 100, 50]); triggerFlash('error'); return item;
        }
        vibrate(20); return { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const processCheckout = (isCourtesy = false) => {
    if (cart.length === 0) return;
    const total = isCourtesy ? 0 : cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    
    const newSale = { id: `V-${Date.now()}`, date: new Date().toISOString(), items: [...cart], total, isCourtesy };

    setInventory(prev => prev.map(invItem => {
      const cartItem = cart.find(c => c.productId === invItem.id);
      return cartItem ? { ...invItem, stockUnits: invItem.stockUnits - cartItem.qty } : invItem;
    }));

    setSales(prev => [newSale, ...prev]);
    setCart([]);
    vibrate([100, 50, 100, 50, 200]); triggerFlash('success');
    triggerNotification(isCourtesy ? "CORTESÍA REGISTRADA" : "¡VENTA EXITOSA!", "success");
  };

  const voidSale = (saleId) => {
    const saleToVoid = sales.find(s => s.id === saleId);
    if (!saleToVoid) return;

    setInventory(prev => prev.map(invItem => {
      const returned = saleToVoid.items.find(i => i.productId === invItem.id);
      return returned ? { ...invItem, stockUnits: invItem.stockUnits + returned.qty } : invItem;
    }));
    setSales(prev => prev.filter(s => s.id !== saleId));
    vibrate(150); triggerNotification("VENTA ANULADA. Stock restaurado.", "info");
  };

  // ==========================================
  // LÓGICA DE PRODUCTOS E INVENTARIO
  // ==========================================
  const handleProductSubmit = (e) => {
    e.preventDefault();
    if (isEditingProduct) {
      setProducts(prev => prev.map(p => p.id === isEditingProduct.id ? isEditingProduct : p));
      setIsEditingProduct(null);
      triggerNotification("Producto actualizado", "success");
    } else {
      const nextId = products.length > 0 ? Math.max(...products.map(p => parseInt(p.id.split('-')[1]))) + 1 : 1;
      const genId = `PRD-${String(nextId).padStart(3, '0')}`;
      setProducts(prev => [...prev, { ...newProduct, id: genId, unitsPerPackage: Number(newProduct.unitsPerPackage), cost: Number(newProduct.cost), price: Number(newProduct.price) }]);
      setInventory(prev => [...prev, { id: genId, stockUnits: 0, totalEntered: 0 }]);
      setNewProduct({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
      triggerNotification("Producto creado", "success");
    }
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === quickStockAdd.productId);
    if (!product || !quickStockAdd.packages) return;
    const units = Number(quickStockAdd.packages) * product.unitsPerPackage;
    setInventory(prev => prev.map(i => i.id === quickStockAdd.productId ? { ...i, stockUnits: i.stockUnits + units, totalEntered: i.totalEntered + units } : i));
    setQuickStockAdd({ productId: '', packages: '' });
    triggerNotification(`Ingresaron ${units} unidades de ${product.name}`, "success");
  };

  // ==========================================
  // LÓGICA DE GASTOS (CRUD COMPLETO)
  // ==========================================
  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    const amount = Number(expenseForm.amount);
    if (!expenseForm.description || amount <= 0) return;

    if (expenseForm.id) {
      // Editar existente
      setExpenses(prev => prev.map(exp => exp.id === expenseForm.id ? { ...exp, category: expenseForm.category, type: expenseForm.type, description: expenseForm.description, amount } : exp));
      triggerNotification("Egreso modificado exitosamente", "success");
    } else {
      // Crear nuevo
      setExpenses(prev => [{ id: `G-${Date.now()}`, date: new Date().toISOString(), category: expenseForm.category, type: expenseForm.type, description: expenseForm.description, amount }, ...prev]);
      triggerNotification("Egreso registrado", "success");
    }
    setExpenseForm({ id: null, category: 'Seguridad', type: 'Directo', description: '', amount: '' });
  };

  const editExpense = (exp) => {
    setExpenseForm({ ...exp });
    triggerNotification("Modo edición activado", "info");
  };

  const deleteExpense = (id) => {
    if(confirm("¿Estás seguro de anular este gasto?")) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      triggerNotification("Egreso eliminado", "info");
    }
  };

  // ==========================================
  // ANALÍTICAS Y MÉTRICAS (DASHBOARD)
  // ==========================================
  const totalIngresos = useMemo(() => sales.reduce((acc, s) => acc + s.total, 0), [sales]);
  const totalEgresos = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);
  const flujoNeto = totalIngresos - totalEgresos;

  // Productos más vendidos
  const bestSellers = useMemo(() => {
    const counts = {};
    sales.filter(s => !s.isCourtesy).forEach(sale => {
      sale.items.forEach(item => {
        if (!counts[item.productId]) counts[item.productId] = { id: item.productId, name: item.name, qty: 0, revenue: 0 };
        counts[item.productId].qty += item.qty;
        counts[item.productId].revenue += (item.qty * item.price);
      });
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [sales]);

  // Alertas de Stock
  const lowStockItems = useMemo(() => {
    return inventory.filter(i => i.stockUnits <= 15).map(i => {
      const p = products.find(prod => prod.id === i.id);
      return { ...i, name: p?.name || 'Desconocido' };
    }).sort((a, b) => a.stockUnits - b.stockUnits);
  }, [inventory, products]);

  // Filtro de ventas específico
  const filteredSalesData = useMemo(() => {
    if (!filterProductId) return null;
    let qty = 0;
    let revenue = 0;
    sales.forEach(s => {
      if(s.isCourtesy) return;
      const item = s.items.find(i => i.productId === filterProductId);
      if (item) { qty += item.qty; revenue += (item.qty * item.price); }
    });
    return { qty, revenue };
  }, [filterProductId, sales]);


  // ==========================================
  // COMPONENTES UI (RENDER)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#050508] text-slate-100 font-sans relative overflow-hidden selection:bg-fuchsia-500 selection:text-white pb-24">
      
      {/* Efectos Globales */}
      <div className={`fixed inset-0 z-50 pointer-events-none transition-opacity duration-150 ${screenFlash === 'success' ? 'bg-emerald-500/20 opacity-100' : screenFlash === 'error' ? 'bg-rose-600/30 opacity-100' : 'opacity-0'}`} />
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-violet-900/10 via-[#050508] to-[#050508] pointer-events-none -z-10"></div>

      {/* Notificaciones */}
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border animate-[bounce_0.3s_ease-out] ${
          notification.type === 'error' ? 'bg-rose-950/90 text-rose-100 border-rose-500/50 shadow-rose-900/50' : 
          notification.type === 'info' ? 'bg-indigo-950/90 text-indigo-100 border-indigo-500/50 shadow-indigo-900/50' :
          'bg-emerald-950/90 text-emerald-100 border-emerald-500/50 shadow-emerald-900/50'
        }`}>
          <div className="w-2 h-2 rounded-full animate-ping bg-current" />
          <span className="font-bold tracking-widest text-xs uppercase">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative bg-gradient-to-br from-fuchsia-600 to-violet-600 p-2.5 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(192,38,211,0.4)]">
            <span className="text-xl">⚡</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-fuchsia-200 to-violet-400 bg-clip-text text-transparent uppercase">
              ENGINE <span className="font-light opacity-50">PRO</span>
            </h1>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Estado Caja</span>
          <span className={`text-xl font-black tracking-tighter ${flujoNeto >= 0 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-rose-500'}`}>
            S/ {flujoNeto.toFixed(2)}
          </span>
        </div>
      </header>

      {/* Navegación Principal */}
      <nav className="px-4 py-4 flex gap-2 overflow-x-auto border-b border-white/5 bg-[#050508]/50 backdrop-blur-sm z-30 sticky top-[73px] custom-scrollbar">
        {[
          { id: 'dashboard', label: 'DASHBOARD', icon: '📊' },
          { id: 'pos', label: 'TERMINAL POS', icon: '🔥' },
          { id: 'inventory', label: 'ALMACÉN & STOCK', icon: '📦' },
          { id: 'expenses', label: 'EGRESOS', icon: '💸' },
          { id: 'products', label: 'CATÁLOGO', icon: '⚙️' },
        ].map(t => (
          <button key={t.id} onClick={() => { vibrate(15); setActiveTab(t.id); }} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[11px] font-black tracking-widest transition-all duration-300 whitespace-nowrap ${activeTab === t.id ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
            <span className="text-sm">{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      {/* ========================================================================= */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ========================================================================= */}
      <main className="p-4 md:p-6 max-w-[1600px] mx-auto w-full">

        {/* 1. DASHBOARD & MÉTRICAS (EL CEREBRO DEL NEGOCIO) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
            
            {/* Tarjetas Principales Dinámicas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-900/40 to-[#13131a] p-6 rounded-3xl border border-emerald-500/20 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/20 blur-3xl group-hover:bg-emerald-500/30 transition-all"></div>
                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Ingresos Brutos</h3>
                <p className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">S/ {totalIngresos.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-rose-900/40 to-[#13131a] p-6 rounded-3xl border border-rose-500/20 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-rose-500/20 blur-3xl group-hover:bg-rose-500/30 transition-all"></div>
                <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Egresos Totales</h3>
                <p className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">S/ {totalEgresos.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-900/40 to-[#13131a] p-6 rounded-3xl border border-indigo-500/20 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/20 blur-3xl group-hover:bg-indigo-500/30 transition-all"></div>
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Cuadre / Flujo Neto</h3>
                <p className={`text-5xl font-black drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] ${flujoNeto >= 0 ? 'text-white' : 'text-rose-500'}`}>S/ {flujoNeto.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Analítica de Productos */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Top Sellers */}
                <div className="bg-[#101016] border border-white/5 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-sm font-black text-white tracking-widest uppercase mb-4 flex items-center gap-2">
                    <span className="text-amber-500">🏆</span> Lo más vendido (Top 5)
                  </h3>
                  <div className="space-y-3">
                    {bestSellers.length === 0 ? <p className="text-slate-600 text-xs font-bold">Aún no hay ventas.</p> : bestSellers.map((item, idx) => (
                      <div key={item.id} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${idx === 0 ? 'bg-amber-500 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-slate-400'}`}>{idx + 1}</span>
                          <div>
                            <p className="font-bold text-white text-sm">{item.name}</p>
                            <p className="text-[10px] font-mono text-slate-500">{item.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-400">S/ {item.revenue.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{item.qty} Unds despachadas</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filtro Inteligente */}
                <div className="bg-[#101016] border border-white/5 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-sm font-black text-white tracking-widest uppercase mb-4 flex items-center gap-2">
                    <span className="text-fuchsia-500">🔍</span> Consultar Rendimiento por Producto
                  </h3>
                  <div className="flex flex-col md:flex-row gap-4">
                    <select 
                      value={filterProductId} 
                      onChange={(e) => setFilterProductId(e.target.value)}
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none"
                    >
                      <option value="">-- Seleccionar Producto a Evaluar --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    
                    {filterProductId && filteredSalesData && (
                      <div className="flex-1 bg-fuchsia-950/30 border border-fuchsia-500/30 rounded-xl p-4 flex justify-around items-center animate-[slideIn_0.3s_ease-out]">
                        <div className="text-center">
                          <p className="text-[10px] uppercase font-black text-fuchsia-400">Unidades Vendidas</p>
                          <p className="text-2xl font-black text-white">{filteredSalesData.qty}</p>
                        </div>
                        <div className="w-px h-10 bg-fuchsia-500/20"></div>
                        <div className="text-center">
                          <p className="text-[10px] uppercase font-black text-fuchsia-400">Ingreso Generado</p>
                          <p className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">S/ {filteredSalesData.revenue.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Alertas y Cuadre Rápido */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Alertas de Stock */}
                <div className="bg-gradient-to-b from-[#1a0f14] to-[#101016] border border-rose-900/50 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><span className="text-6xl">⚠️</span></div>
                  <h3 className="text-sm font-black text-rose-500 tracking-widest uppercase mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    Alertas de Stock Crítico
                  </h3>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                    {lowStockItems.length === 0 ? <p className="text-slate-500 text-xs font-bold">Todo el stock está saludable.</p> : lowStockItems.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-rose-500/20 group hover:border-rose-500/50 transition-colors">
                        <div className="truncate pr-2">
                          <p className="font-bold text-white text-xs truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{item.id}</p>
                        </div>
                        <div className="bg-rose-950 px-3 py-1 rounded-lg text-center min-w-[60px]">
                          <p className="text-lg font-black text-rose-500 leading-none">{item.stockUnits}</p>
                          <p className="text-[8px] uppercase font-black text-rose-400 mt-1">Restan</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mini Cuadre de Caja (Resumen) */}
                <div className="bg-[#101016] border border-white/5 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-sm font-black text-white tracking-widest uppercase mb-4 flex items-center gap-2">
                    <span>💵</span> Estructura de Caja
                  </h3>
                  <div className="space-y-3 text-sm font-bold">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>(+) Ventas Efectivas</span>
                      <span className="text-emerald-400 font-black">S/ {totalIngresos.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>(-) Gastos Directos (Evento)</span>
                      <span className="text-rose-400 font-black">S/ {expenses.filter(e => e.type==='Directo').reduce((a,b)=>a+b.amount,0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 pb-3 border-b border-white/10">
                      <span>(-) Gastos Fijos (Local)</span>
                      <span className="text-orange-400 font-black">S/ {expenses.filter(e => e.type==='Fijo').reduce((a,b)=>a+b.amount,0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-white pt-1">
                      <span className="tracking-widest uppercase font-black">Neto en Caja</span>
                      <span className={`text-2xl font-black ${flujoNeto >= 0 ? 'text-white' : 'text-rose-500'}`}>S/ {flujoNeto.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 2. TERMINAL POS (VENTAS RÁPIDAS) */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px] animate-[fadeIn_0.3s_ease-out]">
            {/* GRID DE PRODUCTOS */}
            <div className="lg:col-span-8 flex flex-col gap-4 h-full">
              <div className="relative group">
                <div className="absolute inset-0 bg-violet-500/20 rounded-2xl blur-xl transition-all"></div>
                <input type="text" placeholder="Buscar para despachar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="relative w-full bg-[#101016] border border-white/10 rounded-2xl px-6 py-4 text-xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-10 pr-2 custom-scrollbar content-start">
                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => {
                  const invItem = inventory.find(i => i.id === product.id);
                  const stock = invItem ? invItem.stockUnits : 0;
                  const cap = invItem ? (invItem.totalEntered || 1) : 1; 
                  const pct = Math.min(100, Math.max(0, (stock / cap) * 100));
                  const isAgotado = stock === 0;
                  const isCritico = stock > 0 && stock <= 15;
                  const inCartQty = cart.find(item => item.productId === product.id)?.qty || 0;

                  return (
                    <button key={product.id} onClick={() => addToCart(product)} disabled={isAgotado} className={`relative overflow-hidden text-left p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between aspect-square group ${isAgotado ? 'bg-[#101016]/50 border-rose-900/30 opacity-50 cursor-not-allowed' : 'bg-[#101016] border-white/5 hover:border-violet-500/50 hover:bg-[#151520] hover:-translate-y-1 active:scale-95'}`}>
                      {isCritico && !isAgotado && <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none"></div>}
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-slate-400 font-mono font-bold">{product.id}</span>
                          {inCartQty > 0 && <span className="bg-violet-500 text-white font-black text-sm w-8 h-8 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">{inCartQty}</span>}
                        </div>
                        <h3 className="font-black text-lg text-slate-100 mt-auto leading-tight line-clamp-3">{product.name}</h3>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-xs font-bold text-violet-500">S/</span>
                          <span className="text-xl font-black text-white">{product.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/50">
                        <div className={`h-full transition-all duration-500 ${isAgotado ? 'bg-transparent' : isCritico ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }}/>
                      </div>
                      <span className={`absolute bottom-2.5 right-3 text-[9px] font-black tracking-widest z-10 ${isAgotado ? 'text-rose-500' : isCritico ? 'text-rose-400' : 'text-emerald-500/50'}`}>{stock} UNDS</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARRITO Y COMANDA */}
            <div className="lg:col-span-4 bg-[#101016] rounded-3xl border border-white/10 flex flex-col shadow-2xl relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-violet-500"></div>
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h2 className="font-black text-xl text-white flex items-center gap-2">🛒 TICKET</h2>
                {cart.length > 0 && <button onClick={() => {vibrate([50,50]); setCart([])}} className="text-[10px] bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-colors">Limpiar</button>}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50"><span className="text-6xl mb-4">🍻</span><p className="font-black tracking-widest text-sm">ESPERANDO ORDEN</p></div>
                ) : (
                  cart.map(item => (
                    <div key={item.productId} className="bg-[#151520] rounded-2xl p-3 flex flex-col gap-3 border border-white/5 relative animate-[slideIn_0.2s_ease-out]">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-white pr-4">{item.name}</h4>
                        <span className="font-black text-emerald-400">S/{(item.price * item.qty).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between bg-black/40 rounded-xl p-1">
                        <button onClick={() => updateCartQty(item.productId, -1)} className="w-12 h-10 bg-white/5 hover:bg-rose-500/20 text-white rounded-lg flex items-center justify-center text-xl font-black active:scale-90">-</button>
                        <span className="font-black text-xl w-12 text-center text-white">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.productId, 1)} className="w-12 h-10 bg-white/5 hover:bg-emerald-500/20 text-white rounded-lg flex items-center justify-center text-xl font-black active:scale-90">+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-5 bg-[#050508] border-t border-white/10 z-10 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">A Cobrar</span>
                  <span className="text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">S/ {cart.reduce((a, b) => a + (b.price * b.qty), 0).toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-12 gap-3">
                  <button disabled={cart.length === 0} onClick={() => processCheckout(true)} className="col-span-4 bg-[#151520] text-slate-400 border border-white/10 hover:text-white hover:border-violet-500 hover:bg-violet-900/30 rounded-2xl py-4 font-black text-xs uppercase tracking-widest disabled:opacity-30 flex flex-col items-center justify-center gap-1 active:scale-95">
                    <span className="text-xl">🎁</span>Merma
                  </button>
                  <button disabled={cart.length === 0} onClick={() => processCheckout(false)} className="col-span-8 bg-emerald-500 text-black hover:bg-emerald-400 rounded-2xl py-4 font-black text-sm uppercase tracking-widest disabled:opacity-30 disabled:bg-white/10 disabled:text-white/30 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95">
                    <span className="text-xl">💵</span> COBRAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. INVENTARIO */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-[#101016] rounded-3xl border border-white/5 p-6 shadow-xl">
              <h2 className="font-black text-xl text-white flex items-center gap-2 mb-6"><span>⚡</span> ENTRADA RÁPIDA DE STOCK</h2>
              <form onSubmit={handleAddStock} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Producto</label>
                  <select value={quickStockAdd.productId} onChange={(e) => setQuickStockAdd({ ...quickStockAdd, productId: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 focus:border-indigo-500 outline-none text-sm font-bold text-white">
                    <option value="">-- SELECCIONAR --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Cantidad (Cajas/Paquetes)</label>
                  <input type="number" min="1" placeholder="0" value={quickStockAdd.packages} onChange={(e) => setQuickStockAdd({ ...quickStockAdd, packages: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 focus:border-indigo-500 outline-none text-lg font-black text-white text-center" />
                </div>
                <div className="md:col-span-4">
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest text-xs active:scale-95">INYECTAR AL STOCK</button>
                </div>
              </form>
            </div>
            <div className="bg-[#101016] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
              <div className="px-6 py-5 bg-black/40 border-b border-white/5">
                <h3 className="font-black text-lg text-white tracking-widest">STOCK FÍSICO</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-black/20 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-white/5">
                    <tr>
                      <th className="p-5">Producto</th>
                      <th className="p-5 text-center">Unidades / Empaque</th>
                      <th className="p-5 text-right">Existencia Físico</th>
                      <th className="p-5 w-1/3">Salud de Inventario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {inventory.map(item => {
                      const p = products.find(prod => prod.id === item.id);
                      if (!p) return null;
                      const pct = Math.min(100, Math.max(0, (item.stockUnits / (item.totalEntered || 1)) * 100));
                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-5"><div className="font-black text-white">{p.name}</div><div className="text-[10px] font-mono text-slate-500">{item.id}</div></td>
                          <td className="p-5 text-center font-bold text-slate-400">{p.unitsPerPackage} unds</td>
                          <td className="p-5 text-right"><span className={`text-2xl font-black tracking-tighter ${item.stockUnits===0 ? 'text-rose-500' : 'text-white'}`}>{item.stockUnits}</span></td>
                          <td className="p-5">
                            <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/5">
                              <div className={`h-full rounded-full ${item.stockUnits===0?'bg-transparent':pct<20?'bg-rose-500':pct<50?'bg-amber-500':'bg-emerald-500'}`} style={{width: `${pct}%`}}/>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. EGRESOS (MÓDULO AVANZADO) */}
        {activeTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-[fadeIn_0.3s_ease-out]">
            
            {/* Formulario de Gastos */}
            <div className="lg:col-span-4 bg-[#101016] rounded-3xl border border-white/5 p-6 h-fit shadow-xl">
              <h2 className="font-black text-xl text-rose-500 flex items-center gap-2 mb-6">
                <span>{expenseForm.id ? '✏️' : '💸'}</span> {expenseForm.id ? 'EDITAR GASTO' : 'REGISTRAR GASTO'}
              </h2>
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Clasificación Principal</label>
                  <select value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value, category: e.target.value === 'Directo' ? 'Cantantes/Músicos' : 'Local' })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-rose-500 outline-none text-sm font-bold text-white appearance-none">
                    <option value="Directo">Gasto Directo (Evento / Operación)</option>
                    <option value="Fijo">Gasto Fijo (Estructura / Local)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoría Específica</label>
                  <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-rose-500 outline-none text-sm font-bold text-white appearance-none">
                    {expenseForm.type === 'Directo' ? (
                      <optgroup label="Personal y Show">
                        <option value="Cantantes/Músicos">Cantantes / Músicos</option>
                        <option value="Animadores/DJs">Animadores / DJs</option>
                        <option value="Seguridad">Seguridad (Box/Puerta)</option>
                        <option value="Cajera">Cajera(o)</option>
                        <option value="Moza/Azafata">Moza / Azafata</option>
                        <option value="Limpieza">Personal de Limpieza</option>
                        <option value="Insumos Evento">Insumos del Evento (Hielo, Vasos)</option>
                      </optgroup>
                    ) : (
                      <optgroup label="Costos Fijos">
                        <option value="Local">Alquiler de Local</option>
                        <option value="Luz">Servicio de Luz</option>
                        <option value="Agua">Servicio de Agua</option>
                        <option value="Internet/Sistemas">Internet / Sistemas</option>
                        <option value="Mantenimiento">Mantenimiento de Equipos</option>
                        <option value="Otros Fijos">Otros Fijos</option>
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción Detallada</label>
                  <textarea required rows="2" placeholder="Ej. Pago DJ invitado o recibo luz enero..." value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-rose-500 outline-none text-sm font-bold text-white resize-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Monto del Desembolso (S/)</label>
                  <input type="number" step="0.01" required min="1" placeholder="0.00" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-rose-500 outline-none text-2xl font-black text-white" />
                </div>

                <div className="flex gap-2 mt-2">
                  {expenseForm.id && (
                    <button type="button" onClick={() => setExpenseForm({ id: null, category: 'Seguridad', type: 'Directo', description: '', amount: '' })} className="flex-1 bg-white/5 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest">Cancelar</button>
                  )}
                  <button type="submit" className="flex-[2] bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all uppercase tracking-widest text-xs active:scale-95">
                    {expenseForm.id ? "GUARDAR CAMBIOS" : "CONFIRMAR EGRESO"}
                  </button>
                </div>
              </form>
            </div>

            {/* Listado de Egresos Editable */}
            <div className="lg:col-span-8 bg-[#101016] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
              <div className="px-6 py-5 bg-black/40 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-black text-lg text-white tracking-widest">HISTORIAL DE SALIDAS</h3>
                <span className="text-xs font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-md">Total: S/ {totalEgresos.toFixed(2)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-black/20 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-white/5">
                    <tr>
                      <th className="p-5">Fecha/Hora</th>
                      <th className="p-5">Tipo & Categoría</th>
                      <th className="p-5">Detalle</th>
                      <th className="p-5 text-right">Monto</th>
                      <th className="p-5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {expenses.map(e => (
                      <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-5 font-mono text-slate-400 font-bold text-xs">{new Date(e.date).toLocaleDateString()} {new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                        <td className="p-5">
                          <span className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase border ${e.type === 'Directo' ? 'bg-amber-950/50 text-amber-300 border-amber-900/50' : 'bg-blue-950/50 text-blue-300 border-blue-900/50'}`}>
                            {e.type} - {e.category}
                          </span>
                        </td>
                        <td className="p-5 text-slate-300 font-medium whitespace-normal min-w-[150px]">{e.description}</td>
                        <td className="p-5 text-right font-black text-lg text-rose-500">- S/{e.amount.toFixed(2)}</td>
                        <td className="p-5 text-center flex justify-center gap-2">
                          <button onClick={() => editExpense(e)} className="bg-white/10 hover:bg-indigo-600 text-white p-2 rounded-lg transition-colors" title="Editar">✏️</button>
                          <button onClick={() => deleteExpense(e.id)} className="bg-white/10 hover:bg-rose-600 text-white p-2 rounded-lg transition-colors" title="Eliminar">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. CATÁLOGO MAESTRO (Sin cambios, es robusto) */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="lg:col-span-4 bg-[#101016] rounded-3xl border border-white/5 p-6 h-fit shadow-xl">
              <h2 className="font-black text-xl text-white flex items-center gap-2 mb-6"><span className="text-fuchsia-500">{isEditingProduct ? "📝" : "✨"}</span>{isEditingProduct ? "EDITAR FICHA" : "NUEVO PRODUCTO"}</h2>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre Comercial</label>
                  <input type="text" required placeholder="Ej. Gin Hendrick's" value={isEditingProduct ? isEditingProduct.name : newProduct.name} onChange={(e) => isEditingProduct ? setIsEditingProduct({ ...isEditingProduct, name: e.target.value }) : setNewProduct({ ...newProduct, name: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-fuchsia-500 outline-none text-sm font-bold text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Empaque</label>
                    <select value={isEditingProduct ? isEditingProduct.type : newProduct.type} onChange={(e) => isEditingProduct ? setIsEditingProduct({ ...isEditingProduct, type: e.target.value }) : setNewProduct({ ...newProduct, type: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-fuchsia-500 outline-none text-sm font-bold text-white appearance-none">
                      <option value="Caja">Caja</option>
                      <option value="Paquete">Paquete</option>
                      <option value="Botella">Botella</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unds. Internas</label>
                    <input type="number" required min="1" value={isEditingProduct ? isEditingProduct.unitsPerPackage : newProduct.unitsPerPackage} onChange={(e) => isEditingProduct ? setIsEditingProduct({ ...isEditingProduct, unitsPerPackage: Number(e.target.value) }) : setNewProduct({ ...newProduct, unitsPerPackage: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-fuchsia-500 outline-none text-sm font-bold text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Costo Lote (S/)</label>
                    <input type="number" step="0.01" required min="0.1" placeholder="0.00" value={isEditingProduct ? isEditingProduct.cost : newProduct.cost} onChange={(e) => isEditingProduct ? setIsEditingProduct({ ...isEditingProduct, cost: Number(e.target.value) }) : setNewProduct({ ...newProduct, cost: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-fuchsia-500 outline-none text-sm font-bold text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mb-2">PVP Unidad (S/)</label>
                    <input type="number" step="0.01" required min="0.1" placeholder="0.00" value={isEditingProduct ? isEditingProduct.price : newProduct.price} onChange={(e) => isEditingProduct ? setIsEditingProduct({ ...isEditingProduct, price: Number(e.target.value) }) : setNewProduct({ ...newProduct, price: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-fuchsia-500 outline-none text-sm font-black text-white" />
                  </div>
                </div>
                
                {/* Info Margen */}
                <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2 mt-4">
                  {(() => {
                    const c = isEditingProduct ? isEditingProduct.cost : newProduct.cost;
                    const u = isEditingProduct ? isEditingProduct.unitsPerPackage : newProduct.unitsPerPackage;
                    const p = isEditingProduct ? isEditingProduct.price : newProduct.price;
                    const uc = u > 0 ? (c / u) : 0;
                    const prof = p - uc;
                    const mg = p > 0 ? ((prof / p) * 100) : 0;
                    return (
                      <>
                        <div className="flex justify-between items-center text-xs font-bold"><span className="text-slate-400">Costo Base Unitario:</span><span className="text-slate-200">S/ {uc.toFixed(2)}</span></div>
                        <div className="flex justify-between items-center text-xs font-bold"><span className="text-slate-400">Ganancia Neta (Und):</span><span className="text-emerald-400">S/ {prof.toFixed(2)}</span></div>
                        <div className="flex justify-between items-center text-xs font-bold border-t border-white/5 pt-2"><span className="text-slate-400 uppercase">MARGEN UTILIDAD:</span><span className={`text-sm font-black ${mg >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{mg.toFixed(1)}%</span></div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex gap-3 pt-2">
                  {isEditingProduct && <button type="button" onClick={() => setIsEditingProduct(null)} className="flex-1 bg-white/5 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest active:scale-95">Cancelar</button>}
                  <button type="submit" className="flex-[2] bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.3)] uppercase tracking-widest text-xs active:scale-95">{isEditingProduct ? "GUARDAR" : "CREAR REGISTRO"}</button>
                </div>
              </form>
            </div>
            <div className="lg:col-span-8 bg-[#101016] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
              <div className="px-6 py-5 bg-black/40 border-b border-white/5"><h3 className="font-black text-lg text-white tracking-widest">CATÁLOGO MAESTRO</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-black/20 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-white/5">
                    <tr><th className="p-5">SKU</th><th className="p-5">Producto</th><th className="p-5 text-right">Inversión Lote</th><th className="p-5 text-right">PVP Unidad</th><th className="p-5 text-center">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-5 font-mono text-fuchsia-500 text-xs font-bold">{p.id}</td>
                        <td className="p-5 font-black text-white">{p.name} <span className="block text-[10px] text-slate-500 font-medium">{p.unitsPerPackage} unds x {p.type}</span></td>
                        <td className="p-5 text-right font-bold text-slate-300">S/ {p.cost.toFixed(2)}</td>
                        <td className="p-5 text-right font-black text-lg text-emerald-400">S/ {p.price.toFixed(2)}</td>
                        <td className="p-5 text-center"><button onClick={() => setIsEditingProduct(p)} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest">Modificar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ESTILOS CSS GLOBALES */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}