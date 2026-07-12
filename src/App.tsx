import React, { useState, useEffect } from 'react';

// === DATOS DE INICIALIZACIÓN (MOCK) ===
const INITIAL_PRODUCTS = [
  { id: "PRD-001", name: "Whisky Johnnie Walker Black Label", type: "Caja", unitsPerPackage: 12, cost: 1200.00, price: 150.00 },
  { id: "PRD-002", name: "Ron Cartavio Selecto 750ml", type: "Caja", unitsPerPackage: 12, cost: 480.00, price: 70.00 },
  { id: "PRD-003", name: "Cerveza Corona Extra 355ml", type: "Paquete", unitsPerPackage: 24, cost: 120.00, price: 15.00 },
  { id: "PRD-004", name: "Red Bull Energy Drink 250ml", type: "Paquete", unitsPerPackage: 24, cost: 180.00, price: 18.00 },
  { id: "PRD-005", name: "Agua Mineral San Mateo 500ml", type: "Paquete", unitsPerPackage: 24, cost: 36.00, price: 6.00 },
];

const INITIAL_INVENTORY = [
  { id: "PRD-001", stockUnits: 45, totalEntered: 60 },
  { id: "PRD-002", stockUnits: 30, totalEntered: 36 },
  { id: "PRD-003", stockUnits: 120, totalEntered: 144 },
  { id: "PRD-004", stockUnits: 80, totalEntered: 120 },
  { id: "PRD-005", stockUnits: 150, totalEntered: 240 },
];

const INITIAL_EXPENSES = [
  { id: "G-1718841600000", date: "2026-07-09T22:00:00.000Z", category: "Seguridad", description: "Pago personal de seguridad externa - Viernes", amount: 450.00 },
  { id: "G-1718845200000", date: "2026-07-09T23:30:00.000Z", category: "Artistas", description: "DJ Residente - Set Principal", amount: 600.00 },
];

const INITIAL_SALES = [
  {
    id: "V-1718852400000",
    date: "2026-07-10T01:40:00.000Z",
    items: [
      { productId: "PRD-001", name: "Whisky Johnnie Walker Black Label", qty: 2, price: 150.00 },
      { productId: "PRD-004", name: "Red Bull Energy Drink 250ml", qty: 4, price: 18.00 }
    ],
    total: 372.00,
    isCourtesy: false
  },
  {
    id: "V-1718856000000",
    date: "2026-07-10T02:10:00.000Z",
    items: [
      { productId: "PRD-003", name: "Cerveza Corona Extra 355ml", qty: 3, price: 15.00 }
    ],
    total: 0.00,
    isCourtesy: true
  }
];

export default function App() {
  // === ESTADOS DEL SISTEMA ===
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

  // UI States
  const [activeTab, setActiveTab] = useState('pos'); // pos, inventory, expenses, analytics, products
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotification, setShowNotification] = useState(null);

  // Forms States
  const [newProduct, setNewProduct] = useState({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
  const [isEditingProduct, setIsEditingProduct] = useState(null);
  const [newExpense, setNewExpense] = useState({ category: 'Barra', description: '', amount: '' });
  const [quickStockAdd, setQuickStockAdd] = useState({ productId: '', packages: '' });

  // === PERSISTENCIA LOCALSTORAGE ===
  useEffect(() => {
    localStorage.setItem('disco_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('disco_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('disco_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('disco_sales', JSON.stringify(sales));
  }, [sales]);

  // === AUXILIARES DE ALERTA ===
  const triggerNotification = (message, type = 'success') => {
    setShowNotification({ message, type });
    setTimeout(() => setShowNotification(null), 3000);
  };

  // === LÓGICA DE VENTAS (POS) ===
  const addToCart = (product) => {
    const invItem = inventory.find(i => i.id === product.id);
    const currentQtyInCart = cart.find(item => item.productId === product.id)?.qty || 0;
    
    if (!invItem || invItem.stockUnits <= currentQtyInCart) {
      triggerNotification(`¡Stock insuficiente de ${product.name}!`, 'error');
      return;
    }

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
          if (newQty <= 0) return null;
          if (invItem && invItem.stockUnits < newQty) {
            triggerNotification(`¡Stock insuficiente de ${product.name}!`, 'error');
            return item;
          }
          return { ...item, qty: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const processCheckout = (isCourtesy = false) => {
    if (cart.length === 0) {
      triggerNotification("El carrito está vacío", "error");
      return;
    }

    // Verificar stock final una vez más
    for (let cartItem of cart) {
      const invItem = inventory.find(i => i.id === cartItem.productId);
      if (!invItem || invItem.stockUnits < cartItem.qty) {
        triggerNotification(`Error: El producto ${cartItem.name} se quedó sin stock suficiente.`, "error");
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

    // Actualizar Stock
    setInventory(prevInv => 
      prevInv.map(invItem => {
        const cartItem = cart.find(c => c.productId === invItem.id);
        if (cartItem) {
          return {
            ...invItem,
            stockUnits: invItem.stockUnits - cartItem.qty
          };
        }
        return invItem;
      })
    );

    setSales(prevSales => [newSale, ...prevSales]);
    setCart([]);
    triggerNotification(isCourtesy ? "¡Cortesía/Merma registrada con éxito!" : "¡Venta procesada con éxito!", "success");
  };

  const voidSale = (saleId) => {
    const saleToVoid = sales.find(s => s.id === saleId);
    if (!saleToVoid) return;

    // Restaurar el stock
    setInventory(prevInv => 
      prevInv.map(invItem => {
        const returnedItem = saleToVoid.items.find(item => item.productId === invItem.id);
        if (returnedItem) {
          return {
            ...invItem,
            stockUnits: invItem.stockUnits + returnedItem.qty
          };
        }
        return invItem;
      })
    );

    setSales(prevSales => prevSales.filter(s => s.id !== saleId));
    triggerNotification("Venta anulada. Inventario restaurado.", "info");
  };

  // === LÓGICA DE INVENTARIO Y PRODUCTOS ===
  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProduct.name || newProduct.cost <= 0 || newProduct.price <= 0) {
      triggerNotification("Por favor completa los campos correctamente", "error");
      return;
    }

    const nextIdNum = products.length > 0 
      ? Math.max(...products.map(p => parseInt(p.id.split('-')[1]))) + 1 
      : 1;
    const generatedId = `PRD-${String(nextIdNum).padStart(3, '0')}`;

    const newProductObj = {
      id: generatedId,
      name: newProduct.name,
      type: newProduct.type,
      unitsPerPackage: Number(newProduct.unitsPerPackage),
      cost: Number(newProduct.cost),
      price: Number(newProduct.price)
    };

    const newInventoryObj = {
      id: generatedId,
      stockUnits: 0,
      totalEntered: 0
    };

    setProducts(prev => [...prev, newProductObj]);
    setInventory(prev => [...prev, newInventoryObj]);
    setNewProduct({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
    triggerNotification("Producto y ficha de inventario creados", "success");
  };

  const handleUpdateProduct = (e) => {
    e.preventDefault();
    if (!isEditingProduct.name || isEditingProduct.cost <= 0 || isEditingProduct.price <= 0) {
      triggerNotification("Por favor completa los campos correctamente", "error");
      return;
    }

    setProducts(prev => prev.map(p => p.id === isEditingProduct.id ? isEditingProduct : p));
    setIsEditingProduct(null);
    triggerNotification("Producto actualizado correctamente", "success");
  };

  const handleAddStockBatch = (e) => {
    e.preventDefault();
    const { productId, packages } = quickStockAdd;
    if (!productId || !packages || Number(packages) <= 0) {
      triggerNotification("Selecciona un producto y cantidad válida", "error");
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const unitsToAdd = Number(packages) * product.unitsPerPackage;

    setInventory(prevInv => 
      prevInv.map(item => {
        if (item.id === productId) {
          return {
            ...item,
            stockUnits: item.stockUnits + unitsToAdd,
            totalEntered: item.totalEntered + unitsToAdd
          };
        }
        return item;
      })
    );

    setQuickStockAdd({ productId: '', packages: '' });
    triggerNotification(`Se añadieron ${unitsToAdd} unidades individuales de ${product.name}`, "success");
  };

  // === LÓGICA DE GASTOS ===
  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount || Number(newExpense.amount) <= 0) {
      triggerNotification("Ingresa una descripción y monto válido", "error");
      return;
    }

    const expenseObj = {
      id: `G-${Date.now()}`,
      date: new Date().toISOString(),
      category: newExpense.category,
      description: newExpense.description,
      amount: Number(newExpense.amount)
    };

    setExpenses(prev => [expenseObj, ...prev]);
    setNewExpense({ category: 'Barra', description: '', amount: '' });
    triggerNotification("Gasto o egreso registrado", "success");
  };

  const deleteExpense = (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    triggerNotification("Gasto eliminado", "info");
  };

  // === CALCULADORA DE MÉTRICAS (CAJA GENERAL) ===
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalExpensesAmount = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netCashFlow = totalSalesRevenue - totalExpensesAmount;

  const totalCourtesiesCount = sales.filter(s => s.isCourtesy).reduce((acc, s) => {
    return acc + s.items.reduce((sum, item) => sum + item.qty, 0);
  }, 0);

  // Alertas de Stock Bajo (menor a 15 unidades individuales)
  const lowStockItems = inventory.filter(item => item.stockUnits < 15).map(item => {
    const prod = products.find(p => p.id === item.id);
    return { ...item, name: prod ? prod.name : "Desconocido" };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-purple-500 selection:text-white">
      
      {/* NOTIFICACIONES FLOTANTES */}
      {showNotification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl transition-all duration-300 border ${
          showNotification.type === 'error' ? 'bg-rose-950/90 text-rose-200 border-rose-500/50' : 
          showNotification.type === 'info' ? 'bg-amber-950/90 text-amber-200 border-amber-500/50' :
          'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
        }`}>
          <div className="w-2 h-2 rounded-full animate-ping bg-current" />
          <span className="font-semibold tracking-wide text-sm">{showNotification.message}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className="sticky top-0 z-40 bg-slate-900/85 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 p-2.5 rounded-xl shadow-lg shadow-fuchsia-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
              DISCOTHEQUE ENGINE v2.5
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Sistema de Control Operativo</p>
          </div>
        </div>

        {/* METRICAS RAPIDAS DE CAJA EN HEADER */}
        <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Flujo Neto</span>
              <span className={`font-mono font-bold ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                S/ {netCashFlow.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Cortesías</span>
              <span className="font-mono font-bold text-violet-400">{totalCourtesiesCount} Unds</span>
            </div>
          </div>
          {lowStockItems.length > 0 && (
            <div className="bg-rose-950/55 border border-rose-800/50 rounded-xl px-4 py-2 flex items-center gap-3 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <div>
                <span className="text-rose-300 block text-[10px] uppercase font-bold tracking-wider">Alerta Stock</span>
                <span className="font-mono font-bold text-rose-400">{lowStockItems.length} Alertas</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MENÚ DE NAVEGACIÓN */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex flex-wrap gap-2">
        {[
          { id: 'pos', label: 'Terminal Ventas (POS)', icon: '🛒' },
          { id: 'inventory', label: 'Inventario y Lotes', icon: '📦' },
          { id: 'products', label: 'Catálogo Productos', icon: '📝' },
          { id: 'expenses', label: 'Egresos y Gastos', icon: '💸' },
          { id: 'analytics', label: 'Caja & Historial', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-fuchsia-500/40 text-fuchsia-200 shadow-md shadow-fuchsia-950/10'
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        
        {/* ========================================================= */}
        {/* PESTAÑA: POS / TERMINAL DE VENTAS */}
        {/* ========================================================= */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Buscador y Catálogo de Productos */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar bebida, botella o insumo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3.5 pl-12 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 text-slate-100 placeholder-slate-500 transition-all text-sm font-medium"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded">
                    Limpiar
                  </button>
                )}
              </div>

              {/* Grid de Productos Rápidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[620px] pr-2">
                {products
                  .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(product => {
                    const invItem = inventory.find(i => i.id === product.id);
                    const stock = invItem ? invItem.stockUnits : 0;
                    const inCartQty = cart.find(item => item.productId === product.id)?.qty || 0;
                    const isLowStock = stock <= 15;

                    return (
                      <button
                        key={product.id}
                        disabled={stock === 0}
                        onClick={() => addToCart(product)}
                        className={`group relative text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-40 ${
                          stock === 0 
                            ? 'bg-slate-900/40 border-slate-900 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700/80 hover:bg-slate-850 hover:shadow-xl hover:shadow-slate-950/50 cursor-pointer active:scale-[0.98]'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                              {product.id}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              stock === 0 ? 'bg-slate-950 text-slate-600' :
                              isLowStock ? 'bg-rose-950 text-rose-400 border border-rose-900/50 animate-pulse' : 
                              'bg-slate-950 text-emerald-400'
                            }`}>
                              {stock === 0 ? 'AGOTADO' : `${stock} Unidades`}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-slate-100 mt-2 line-clamp-2 leading-snug group-hover:text-fuchsia-400 transition-colors">
                            {product.name}
                          </h3>
                        </div>

                        <div className="flex items-end justify-between mt-2">
                          <span className="text-xl font-mono font-extrabold text-slate-100">
                            S/ {product.price.toFixed(2)}
                          </span>
                          {inCartQty > 0 && (
                            <span className="bg-fuchsia-600 text-white font-extrabold text-xs w-6 h-6 rounded-full flex items-center justify-center animate-bounce shadow-md shadow-fuchsia-950">
                              {inCartQty}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* CARRITO Y PROCESAMIENTO (COLUMNA DERECHA) */}
            <div className="lg:col-span-5 bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between h-[680px] shadow-2xl">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <h2 className="font-extrabold text-lg flex items-center gap-2">
                    <span>🍸</span> Comanda Actual
                  </h2>
                  {cart.length > 0 && (
                    <button 
                      onClick={() => setCart([])}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold tracking-wider uppercase hover:underline"
                    >
                      Vaciar
                    </button>
                  )}
                </div>

                {/* Lista de Items en Carrito */}
                <div className="overflow-y-auto max-h-[380px] my-4 pr-1 space-y-3">
                  {cart.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                      <span className="text-5xl mb-3">🛸</span>
                      <p className="text-sm font-semibold">El carrito está listo para marchar</p>
                      <p className="text-xs text-slate-600 mt-1">Toca las bebidas del catálogo</p>
                    </div>
                  ) : (
                    cart.map(item => {
                      const productObj = products.find(p => p.id === item.productId);
                      return (
                        <div key={item.productId} className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-slate-200 truncate">{item.name}</h4>
                            <span className="text-slate-500 text-[10px] font-mono">P.U: S/ {item.price.toFixed(2)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateCartQty(item.productId, -1)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 w-7 h-7 rounded-lg flex items-center justify-center font-extrabold transition-colors"
                            >
                              -
                            </button>
                            <span className="font-mono text-sm font-bold w-6 text-center text-fuchsia-300">
                              {item.qty}
                            </span>
                            <button 
                              onClick={() => updateCartQty(item.productId, 1)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 w-7 h-7 rounded-lg flex items-center justify-center font-extrabold transition-colors"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right min-w-[70px]">
                            <span className="font-mono text-xs font-black text-slate-100">
                              S/ {(item.price * item.qty).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* TOTALES Y ACCIONES */}
              <div className="border-t border-slate-800 pt-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono">S/ {cart.reduce((acc, item) => acc + (item.price * item.qty), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-slate-300">TOTAL ESTIMADO</span>
                    <span className="text-3xl font-mono font-black text-fuchsia-400">
                      S/ {cart.reduce((acc, item) => acc + (item.price * item.qty), 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={cart.length === 0}
                    onClick={() => processCheckout(true)}
                    className="py-3 px-4 rounded-xl border border-violet-800/60 bg-violet-950/40 text-violet-300 hover:bg-violet-900/30 font-bold text-xs tracking-wider uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>🎁</span> Cortesía / Merma
                  </button>
                  <button
                    disabled={cart.length === 0}
                    onClick={() => processCheckout(false)}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs tracking-widest uppercase transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>💳</span> Cobrar Venta
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA: GESTIÓN DE INVENTARIO Y LOTES */}
        {/* ========================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            
            {/* Formulario rápido de ingreso de stock */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl">
              <h2 className="font-black text-lg flex items-center gap-2 text-indigo-400 mb-4">
                <span>➕</span> Ingresar Lote de Mercadería (Entrada de Almacén)
              </h2>
              <form onSubmit={handleAddStockBatch} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Producto Recibido</label>
                  <select
                    value={quickStockAdd.productId}
                    onChange={(e) => setQuickStockAdd({ ...quickStockAdd, productId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="">-- Seleccionar Bebida --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type} de {p.unitsPerPackage} unds)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cantidad de Empaques Entrantes</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej. 5 cajas / bultos"
                    value={quickStockAdd.packages}
                    onChange={(e) => setQuickStockAdd({ ...quickStockAdd, packages: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono text-slate-100 placeholder-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg text-sm uppercase tracking-wider"
                >
                  Registrar Entrada y Convertir Stock
                </button>
              </form>
              <p className="text-slate-500 text-[11px] mt-3 italic">
                * Nota: El sistema convertirá automáticamente los paquetes/cajas en unidades individuales basándose en la ficha técnica del producto.
              </p>
            </div>

            {/* Listado de Inventario Físico Actual */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-100 flex items-center gap-2">
                  <span>📊</span> Stock Físico en Unidades Individuales
                </h3>
                <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-full font-bold text-slate-400">
                  Total Registrados: {inventory.length} Insumos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-400 font-extrabold border-b border-slate-800">
                    <tr>
                      <th className="p-4">SKU / ID</th>
                      <th className="p-4">Nombre Comercial</th>
                      <th className="p-4 text-center">Tipo Empaque</th>
                      <th className="p-4 text-center">Contenido x Caja</th>
                      <th className="p-4 text-right">Existencia (Unidades)</th>
                      <th className="p-4 text-right">Acumulado Histórico</th>
                      <th className="p-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {inventory.map(item => {
                      const product = products.find(p => p.id === item.id);
                      if (!product) return null;

                      const isCritical = item.stockUnits <= 15;
                      const isAgotado = item.stockUnits === 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-fuchsia-400 text-xs">{item.id}</td>
                          <td className="p-4 font-bold text-slate-200">{product.name}</td>
                          <td className="p-4 text-center text-slate-400 font-medium">{product.type}</td>
                          <td className="p-4 text-center font-mono text-indigo-300">{product.unitsPerPackage} Unds</td>
                          <td className="p-4 text-right font-mono font-extrabold text-slate-100 text-base">{item.stockUnits}</td>
                          <td className="p-4 text-right font-mono text-slate-500 text-xs">{item.totalEntered}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-extrabold tracking-wider ${
                              isAgotado ? 'bg-rose-950 text-rose-400 border border-rose-900/45' :
                              isCritical ? 'bg-amber-950 text-amber-400 border border-amber-900/45' : 
                              'bg-emerald-950 text-emerald-400 border border-emerald-900/45'
                            }`}>
                              {isAgotado ? 'SIN STOCK' : isCritical ? 'BAJO STOCK' : 'EXCELENTE'}
                            </span>
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
        {/* PESTAÑA: CATALOGO DE PRODUCTOS */}
        {/* ========================================================= */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Creador / Editor de Fichas de Productos */}
            <div className="lg:col-span-4 bg-slate-900 rounded-3xl border border-slate-800 p-6 h-fit shadow-xl">
              <h2 className="font-black text-lg text-fuchsia-400 flex items-center gap-2 mb-4">
                {isEditingProduct ? "📝 Editar Producto" : "✨ Registrar Producto Nuevo"}
              </h2>

              <form onSubmit={isEditingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Gin Hendrick's 750ml"
                    value={isEditingProduct ? isEditingProduct.name : newProduct.name}
                    onChange={(e) => {
                      if (isEditingProduct) {
                        setIsEditingProduct({ ...isEditingProduct, name: e.target.value });
                      } else {
                        setNewProduct({ ...newProduct, name: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm text-slate-100 placeholder-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo Empaque</label>
                    <select
                      value={isEditingProduct ? isEditingProduct.type : newProduct.type}
                      onChange={(e) => {
                        if (isEditingProduct) {
                          setIsEditingProduct({ ...isEditingProduct, type: e.target.value });
                        } else {
                          setNewProduct({ ...newProduct, type: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm text-slate-100"
                    >
                      <option value="Caja">Caja</option>
                      <option value="Paquete">Paquete</option>
                      <option value="Botella">Botella</option>
                      <option value="Lata">Lata</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unids por Empaque</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={isEditingProduct ? isEditingProduct.unitsPerPackage : newProduct.unitsPerPackage}
                      onChange={(e) => {
                        if (isEditingProduct) {
                          setIsEditingProduct({ ...isEditingProduct, unitsPerPackage: Number(e.target.value) });
                        } else {
                          setNewProduct({ ...newProduct, unitsPerPackage: Number(e.target.value) });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm font-mono text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Costo Adquisición x Empaque</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.1"
                      placeholder="S/ 0.00"
                      value={isEditingProduct ? isEditingProduct.cost : newProduct.cost}
                      onChange={(e) => {
                        if (isEditingProduct) {
                          setIsEditingProduct({ ...isEditingProduct, cost: Number(e.target.value) });
                        } else {
                          setNewProduct({ ...newProduct, cost: Number(e.target.value) });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm font-mono text-slate-100 placeholder-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">PVP Unidad Individual</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.1"
                      placeholder="S/ 0.00"
                      value={isEditingProduct ? isEditingProduct.price : newProduct.price}
                      onChange={(e) => {
                        if (isEditingProduct) {
                          setIsEditingProduct({ ...isEditingProduct, price: Number(e.target.value) });
                        } else {
                          setNewProduct({ ...newProduct, price: Number(e.target.value) });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm font-mono text-slate-100 placeholder-slate-700"
                    />
                  </div>
                </div>

                {/* Mostrar información de rentabilidad calculada antes de guardar */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 text-xs text-slate-400 font-medium">
                  {(() => {
                    const cost = isEditingProduct ? isEditingProduct.cost : newProduct.cost;
                    const uPerPack = isEditingProduct ? isEditingProduct.unitsPerPackage : newProduct.unitsPerPackage;
                    const price = isEditingProduct ? isEditingProduct.price : newProduct.price;

                    const unitCost = uPerPack > 0 ? (cost / uPerPack) : 0;
                    const profitPerUnit = price - unitCost;
                    const marginPercent = price > 0 ? ((profitPerUnit / price) * 100) : 0;

                    return (
                      <>
                        <div className="flex justify-between">
                          <span>Costo Unitario Real:</span>
                          <span className="font-mono text-slate-200">S/ {unitCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Utilidad por Unidad Vendida:</span>
                          <span className="font-mono text-emerald-400">S/ {profitPerUnit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Margen Comercial Estimado:</span>
                          <span className={`font-mono font-bold ${marginPercent >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {marginPercent.toFixed(1)}%
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex gap-2">
                  {isEditingProduct && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProduct(null)}
                      className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-black py-3 rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider"
                  >
                    {isEditingProduct ? "Guardar Cambios" : "Crear Ficha"}
                  </button>
                </div>
              </form>
            </div>

            {/* Catálogo Listado */}
            <div className="lg:col-span-8 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800">
                <h3 className="font-extrabold text-slate-100 flex items-center gap-2">
                  <span>📖</span> Catálogo Técnico de Productos
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-400 font-extrabold border-b border-slate-800">
                    <tr>
                      <th className="p-4">SKU / ID</th>
                      <th className="p-4">Nombre Comercial</th>
                      <th className="p-4 text-right">Costo x Empaque</th>
                      <th className="p-4 text-center">Rendimiento (Unds)</th>
                      <th className="p-4 text-right">Precio Venta (Und)</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-fuchsia-400 text-xs">{p.id}</td>
                        <td className="p-4 font-extrabold text-slate-200">{p.name}</td>
                        <td className="p-4 text-right font-mono text-slate-300">S/ {p.cost.toFixed(2)}</td>
                        <td className="p-4 text-center font-mono text-slate-400">{p.unitsPerPackage} und x {p.type}</td>
                        <td className="p-4 text-right font-mono font-black text-emerald-400 text-base">S/ {p.price.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setIsEditingProduct(p)}
                            className="bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 px-3 py-1.5 rounded-lg border border-slate-800 font-semibold text-xs transition-all"
                          >
                            Editar ✏️
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
        {/* PESTAÑA: GESTIÓN DE EGRESOS / GASTOS */}
        {/* ========================================================= */}
        {activeTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Formulario de salida de dinero */}
            <div className="lg:col-span-4 bg-slate-900 rounded-3xl border border-slate-800 p-6 h-fit shadow-xl">
              <h2 className="font-black text-lg text-rose-400 flex items-center gap-2 mb-4">
                <span>💸</span> Registrar Salida / Egreso
              </h2>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoría del Gasto</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm text-slate-100"
                  >
                    <option value="Artistas">Artistas & DJs</option>
                    <option value="Seguridad">Seguridad</option>
                    <option value="Barra">Abastecimiento Barra / Spillage</option>
                    <option value="Limpieza">Limpieza & Suministros</option>
                    <option value="Infraestructura">Mantenimiento y Estructuras</option>
                    <option value="Otros">Otros Egresos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descripción / Justificación Detallada</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Ej. Pago a Dj invitado o compra de hielo de emergencia."
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm text-slate-100 placeholder-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monto en Soles (Float)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    placeholder="S/ 0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm font-mono text-slate-100 placeholder-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-black py-3 rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider"
                >
                  Confirmar Salida de Caja
                </button>
              </form>
            </div>

            {/* Listado de egresos */}
            <div className="lg:col-span-8 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-100 flex items-center gap-2">
                  <span>📝</span> Bitácora General de Salidas (Caja Chica)
                </h3>
                <span className="font-mono text-rose-400 font-black text-sm">
                  Total Egresos: S/ {totalExpensesAmount.toFixed(2)}
                </span>
              </div>

              {expenses.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  <span className="text-4xl mb-3 block">💸</span>
                  <p className="font-bold text-sm">No se han registrado salidas el día de hoy.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-400 font-extrabold border-b border-slate-800">
                      <tr>
                        <th className="p-4">ID de Transacción</th>
                        <th className="p-4">Hora</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4">Descripción</th>
                        <th className="p-4 text-right">Desembolso</th>
                        <th className="p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-4 font-mono text-slate-500 text-xs">{e.id}</td>
                          <td className="p-4 font-mono text-slate-400 text-xs">
                            {new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4">
                            <span className="bg-rose-950/40 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-900/30">
                              {e.category}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300 font-medium max-w-xs truncate">{e.description}</td>
                          <td className="p-4 text-right font-mono font-black text-rose-400">
                            - S/ {e.amount.toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => deleteExpense(e.id)}
                              className="text-rose-500 hover:text-rose-400 text-xs font-bold"
                            >
                              Eliminar 🗑️
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
        {/* PESTAÑA: HISTORIAL Y CUADRE DE CAJA */}
        {/* ========================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Tarjetas de Cuadre Consolidado */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-extrabold block">Ingresos Brutos</span>
                <span className="font-mono text-3xl font-black text-emerald-400 block mt-2">
                  S/ {totalSalesRevenue.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Suma acumulada de tickets despachados</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-extrabold block">Total Egresos / Gastos</span>
                <span className="font-mono text-3xl font-black text-rose-400 block mt-2">
                  S/ {totalExpensesAmount.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Salidas registradas de caja chica</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-extrabold block">Flujo de Caja Real</span>
                <span className={`font-mono text-3xl font-black block mt-2 ${netCashFlow >= 0 ? 'text-cyan-400' : 'text-rose-500'}`}>
                  S/ {netCashFlow.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Diferencia neta disponible en caja física</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-extrabold block">Despacho de Cortesías</span>
                <span className="font-mono text-3xl font-black text-violet-400 block mt-2">
                  {totalCourtesiesCount} <span className="text-sm">Unds</span>
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Despachado de cortesías (S/ 0.00 bruto)</p>
              </div>

            </div>

            {/* Historial Detallado de Ventas */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800">
                <h3 className="font-extrabold text-slate-100 flex items-center gap-2">
                  <span>⏱️</span> Bitácora Crítica de Ventas y Cortesías
                </h3>
              </div>

              {sales.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                  <span className="text-4xl mb-3 block">🍸</span>
                  <p className="font-bold text-sm">No hay transacciones registradas todavía.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-400 font-extrabold border-b border-slate-800">
                      <tr>
                        <th className="p-4">ID de Ticket</th>
                        <th className="p-4">Hora Despacho</th>
                        <th className="p-4">Items / Composición</th>
                        <th className="p-4 text-center">Tipo de Operación</th>
                        <th className="p-4 text-right">Total Ingreso</th>
                        <th className="p-4 text-center">Acciones Críticas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {sales.map(s => (
                        <tr key={s.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-4 font-mono text-slate-400 text-xs font-bold">{s.id}</td>
                          <td className="p-4 font-mono text-slate-400 text-xs">
                            {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4">
                            <div className="max-w-xs space-y-1">
                              {s.items.map((item, idx) => (
                                <div key={idx} className="text-xs text-slate-200">
                                  <span className="text-fuchsia-400 font-bold">{item.qty}x</span> {item.name}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                              s.isCourtesy 
                                ? 'bg-violet-950 text-violet-300 border border-violet-800/55' 
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800/55'
                            }`}>
                              {s.isCourtesy ? 'Cortesía / Merma' : 'Venta Regular'}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono font-black text-slate-100 text-base">
                            S/ {s.total.toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => voidSale(s.id)}
                              className="bg-rose-950/30 border border-rose-900/40 text-rose-400 hover:bg-rose-900 hover:text-white px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all"
                            >
                              Anular Venta 🚫
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

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900/60 py-6 text-center text-xs text-slate-600">
        <p>© 2026 Nightclub Operations Core. Diseñado para alto rendimiento y bajo lag en dispositivos móviles.</p>
      </footer>

    </div>
  );
}
