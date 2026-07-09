import { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Receipt, 
  Package, 
  LogOut, 
  ShieldCheck, 
  Plus, 
  Trash2,
  Beer,
  ArrowLeft,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Gift,
  Boxes,
  CheckCircle,
  X,
  Menu
} from 'lucide-react';

// ==========================================
// 1. BASE DE DATOS INICIAL (ESTADO INICIAL)
// ==========================================

const INITIAL_CATALOG = [
  { id: 'PRD-001', name: 'Cerveza San Juan', type: 'Caja', unitsPerPackage: 12, cost: 60, price: 10 },
  { id: 'PRD-002', name: 'Gaseosa Guarana', type: 'Paquete', unitsPerPackage: 15, cost: 45, price: 5 },
  { id: 'PRD-003', name: 'Agua San Mateo', type: 'Paquete', unitsPerPackage: 20, cost: 30, price: 3 },
  { id: 'PRD-004', name: 'Cigarro Lucky', type: 'Paquete', unitsPerPackage: 20, cost: 20, price: 2 },
];

const INITIAL_INVENTORY = [
  { id: 'PRD-001', stockUnits: 120 },
  { id: 'PRD-002', stockUnits: 75 },
  { id: 'PRD-003', stockUnits: 100 },
  { id: 'PRD-004', stockUnits: 40 },
];

const INITIAL_EXPENSES = [
  { id: 'G-1', date: new Date().toISOString(), category: 'Marketing', description: 'Publicidad Meta Ads', type: 'Marketing', amount: 150 },
  { id: 'G-2', date: new Date().toISOString(), category: 'Artistas', description: 'Orquesta Tumbao', type: 'Por Evento', amount: 800 },
];

const INITIAL_SALES = [
  { id: 'V-1', date: new Date().toISOString(), items: [{ productId: 'PRD-001', name: 'Cerveza San Juan', qty: 24, price: 10 }], total: 240, isCourtesy: false },
  { id: 'V-2', date: new Date().toISOString(), items: [{ productId: 'PRD-002', name: 'Gaseosa Guarana', qty: 5, price: 5 }], total: 25, isCourtesy: true },
];

// ==========================================
// 2. COMPONENTE PRINCIPAL (APP)
// ==========================================

export default function App() {
  // --- ESTADOS DE SESIÓN Y NAVEGACIÓN ---
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loginStep, setLoginStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('panel');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // SOLUCIÓN AL MENÚ MÓVIL

  // --- ESTADOS DE DATOS ---
  const [catalog, setCatalog] = useState(INITIAL_CATALOG);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [sales, setSales] = useState(INITIAL_SALES);

  // --- ESTADO DE NOTIFICACIÓN PERSONALIZADA ---
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // --- ESTADOS DE FORMULARIOS ---
  const [newProduct, setNewProduct] = useState({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
  const [newExpense, setNewExpense] = useState({ category: 'Artistas', description: '', type: 'Por Evento', amount: 0 });
  const [stockAdd, setStockAdd] = useState({ productId: '', packageQty: 0 });
  
  // --- ESTADO DE CAJA (PUNTO DE VENTA) ---
  const [cart, setCart] = useState<Array<{productId: string, name: string, qty: number, price: number}>>([]);

  // ==========================================
  // 3. LÓGICA DE NEGOCIO Y CÁLCULOS
  // ==========================================

  const triggerNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Cálculos del Dashboard
  const dashboardStats = useMemo(() => {
    const totalRevenue = sales.filter(s => !s.isCourtesy).reduce((sum, sale) => sum + sale.total, 0);
    const totalCourtesy = sales.filter(s => s.isCourtesy).reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    // Lógica para Stock Vendido Dinámico (Suma de Ventas normales + Cortesías por producto)
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
        if (sale.isCourtesy) {
          itemsSold[item.productId].isCourtesyQty += item.qty;
        } else {
          itemsSold[item.productId].qty += item.qty;
        }
      });
    });

    const totalUnitsSold = Object.values(itemsSold).reduce((sum, item) => sum + item.qty + item.isCourtesyQty, 0);

    return { totalRevenue, totalCourtesy, totalExpenses, netProfit, itemsSold: Object.values(itemsSold), totalUnitsSold };
  }, [sales, expenses, catalog]);

  // Funciones de Login
  const handleSelectRole = (role: string) => {
    setSelectedRole(role);
    setLoginStep(1);
    setError('');
    setPassword('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === 'admin' && password === '1admin') {
      setUserRole('admin');
      setActiveTab('panel');
      triggerNotification('¡Bienvenido Administrador!', 'success');
    } else if (selectedRole === 'staff' && password === 'personal') {
      setUserRole('staff');
      setActiveTab('panel'); 
      triggerNotification('¡Bienvenido Personal de Barra!', 'success');
    } else {
      setError('Contraseña incorrecta');
      triggerNotification('Contraseña inválida. Intente de nuevo.', 'error');
    }
  };

  // Funciones de Catálogo (Configuración REPARADA al 100%)
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || Number(newProduct.price) <= 0) {
      triggerNotification('Complete el nombre y asegúrese que el precio de venta sea mayor a 0.', 'error');
      return;
    }
    const newId = `PRD-00${catalog.length + 1}`;
    const productToAdd = { 
      id: newId,
      name: newProduct.name, 
      type: newProduct.type, 
      unitsPerPackage: Number(newProduct.unitsPerPackage) || 1, 
      cost: Number(newProduct.cost) || 0, 
      price: Number(newProduct.price) 
    };

    setCatalog(prevCatalog => [...prevCatalog, productToAdd]);
    setInventory(prevInventory => [...prevInventory, { id: newId, stockUnits: 0 }]); 
    setNewProduct({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 }); // reset form
    triggerNotification('Producto añadido correctamente al Catálogo.', 'success');
  };

  const handleDeleteProduct = (id: string) => {
    setCatalog(prevCatalog => prevCatalog.filter(prod => prod.id !== id));
    setInventory(prevInventory => prevInventory.filter(inv => inv.id !== id));
    triggerNotification('Producto removido del Catálogo.', 'success');
  };

  // Funciones de Gastos
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || Number(newExpense.amount) <= 0) {
      triggerNotification('Llene todos los datos del gasto con montos reales.', 'error');
      return;
    }
    const newId = `G-${expenses.length + 1}`;
    setExpenses(prevExpenses => [...prevExpenses, { 
      id: newId, 
      category: newExpense.category, 
      description: newExpense.description, 
      type: newExpense.type, 
      amount: Number(newExpense.amount), 
      date: new Date().toISOString() 
    }]);
    setNewExpense({ category: 'Artistas', description: '', type: 'Por Evento', amount: 0 });
    triggerNotification('Gasto registrado con éxito.', 'success');
  };

  // Funciones de Inventario
  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdd.productId || Number(stockAdd.packageQty) <= 0) {
      triggerNotification('Seleccione un producto e ingrese la cantidad.', 'error');
      return;
    }
    const product = catalog.find(p => p.id === stockAdd.productId);
    if (!product) return;
    const unitsToAdd = Number(stockAdd.packageQty) * product.unitsPerPackage;
    setInventory(prevInventory => prevInventory.map(inv => 
      inv.id === stockAdd.productId ? { ...inv, stockUnits: inv.stockUnits + unitsToAdd } : inv
    ));
    setStockAdd({ productId: '', packageQty: 0 });
    triggerNotification(`¡Stock actualizado! Se añadieron ${unitsToAdd} unidades.`, 'success');
  };

  // Funciones de Caja (Punto de Venta)
  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id);
    const currentStock = inventory.find(i => i.id === product.id)?.stockUnits || 0;
    const currentQtyInCart = existing ? existing.qty : 0;

    if (currentQtyInCart + 1 > currentStock) {
      triggerNotification(`No puedes agregar más de este producto. Stock máximo: ${currentStock}`, 'error');
      return;
    }

    if (existing) {
      setCart(prevCart => prevCart.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart(prevCart => [...prevCart, { productId: product.id, name: product.name, qty: 1, price: product.price }]);
    }
  };

  const updateCartQty = (productId: string, increment: boolean) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    const currentStock = inventory.find(i => i.id === productId)?.stockUnits || 0;

    if (increment) {
      if (item.qty + 1 > currentStock) {
        triggerNotification('Límite de stock disponible alcanzado.', 'error');
        return;
      }
      setCart(prevCart => prevCart.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i));
    } else {
      if (item.qty - 1 <= 0) {
        removeFromCart(productId);
      } else {
        setCart(prevCart => prevCart.map(i => i.productId === productId ? { ...i, qty: i.qty - 1 } : i));
      }
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const checkout = (isCourtesy: boolean = false) => {
    if (cart.length === 0) return;
    
    // Validar Stock final antes de procesar la venta
    for (let item of cart) {
      const inv = inventory.find(i => i.id === item.productId);
      if (!inv || inv.stockUnits < item.qty) {
        triggerNotification(`Error: No queda suficiente stock de ${item.name}`, 'error');
        return;
      }
    }

    const newSale = { 
      id: `V-${sales.length + 1}`, 
      date: new Date().toISOString(), 
      items: [...cart], 
      total: cartTotal, 
      isCourtesy 
    };

    setSales(prevSales => [...prevSales, newSale]);

    setInventory(prevInventory => prevInventory.map(inv => {
      const cartItem = cart.find(c => c.productId === inv.id);
      return cartItem ? { ...inv, stockUnits: inv.stockUnits - cartItem.qty } : inv;
    }));

    setCart([]);
    triggerNotification(isCourtesy ? '¡Cortesía registrada con éxito!' : '¡Venta procesada con éxito!', 'success');
  };

  // Función para cambiar de pestaña y cerrar el menú en móviles
  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  // ==========================================
  // 4. RENDERS DE LAS VISTAS (PANTALLAS)
  // ==========================================

  // --- LOGIN ---
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0410] p-4 font-sans relative">
        <div className="bg-[#13071E] p-10 rounded-3xl w-full max-w-md shadow-[0_0_60px_rgba(217,70,239,0.18)] border border-fuchsia-900/35 relative z-10">
          <div className="flex justify-center mb-6">
            <ShieldCheck size={64} className="text-fuchsia-500 filter drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]" />
          </div>
          <h2 className="text-white text-center text-4xl font-black italic mb-2 tracking-widest">EL ENCANTO</h2>
          <p className="text-cyan-400 text-center text-lg font-bold tracking-widest mb-10">SISTEMA MAESTRO</p>

          {loginStep === 0 ? (
            <div className="space-y-4">
              <button onClick={() => handleSelectRole('admin')} className="w-full bg-fuchsia-600 text-white p-4 rounded-xl font-black text-lg hover:bg-fuchsia-500 transition-colors tracking-wide shadow-lg shadow-fuchsia-950/50">
                ADMINISTRADOR
              </button>
              <button onClick={() => handleSelectRole('staff')} className="w-full bg-cyan-500 text-black p-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition-colors tracking-wide shadow-lg shadow-cyan-950/50">
                STAFF / BARRA
              </button>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-3 mb-6 cursor-pointer text-slate-400 hover:text-white transition-colors" onClick={() => setLoginStep(0)}>
                <ArrowLeft size={20} /> <span className="text-sm font-semibold uppercase tracking-wider">Volver</span>
              </div>
              <h3 className="text-white text-center font-bold mb-4 uppercase text-sm tracking-widest text-fuchsia-400">Ingresando como {selectedRole}</h3>
              <input className="w-full bg-slate-900 text-white p-4 rounded-xl outline-none focus:ring-2 focus:ring-fuchsia-500 border border-slate-800 text-center tracking-widest text-xl font-bold" type="password" placeholder="CONTRASEÑA" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              <button className="w-full bg-emerald-500 text-black p-4 rounded-xl font-black text-lg hover:bg-emerald-400 transition-colors tracking-wide mt-4 shadow-lg shadow-emerald-950/50">INGRESAR</button>
              {error && <p className="text-red-400 text-center mt-4 text-sm font-bold bg-red-500/10 p-2 rounded-lg">{error}</p>}
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- DASHBOARD (COMPARTIDO ADMIN Y STAFF) ---
  const renderPanel = () => (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black italic text-fuchsia-500 tracking-widest uppercase">Dashboard de Control</h2>
          <p className="text-slate-400 text-sm mt-1">Monitoreo de ventas y rotación de inventarios del día</p>
        </div>
        <span className="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 px-4 py-2 rounded-lg font-bold text-sm tracking-wider w-max">
          HOY: {new Date().toLocaleDateString()}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* TARJETAS FINANCIERAS (EXCLUSIVAS DE ADMINISTRADOR) */}
        {userRole === 'admin' ? (
          <>
            <div className="bg-[#13071E] p-6 rounded-3xl border border-emerald-500/30 shadow-lg shadow-emerald-950/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><DollarSign size={24}/></div>
                <h4 className="text-slate-400 font-bold uppercase tracking-wider text-sm">Ingresos Barra</h4>
              </div>
              <p className="text-4xl font-black text-emerald-400">S/ {dashboardStats.totalRevenue.toFixed(2)}</p>
            </div>

            <div className="bg-[#13071E] p-6 rounded-3xl border border-red-500/30 shadow-lg shadow-red-950/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/20 rounded-xl text-red-400"><TrendingDown size={24}/></div>
                <h4 className="text-slate-400 font-bold uppercase tracking-wider text-sm">Gastos Totales</h4>
              </div>
              <p className="text-4xl font-black text-red-400">S/ {dashboardStats.totalExpenses.toFixed(2)}</p>
            </div>

            <div className="bg-[#13071E] p-6 rounded-3xl border border-fuchsia-500/30 shadow-lg shadow-fuchsia-950/20 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-5"><TrendingUp size={100}/></div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 bg-fuchsia-500/20 rounded-xl text-fuchsia-400"><TrendingUp size={24}/></div>
                <h4 className="text-slate-400 font-bold uppercase tracking-wider text-sm">Utilidad Neta</h4>
              </div>
              <p className={`text-4xl font-black relative z-10 ${dashboardStats.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                S/ {dashboardStats.netProfit.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-[#13071E] p-6 rounded-3xl border border-orange-500/30 shadow-lg shadow-orange-950/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400"><Gift size={24}/></div>
                <h4 className="text-slate-400 font-bold uppercase tracking-wider text-sm">Cortesías (Mermas)</h4>
              </div>
              <p className="text-4xl font-black text-orange-400">S/ {dashboardStats.totalCourtesy.toFixed(2)}</p>
            </div>
          </>
        ) : (
          /* MENSAJE DE SEGURIDAD EXCLUSIVO PARA STAFF */
          <div className="md:col-span-2 lg:col-span-4 bg-[#13071E]/60 border border-cyan-500/20 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <ShieldCheck className="text-cyan-400 flex-shrink-0" size={32} />
            <div>
              <h4 className="font-bold text-white uppercase text-xs tracking-wider">Acceso Restringido</h4>
              <p className="text-xs text-slate-400">Los módulos financieros de caja y balances netos están ocultos para tu nivel de privilegios por seguridad.</p>
            </div>
          </div>
        )}

        {/* TARJETA DINÁMICA DE STOCK VENDIDO (PARA AMBOS USUARIOS) */}
        <div className="md:col-span-2 lg:col-span-4 bg-[#13071E] p-6 rounded-3xl border border-cyan-500/30 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4">
            <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400"><Boxes size={28}/></div>
            <div>
              <h4 className="text-white font-black uppercase tracking-widest text-lg">Reporte de Stock Vendido</h4>
              <p className="text-slate-400 text-sm">Total del día: {dashboardStats.totalUnitsSold} unidades despachadas</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-cyan-400 text-xs uppercase tracking-widest border-b border-slate-800 pb-3">
                  <th className="pb-3 font-black">Producto</th>
                  <th className="pb-3 font-black text-right">Vendido (Unid)</th>
                  <th className="pb-3 font-black text-right">Cortesías (Unid)</th>
                  <th className="pb-3 font-black text-right">Total Despachado</th>
                  <th className="pb-3 font-black text-right">Equivalente en Empaques</th>
                </tr>
              </thead>
              <tbody>
                {dashboardStats.itemsSold.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-bold">
                      Aún no se registran movimientos de stock en el turno de hoy.
                    </td>
                  </tr>
                ) : (
                  dashboardStats.itemsSold.map((item, idx) => {
                    const totalUnid = item.qty + item.isCourtesyQty;
                    const empaquesEnteros = Math.floor(totalUnid / item.unitsPerPackage);
                    const unidadesSueltas = totalUnid % item.unitsPerPackage;
                    const textoEquivalente = empaquesEnteros > 0 
                      ? `${empaquesEnteros} ${item.type}(s) ${unidadesSueltas > 0 ? `y ${unidadesSueltas} Unid.` : ''}` 
                      : `${totalUnid} Unid. sueltas`;

                    return (
                      <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 font-bold text-white text-sm">{item.name}</td>
                        <td className="py-4 text-right text-emerald-400 font-black">{item.qty}</td>
                        <td className="py-4 text-right text-orange-400 font-black">{item.isCourtesyQty}</td>
                        <td className="py-4 text-right text-cyan-400 font-black text-lg">{totalUnid}</td>
                        <td className="py-4 text-right text-slate-300 font-medium text-sm">{textoEquivalente}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );

  // --- PUNTO DE VENTA (CAJA/BARRA) ---
  const renderBarra = () => (
    <div className="animate-in fade-in duration-500 h-full flex flex-col lg:flex-row gap-6">
      <div className="flex-1 bg-[#13071E] rounded-3xl border border-fuchsia-900/30 p-6 shadow-xl overflow-y-auto">
        <h3 className="text-2xl font-black italic text-cyan-400 mb-6 tracking-widest uppercase">Caja / Pedidos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {catalog.map(prod => {
            const inv = inventory.find(i => i.id === prod.id)?.stockUnits || 0;
            return (
              <button 
                key={prod.id} 
                onClick={() => addToCart(prod)}
                disabled={inv <= 0}
                className={`p-4 rounded-2xl border text-left transition-all ${inv > 0 ? 'bg-slate-900 border-slate-700 hover:border-cyan-400 hover:bg-slate-800' : 'bg-slate-950 border-red-900/30 opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <Beer size={24} className={inv > 0 ? 'text-cyan-400' : 'text-red-500'} />
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${inv > 10 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>Stock: {inv}</span>
                </div>
                <h4 className="font-bold text-white mb-1 line-clamp-2">{prod.name}</h4>
                <p className="text-emerald-400 font-black text-lg">S/ {prod.price.toFixed(2)}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full lg:w-96 bg-[#0B0410] rounded-3xl border border-slate-800 p-6 flex flex-col shadow-2xl">
        <h3 className="text-xl font-black text-white mb-4 flex items-center gap-3 border-b border-slate-800 pb-4">
          <ShoppingCart className="text-fuchsia-500"/> Ticket Actual
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 mb-6 min-h-[300px]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <Package size={48} className="mb-2 opacity-20 animate-pulse" />
              <p className="font-bold tracking-widest uppercase text-sm">Ticket Vacío</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center bg-[#13071E] p-3 rounded-xl border border-slate-800 gap-3">
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{item.name}</p>
                  <p className="text-slate-400 text-xs">{item.qty} x S/ {item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-1 border border-slate-700 rounded-md overflow-hidden bg-slate-900">
                    <button onClick={() => updateCartQty(item.productId, false)} className="px-3 py-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700">-</button>
                    <span className="text-white text-xs font-bold px-2">{item.qty}</span>
                    <button onClick={() => updateCartQty(item.productId, true)} className="px-3 py-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700">+</button>
                  </div>
                  <span className="font-black text-emerald-400">S/ {(item.qty * item.price).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(item.productId)} className="text-red-500 hover:text-red-400 bg-red-500/10 p-2 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-800 pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold uppercase tracking-widest">Total:</span>
            <span className="text-4xl font-black text-emerald-400">S/ {cartTotal.toFixed(2)}</span>
          </div>
          <button onClick={() => checkout(false)} disabled={cart.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl p-4 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-emerald-900/50">
            COBRAR TICKET
          </button>
          <button onClick={() => checkout(true)} disabled={cart.length === 0} className="w-full bg-orange-500/20 border border-orange-500 hover:bg-orange-500/30 text-orange-400 font-bold p-3 rounded-xl transition-colors disabled:opacity-50">
            REGISTRAR COMO CORTESÍA
          </button>
        </div>
      </div>
    </div>
  );

  // --- GASTOS ---
  const renderGastos = () => (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-3xl font-black italic text-fuchsia-500 mb-8 tracking-widest uppercase">Gastos y Personal</h2>
      
      <div className="bg-[#13071E] p-8 rounded-3xl border border-fuchsia-900/30 mb-8 shadow-xl">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Plus className="text-fuchsia-400"/> Nueva Salida de Dinero</h3>
        <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">Categoría</label>
            <select className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
              <option>Artistas</option><option>Seguridad</option><option>Marketing</option><option>Personal</option><option>Limpieza</option><option>Servicios</option><option>Otros</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">Descripción / Concepto</label>
            <input required type="text" className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} placeholder="Ej. Pago Orquesta Tumbao" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">Monto (S/)</label>
            <input required type="number" step="0.1" className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: e.target.value as any})} placeholder="0.00" />
          </div>
          <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-500 p-3 rounded-xl font-black text-white transition-colors h-[50px] shadow-lg shadow-fuchsia-900/50 md:col-span-4">REGISTRAR GASTO</button>
        </form>
      </div>

      <div className="bg-[#13071E] rounded-3xl border border-fuchsia-900/30 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-900/50 text-fuchsia-400 text-xs uppercase tracking-widest border-b border-fuchsia-900/30">
                <th className="p-5 font-black">Fecha</th><th className="p-5 font-black">Categoría</th><th className="p-5 font-black">Descripción</th><th className="p-5 font-black text-right">Monto Pagado</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="p-5 text-slate-400 text-sm">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="p-5"><span className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-cyan-400 uppercase">{exp.category}</span></td>
                  <td className="p-5 font-bold text-white">{exp.description}</td>
                  <td className="p-5 text-right font-black text-red-400 text-lg">- S/ {exp.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // --- INVENTARIO ---
  const renderInventario = () => (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-3xl font-black italic text-fuchsia-500 mb-8 tracking-widest uppercase">Productos (Inventario)</h2>
      
      {userRole === 'admin' && (
        <div className="bg-[#13071E] p-8 rounded-3xl border border-emerald-500/30 mb-8 shadow-xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Package className="text-emerald-400"/> Ingresar Nueva Mercadería</h3>
          <form onSubmit={handleAddStock} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">Seleccionar Producto</label>
              <select required className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-800 focus:border-emerald-500 outline-none" value={stockAdd.productId} onChange={e => setStockAdd({...stockAdd, productId: e.target.value})}>
                <option value="">-- Elegir del Catálogo --</option>
                {catalog.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type} x {p.unitsPerPackage})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">Cantidad (Empaques)</label>
              <input required type="number" min="1" className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-800 focus:border-emerald-500 outline-none" value={stockAdd.packageQty || ''} onChange={e => setStockAdd({...stockAdd, packageQty: e.target.value as any})} placeholder="Ej. 5 Cajas" />
            </div>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl font-black text-white transition-colors h-[50px] shadow-lg shadow-emerald-900/50">SUMAR AL STOCK</button>
          </form>
        </div>
      )}

      <div className="bg-[#13071E] rounded-3xl border border-fuchsia-900/30 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-900/50 text-fuchsia-400 text-xs uppercase tracking-widest border-b border-fuchsia-900/30">
                <th className="p-5 font-black">Producto</th><th className="p-5 font-black text-center">Formato</th><th className="p-5 font-black text-right">Stock (Unidades)</th><th className="p-5 font-black text-right">Equivalencia Aprox.</th><th className="p-5 font-black text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((prod) => {
                const stock = inventory.find(i => i.id === prod.id)?.stockUnits || 0;
                const equivalent = (stock / prod.unitsPerPackage).toFixed(1);
                let statusColor = stock > 20 ? 'text-emerald-400' : (stock > 0 ? 'text-orange-400' : 'text-red-500');
                return (
                  <tr key={prod.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="p-5 font-bold text-white text-lg">{prod.name}</td>
                    <td className="p-5 text-center text-slate-400 text-sm">{prod.type} (x{prod.unitsPerPackage})</td>
                    <td className={`p-5 text-right font-black text-2xl ${statusColor}`}>{stock}</td>
                    <td className="p-5 text-right text-slate-500 font-bold">{equivalent} {prod.type}s</td>
                    <td className="p-5 text-center">
                      {stock === 0 ? <span className="px-3 py-1 bg-red-500/20 text-red-500 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-1 w-max mx-auto"><AlertCircle size={14}/> Agotado</span> : stock <= 20 ? <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-bold uppercase w-max mx-auto block">Bajo</span> : <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase w-max mx-auto block">Óptimo</span>}
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

  // --- CATÁLOGO (CONFIGURAR) ---
  const renderConfigurar = () => (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-3xl font-black italic text-fuchsia-500 mb-8 tracking-widest uppercase">Configurar Catálogo</h2>
      
      <div className="bg-[#13071E] p-8 rounded-3xl border border-fuchsia-900/30 mb-8 shadow-xl">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Plus className="text-fuchsia-400"/> Crear Nuevo Producto</h3>
        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">Nombre</label>
            <input required type="text" className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ej. Cerveza Corona" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">Empaque</label>
            <select className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none" value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value})}>
              <option>Caja</option><option>Paquete</option><option>Unidad</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">U. x Empaque</label>
            <input required type="number" min="1" className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none" value={newProduct.unitsPerPackage || ''} onChange={e => setNewProduct({...newProduct, unitsPerPackage: e.target.value as any})} placeholder="12" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">Costo (S/)</label>
            <input required type="number" step="0.1" className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none" value={newProduct.cost || ''} onChange={e => setNewProduct({...newProduct, cost: e.target.value as any})} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-wider text-slate-400 mb-2 uppercase">Precio Venta (S/)</label>
            <input required type="number" step="0.1" className="w-full bg-slate-900 p-3 rounded-xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: e.target.value as any})} placeholder="0.00" />
          </div>
          <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-500 p-3 rounded-xl font-black text-white transition-colors h-[50px] shadow-lg shadow-fuchsia-900/50">CREAR</button>
        </form>
      </div>

      <div className="bg-[#13071E] rounded-3xl border border-fuchsia-900/30 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-900/50 text-fuchsia-400 text-xs uppercase tracking-widest border-b border-fuchsia-900/30">
                <th className="p-5 font-black">ID</th>
                <th className="p-5 font-black">Producto</th>
                <th className="p-5 font-black">Formato Compra</th>
                <th className="p-5 font-black text-right">Costo Empaque</th>
                <th className="p-5 font-black text-right">Precio Venta (U)</th>
                <th className="p-5 font-black text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((prod) => (
                <tr key={prod.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="p-5 text-slate-500 text-sm font-bold">{prod.id}</td>
                  <td className="p-5 font-bold text-white text-lg">{prod.name}</td>
                  <td className="p-5 text-slate-400 text-sm">{prod.type} (Trae {prod.unitsPerPackage} unid.)</td>
                  <td className="p-5 text-right font-black text-red-400">S/ {prod.cost.toFixed(2)}</td>
                  <td className="p-5 text-right font-black text-emerald-400 text-xl">S/ {prod.price.toFixed(2)}</td>
                  <td className="p-5 text-center">
                    <button onClick={() => handleDeleteProduct(prod.id)} className="p-3 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-colors"><Trash2 size={20} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 5. RENDER ESTRUCTURA BASE (APP)
  // ==========================================
  return (
    <div className="h-screen bg-[#0B0410] text-white flex overflow-hidden">
      
      {/* NOTIFICACIONES */}
      {notification && (
        <div className={`fixed top-5 right-5 z-[999] flex items-center gap-3 p-4 rounded-xl border shadow-xl animate-bounce ${notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-400' : 'bg-red-950/90 border-red-500 text-red-400'}`}>
          {notification.type === 'success' ? <CheckCircle size={24}/> : <X size={24}/>}
          <span className="font-bold text-sm tracking-wide">{notification.message}</span>
        </div>
      )}

      {/* OVERLAY FONDO OSCURO PARA MENÚ MÓVIL */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR LATERAL (REPARADO PARA SER VISIBLE EN CELULARES Y PC) */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-[#0B0410] border-r border-fuchsia-900/20 p-6 flex flex-col justify-between h-full overflow-y-auto transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div>
          {/* Botón cerrar en móviles */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-900 p-2 rounded-lg">
            <X size={24} />
          </button>

          <div className="mb-12 text-center mt-4">
             <h1 className="font-black italic text-3xl tracking-widest text-white">EL ENCANTO</h1>
             <p className={`text-xs font-black uppercase tracking-widest mt-2 py-1.5 rounded-lg border inline-block px-4 shadow-lg ${userRole === 'admin' ? 'bg-fuchsia-900/20 text-fuchsia-400 border-fuchsia-500/20 shadow-fuchsia-900/20' : 'bg-cyan-900/20 text-cyan-400 border-cyan-500/20 shadow-cyan-900/20'}`}>
               MODO: {userRole}
             </p>
          </div>
          
          <nav className="space-y-3">
            <button onClick={() => handleNavClick('panel')} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider ${activeTab === 'panel' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/50' : 'text-slate-400 hover:bg-[#13071E] hover:text-white'}`}>
              <LayoutDashboard size={20} /> PANEL
            </button>
            
            <button onClick={() => handleNavClick('barra')} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider ${activeTab === 'barra' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-[#13071E] hover:text-white'}`}>
              <Beer size={20} /> CONTROL BARRA
            </button>
            
            {userRole === 'admin' ? (
              <>
                <button onClick={() => handleNavClick('gastos')} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider ${activeTab === 'gastos' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/50' : 'text-slate-400 hover:bg-[#13071E] hover:text-white'}`}>
                  <Receipt size={20} /> GASTOS Y PERSONAL
                </button>
                <button onClick={() => handleNavClick('productos')} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider ${activeTab === 'productos' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/50' : 'text-slate-400 hover:bg-[#13071E] hover:text-white'}`}>
                  <Package size={20} /> PRODUCTOS
                </button>
                <button onClick={() => handleNavClick('configurar')} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider mt-6 ${activeTab === 'configurar' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/50' : 'text-fuchsia-400 hover:bg-fuchsia-900/20 border border-transparent hover:border-fuchsia-900/30'}`}>
                  <Settings size={20} /> CONFIGURAR
                </button>
              </>
            ) : (
              // El STAFF también puede ver el stock (Inventario de Productos)
              <button onClick={() => handleNavClick('productos')} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-sm tracking-wider ${activeTab === 'productos' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/50' : 'text-slate-400 hover:bg-[#13071E] hover:text-white'}`}>
                <Package size={20} /> PRODUCTOS
              </button>
            )}
          </nav>
        </div>
        
        <button onClick={() => {setUserRole(null); setActiveTab('panel'); setIsMobileMenuOpen(false);}} className="flex items-center justify-center gap-3 text-red-500 hover:text-white text-sm font-bold p-4 hover:bg-red-500 rounded-2xl transition-all mt-8 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <LogOut size={20} /> SALIR
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-fuchsia-900/10 via-[#0B0410] to-[#0B0410]">
        
        {/* HEADER MÓVIL (NUEVO: Para abrir el menú en celulares) */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-fuchsia-900/20 bg-[#0B0410]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={28} className="text-fuchsia-500" />
            <h1 className="font-black italic text-xl tracking-widest text-white">EL ENCANTO</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-900 rounded-lg text-fuchsia-400 hover:text-white">
            <Menu size={28} />
          </button>
        </header>

        {/* CONTENIDO DE LA PESTAÑA */}
        <main className="flex-1 p-4 md:p-10 overflow-y-auto">
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
