import { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Settings, Receipt, Package, LogOut, ShieldCheck, 
  Plus, Trash2, Beer, ArrowLeft, ShoppingCart, TrendingUp, TrendingDown, 
  DollarSign, AlertCircle, Gift, Boxes, CheckCircle, X, Menu, Activity,
  PackagePlus, Tags, Archive
} from 'lucide-react';

// ==========================================
// 1. BASE DE DATOS INICIAL (ESTADO SIMULADO)
// ==========================================

const INITIAL_CATALOG = [
  { id: 'PRD-001', name: 'Cerveza San Juan', type: 'Caja', unitsPerPackage: 12, cost: 60, price: 10 },
  { id: 'PRD-002', name: 'Gaseosa Guarana', type: 'Paquete', unitsPerPackage: 15, cost: 45, price: 5 },
  { id: 'PRD-003', name: 'Agua San Mateo', type: 'Paquete', unitsPerPackage: 20, cost: 30, price: 3 },
  { id: 'PRD-004', name: 'Cigarro Lucky', type: 'Paquete', unitsPerPackage: 20, cost: 20, price: 2 },
];

const INITIAL_INVENTORY = [
  { id: 'PRD-001', stockUnits: 120, totalEntered: 150 },
  { id: 'PRD-002', stockUnits: 75, totalEntered: 100 },
  { id: 'PRD-003', stockUnits: 100, totalEntered: 100 },
  { id: 'PRD-004', stockUnits: 40, totalEntered: 50 },
];

const INITIAL_EXPENSES = [
  { id: 'G-1', date: new Date().toISOString(), category: 'Marketing', description: 'Publicidad Meta Ads', amount: 150 },
];

const INITIAL_SALES = [
  { id: 'V-1', date: new Date().toISOString(), items: [{ productId: 'PRD-001', name: 'Cerveza San Juan', qty: 30, price: 10 }], total: 300, isCourtesy: false },
  { id: 'V-2', date: new Date().toISOString(), items: [{ productId: 'PRD-002', name: 'Gaseosa Guarana', qty: 25, price: 5 }], total: 125, isCourtesy: true },
];

// ==========================================
// 2. COMPONENTE MOTOR PRINCIPAL
// ==========================================

export default function App() {
  // AUTO-INYECTOR DE ESTILOS (Garantiza el diseño premium aunque falle Vercel)
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // --- ESTADOS DE SESIÓN Y NAVEGACIÓN ---
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loginStep, setLoginStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('panel');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- ESTADOS DE BASE DE DATOS LOCAL ---
  const [catalog, setCatalog] = useState(INITIAL_CATALOG);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [sales, setSales] = useState(INITIAL_SALES);

  // --- NOTIFICACIONES ---
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // --- FORMULARIOS ---
  const [newProduct, setNewProduct] = useState({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
  const [newExpense, setNewExpense] = useState({ category: 'Artistas', description: '', amount: 0 });
  const [stockAdd, setStockAdd] = useState({ productId: '', packageQty: 0 });
  const [cart, setCart] = useState<Array<{productId: string, name: string, qty: number, price: number}>>([]);

  // ==========================================
  // 3. LÓGICA DE NEGOCIO Y ALGORITMOS EXTREMOS
  // ==========================================

  const triggerNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // CÁLCULOS DEL DASHBOARD (FINANZAS Y FLUJO DE STOCK)
  const dashboardStats = useMemo(() => {
    // 1. Finanzas
    const totalRevenue = sales.filter(s => !s.isCourtesy).reduce((sum, sale) => sum + sale.total, 0);
    const totalCourtesyValue = sales.filter(s => s.isCourtesy).reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    // 2. Reporte Exacto de Stock y Ventas por Producto
    const itemsSold: Record<string, { name: string, qty: number, isCourtesyQty: number, type: string, unitsPerPackage: number }> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!itemsSold[item.productId]) {
          const productInfo = catalog.find(p => p.id === item.productId);
          itemsSold[item.productId] = { 
            name: item.name, 
            qty: 0, 
            isCourtesyQty: 0, 
            type: productInfo?.type || 'Unidad', 
            unitsPerPackage: productInfo?.unitsPerPackage || 1
          };
        }
        if (sale.isCourtesy) itemsSold[item.productId].isCourtesyQty += item.qty;
        else itemsSold[item.productId].qty += item.qty;
      });
    });

    const stockReport = catalog.map(prod => {
      const invData = inventory.find(i => i.id === prod.id) || { stockUnits: 0, totalEntered: 0 };
      const soldData = itemsSold[prod.id] || { qty: 0, isCourtesyQty: 0 };
      
      return {
        id: prod.id,
        name: prod.name,
        type: prod.type,
        unitsPerPackage: prod.unitsPerPackage,
        totalEntered: invData.totalEntered,
        soldUnits: soldData.qty,
        courtesyUnits: soldData.isCourtesyQty,
        currentStock: invData.stockUnits
      };
    });

    // 3. Indicadores Globales para las Tarjetas
    const globalEntered = inventory.reduce((sum, inv) => sum + inv.totalEntered, 0);
    const globalSold = Object.values(itemsSold).reduce((sum, item) => sum + item.qty, 0);
    const globalStock = inventory.reduce((sum, inv) => sum + inv.stockUnits, 0);

    return { 
      totalRevenue, totalCourtesyValue, totalExpenses, netProfit, 
      stockReport, globalEntered, globalSold, globalStock 
    };
  }, [sales, expenses, catalog, inventory]);

  // LOGIN CON SEGURIDAD ROL-BASED
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === 'admin' && password === '123') {
      setUserRole('admin');
      setActiveTab('panel');
      triggerNotification('Acceso Concedido: MODO ADMINISTRADOR', 'success');
    } else if (selectedRole === 'staff' && password === '456') {
      setUserRole('staff');
      setActiveTab('panel');
      triggerNotification('Turno Iniciado: MODO STAFF / BARRA', 'success');
    } else {
      triggerNotification('Clave de acceso incorrecta.', 'error');
    }
  };

  // MÓDULO: CONFIGURAR (GESTIÓN DE CATÁLOGO BLINDADA)
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Number(newProduct.cost);
    const price = Number(newProduct.price);
    const units = Number(newProduct.unitsPerPackage);

    if (!newProduct.name || price <= 0 || units <= 0) {
      triggerNotification('Fallo: Ingrese un nombre y precios mayores a 0.', 'error');
      return;
    }

    const newId = `PRD-00${catalog.length + 1}`;
    const productToAdd = { id: newId, name: newProduct.name, type: newProduct.type, unitsPerPackage: units, cost, price };

    setCatalog([...catalog, productToAdd]);
    setInventory([...inventory, { id: newId, stockUnits: 0, totalEntered: 0 }]); 
    setNewProduct({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
    triggerNotification('Catálogo actualizado correctamente.', 'success');
  };

  const handleDeleteProduct = (id: string) => {
    setCatalog(catalog.filter(prod => prod.id !== id));
    setInventory(inventory.filter(inv => inv.id !== id));
    triggerNotification('Producto dado de baja del sistema.', 'success');
  };

  // MÓDULO: GASTOS OPERATIVOS
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newExpense.amount);
    if (!newExpense.description || amount <= 0) {
      triggerNotification('Fallo: Especifique el motivo y el monto exacto.', 'error'); return;
    }
    const newId = `G-${expenses.length + 1}`;
    setExpenses([{ id: newId, category: newExpense.category, description: newExpense.description, amount, date: new Date().toISOString() }, ...expenses]);
    setNewExpense({ category: 'Artistas', description: '', amount: 0 });
    triggerNotification('Salida de dinero registrada y descontada.', 'success');
  };

  // MÓDULO: INVENTARIO (REABASTECIMIENTO)
  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(stockAdd.packageQty);
    if (!stockAdd.productId || qty <= 0) {
      triggerNotification('Fallo: Seleccione producto e ingrese la cantidad.', 'error'); return;
    }
    const product = catalog.find(p => p.id === stockAdd.productId);
    if (!product) return;
    
    const unitsToAdd = qty * product.unitsPerPackage;
    setInventory(inventory.map(inv => 
      inv.id === stockAdd.productId 
        ? { ...inv, stockUnits: inv.stockUnits + unitsToAdd, totalEntered: inv.totalEntered + unitsToAdd } 
        : inv
    ));
    setStockAdd({ productId: '', packageQty: 0 });
    triggerNotification(`Almacén: Ingresaron ${unitsToAdd} unidades nuevas.`, 'success');
  };

  // MÓDULO: MOTOR DE CAJA / BARRA (POS)
  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id);
    const currentStock = inventory.find(i => i.id === product.id)?.stockUnits || 0;
    const currentQtyInCart = existing ? existing.qty : 0;

    if (currentQtyInCart + 1 > currentStock) {
      triggerNotification(`Alerta de Stock: Solo quedan ${currentStock} de ${product.name}`, 'error'); return;
    }

    if (existing) setCart(cart.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item));
    else setCart([...cart, { productId: product.id, name: product.name, qty: 1, price: product.price }]);
  };

  const updateCartQty = (productId: string, increment: boolean) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    const currentStock = inventory.find(i => i.id === productId)?.stockUnits || 0;

    if (increment) {
      if (item.qty + 1 > currentStock) { triggerNotification('Límite físico de stock alcanzado.', 'error'); return; }
      setCart(cart.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i));
    } else {
      if (item.qty - 1 <= 0) setCart(cart.filter(item => item.productId !== productId));
      else setCart(cart.map(i => i.productId === productId ? { ...i, qty: i.qty - 1 } : i));
    }
  };

  const checkout = (isCourtesy: boolean = false) => {
    if (cart.length === 0) return;
    
    // Doble validación de seguridad de Stock
    for (let item of cart) {
      const inv = inventory.find(i => i.id === item.productId);
      if (!inv || inv.stockUnits < item.qty) {
        triggerNotification(`Venta Bloqueada: Faltan unidades de ${item.name}.`, 'error'); return;
      }
    }

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const newSale = { id: `V-${sales.length + 1}`, date: new Date().toISOString(), items: [...cart], total: cartTotal, isCourtesy };
    
    setSales([...sales, newSale]);
    
    // Descontar inventario real
    setInventory(inventory.map(inv => {
      const cartItem = cart.find(c => c.productId === inv.id);
      return cartItem ? { ...inv, stockUnits: inv.stockUnits - cartItem.qty } : inv;
    }));
    
    setCart([]);
    triggerNotification(isCourtesy ? 'Salida por cortesía ejecutada.' : '¡Pago Procesado Satisfactoriamente!', 'success');
  };

  // ==========================================
  // 4. INTERFAZ GRÁFICA PREMIUM (VISTAS)
  // ==========================================

  // PANTALLA DE ACCESO (LOGIN)
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07020A] p-4 font-sans relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px]"></div>

        <div className="bg-[#11051A]/80 backdrop-blur-xl p-10 rounded-[2rem] w-full max-w-md shadow-[0_0_80px_rgba(217,70,239,0.15)] border border-fuchsia-500/20 relative z-10">
          <div className="flex justify-center mb-6">
            <ShieldCheck size={72} className="text-fuchsia-500 filter drop-shadow-[0_0_20px_rgba(217,70,239,0.6)]" />
          </div>
          <h2 className="text-white text-center text-4xl font-black italic mb-1 tracking-widest">EL ENCANTO</h2>
          <p className="text-cyan-400 text-center text-sm font-black tracking-[0.3em] mb-10">MOTOR DE VENTAS</p>

          {loginStep === 0 ? (
            <div className="space-y-5">
              <button onClick={() => { setSelectedRole('admin'); setLoginStep(1); setPassword(''); }} className="w-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 text-white p-4 rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(217,70,239,0.4)] tracking-wider">
                ADMINISTRADOR
              </button>
              <button onClick={() => { setSelectedRole('staff'); setLoginStep(1); setPassword(''); }} className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 text-black p-4 rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(34,211,238,0.4)] tracking-wider">
                STAFF / BARRA
              </button>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-5 animate-in zoom-in duration-300">
              <div className="flex items-center gap-3 mb-6 cursor-pointer text-slate-400 hover:text-white transition-colors w-max" onClick={() => {setLoginStep(0); setPassword('');}}>
                <ArrowLeft size={20} /> <span className="text-sm font-bold uppercase tracking-widest">Volver</span>
              </div>
              <p className="text-center text-slate-300 font-bold text-sm tracking-widest uppercase bg-slate-900/50 py-2 rounded-lg border border-slate-800">
                Modo: <span className={selectedRole === 'admin' ? 'text-fuchsia-400' : 'text-cyan-400'}>{selectedRole}</span>
              </p>
              <input 
                className="w-full bg-[#07020A] text-white p-5 rounded-2xl outline-none focus:border-fuchsia-500 border border-slate-800 text-center tracking-[0.5em] text-2xl font-black shadow-inner transition-colors" 
                type="password" placeholder={selectedRole === 'admin' ? "Clave Admin" : "Clave Staff"} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus 
              />
              <button type="submit" className="w-full bg-emerald-500 text-black p-4 rounded-2xl font-black text-lg hover:bg-emerald-400 transition-colors tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.3)] mt-2">
                INICIAR TURNO
              </button>
            </form>
          )}
        </div>

        {notification && (
          <div className="fixed top-5 right-5 z-[999] flex items-center gap-3 p-4 rounded-2xl border shadow-2xl animate-bounce bg-red-950/90 border-red-500 text-red-400">
            <AlertCircle size={24}/> <span className="font-bold text-sm tracking-wide">{notification.message}</span>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA 1: PANEL DASHBOARD ---
  const renderPanel = () => (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-fuchsia-900/30 pb-6">
        <div>
          <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400 tracking-widest uppercase">Dashboard General</h2>
          <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide">Monitoreo central de flujo de caja e inventario.</p>
        </div>
        <div className="bg-[#11051A] border border-fuchsia-500/20 px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(217,70,239,0.1)]">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-1">Día Operativo</span>
          <span className="text-fuchsia-400 font-black tracking-widest">{new Date().toLocaleDateString('es-PE')}</span>
        </div>
      </div>
      
      {/* SECCIÓN FINANZAS (SÓLO ADMINISTRADOR) */}
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-[#11051A] to-[#07020A] p-6 rounded-3xl border border-emerald-500/30 shadow-lg shadow-emerald-900/10">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Venta Bruta</h4>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><DollarSign size={20}/></div>
            </div>
            <p className="text-4xl font-black text-emerald-400 tracking-wider">S/ {dashboardStats.totalRevenue.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-[#11051A] to-[#07020A] p-6 rounded-3xl border border-red-500/30 shadow-lg shadow-red-900/10">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Gastos Totales</h4>
              <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><TrendingDown size={20}/></div>
            </div>
            <p className="text-4xl font-black text-red-400 tracking-wider">S/ {dashboardStats.totalExpenses.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-fuchsia-900/20 to-[#07020A] p-6 rounded-3xl border border-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.15)] relative overflow-hidden lg:col-span-2">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-fuchsia-500/10 to-transparent pointer-events-none"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-fuchsia-200 font-bold uppercase tracking-widest text-sm">Caja Neta del Día</h4>
                <div className="p-2 bg-fuchsia-500/20 rounded-lg text-fuchsia-400"><TrendingUp size={24}/></div>
              </div>
              <div className="flex items-baseline gap-4">
                <p className={`text-6xl font-black tracking-wider ${dashboardStats.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                  S/ {dashboardStats.netProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN STAFF RESTRINGIDO */}
      {userRole === 'staff' && (
        <div className="bg-[#11051A]/60 border border-cyan-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 text-center md:text-left shadow-lg">
          <ShieldCheck className="text-cyan-400 flex-shrink-0" size={48} />
          <div>
            <h4 className="font-black text-white uppercase text-sm tracking-widest mb-2">Bloqueo de Seguridad Activo</h4>
            <p className="text-sm text-slate-400">Los datos financieros y de ganancias están encriptados y ocultos para el nivel STAFF. Acceda al módulo inferior para su cuadre de stock.</p>
          </div>
        </div>
      )}

      {/* SECCIÓN STOCK (COMPARTIDA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="bg-[#11051A] p-6 rounded-2xl border border-blue-500/20 shadow-lg flex items-center gap-5">
          <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400"><PackagePlus size={32}/></div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Total Ingresado</p>
            <p className="text-3xl font-black text-white">{dashboardStats.globalEntered} <span className="text-sm font-medium text-slate-500">Unid.</span></p>
          </div>
        </div>
        <div className="bg-[#11051A] p-6 rounded-2xl border border-emerald-500/20 shadow-lg flex items-center gap-5">
          <div className="p-4 bg-emerald-500/10 rounded-xl text-emerald-400"><Tags size={32}/></div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Total Vendido</p>
            <p className="text-3xl font-black text-white">{dashboardStats.globalSold} <span className="text-sm font-medium text-slate-500">Unid.</span></p>
          </div>
        </div>
        <div className="bg-[#11051A] p-6 rounded-2xl border border-cyan-500/20 shadow-lg flex items-center gap-5">
          <div className="p-4 bg-cyan-500/10 rounded-xl text-cyan-400"><Archive size={32}/></div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Stock Físico Real</p>
            <p className="text-3xl font-black text-white">{dashboardStats.globalStock} <span className="text-sm font-medium text-slate-500">Unid.</span></p>
          </div>
        </div>
      </div>

      <div className="bg-[#11051A] rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.05)] overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-800/80 bg-slate-900/20 flex items-center gap-4">
          <div className="p-4 bg-cyan-500/10 rounded-2xl text-cyan-400 shadow-inner"><Activity size={32}/></div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest text-white">Desglose Detallado por Producto</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-black/40 text-cyan-500 text-xs uppercase tracking-widest border-b border-slate-800">
                <th className="p-6 font-black">Producto</th>
                <th className="p-6 font-black text-right border-l border-slate-800/50 bg-emerald-950/20">Ingreso</th>
                <th className="p-6 font-black text-right bg-emerald-950/20">Venta</th>
                <th className="p-6 font-black text-right bg-orange-950/20">Mermas</th>
                <th className="p-6 font-black text-right border-l border-slate-800/50 text-white">Stock Total</th>
                <th className="p-6 font-black text-right text-white">Equivalente Caja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {dashboardStats.stockReport.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-slate-500 font-bold">Catálogo vacío o sin configuración.</td></tr>
              ) : (
                dashboardStats.stockReport.map((item, idx) => {
                  const cajasEnteras = Math.floor(item.currentStock / item.unitsPerPackage);
                  const sueltos = item.currentStock % item.unitsPerPackage;
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-6">
                        <p className="font-bold text-white text-base">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{item.type} (x{item.unitsPerPackage})</p>
                      </td>
                      <td className="p-6 text-right font-black text-lg text-emerald-500/60 border-l border-slate-800/50 bg-emerald-950/10">{item.totalEntered}</td>
                      <td className="p-6 text-right font-black text-lg text-emerald-400 bg-emerald-950/10">{item.soldUnits}</td>
                      <td className="p-6 text-right font-black text-lg text-orange-400 bg-orange-950/10">{item.courtesyUnits}</td>
                      <td className="p-6 text-right font-black text-2xl text-cyan-400 border-l border-slate-800/50">{item.currentStock}</td>
                      <td className="p-6 text-right font-medium text-sm text-slate-300">
                        {cajasEnteras > 0 && `${cajasEnteras} ${item.type}s`} {cajasEnteras > 0 && sueltos > 0 && '+ '} {sueltos > 0 && `${sueltos} u.`}
                        {item.currentStock === 0 && <span className="text-red-500 font-bold uppercase text-xs bg-red-500/10 px-2 py-1 rounded ml-2">Agotado</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // --- VISTA 2: PUNTO DE VENTA (BARRA) ---
  const renderBarra = () => (
    <div className="animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
      <div className="flex-1 bg-[#11051A] rounded-3xl border border-fuchsia-900/20 p-6 shadow-xl flex flex-col">
        <h3 className="text-2xl font-black italic text-cyan-400 mb-6 tracking-widest uppercase flex items-center gap-3 border-b border-slate-800 pb-4">
          <Boxes /> Productos en Barra
        </h3>
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {catalog.map(prod => {
              const inv = inventory.find(i => i.id === prod.id)?.stockUnits || 0;
              return (
                <button 
                  key={prod.id} onClick={() => addToCart(prod)} disabled={inv <= 0}
                  className={`p-5 rounded-2xl border text-left transition-all ${inv > 0 ? 'bg-[#180A24] border-slate-700/50 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:-translate-y-1' : 'bg-black/50 border-red-900/30 opacity-50 cursor-not-allowed'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <Beer size={28} className={inv > 0 ? 'text-cyan-400' : 'text-red-500'} />
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${inv > 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>Stock: {inv}</span>
                  </div>
                  <h4 className="font-bold text-white mb-2 leading-tight h-10">{prod.name}</h4>
                  <p className="text-emerald-400 font-black text-xl">S/ {prod.price.toFixed(2)}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[400px] bg-[#07020A] rounded-3xl border border-fuchsia-900/30 p-6 flex flex-col shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-600/10 rounded-full blur-[50px] pointer-events-none"></div>
        <h3 className="text-xl font-black text-white mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
          <span className="flex items-center gap-3"><ShoppingCart className="text-fuchsia-500"/> Ticket Actual</span>
          <span className="bg-slate-800 text-xs px-2 py-1 rounded font-bold text-slate-300">{cart.length} items</span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 mb-6 relative z-10">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <ShoppingCart size={64} className="mb-4 opacity-10" />
              <p className="font-bold tracking-widest uppercase text-sm">Caja Disponible</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center bg-[#13071E] p-4 rounded-2xl border border-slate-800/80 gap-3 hover:border-slate-700 transition-colors">
                <div className="flex-1">
                  <p className="font-bold text-white text-sm leading-tight mb-1">{item.name}</p>
                  <p className="text-slate-400 text-xs font-medium">S/ {item.price.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  <div className="flex items-center bg-[#07020A] border border-slate-700 rounded-lg overflow-hidden h-9">
                    <button onClick={() => updateCartQty(item.productId, false)} className="px-3 h-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold">-</button>
                    <span className="text-white text-sm font-black px-2 min-w-[2ch] text-center">{item.qty}</span>
                    <button onClick={() => updateCartQty(item.productId, true)} className="px-3 h-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold">+</button>
                  </div>
                  <span className="font-black text-emerald-400 w-16 text-right">S/ {(item.qty * item.price).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-800 pt-6 space-y-4 relative z-10">
          <div className="flex justify-between items-end mb-2">
            <span className="text-slate-400 font-black uppercase tracking-widest text-sm">Total a Cobrar:</span>
            <span className="text-5xl font-black text-emerald-400 tracking-tighter">S/ {cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)}</span>
          </div>
          <button onClick={() => checkout(false)} disabled={cart.length === 0} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-xl p-5 rounded-2xl transition-all disabled:opacity-50 hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.3)] tracking-widest">
            PROCESAR VENTA
          </button>
          <button onClick={() => checkout(true)} disabled={cart.length === 0} className="w-full bg-transparent border-2 border-orange-500/50 hover:border-orange-500 hover:bg-orange-500/10 text-orange-400 font-bold p-3 rounded-2xl transition-all disabled:opacity-50 text-sm tracking-widest uppercase">
            Descontar por Cortesía
          </button>
        </div>
      </div>
    </div>
  );

  // --- VISTA 3: GASTOS (ADMIN) ---
  const renderGastos = () => (
    <div className="animate-in fade-in duration-500 max-w-5xl">
      <div className="mb-8 border-b border-fuchsia-900/30 pb-6">
        <h2 className="text-3xl font-black italic text-fuchsia-500 tracking-widest uppercase">Egresos y Personal</h2>
        <p className="text-slate-400 text-sm mt-2">Documenta cada sol que sale de la caja para un cuadre perfecto.</p>
      </div>
      
      <div className="bg-[#11051A] p-8 rounded-3xl border border-fuchsia-900/20 mb-8 shadow-xl">
        <h3 className="text-lg font-black mb-6 flex items-center gap-3 text-white uppercase tracking-widest"><Receipt className="text-fuchsia-400"/> Declarar Nuevo Gasto</h3>
        <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
          <div>
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-2 uppercase">Tipo de Gasto</label>
            <select className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none transition-all" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
              <option>Artistas / Orquestas</option><option>Seguridad</option><option>Marketing / Publi</option><option>Personal de Barra</option><option>Limpieza</option><option>Alquiler / Servicios</option><option>Otros Múltiples</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-2 uppercase">Concepto o Destino</label>
            <input required type="text" className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} placeholder="Ej. Pago Dj o Seguridad" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-2 uppercase">Monto Efectivo (S/)</label>
            <input required type="number" step="0.1" className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all font-black text-lg" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: e.target.value as any})} placeholder="0.00" />
          </div>
          <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-500 p-4 rounded-2xl font-black text-white transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] md:col-span-4 tracking-widest uppercase mt-2 hover:scale-[1.01]">
            Validar Gasto
          </button>
        </form>
      </div>

      <div className="bg-[#11051A] rounded-3xl border border-fuchsia-900/20 overflow-hidden shadow-xl">
        <div className="p-6 bg-slate-900/20 border-b border-slate-800/80">
          <h3 className="font-bold text-white uppercase tracking-widest text-sm">Libro Mayor de Salidas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-black/20 text-slate-400 text-xs uppercase tracking-widest border-b border-slate-800">
                <th className="p-5 font-black">Hora de Registro</th>
                <th className="p-5 font-black">Departamento</th>
                <th className="p-5 font-black">Justificación</th>
                <th className="p-5 font-black text-right">Efectivo Retirado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {expenses.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-slate-500 font-bold">Registro limpio por ahora.</td></tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-5 text-slate-500 text-xs font-mono">{new Date(exp.date).toLocaleTimeString()}</td>
                    <td className="p-5"><span className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-cyan-400 uppercase tracking-wider">{exp.category}</span></td>
                    <td className="p-5 font-bold text-white text-sm">{exp.description}</td>
                    <td className="p-5 text-right font-black text-red-400 text-xl">- S/ {exp.amount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // --- VISTA 4: INVENTARIO Y REABASTECIMIENTO ---
  const renderInventario = () => (
    <div className="animate-in fade-in duration-500 max-w-5xl">
      <div className="mb-8 border-b border-fuchsia-900/30 pb-6">
        <h2 className="text-3xl font-black italic text-fuchsia-500 tracking-widest uppercase">Gestión de Almacén</h2>
        <p className="text-slate-400 text-sm mt-2">Suma stock nuevo y verifica las unidades exactas que quedan en el local.</p>
      </div>
      
      {userRole === 'admin' && (
        <div className="bg-[#11051A] p-8 rounded-3xl border border-emerald-500/20 mb-8 shadow-xl">
          <h3 className="text-lg font-black mb-6 flex items-center gap-3 text-white uppercase tracking-widest"><Package className="text-emerald-400"/> Inyectar Cajas al Sistema</h3>
          <form onSubmit={handleAddStock} className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold tracking-widest text-slate-400 mb-2 uppercase">Búsqueda de Producto</label>
              <select required className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-emerald-500 outline-none transition-all" value={stockAdd.productId} onChange={e => setStockAdd({...stockAdd, productId: e.target.value})}>
                <option value="">-- Elige del Catálogo Oficial --</option>
                {catalog.map(p => <option key={p.id} value={p.id}>{p.name} (Por {p.type} de {p.unitsPerPackage})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest text-slate-400 mb-2 uppercase">Cant. de Empaques Entrantes</label>
              <input required type="number" min="1" className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-emerald-500 outline-none transition-all font-black text-lg" value={stockAdd.packageQty || ''} onChange={e => setStockAdd({...stockAdd, packageQty: e.target.value as any})} placeholder="Ej. 10 Cajas" />
            </div>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl font-black text-white transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] tracking-widest uppercase hover:scale-[1.02]">
              Consolidar Ingreso
            </button>
          </form>
        </div>
      )}

      <div className="bg-[#11051A] rounded-3xl border border-fuchsia-900/20 overflow-hidden shadow-xl">
        <div className="p-6 bg-slate-900/20 border-b border-slate-800/80">
          <h3 className="font-bold text-white uppercase tracking-widest text-sm">Disponibilidad en Vivo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-black/20 text-fuchsia-400 text-xs uppercase tracking-widest border-b border-slate-800">
                <th className="p-5 font-black">Mercadería</th>
                <th className="p-5 font-black text-center">Tipo de Base</th>
                <th className="p-5 font-black text-right">Unid. en Físico</th>
                <th className="p-5 font-black text-right">Equivalente Cajas</th>
                <th className="p-5 font-black text-center">Semáforo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {catalog.map((prod) => {
                const stock = inventory.find(i => i.id === prod.id)?.stockUnits || 0;
                const cajasEnteras = Math.floor(stock / prod.unitsPerPackage);
                const sueltos = stock % prod.unitsPerPackage;
                let statusColor = stock > 20 ? 'text-emerald-400' : (stock > 0 ? 'text-orange-400' : 'text-red-500');
                
                return (
                  <tr key={prod.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-5 font-bold text-white text-base">{prod.name}</td>
                    <td className="p-5 text-center text-slate-400 text-xs uppercase tracking-wider">{prod.type} x {prod.unitsPerPackage}</td>
                    <td className={`p-5 text-right font-black text-2xl ${statusColor}`}>{stock}</td>
                    <td className="p-5 text-right text-slate-300 font-bold">
                      {cajasEnteras > 0 ? `${cajasEnteras} ${prod.type}s` : ''} {cajasEnteras > 0 && sueltos > 0 ? '+' : ''} {sueltos > 0 ? ` ${sueltos} u.` : ''}
                      {stock === 0 && '-'}
                    </td>
                    <td className="p-5 text-center">
                      {stock === 0 ? (
                        <span className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 w-max mx-auto tracking-widest"><AlertCircle size={14}/> VACÍO</span>
                      ) : stock <= 20 ? (
                        <span className="px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-xs font-black uppercase w-max mx-auto block tracking-widest">CRÍTICO</span>
                      ) : (
                        <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-black uppercase w-max mx-auto block tracking-widest">NORMAL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // --- VISTA 5: CONFIGURAR (CATÁLOGO REPARADO) ---
  const renderConfigurar = () => (
    <div className="animate-in fade-in duration-500 max-w-6xl">
      <div className="mb-8 border-b border-fuchsia-900/30 pb-6">
        <h2 className="text-3xl font-black italic text-fuchsia-500 tracking-widest uppercase">Catálogo Precios base</h2>
        <p className="text-slate-400 text-sm mt-2">La matriz del sistema: Lo que configures aquí determinará la caja y el stock de toda la discoteca.</p>
      </div>
      
      <div className="bg-[#11051A] p-8 rounded-3xl border border-fuchsia-900/30 mb-10 shadow-[0_0_30px_rgba(217,70,239,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/5 rounded-full blur-[80px] pointer-events-none"></div>
        <h3 className="text-lg font-black mb-6 flex items-center gap-3 text-white uppercase tracking-widest relative z-10"><Settings className="text-fuchsia-400"/> Crear Ficha de Producto</h3>
        
        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-6 gap-5 items-end relative z-10">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-2 uppercase">Nombre Comercial</label>
            <input required type="text" className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ej. Ron Cartavio" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-2 uppercase">Formato Padre</label>
            <select className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all" value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value})}>
              <option>Caja</option><option>Paquete</option><option>Botella</option><option>Display</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-2 uppercase">Unid. Internas</label>
            <input required type="number" min="1" className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all font-bold" value={newProduct.unitsPerPackage || ''} onChange={e => setNewProduct({...newProduct, unitsPerPackage: e.target.value as any})} placeholder="12" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-2 uppercase">Costo Empresa</label>
            <input required type="number" step="0.1" className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all font-bold" value={newProduct.cost || ''} onChange={e => setNewProduct({...newProduct, cost: e.target.value as any})} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-2 uppercase text-emerald-400">P. Venta Público</label>
            <input required type="number" step="0.1" className="w-full bg-emerald-950/20 p-4 rounded-2xl text-emerald-400 border border-emerald-900/50 focus:border-emerald-500 outline-none transition-all font-black text-lg" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: e.target.value as any})} placeholder="0.00" />
          </div>
          <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-500 p-4 rounded-2xl font-black text-white transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] md:col-span-6 tracking-widest uppercase hover:scale-[1.01] mt-2">
            REGISTRAR PRODUCTO MAESTRO
          </button>
        </form>
      </div>

      <div className="bg-[#11051A] rounded-3xl border border-fuchsia-900/20 overflow-hidden shadow-xl">
        <div className="p-6 bg-slate-900/20 border-b border-slate-800/80">
          <h3 className="font-bold text-white uppercase tracking-widest text-sm">Matriz de Productos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-black/40 text-slate-400 text-xs uppercase tracking-widest border-b border-slate-800">
                <th className="p-5 font-black">Referencia</th>
                <th className="p-5 font-black">Artículo</th>
                <th className="p-5 font-black">Detalle Empaque</th>
                <th className="p-5 font-black text-right">Inversión Base</th>
                <th className="p-5 font-black text-right text-emerald-500">Cobro en Barra</th>
                <th className="p-5 font-black text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {catalog.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-5 text-slate-500 text-xs font-mono font-bold">{prod.id}</td>
                  <td className="p-5 font-bold text-white text-base">{prod.name}</td>
                  <td className="p-5"><span className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 uppercase tracking-wider">{prod.type} de {prod.unitsPerPackage} unid.</span></td>
                  <td className="p-5 text-right font-bold text-slate-400">S/ {prod.cost.toFixed(2)}</td>
                  <td className="p-5 text-right font-black text-emerald-400 text-xl">S/ {prod.price.toFixed(2)}</td>
                  <td className="p-5 text-center">
                    <button onClick={() => handleDeleteProduct(prod.id)} className="p-2.5 text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-xl transition-all border border-red-500/20">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {catalog.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-500 font-bold">No hay artículos fundacionales.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 5. NAVEGACIÓN Y ESTRUCTURA GLOBAL
  // ==========================================
  return (
    <div className="h-screen bg-[#07020A] text-white flex overflow-hidden font-sans">
      
      {/* ALERTAS */}
      {notification && (
        <div className={`fixed top-5 right-5 z-[999] flex items-center gap-3 p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${notification.type === 'success' ? 'bg-[#062817] border-emerald-500/50 text-emerald-400' : 'bg-[#2E0909] border-red-500/50 text-red-400'}`}>
          {notification.type === 'success' ? <CheckCircle size={24} className="text-emerald-500"/> : <X size={24} className="text-red-500"/>}
          <span className="font-bold text-sm tracking-wide">{notification.message}</span>
        </div>
      )}

      {/* OVERLAY MENÚ MÓVIL */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* MENÚ LATERAL IMPENETRABLE */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#0B0410] border-r border-fuchsia-900/20 p-6 flex flex-col justify-between h-full transform transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full'} md:translate-x-0`}>
        <div>
          <div className="flex justify-between items-center md:hidden mb-6">
            <ShieldCheck size={32} className="text-fuchsia-500" />
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white bg-slate-900 p-2 rounded-xl transition-colors"><X size={24} /></button>
          </div>

          <div className="hidden md:block mb-10 text-center mt-2">
             <h1 className="font-black italic text-3xl tracking-widest text-white">EL ENCANTO</h1>
          </div>
          
          <div className={`mb-8 flex flex-col items-center justify-center py-3 rounded-2xl border border-dashed ${userRole === 'admin' ? 'bg-fuchsia-950/20 border-fuchsia-500/30' : 'bg-cyan-950/20 border-cyan-500/30'}`}>
            <span className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase mb-1">Nivel Autorizado</span>
            <span className={`text-sm font-black uppercase tracking-widest ${userRole === 'admin' ? 'text-fuchsia-400' : 'text-cyan-400'}`}>{userRole}</span>
          </div>
          
          <nav className="space-y-2">
            <button onClick={() => {setActiveTab('panel'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider ${activeTab === 'panel' ? 'bg-fuchsia-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)]' : 'text-slate-400 hover:bg-[#13071E] hover:text-white'}`}>
              <LayoutDashboard size={20} /> DASHBOARD / PANEL
            </button>
            
            <button onClick={() => {setActiveTab('barra'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider ${activeTab === 'barra' ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'text-slate-400 hover:bg-[#13071E] hover:text-white'}`}>
              <Beer size={20} /> CONTROL BARRA
            </button>
            
            {userRole === 'admin' ? (
              <>
                <button onClick={() => {setActiveTab('gastos'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider ${activeTab === 'gastos' ? 'bg-fuchsia-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)]' : 'text-slate-400 hover:bg-[#13071E] hover:text-white'}`}>
                  <Receipt size={20} /> GASTOS Y FLUJO
                </button>
                <button onClick={() => {setActiveTab('productos'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider ${activeTab === 'productos' ? 'bg-fuchsia-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)]' : 'text-slate-400 hover:bg-[#13071E] hover:text-white'}`}>
                  <Package size={20} /> INVENTARIO ALMACÉN
                </button>
                <button onClick={() => {setActiveTab('configurar'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider mt-8 ${activeTab === 'configurar' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:bg-[#13071E] hover:text-white border border-transparent'}`}>
                  <Settings size={20} /> CONFIGURAR SISTEMA
                </button>
              </>
            ) : (
              <button onClick={() => {setActiveTab('productos'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider ${activeTab === 'productos' ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(8,145,178,0.3)]' : 'text-slate-400 hover:bg-[#13071E] hover:text-white'}`}>
                <Package size={20} /> STOCK DISPONIBLE
              </button>
            )}
          </nav>
        </div>
        
        <button onClick={() => {setUserRole(null); setActiveTab('panel'); setIsMobileMenuOpen(false);}} className="flex items-center justify-center gap-3 text-red-500 hover:text-white text-sm font-bold p-4 hover:bg-red-600 rounded-2xl transition-all mt-8 border border-red-900/50 bg-red-950/20 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]">
          <LogOut size={20} /> FINALIZAR TURNO
        </button>
      </aside>

      {/* ÁREA DE CONTENIDO FLUIDA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1A0B2E] via-[#07020A] to-[#07020A] relative">
        
        {/* ENCABEZADO MÓVIL */}
        <header className="md:hidden flex items-center justify-between p-5 border-b border-fuchsia-900/30 bg-[#07020A]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <ShieldCheck size={32} className="text-fuchsia-500" />
            <h1 className="font-black italic text-2xl tracking-widest text-white">EL ENCANTO</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-3 bg-slate-900 rounded-xl text-fuchsia-400 hover:text-white transition-colors border border-slate-800">
            <Menu size={24} />
          </button>
        </header>

        {/* ESPACIO DE TRABAJO */}
        <main className="flex-1 p-5 md:p-10 overflow-y-auto scroll-smooth">
          {activeTab === 'panel' && renderPanel()}
          {activeTab === 'barra' && renderBarra()}
          {activeTab === 'gastos' && userRole === 'admin' && renderGastos()}
          {activeTab === 'productos' && renderInventario()}
          {activeTab === 'configurar' && userRole === 'admin' && renderConfigurar()}
        </main>
      </div>
    </div>
  );
}
