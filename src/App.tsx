import React, { useState, useEffect, useCallback } from 'react';

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
  { id: "PRD-002", stockUnits: 5, totalEntered: 36 }, // Stock crítico para demo
  { id: "PRD-003", stockUnits: 120, totalEntered: 144 },
  { id: "PRD-004", stockUnits: 80, totalEntered: 120 },
  { id: "PRD-005", stockUnits: 150, totalEntered: 240 },
];

const INITIAL_EXPENSES = [
  { id: "G-1718841600000", date: new Date().toISOString(), category: "Seguridad", description: "Pago personal de seguridad externa", amount: 450.00 },
];

const INITIAL_SALES = [];

// Helper para vibración (Táctil)
const vibrate = (pattern) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export default function App() {
  // === INYECCIÓN DE ESTILOS (SOLUCIÓN PARA STACKBLITZ) ===
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('disco_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem('disco_inventory');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('disco_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem('disco_sales');
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [activeTab, setActiveTab] = useState('pos');
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotification, setShowNotification] = useState(null);
  const [screenFlash, setScreenFlash] = useState('');

  const [newProduct, setNewProduct] = useState({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
  const [isEditingProduct, setIsEditingProduct] = useState(null);
  const [newExpense, setNewExpense] = useState({ category: 'Barra', description: '', amount: '' });
  const [quickStockAdd, setQuickStockAdd] = useState({ productId: '', packages: '' });

  // === PERSISTENCIA ===
  useEffect(() => localStorage.setItem('disco_products', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('disco_inventory', JSON.stringify(inventory)), [inventory]);
  useEffect(() => localStorage.setItem('disco_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('disco_sales', JSON.stringify(sales)), [sales]);

  // === EFECTOS DINÁMICOS ===
  const triggerNotification = useCallback((message, type = 'success') => {
    setShowNotification({ message, type });
    setTimeout(() => setShowNotification(null), 3000);
  }, []);

  const triggerFlash = (type) => {
    setScreenFlash(type);
    setTimeout(() => setScreenFlash(''), 300);
  };

  // === MOTOR POS ===
  const addToCart = (product) => {
    const invItem = inventory.find(i => i.id === product.id);
    const currentQtyInCart = cart.find(item => item.productId === product.id)?.qty || 0;
    
    if (!invItem || invItem.stockUnits <= currentQtyInCart) {
      vibrate([50, 100, 50]);
      triggerFlash('error');
      triggerNotification(`¡Sin stock de ${product.name}!`, 'error');
      return;
    }

    vibrate(30);
    setCart(prevCart => {
      const existing = prevCart.find(item => item.productId === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { productId: product.id, name: product.name, qty: 1, price: product.price }];
    });
  };

  const updateCartQty = (productId, change) => {
    const product = products.find(p => p.id === productId);
    const invItem = inventory.find(i => i.id === productId);
    
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.productId === productId) {
          const newQty = item.qty + change;
          if (newQty <= 0) {
            vibrate(20);
            return null;
          }
          if (change > 0 && invItem && invItem.stockUnits < newQty) {
            vibrate([50, 100, 50]);
            triggerFlash('error');
            return item;
          }
          vibrate(20);
          return { ...item, qty: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const processCheckout = (isCourtesy = false) => {
    if (cart.length === 0) return;

    for (let cartItem of cart) {
      const invItem = inventory.find(i => i.id === cartItem.productId);
      if (!invItem || invItem.stockUnits < cartItem.qty) {
        vibrate([100, 50, 100]);
        triggerFlash('error');
        triggerNotification(`Error de stock: ${cartItem.name}`, "error");
        return;
      }
    }

    const totalCalculated = isCourtesy ? 0 : cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const newSale = {
      id: `V-${Date.now()}`,
      date: new Date().toISOString(),
      items: [...cart],
      total: totalCalculated,
      isCourtesy: isCourtesy
    };

    setInventory(prevInv => 
      prevInv.map(invItem => {
        const cartItem = cart.find(c => c.productId === invItem.id);
        if (cartItem) return { ...invItem, stockUnits: invItem.stockUnits - cartItem.qty };
        return invItem;
      })
    );

    setSales(prevSales => [newSale, ...prevSales]);
    setCart([]);
    
    vibrate([100, 50, 100, 50, 200]);
    triggerFlash('success');
    triggerNotification(isCourtesy ? "CORTESÍA REGISTRADA" : "¡VENTA COBRADA!", "success");
  };

  const voidSale = (saleId) => {
    const saleToVoid = sales.find(s => s.id === saleId);
    if (!saleToVoid) return;

    setInventory(prevInv => 
      prevInv.map(invItem => {
        const returnedItem = saleToVoid.items.find(item => item.productId === invItem.id);
        if (returnedItem) return { ...invItem, stockUnits: invItem.stockUnits + returnedItem.qty };
        return invItem;
      })
    );
    setSales(prevSales => prevSales.filter(s => s.id !== saleId));
    vibrate(150);
    triggerNotification("VENTA ANULADA. Stock devuelto.", "info");
  };

  // === INVENTARIO, PRODUCTOS Y EGRESOS ===
  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProduct.name || newProduct.cost <= 0 || newProduct.price <= 0) {
      triggerNotification("Completa los datos correctamente", "error");
      return;
    }
    const nextIdNum = products.length > 0 ? Math.max(...products.map(p => parseInt(p.id.split('-')[1]))) + 1 : 1;
    const generatedId = `PRD-${String(nextIdNum).padStart(3, '0')}`;

    setProducts(prev => [...prev, { ...newProduct, id: generatedId, unitsPerPackage: Number(newProduct.unitsPerPackage), cost: Number(newProduct.cost), price: Number(newProduct.price) }]);
    setInventory(prev => [...prev, { id: generatedId, stockUnits: 0, totalEntered: 0 }]);
    setNewProduct({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
    vibrate(100);
    triggerNotification("Ficha de producto creada", "success");
  };

  const handleUpdateProduct = (e) => {
    e.preventDefault();
    setProducts(prev => prev.map(p => p.id === isEditingProduct.id ? isEditingProduct : p));
    setIsEditingProduct(null);
    vibrate(100);
    triggerNotification("Producto actualizado", "success");
  };

  const handleAddStockBatch = (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === quickStockAdd.productId);
    if (!product || !quickStockAdd.packages) return;

    const unitsToAdd = Number(quickStockAdd.packages) * product.unitsPerPackage;

    setInventory(prevInv => 
      prevInv.map(item => item.id === quickStockAdd.productId ? { ...item, stockUnits: item.stockUnits + unitsToAdd, totalEntered: item.totalEntered + unitsToAdd } : item)
    );
    setQuickStockAdd({ productId: '', packages: '' });
    vibrate(100);
    triggerNotification(`Ingreso de ${unitsToAdd} unidades completado`, "success");
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    
    setExpenses(prev => [{ id: `G-${Date.now()}`, date: new Date().toISOString(), category: newExpense.category, description: newExpense.description, amount: Number(newExpense.amount) }, ...prev]);
    setNewExpense({ category: 'Barra', description: '', amount: '' });
    vibrate(100);
    triggerNotification("Egreso registrado", "success");
  };

  const deleteExpense = (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    vibrate(150);
    triggerNotification("Gasto eliminado", "info");
  };

  // === MÉTRICAS ===
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalExpensesAmount = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netCashFlow = totalSalesRevenue - totalExpensesAmount;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-fuchsia-500 selection:text-white">
      
      {/* CAPA DE FLASH DINÁMICO (Feedback visual inmediato) */}
      <div className={`fixed inset-0 z-50 pointer-events-none transition-opacity duration-150 ${
        screenFlash === 'success' ? 'bg-emerald-500/30 opacity-100' :
        screenFlash === 'error' ? 'bg-rose-600/40 opacity-100' : 'opacity-0'
      }`} />

      {/* RUIDO Y GLOW DE FONDO (Estética Discoteca) */}
      <div className="fixed top-[-50%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-[#0a0a0f]/0 to-[#0a0a0f]/0 pointer-events-none -z-10 blur-3xl"></div>

      {/* NOTIFICACIONES */}
      {showNotification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl border animate-[bounce_0.3s_ease-out] ${
          showNotification.type === 'error' ? 'bg-rose-950/80 text-rose-100 border-rose-500/50 shadow-rose-900/50' : 
          showNotification.type === 'info' ? 'bg-amber-950/80 text-amber-100 border-amber-500/50' :
          'bg-emerald-950/80 text-emerald-100 border-emerald-500/50 shadow-emerald-900/50'
        }`}>
          <div className="w-2.5 h-2.5 rounded-full animate-ping bg-current" />
          <span className="font-bold tracking-widest text-sm uppercase">{showNotification.message}</span>
        </div>
      )}

      {/* HEADER DINÁMICO */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-fuchsia-500 rounded-xl blur group-hover:blur-md transition-all duration-300 opacity-50 group-hover:opacity-100"></div>
            <div className="relative bg-slate-900 p-2.5 rounded-xl border border-white/10">
              <span className="text-xl">⚡</span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-fuchsia-200 to-violet-400 bg-clip-text text-transparent uppercase">
              ENGINE <span className="font-light opacity-50">PRO</span>
            </h1>
          </div>
        </div>

        {/* HUD Mini */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Caja Neta</span>
            <span className={`text-xl font-black tracking-tighter ${netCashFlow >= 0 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]' : 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]'}`}>
              S/ {netCashFlow.toFixed(2)}
            </span>
          </div>
        </div>
      </header>

      {/* MENÚ DE NAVEGACIÓN ESTILO PESTAÑAS FLOTANTES */}
      <nav className="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar border-b border-white/5 bg-[#0a0a0f]/50 backdrop-blur-sm z-30 sticky top-[73px]">
        {[
          { id: 'pos', label: 'TERMINAL', icon: '🔥' },
          { id: 'inventory', label: 'ALMACÉN', icon: '📦' },
          { id: 'products', label: 'CATÁLOGO', icon: '⚙️' },
          { id: 'expenses', label: 'EGRESOS', icon: '💸' },
          { id: 'analytics', label: 'MÉTRICAS', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { vibrate(20); setActiveTab(tab.id); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black tracking-widest transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto relative z-10">
        
        {/* ========================================================= */}
        {/* PESTAÑA: POS (REDESIGN DINÁMICO) */}
        {/* ========================================================= */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px] animate-[fadeIn_0.3s_ease-out]">
            
            {/* GRID DE PRODUCTOS (Izquierda) */}
            <div className="lg:col-span-8 flex flex-col gap-4 h-full">
              <div className="relative group">
                <div className="absolute inset-0 bg-fuchsia-500/20 rounded-2xl blur-xl group-focus-within:bg-fuchsia-500/40 transition-all"></div>
                <input
                  type="text"
                  placeholder="Buscar rápidamente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="relative w-full bg-[#13131a] border border-white/10 rounded-2xl px-6 py-4 text-xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-fuchsia-500 transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-20 pr-2 custom-scrollbar content-start">
                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => {
                  const invItem = inventory.find(i => i.id === product.id);
                  const stock = invItem ? invItem.stockUnits : 0;
                  const totalCapacity = invItem ? (invItem.totalEntered || 1) : 1; 
                  const stockPercentage = Math.min(100, Math.max(0, (stock / totalCapacity) * 100));
                  
                  const isAgotado = stock === 0;
                  const isCritico = stock > 0 && stock <= 15;
                  
                  const inCartQty = cart.find(item => item.productId === product.id)?.qty || 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isAgotado}
                      className={`relative overflow-hidden text-left p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between aspect-square group ${
                        isAgotado 
                          ? 'bg-[#13131a]/50 border-rose-900/30 opacity-50 cursor-not-allowed'
                          : 'bg-[#13131a] border-white/5 hover:border-fuchsia-500/50 hover:bg-[#1a1a24] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(217,70,239,0.15)] active:scale-95'
                      }`}
                    >
                      {/* Fondo dinámico de stock crítico */}
                      {isCritico && !isAgotado && (
                        <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none"></div>
                      )}

                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-slate-500 font-mono font-bold bg-black/40 px-2 py-1 rounded-md">{product.id}</span>
                          {inCartQty > 0 && (
                            <span className="bg-fuchsia-500 text-white font-black text-sm w-8 h-8 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.5)] animate-[bounce_0.2s_ease-out]">
                              {inCartQty}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-black text-lg text-slate-100 mt-auto leading-tight line-clamp-3">
                          {product.name}
                        </h3>
                        
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-sm font-bold text-fuchsia-500">S/</span>
                          <span className="text-2xl font-black tracking-tighter text-white">{product.price.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* HUD DE STOCK (Barra inferior visual) */}
                      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/50">
                        <div 
                          className={`h-full transition-all duration-500 ${isAgotado ? 'bg-transparent' : isCritico ? 'bg-rose-500 shadow-[0_0_10px_red]' : 'bg-emerald-500'}`}
                          style={{ width: `${stockPercentage}%` }}
                        />
                      </div>
                      <span className={`absolute bottom-2.5 right-3 text-[9px] font-black tracking-widest z-10 ${isAgotado ? 'text-rose-500' : isCritico ? 'text-rose-400' : 'text-emerald-500/50'}`}>
                        {stock} RESTA
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARRITO Y COMANDA (Derecha) */}
            <div className="lg:col-span-4 bg-[#13131a] rounded-3xl border border-white/10 flex flex-col shadow-2xl relative overflow-hidden h-full max-h-[85vh]">
              {/* Resplandor superior carrito */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500"></div>

              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h2 className="font-black text-xl tracking-tight text-white flex items-center gap-2">
                  <span>🚀</span> MARCHA
                </h2>
                {cart.length > 0 && (
                  <button onClick={() => {vibrate([50,50]); setCart([])}} className="text-[10px] bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-colors">
                    Limpiar
                  </button>
                )}
              </div>

              {/* Lista Items Carrito */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                    <span className="text-6xl mb-4">🥂</span>
                    <p className="font-black tracking-widest text-sm">ESPERANDO ORDEN</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.productId} className="bg-[#1a1a24] rounded-2xl p-3 flex flex-col gap-3 border border-white/5 relative group animate-[slideIn_0.2s_ease-out]">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-white pr-4 leading-tight">{item.name}</h4>
                        <span className="font-black text-fuchsia-400">S/{(item.price * item.qty).toFixed(2)}</span>
                      </div>
                      
                      {/* Controles táctiles gigantes */}
                      <div className="flex items-center justify-between bg-black/40 rounded-xl p-1">
                        <button 
                          onClick={() => updateCartQty(item.productId, -1)}
                          className="w-12 h-10 bg-white/5 hover:bg-rose-500/20 text-white rounded-lg flex items-center justify-center text-xl font-black transition-colors active:scale-90"
                        >-</button>
                        <span className="font-black text-xl w-12 text-center text-white">{item.qty}</span>
                        <button 
                          onClick={() => updateCartQty(item.productId, 1)}
                          className="w-12 h-10 bg-white/5 hover:bg-emerald-500/20 text-white rounded-lg flex items-center justify-center text-xl font-black transition-colors active:scale-90"
                        >+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Área de Cobro Flotante Inferior */}
              <div className="p-5 bg-[#0a0a0f] border-t border-white/10 z-10 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Total Estimado</span>
                  <span className="text-4xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    S/ {cart.reduce((a, b) => a + (b.price * b.qty), 0).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <button
                    disabled={cart.length === 0}
                    onClick={() => processCheckout(true)}
                    className="col-span-4 bg-[#1a1a24] text-slate-400 border border-white/10 hover:text-white hover:border-violet-500 hover:bg-violet-900/30 rounded-2xl py-4 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-30 flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="text-xl">🎁</span>
                    Merma
                  </button>
                  <button
                    disabled={cart.length === 0}
                    onClick={() => processCheckout(false)}
                    className="col-span-8 relative overflow-hidden bg-white text-black hover:bg-slate-200 rounded-2xl py-4 font-black text-sm uppercase tracking-widest transition-all disabled:opacity-30 disabled:bg-white/10 disabled:text-white/30 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <span className="text-xl">💵</span>
                      COBRAR YA
                    </span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA: ALMACÉN (Dinámico y Visual) */}
        {/* ========================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            
            <div className="bg-[#13131a] rounded-3xl border border-white/5 p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
              
              <h2 className="font-black text-xl text-white flex items-center gap-2 mb-6">
                <span>⚡</span> FAST INGRESO DE LOTE
              </h2>
              <form onSubmit={handleAddStockBatch} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end relative z-10">
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Producto</label>
                  <select
                    value={quickStockAdd.productId}
                    onChange={(e) => setQuickStockAdd({ ...quickStockAdd, productId: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-white appearance-none"
                  >
                    <option value="">-- SELECCIONAR --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Bultos / Cajas</label>
                  <input
                    type="number" min="1" placeholder="0"
                    value={quickStockAdd.packages}
                    onChange={(e) => setQuickStockAdd({ ...quickStockAdd, packages: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 focus:border-indigo-500 text-lg font-black text-white text-center"
                  />
                </div>

                <div className="md:col-span-4">
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all uppercase tracking-widest text-xs active:scale-95">
                    INYECTAR AL STOCK
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-[#13131a] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="px-6 py-5 bg-black/40 border-b border-white/5">
                <h3 className="font-black text-lg text-white tracking-widest">STOCK EN TIEMPO REAL</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-black/20 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-white/5">
                    <tr>
                      <th className="p-5">Producto</th>
                      <th className="p-5 text-center">Unidades / Empaque</th>
                      <th className="p-5 text-right">Físico Disponible</th>
                      <th className="p-5">Barra Vital</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {inventory.map(item => {
                      const product = products.find(p => p.id === item.id);
                      if (!product) return null;
                      const isAgotado = item.stockUnits === 0;
                      const stockPercentage = Math.min(100, Math.max(0, (item.stockUnits / (item.totalEntered || 1)) * 100));

                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-5">
                            <div className="font-black text-white">{product.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">{item.id}</div>
                          </td>
                          <td className="p-5 text-center font-bold text-slate-400">{product.unitsPerPackage} unds</td>
                          <td className="p-5 text-right">
                            <span className={`text-2xl font-black tracking-tighter ${isAgotado ? 'text-rose-500' : 'text-white'}`}>
                              {item.stockUnits}
                            </span>
                          </td>
                          <td className="p-5 w-64">
                            <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${isAgotado ? 'bg-transparent' : stockPercentage < 20 ? 'bg-rose-500 shadow-[0_0_10px_red]' : 'bg-indigo-500'}`}
                                style={{ width: `${stockPercentage}%` }}
                              />
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

        {/* ========================================================= */}
        {/* PESTAÑA: CATÁLOGO DE PRODUCTOS (Restaurada al 100%) */}
        {/* ========================================================= */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-[fadeIn_0.3s_ease-out]">
            
            {/* Editor de Productos */}
            <div className="lg:col-span-4 bg-[#13131a] rounded-3xl border border-white/5 p-6 h-fit shadow-2xl relative overflow-hidden">
              <div className="absolute -left-20 -top-20 w-64 h-64 bg-fuchsia-500/10 blur-3xl rounded-full pointer-events-none"></div>
              
              <h2 className="font-black text-xl text-white flex items-center gap-2 mb-6 relative z-10">
                <span className="text-fuchsia-500">{isEditingProduct ? "📝" : "✨"}</span>
                {isEditingProduct ? "EDITAR FICHA" : "NUEVO PRODUCTO"}
              </h2>

              <form onSubmit={isEditingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-4 relative z-10">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre Comercial</label>
                  <input
                    type="text" required
                    placeholder="Ej. Gin Hendrick's 750ml"
                    value={isEditingProduct ? isEditingProduct.name : newProduct.name}
                    onChange={(e) => isEditingProduct ? setIsEditingProduct({ ...isEditingProduct, name: e.target.value }) : setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 text-sm font-bold text-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Empaque</label>
                    <select
                      value={isEditingProduct ? isEditingProduct.type : newProduct.type}
                      onChange={(e) => isEditingProduct ? setIsEditingProduct({ ...isEditingProduct, type: e.target.value }) : setNewProduct({ ...newProduct, type: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 text-sm font-bold text-white appearance-none transition-all"
                    >
                      <option value="Caja">Caja</option>
                      <option value="Paquete">Paquete</option>
                      <option value="Botella">Botella</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unds. Internas</label>
                    <input
                      type="number" required min="1"
                      value={isEditingProduct ? isEditingProduct.unitsPerPackage : newProduct.unitsPerPackage}
                      onChange={(e) => isEditingProduct ? setIsEditingProduct({ ...isEditingProduct, unitsPerPackage: Number(e.target.value) }) : setNewProduct({ ...newProduct, unitsPerPackage: Number(e.target.value) })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 text-sm font-bold text-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Costo Lote (S/)</label>
                    <input
                      type="number" step="0.01" required min="0.1" placeholder="0.00"
                      value={isEditingProduct ? isEditingProduct.cost : newProduct.cost}
                      onChange={(e) => isEditingProduct ? setIsEditingProduct({ ...isEditingProduct, cost: Number(e.target.value) }) : setNewProduct({ ...newProduct, cost: Number(e.target.value) })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 text-sm font-bold text-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mb-2">PVP Unidad (S/)</label>
                    <input
                      type="number" step="0.01" required min="0.1" placeholder="0.00"
                      value={isEditingProduct ? isEditingProduct.price : newProduct.price}
                      onChange={(e) => isEditingProduct ? setIsEditingProduct({ ...isEditingProduct, price: Number(e.target.value) }) : setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 text-sm font-black text-white transition-all"
                    />
                  </div>
                </div>

                {/* Previsualizador de Margen Dinámico */}
                <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2 mt-4">
                  {(() => {
                    const cost = isEditingProduct ? isEditingProduct.cost : newProduct.cost;
                    const uPerPack = isEditingProduct ? isEditingProduct.unitsPerPackage : newProduct.unitsPerPackage;
                    const price = isEditingProduct ? isEditingProduct.price : newProduct.price;

                    const unitCost = uPerPack > 0 ? (cost / uPerPack) : 0;
                    const profitPerUnit = price - unitCost;
                    const marginPercent = price > 0 ? ((profitPerUnit / price) * 100) : 0;

                    return (
                      <>
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-400">Costo Base Unitario:</span>
                          <span className="text-slate-200">S/ {unitCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-400">Ganancia Neta (Und):</span>
                          <span className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">S/ {profitPerUnit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold border-t border-white/5 pt-2">
                          <span className="text-slate-400 uppercase">MARGEN UTILIDAD:</span>
                          <span className={`text-sm font-black ${marginPercent >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {marginPercent.toFixed(1)}%
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex gap-3 pt-2">
                  {isEditingProduct && (
                    <button type="button" onClick={() => setIsEditingProduct(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-xl transition-all text-xs uppercase tracking-widest active:scale-95">
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className="flex-[2] bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-all uppercase tracking-widest text-xs active:scale-95">
                    {isEditingProduct ? "GUARDAR" : "CREAR REGISTRO"}
                  </button>
                </div>
              </form>
            </div>

            {/* Listado de Catálogo */}
            <div className="lg:col-span-8 bg-[#13131a] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="px-6 py-5 bg-black/40 border-b border-white/5">
                <h3 className="font-black text-lg text-white tracking-widest">CATÁLOGO MAESTRO</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-black/20 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-white/5">
                    <tr>
                      <th className="p-5">SKU</th>
                      <th className="p-5">Producto Comercial</th>
                      <th className="p-5 text-right">Inversión Lote</th>
                      <th className="p-5 text-right">PVP Unidad</th>
                      <th className="p-5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-5 font-mono text-fuchsia-500 text-xs font-bold">{p.id}</td>
                        <td className="p-5 font-black text-white">{p.name} <span className="block text-[10px] text-slate-500 font-medium">{p.unitsPerPackage} unds x {p.type}</span></td>
                        <td className="p-5 text-right font-bold text-slate-300">S/ {p.cost.toFixed(2)}</td>
                        <td className="p-5 text-right font-black text-lg text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.2)]">
                          S/ {p.price.toFixed(2)}
                        </td>
                        <td className="p-5 text-center">
                          <button onClick={() => setIsEditingProduct(p)} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all">
                            Modificar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA: EGRESOS (Restaurada al 100%) */}
        {/* ========================================================= */}
        {activeTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-[fadeIn_0.3s_ease-out]">
            
            {/* Formulario de Salida */}
            <div className="lg:col-span-4 bg-[#13131a] rounded-3xl border border-white/5 p-6 h-fit shadow-2xl relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-rose-500/10 blur-3xl rounded-full pointer-events-none"></div>
              
              <h2 className="font-black text-xl text-rose-500 flex items-center gap-2 mb-6 relative z-10">
                <span>💸</span> SALIDA DE EFECTIVO
              </h2>

              <form onSubmit={handleAddExpense} className="space-y-4 relative z-10">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoría del Gasto</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-sm font-bold text-white appearance-none transition-all"
                  >
                    <option value="Artistas">Artistas & DJs</option>
                    <option value="Seguridad">Seguridad</option>
                    <option value="Barra">Abastecimiento de Emergencia</option>
                    <option value="Limpieza">Limpieza y Suministros</option>
                    <option value="Infraestructura">Mantenimiento</option>
                    <option value="Otros">Otros (Caja Chica)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detalle / Justificación</label>
                  <textarea
                    required rows="3"
                    placeholder="Ej. Anticipo pago seguridad..."
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-sm font-bold text-white transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Monto Retirado (S/)</label>
                  <input
                    type="number" step="0.01" required min="1" placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-2xl font-black text-white transition-all"
                  />
                </div>

                <button type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all uppercase tracking-widest text-xs active:scale-95 mt-2">
                  CONFIRMAR EGRESO
                </button>
              </form>
            </div>

            {/* Listado de Egresos */}
            <div className="lg:col-span-8 bg-[#13131a] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="px-6 py-5 bg-black/40 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-black text-lg text-white tracking-widest">BITÁCORA CAJA CHICA</h3>
                <span className="text-xs font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-md">
                  Total: S/ {totalExpensesAmount.toFixed(2)}
                </span>
              </div>
              
              {expenses.length === 0 ? (
                <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center opacity-60">
                  <span className="text-5xl mb-4 block grayscale">💰</span>
                  <p className="font-black tracking-widest text-sm uppercase">Caja intacta. No hay salidas registradas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-black/20 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-white/5">
                      <tr>
                        <th className="p-5">Hora Trans.</th>
                        <th className="p-5">Clasificación</th>
                        <th className="p-5">Concepto</th>
                        <th className="p-5 text-right">Monto (S/)</th>
                        <th className="p-5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="p-5 font-mono text-slate-400 font-bold text-xs">
                            {new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' })}
                          </td>
                          <td className="p-5">
                            <span className="text-[10px] font-black tracking-widest text-rose-300 bg-rose-950/50 border border-rose-900/50 px-2.5 py-1 rounded-md uppercase">
                              {e.category}
                            </span>
                          </td>
                          <td className="p-5 text-slate-300 font-medium whitespace-normal min-w-[200px]">
                            {e.description}
                          </td>
                          <td className="p-5 text-right font-black text-lg text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.2)]">
                            - {e.amount.toFixed(2)}
                          </td>
                          <td className="p-5 text-center">
                            <button onClick={() => deleteExpense(e.id)} className="text-[10px] font-black tracking-widest text-slate-500 hover:text-white bg-black/40 hover:bg-rose-600 px-3 py-2 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                              REVERTIR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA: MÉTRICAS Y ANULACIONES */}
        {/* ========================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'INGRESOS TOTALES', val: totalSalesRevenue, color: 'text-emerald-400', glow: 'shadow-[0_0_30px_rgba(52,211,153,0.1)]' },
                { label: 'SALIDAS / GASTOS', val: totalExpensesAmount, color: 'text-rose-400', glow: 'shadow-[0_0_30px_rgba(244,63,94,0.1)]' },
                { label: 'EFECTIVO NETO CAJA', val: netCashFlow, color: 'text-white', glow: 'shadow-[0_0_30px_rgba(255,255,255,0.1)]', bg: 'bg-white/5' }
              ].map((stat, i) => (
                <div key={i} className={`p-6 rounded-3xl border border-white/10 flex flex-col justify-center items-center text-center ${stat.bg || 'bg-[#13131a]'} ${stat.glow} relative overflow-hidden`}>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 z-10">{stat.label}</span>
                  <span className={`text-4xl lg:text-5xl font-black tracking-tighter z-10 ${stat.color}`}>
                    S/ {stat.val.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-[#13131a] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="px-6 py-5 bg-black/40 border-b border-white/5">
                <h3 className="font-black text-lg text-white tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  RADAR DE TICKETS (LIVE)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-black/20 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-white/5">
                    <tr>
                      <th className="p-5">Hora</th>
                      <th className="p-5">Composición</th>
                      <th className="p-5 text-right">Total</th>
                      <th className="p-5 text-center">Protocolo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sales.map(s => (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-5 font-mono text-slate-400 font-bold">
                          {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' })}
                        </td>
                        <td className="p-5">
                          <div className="flex gap-2 flex-wrap max-w-sm">
                            {s.items.map((item, idx) => (
                              <span key={idx} className="text-xs bg-black/50 border border-white/5 px-2 py-1 rounded-md text-slate-300">
                                <span className="text-fuchsia-400 font-black">{item.qty}x</span> {item.name.split(' ')[0]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-5 text-right font-black text-lg text-white">
                          S/ {s.total.toFixed(2)}
                        </td>
                        <td className="p-5 text-center">
                          {s.isCourtesy ? (
                            <span className="text-[10px] font-black tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-lg">CORTESÍA</span>
                          ) : (
                            <button
                              onClick={() => voidSale(s.id)}
                              className="text-[10px] font-black tracking-widest text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-lg hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                              ANULAR 🚫
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
