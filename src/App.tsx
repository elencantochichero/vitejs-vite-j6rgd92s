import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Settings, Receipt, Package, LogOut, ShieldCheck, 
  Plus, Trash2, Beer, ArrowLeft, ShoppingCart, TrendingUp, TrendingDown, 
  DollarSign, AlertCircle, Gift, Boxes, CheckCircle, X, Menu, Activity,
  PackagePlus, Tags, Archive, Search, FileText, BarChart2, Info
} from 'lucide-react';

// ============================================================================
// 1. MODELOS Y TIPOS DE DATOS (INTERFACES)
// ============================================================================

interface Product {
  id: string;
  name: string;
  type: string;
  unitsPerPackage: number;
  cost: number;
  price: number;
}

interface InventoryItem {
  id: string;
  stockUnits: number;
  totalEntered: number;
}

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

interface CartItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  isCourtesy: boolean;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

// ============================================================================
// 2. BASE DE DATOS INICIAL SIMULADA (MOCK DATA)
// ============================================================================

const INITIAL_CATALOG: Product[] = [
  { id: 'PRD-001', name: 'Cerveza San Juan', type: 'Caja', unitsPerPackage: 12, cost: 60, price: 10 },
  { id: 'PRD-002', name: 'Gaseosa Guarana', type: 'Paquete', unitsPerPackage: 15, cost: 45, price: 5 },
  { id: 'PRD-003', name: 'Agua San Mateo', type: 'Paquete', unitsPerPackage: 20, cost: 30, price: 3 },
  { id: 'PRD-004', name: 'Cigarro Lucky Strike', type: 'Paquete', unitsPerPackage: 20, cost: 20, price: 2 },
  { id: 'PRD-005', name: 'Ron Cartavio', type: 'Botella', unitsPerPackage: 1, cost: 25, price: 40 },
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'PRD-001', stockUnits: 120, totalEntered: 240 },
  { id: 'PRD-002', stockUnits: 75, totalEntered: 150 },
  { id: 'PRD-003', stockUnits: 100, totalEntered: 100 },
  { id: 'PRD-004', stockUnits: 40, totalEntered: 60 },
  { id: 'PRD-005', stockUnits: 10, totalEntered: 15 },
];

const INITIAL_EXPENSES: Expense[] = [
  { id: 'G-1', date: new Date().toISOString(), category: 'Marketing', description: 'Publicidad Meta Ads Semanal', amount: 150 },
  { id: 'G-2', date: new Date().toISOString(), category: 'Artistas', description: 'Adelanto Orquesta Tumbao', amount: 800 },
  { id: 'G-3', date: new Date().toISOString(), category: 'Limpieza', description: 'Artículos de limpieza', amount: 45 },
];

const INITIAL_SALES: Sale[] = [
  { id: 'V-1', date: new Date().toISOString(), items: [{ productId: 'PRD-001', name: 'Cerveza San Juan', qty: 24, price: 10 }], total: 240, isCourtesy: false },
  { id: 'V-2', date: new Date().toISOString(), items: [{ productId: 'PRD-004', name: 'Cigarro Lucky Strike', qty: 5, price: 2 }], total: 10, isCourtesy: false },
  { id: 'V-3', date: new Date().toISOString(), items: [{ productId: 'PRD-002', name: 'Gaseosa Guarana', qty: 10, price: 5 }], total: 50, isCourtesy: true },
];

// ============================================================================
// 3. COMPONENTE PRINCIPAL (MOTOR DE LA APLICACIÓN)
// ============================================================================

export default function App() {
  // --------------------------------------------------------------------------
  // ESTADOS DE SEGURIDAD Y NAVEGACIÓN
  // --------------------------------------------------------------------------
  const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null);
  const [loginStep, setLoginStep] = useState<number>(0);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'staff' | null>(null);
  const [password, setPassword] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('panel');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // ESTADOS DEL SISTEMA (DATOS)
  // --------------------------------------------------------------------------
  const [catalog, setCatalog] = useState<Product[]>(INITIAL_CATALOG);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);

  // --------------------------------------------------------------------------
  // ESTADOS DE INTERFAZ DE USUARIO (UI)
  // --------------------------------------------------------------------------
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Estados para Formularios
  const [newProduct, setNewProduct] = useState({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
  const [newExpense, setNewExpense] = useState({ category: 'Artistas', description: '', amount: 0 });
  const [stockAdd, setStockAdd] = useState({ productId: '', packageQty: 0 });
  
  // Estado del Punto de Venta (Carrito)
  const [cart, setCart] = useState<CartItem[]>([]);

  // --------------------------------------------------------------------------
  // SISTEMA DE NOTIFICACIONES (ROBUSTO)
  // --------------------------------------------------------------------------
  const notify = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  // --------------------------------------------------------------------------
  // MOTOR DE CÁLCULOS (ALGORITMOS FINANCIEROS Y DE STOCK)
  // --------------------------------------------------------------------------
  const dashboardStats = useMemo(() => {
    // 1. Cálculos Financieros
    const totalRevenue = sales.filter(s => !s.isCourtesy).reduce((sum, sale) => sum + sale.total, 0);
    const totalCourtesyValue = sales.filter(s => s.isCourtesy).reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    // 2. Mapeo de Stock Vendido Dinámico
    const itemsSoldMap: Record<string, { qty: number, courtesyQty: number }> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!itemsSoldMap[item.productId]) {
          itemsSoldMap[item.productId] = { qty: 0, courtesyQty: 0 };
        }
        if (sale.isCourtesy) {
          itemsSoldMap[item.productId].courtesyQty += item.qty;
        } else {
          itemsSoldMap[item.productId].qty += item.qty;
        }
      });
    });

    // 3. Consolidación de Reporte de Inventario
    const stockReport = catalog.map(prod => {
      const invData = inventory.find(i => i.id === prod.id) || { stockUnits: 0, totalEntered: 0 };
      const soldData = itemsSoldMap[prod.id] || { qty: 0, courtesyQty: 0 };
      
      return {
        id: prod.id,
        name: prod.name,
        type: prod.type,
        unitsPerPackage: prod.unitsPerPackage,
        totalEntered: invData.totalEntered,
        soldUnits: soldData.qty,
        courtesyUnits: soldData.courtesyQty,
        currentStock: invData.stockUnits,
        price: prod.price
      };
    });

    // 4. Indicadores Globales
    const globalEntered = stockReport.reduce((sum, item) => sum + item.totalEntered, 0);
    const globalSold = stockReport.reduce((sum, item) => sum + item.soldUnits, 0);
    const globalCourtesy = stockReport.reduce((sum, item) => sum + item.courtesyUnits, 0);
    const globalStock = stockReport.reduce((sum, item) => sum + item.currentStock, 0);

    return { 
      totalRevenue, 
      totalCourtesyValue, 
      totalExpenses, 
      netProfit, 
      stockReport, 
      globalEntered, 
      globalSold, 
      globalCourtesy,
      globalStock 
    };
  }, [sales, expenses, catalog, inventory]);

  // --------------------------------------------------------------------------
  // LÓGICA DE AUTENTICACIÓN Y SEGURIDAD
  // --------------------------------------------------------------------------
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Claves Maestras
    const ADMIN_PASS = '123';
    const STAFF_PASS = '456';

    if (selectedRole === 'admin' && (password === ADMIN_PASS || password === '1admin')) {
      setUserRole('admin');
      setActiveTab('panel');
      notify('Acceso Concedido: MODO ADMINISTRADOR', 'success');
    } else if (selectedRole === 'staff' && (password === STAFF_PASS || password === 'personal')) {
      setUserRole('staff');
      setActiveTab('panel');
      notify('Turno Iniciado: MODO STAFF / BARRA', 'success');
    } else {
      notify('Clave de acceso incorrecta o no autorizada.', 'error');
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setActiveTab('panel');
    setIsMobileMenuOpen(false);
    setPassword('');
    setLoginStep(0);
    notify('Sesión cerrada correctamente.', 'info');
  };

  // --------------------------------------------------------------------------
  // LÓGICA DEL CATÁLOGO (MÓDULO DE CONFIGURACIÓN)
  // --------------------------------------------------------------------------
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(Number(newProduct.cost).toFixed(2));
    const price = parseFloat(Number(newProduct.price).toFixed(2));
    const units = parseInt(Number(newProduct.unitsPerPackage).toString());

    // Validaciones estrictas
    if (!newProduct.name.trim()) {
      notify('El nombre del producto es obligatorio.', 'error');
      return;
    }
    if (price <= 0) {
      notify('El precio de venta debe ser mayor a 0.', 'error');
      return;
    }
    if (units <= 0) {
      notify('Las unidades por empaque deben ser al menos 1.', 'error');
      return;
    }

    const newId = `PRD-${(catalog.length + 1).toString().padStart(3, '0')}`;
    const productToAdd: Product = { 
      id: newId, 
      name: newProduct.name.trim(), 
      type: newProduct.type, 
      unitsPerPackage: units, 
      cost, 
      price 
    };

    setCatalog([...catalog, productToAdd]);
    setInventory([...inventory, { id: newId, stockUnits: 0, totalEntered: 0 }]); 
    
    // Reset Formulario
    setNewProduct({ name: '', type: 'Caja', unitsPerPackage: 12, cost: 0, price: 0 });
    notify(`Producto "${productToAdd.name}" registrado con éxito.`, 'success');
  };

  const handleDeleteProduct = (id: string) => {
    const product = catalog.find(p => p.id === id);
    if (!product) return;
    
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar "${product.name}"? Esta acción no se puede deshacer.`);
    if (confirmDelete) {
      setCatalog(catalog.filter(prod => prod.id !== id));
      setInventory(inventory.filter(inv => inv.id !== id));
      // También podríamos limpiar el carrito si está el producto
      setCart(cart.filter(item => item.productId !== id));
      notify('Producto eliminado del sistema.', 'success');
    }
  };

  // --------------------------------------------------------------------------
  // LÓGICA DE GASTOS OPERATIVOS
  // --------------------------------------------------------------------------
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(Number(newExpense.amount).toFixed(2));
    
    if (!newExpense.description.trim()) {
      notify('Especifique el concepto del gasto.', 'error'); 
      return;
    }
    if (amount <= 0) {
      notify('El monto del gasto debe ser mayor a 0.', 'error'); 
      return;
    }

    const newId = `G-${Date.now()}`;
    const expenseToAdd: Expense = { 
      id: newId, 
      category: newExpense.category, 
      description: newExpense.description.trim(), 
      amount, 
      date: new Date().toISOString() 
    };

    setExpenses([expenseToAdd, ...expenses]);
    setNewExpense({ category: 'Artistas', description: '', amount: 0 });
    notify(`Salida de dinero registrada: S/ ${amount}`, 'success');
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
    notify('Gasto anulado.', 'info');
  };

  // --------------------------------------------------------------------------
  // LÓGICA DE INVENTARIO Y REABASTECIMIENTO
  // --------------------------------------------------------------------------
  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(Number(stockAdd.packageQty).toString());
    
    if (!stockAdd.productId) {
      notify('Debe seleccionar un producto del catálogo.', 'error'); 
      return;
    }
    if (qty <= 0) {
      notify('La cantidad de empaques debe ser mayor a 0.', 'error'); 
      return;
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
    notify(`Se agregaron ${unitsToAdd} unidades (${qty} ${product.type}s) de ${product.name}.`, 'success');
  };

  // --------------------------------------------------------------------------
  // LÓGICA DEL PUNTO DE VENTA (CAJA / BARRA)
  // --------------------------------------------------------------------------
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    const currentStock = inventory.find(i => i.id === product.id)?.stockUnits || 0;
    const currentQtyInCart = existingItem ? existingItem.qty : 0;

    if (currentQtyInCart + 1 > currentStock) {
      notify(`Stock insuficiente. Solo quedan ${currentStock} unidades de ${product.name}`, 'error'); 
      return;
    }

    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, qty: item.qty + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, qty: 1, price: product.price }]);
    }
  };

  const updateCartQty = (productId: string, increment: boolean) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    const currentStock = inventory.find(i => i.id === productId)?.stockUnits || 0;

    if (increment) {
      if (item.qty + 1 > currentStock) { 
        notify(`Límite físico de stock alcanzado (${currentStock} disp.)`, 'error'); 
        return; 
      }
      setCart(cart.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i));
    } else {
      if (item.qty - 1 <= 0) {
        setCart(cart.filter(item => item.productId !== productId));
      } else {
        setCart(cart.map(i => i.productId === productId ? { ...i, qty: i.qty - 1 } : i));
      }
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    if(window.confirm('¿Está seguro de vaciar el ticket completo?')) {
      setCart([]);
    }
  }

  const checkout = (isCourtesy: boolean = false) => {
    if (cart.length === 0) return;
    
    // Doble validación de seguridad de Stock para evitar sobreventas
    for (let item of cart) {
      const inv = inventory.find(i => i.id === item.productId);
      if (!inv || inv.stockUnits < item.qty) {
        notify(`Error Crítico: Faltan unidades físicas de ${item.name} para completar la transacción.`, 'error'); 
        return;
      }
    }

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const newSale: Sale = { 
      id: `V-${Date.now()}`, 
      date: new Date().toISOString(), 
      items: [...cart], 
      total: cartTotal, 
      isCourtesy 
    };
    
    // 1. Guardar Venta
    setSales([...sales, newSale]);
    
    // 2. Descontar Inventario Real
    setInventory(inventory.map(inv => {
      const cartItem = cart.find(c => c.productId === inv.id);
      if (cartItem) {
        return { ...inv, stockUnits: inv.stockUnits - cartItem.qty };
      }
      return inv;
    }));
    
    // 3. Limpiar y Notificar
    setCart([]);
    notify(isCourtesy ? 'Salida por cortesía/merma registrada con éxito.' : '¡Transacción procesada y cobrada con éxito!', 'success');
  };

  // --------------------------------------------------------------------------
  // COMPONENTES REUTILIZABLES DE UI
  // --------------------------------------------------------------------------
  const SectionHeader = ({ title, subtitle, icon: Icon }: { title: string, subtitle: string, icon?: any }) => (
    <div className="mb-8 border-b border-fuchsia-900/30 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {Icon && <Icon className="text-fuchsia-500" size={32} />}
          <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400 tracking-widest uppercase">
            {title}
          </h2>
        </div>
        <p className="text-slate-400 text-sm font-medium tracking-wide">{subtitle}</p>
      </div>
      <div className="bg-[#11051A] border border-fuchsia-500/20 px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(217,70,239,0.05)]">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-1">Día Operativo</span>
        <span className="text-fuchsia-400 font-black tracking-widest">{new Date().toLocaleDateString('es-PE')}</span>
      </div>
    </div>
  );

  // ============================================================================
  // PANTALLAS Y RENDERIZADO
  // ============================================================================

  // --- VISTA 0: PANTALLA DE ACCESO (LOGIN) ---
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07020A] p-4 font-sans relative overflow-hidden text-white">
        {/* Efectos visuales de fondo */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-700/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="bg-[#11051A]/80 backdrop-blur-2xl p-10 rounded-[2.5rem] w-full max-w-md shadow-[0_0_80px_rgba(217,70,239,0.15)] border border-fuchsia-500/30 relative z-10 transition-all duration-500">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-fuchsia-500/10 rounded-3xl border border-fuchsia-500/20 shadow-[0_0_30px_rgba(217,70,239,0.2)]">
              <ShieldCheck size={64} className="text-fuchsia-500" />
            </div>
          </div>
          
          <h2 className="text-white text-center text-4xl font-black italic mb-1 tracking-widest drop-shadow-md">EL ENCANTO</h2>
          <p className="text-cyan-400 text-center text-sm font-black tracking-[0.3em] mb-10">SISTEMA MAESTRO</p>

          {loginStep === 0 ? (
            <div className="space-y-5 animate-in slide-in-from-bottom-5 duration-500">
              <button 
                onClick={() => { setSelectedRole('admin'); setLoginStep(1); setPassword(''); }} 
                className="w-full relative group overflow-hidden bg-gradient-to-r from-fuchsia-700 to-fuchsia-500 text-white p-5 rounded-2xl font-black text-lg transition-transform shadow-[0_0_40px_rgba(217,70,239,0.3)] tracking-wider hover:-translate-y-1"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <span className="relative z-10">ADMINISTRADOR</span>
              </button>
              
              <button 
                onClick={() => { setSelectedRole('staff'); setLoginStep(1); setPassword(''); }} 
                className="w-full relative group overflow-hidden bg-gradient-to-r from-cyan-600 to-cyan-400 text-black p-5 rounded-2xl font-black text-lg transition-transform shadow-[0_0_40px_rgba(34,211,238,0.3)] tracking-wider hover:-translate-y-1"
              >
                <div className="absolute inset-0 w-full h-full bg-white/30 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <span className="relative z-10">STAFF / BARRA</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center justify-between mb-6">
                <button 
                  type="button"
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-800/50 px-3 py-2 rounded-xl" 
                  onClick={() => {setLoginStep(0); setPassword('');}}
                >
                  <ArrowLeft size={18} /> <span className="text-xs font-bold uppercase tracking-widest">Atrás</span>
                </button>
                <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Autenticación</span>
              </div>
              
              <div className="text-center mb-6">
                <p className="text-slate-400 font-medium text-sm tracking-widest uppercase mb-2">Ingresando al panel de:</p>
                <div className={`inline-block px-6 py-2 rounded-xl border font-black tracking-widest uppercase ${selectedRole === 'admin' ? 'bg-fuchsia-950/40 text-fuchsia-400 border-fuchsia-500/30' : 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'}`}>
                  {selectedRole}
                </div>
              </div>

              <div className="relative">
                <input 
                  className="w-full bg-[#07020A] text-white p-5 rounded-2xl outline-none focus:border-fuchsia-500 border border-slate-700 text-center tracking-[0.5em] text-2xl font-black shadow-inner transition-all focus:ring-2 focus:ring-fuchsia-500/50 placeholder:tracking-normal placeholder:text-sm placeholder:font-medium placeholder:text-slate-600" 
                  type="password" 
                  placeholder="Ingrese clave de acceso" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  autoFocus 
                />
              </div>

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-black p-5 rounded-2xl font-black text-lg transition-all tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] mt-4 hover:-translate-y-1">
                VALIDAR CREDENCIALES
              </button>
            </form>
          )}
        </div>

        {/* Notificaciones Login */}
        <div className="fixed top-5 right-5 z-[999] flex flex-col gap-2">
          {notifications.map(notif => (
            <div key={notif.id} className={`flex items-center gap-3 p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${notif.type === 'success' ? 'bg-[#062817] border-emerald-500/50 text-emerald-400' : 'bg-[#2E0909] border-red-500/50 text-red-400'}`}>
              {notif.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
              <span className="font-bold text-sm tracking-wide">{notif.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VISTA 1: DASHBOARD (PANEL DE CONTROL) ---
  const renderDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <SectionHeader title="Dashboard Analítico" subtitle="Monitoreo central de flujo de caja e inventario en tiempo real." icon={LayoutDashboard} />
      
      {/* TARJETAS FINANCIERAS (SÓLO ADMINISTRADOR) */}
      {userRole === 'admin' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-[#11051A] to-[#07020A] p-6 rounded-3xl border border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.05)] hover:border-emerald-500/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Venta Bruta</h4>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400"><DollarSign size={20}/></div>
            </div>
            <p className="text-4xl font-black text-emerald-400 tracking-wider">S/ {dashboardStats.totalRevenue.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-[#11051A] to-[#07020A] p-6 rounded-3xl border border-red-500/30 shadow-[0_10px_30px_rgba(239,68,68,0.05)] hover:border-red-500/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Gastos Operativos</h4>
              <div className="p-2.5 bg-red-500/10 rounded-xl text-red-400"><TrendingDown size={20}/></div>
            </div>
            <p className="text-4xl font-black text-red-400 tracking-wider">S/ {dashboardStats.totalExpenses.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-fuchsia-900/30 to-[#07020A] p-6 rounded-3xl border border-fuchsia-500/50 shadow-[0_15px_40px_rgba(217,70,239,0.15)] relative overflow-hidden lg:col-span-2 group">
            <div className="absolute right-0 top-0 h-full w-2/3 bg-gradient-to-l from-fuchsia-500/10 to-transparent pointer-events-none transition-transform group-hover:scale-110"></div>
            <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12 transition-transform group-hover:rotate-0 duration-500"><TrendingUp size={150}/></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-fuchsia-200 font-black uppercase tracking-widest text-sm bg-fuchsia-950/50 px-3 py-1 rounded-lg border border-fuchsia-500/30">Caja Neta del Día (Utilidad)</h4>
                <div className="p-3 bg-fuchsia-500/20 rounded-xl text-fuchsia-400 backdrop-blur-md"><TrendingUp size={24}/></div>
              </div>
              <div className="flex items-baseline gap-4 mt-2">
                <p className={`text-5xl md:text-6xl font-black tracking-wider ${dashboardStats.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                  S/ {dashboardStats.netProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MENSAJE DE SEGURIDAD EXCLUSIVO PARA STAFF */
        <div className="bg-[#11051A]/80 border-l-4 border-cyan-500 p-6 rounded-r-2xl shadow-lg flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="p-4 bg-cyan-500/10 rounded-full">
            <ShieldCheck className="text-cyan-400" size={40} />
          </div>
          <div>
            <h4 className="font-black text-white uppercase tracking-widest mb-2 text-lg">Bloqueo Financiero Activo</h4>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Los datos financieros, ingresos netos y gastos operativos están encriptados y ocultos para el nivel <strong>STAFF</strong>. 
              Usted tiene acceso exclusivo al módulo inferior para el monitoreo y cuadre de inventario físico.
            </p>
          </div>
        </div>
      )}

      {/* SECCIÓN STOCK (COMPARTIDA: ADMIN Y STAFF) */}
      <div className="pt-6">
        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-6 border-l-4 border-cyan-500 pl-4">Resumen Global de Inventario</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#11051A] p-6 rounded-3xl border border-blue-500/20 shadow-lg flex items-center gap-5 hover:bg-[#150724] transition-colors">
            <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400"><PackagePlus size={32}/></div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Total Ingresado (Histórico)</p>
              <p className="text-3xl font-black text-white">{dashboardStats.globalEntered} <span className="text-sm font-medium text-slate-500 tracking-normal">Unid.</span></p>
            </div>
          </div>
          
          <div className="bg-[#11051A] p-6 rounded-3xl border border-emerald-500/20 shadow-lg flex items-center gap-5 hover:bg-[#150724] transition-colors">
            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400"><Tags size={32}/></div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Total Vendido / Despachado</p>
              <p className="text-3xl font-black text-white">{dashboardStats.globalSold} <span className="text-sm font-medium text-slate-500 tracking-normal">Unid.</span></p>
            </div>
          </div>
          
          <div className="bg-[#11051A] p-6 rounded-3xl border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)] flex items-center gap-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
            <div className="p-4 bg-cyan-500/20 rounded-2xl text-cyan-400 relative z-10"><Archive size={32}/></div>
            <div className="relative z-10">
              <p className="text-[10px] text-cyan-200 font-bold uppercase tracking-[0.2em] mb-1">Stock Físico Actual</p>
              <p className="text-3xl font-black text-cyan-400">{dashboardStats.globalStock} <span className="text-sm font-medium text-cyan-700 tracking-normal">Unid.</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA MAESTRA DE FLUJO DE INVENTARIO */}
      <div className="bg-[#11051A] rounded-3xl border border-cyan-500/30 shadow-[0_10px_40px_rgba(34,211,238,0.08)] overflow-hidden mt-8">
        <div className="p-6 md:p-8 border-b border-slate-800/80 bg-slate-900/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 shadow-inner"><Activity size={28}/></div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-widest text-white">Desglose Detallado por Producto</h3>
              <p className="text-slate-400 text-xs font-medium tracking-wide mt-1">Calculado en base a ingresos de almacén y ventas de POS.</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-black/60 text-cyan-500 text-[10px] uppercase tracking-[0.15em] border-b border-cyan-900/30">
                <th className="p-5 font-black">Producto Comercial</th>
                <th className="p-5 font-black text-right border-l border-slate-800/50 bg-blue-950/10">Ingreso Histórico</th>
                <th className="p-5 font-black text-right bg-emerald-950/10">Venta POS</th>
                <th className="p-5 font-black text-right bg-orange-950/10">Mermas / Cort.</th>
                <th className="p-5 font-black text-right border-l border-slate-800/50 text-cyan-300">Stock Actual</th>
                <th className="p-5 font-black text-right text-slate-300">Equivalente Físico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {dashboardStats.stockReport.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <Archive size={48} className="mb-4 text-slate-500" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest">Catálogo Vacío</p>
                      <p className="text-slate-500 text-sm">Diríjase a configuración para crear productos.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                dashboardStats.stockReport.map((item, idx) => {
                  const cajasEnteras = Math.floor(item.currentStock / item.unitsPerPackage);
                  const sueltos = item.currentStock % item.unitsPerPackage;
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="p-5">
                        <p className="font-bold text-white text-sm md:text-base group-hover:text-cyan-300 transition-colors">{item.name}</p>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold bg-slate-900 w-max px-2 py-0.5 rounded">{item.type} (x{item.unitsPerPackage})</p>
                      </td>
                      <td className="p-5 text-right font-black text-base text-blue-400/80 border-l border-slate-800/50 bg-blue-950/5">{item.totalEntered}</td>
                      <td className="p-5 text-right font-black text-base text-emerald-400 bg-emerald-950/5">{item.soldUnits}</td>
                      <td className="p-5 text-right font-black text-base text-orange-400 bg-orange-950/5">{item.courtesyUnits}</td>
                      <td className="p-5 text-right font-black text-xl text-cyan-400 border-l border-slate-800/50 bg-cyan-950/10 shadow-inner">
                        {item.currentStock}
                      </td>
                      <td className="p-5 text-right font-medium text-sm text-slate-300">
                        {cajasEnteras > 0 && <span className="text-white">{cajasEnteras} <span className="text-slate-500 text-xs uppercase">{item.type}s</span></span>} 
                        {cajasEnteras > 0 && sueltos > 0 && <span className="text-slate-600 mx-1">+</span>} 
                        {sueltos > 0 && <span className="text-white">{sueltos} <span className="text-slate-500 text-xs uppercase">Unid.</span></span>}
                        
                        {item.currentStock === 0 && (
                          <span className="inline-flex items-center gap-1 text-red-500 font-bold uppercase text-[10px] tracking-widest bg-red-500/10 border border-red-500/20 px-2 py-1 rounded ml-2">
                            <AlertCircle size={12}/> Agotado
                          </span>
                        )}
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

  // --- VISTA 2: PUNTO DE VENTA (BARRA / POS) ---
  const renderPointOfSale = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-140px)] flex flex-col xl:flex-row gap-6">
      
      {/* PANEL IZQUIERDO: GRILLA DE PRODUCTOS */}
      <div className="flex-1 bg-[#11051A] rounded-3xl border border-fuchsia-900/20 p-6 shadow-xl flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/5 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-6 border-b border-slate-800/80 pb-4 relative z-10">
          <h3 className="text-2xl font-black italic text-cyan-400 tracking-widest uppercase flex items-center gap-3">
            <Beer /> Terminal POS
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              className="bg-[#07020A] border border-slate-700 text-white text-sm rounded-xl pl-10 pr-4 py-2 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all w-48 md:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
            {catalog
              .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(prod => {
                const inv = inventory.find(i => i.id === prod.id)?.stockUnits || 0;
                const isOutOfStock = inv <= 0;
                
                return (
                  <button 
                    key={prod.id} 
                    onClick={() => addToCart(prod)} 
                    disabled={isOutOfStock}
                    className={`relative p-5 rounded-2xl border text-left transition-all duration-300 overflow-hidden group
                      ${!isOutOfStock 
                        ? 'bg-gradient-to-br from-[#180A24] to-[#11051A] border-slate-700/50 hover:border-cyan-500/80 hover:shadow-[0_10px_25px_rgba(34,211,238,0.15)] hover:-translate-y-1' 
                        : 'bg-black/40 border-red-900/30 opacity-60 cursor-not-allowed grayscale-[50%]'
                      }`}
                  >
                    {!isOutOfStock && (
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className={`p-2 rounded-xl ${!isOutOfStock ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-500'}`}>
                        <Beer size={24} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-inner border
                        ${inv > 20 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : inv > 0 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        Stock: {inv}
                      </span>
                    </div>
                    
                    <div className="relative z-10">
                      <h4 className="font-bold text-white mb-2 leading-tight h-10 text-sm md:text-base">{prod.name}</h4>
                      <div className="flex items-end justify-between mt-2">
                        <p className={`font-black text-xl md:text-2xl tracking-tight ${!isOutOfStock ? 'text-emerald-400' : 'text-slate-500'}`}>
                          <span className="text-sm mr-1">S/</span>{prod.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              
            {catalog.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-500">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-sm">No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PANEL DERECHO: TICKET / CARRITO */}
      <div className="w-full xl:w-[450px] bg-[#07020A] rounded-3xl border border-fuchsia-900/40 p-6 flex flex-col shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-emerald-500"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-600/10 rounded-full blur-[60px] pointer-events-none"></div>
        
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5 mb-4 relative z-10">
          <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-widest uppercase">
            <ShoppingCart className="text-fuchsia-500"/> Ticket
          </h3>
          <div className="flex items-center gap-3">
            <span className="bg-fuchsia-950/50 border border-fuchsia-500/30 text-fuchsia-400 text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase">
              {cart.length} Ítems
            </span>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg transition-colors" title="Vaciar Ticket">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 mb-6 relative z-10 custom-scrollbar pr-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-60">
              <ShoppingCart size={80} className="mb-6 opacity-20" />
              <p className="font-black tracking-[0.2em] uppercase text-sm mb-2 text-slate-500">Caja Libre</p>
              <p className="text-xs text-center max-w-[200px] leading-relaxed">Selecciona productos del panel izquierdo para armar el ticket.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="bg-[#11051A] p-4 rounded-2xl border border-slate-800 hover:border-slate-600 transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <p className="font-bold text-white text-sm leading-tight pr-4">{item.name}</p>
                  <span className="font-black text-emerald-400 text-lg whitespace-nowrap">S/ {(item.qty * item.price).toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <p className="text-slate-500 text-xs font-medium">S/ {item.price.toFixed(2)} Unidad</p>
                  
                  <div className="flex items-center bg-[#07020A] border border-slate-700/80 rounded-xl overflow-hidden shadow-inner">
                    <button 
                      onClick={() => updateCartQty(item.productId, false)} 
                      className="px-4 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-black"
                    >
                      -
                    </button>
                    <span className="text-white text-sm font-black px-3 min-w-[2.5rem] text-center border-x border-slate-800">
                      {item.qty}
                    </span>
                    <button 
                      onClick={() => updateCartQty(item.productId, true)} 
                      className="px-4 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-800/80 pt-6 relative z-10 bg-[#07020A]">
          <div className="flex justify-between items-end mb-6 bg-[#11051A] p-4 rounded-2xl border border-slate-800/50">
            <span className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Total a Cobrar</span>
            <span className="text-5xl font-black text-emerald-400 tracking-tighter">
              <span className="text-2xl mr-1 opacity-70">S/</span>
              {cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)}
            </span>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => checkout(false)} 
              disabled={cart.length === 0} 
              className="w-full relative group overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-xl p-5 rounded-2xl transition-all disabled:opacity-50 hover:scale-[1.02] shadow-[0_10px_30px_rgba(16,185,129,0.25)] tracking-widest flex items-center justify-center gap-3"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <CheckCircle size={24} className="relative z-10" />
              <span className="relative z-10">PROCESAR PAGO</span>
            </button>
            
            <button 
              onClick={() => checkout(true)} 
              disabled={cart.length === 0} 
              className="w-full bg-transparent border-2 border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/10 text-orange-400 font-bold p-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2"
            >
              <Gift size={16} /> Registrar Merma / Cortesía
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- VISTA 3: GASTOS OPERATIVOS (SÓLO ADMIN) ---
  const renderExpenses = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto space-y-8">
      <SectionHeader title="Gastos Operativos" subtitle="Documentación y control de egresos, pagos a personal y mantenimiento." icon={Receipt} />
      
      <div className="bg-[#11051A] p-8 rounded-3xl border border-fuchsia-900/30 shadow-[0_10px_40px_rgba(217,70,239,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-[80px] pointer-events-none"></div>
        <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-white uppercase tracking-widest relative z-10 border-l-4 border-fuchsia-500 pl-4">
          Declarar Salida de Dinero
        </h3>
        
        <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-3 uppercase">Categoría</label>
            <div className="relative">
              <select className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none transition-all appearance-none font-medium" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                <option>Artistas / Orquestas</option>
                <option>Seguridad</option>
                <option>Marketing / Publi</option>
                <option>Personal de Barra</option>
                <option>Limpieza</option>
                <option>Alquiler / Servicios</option>
                <option>Otros Múltiples</option>
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
            </div>
          </div>
          
          <div className="md:col-span-5">
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-3 uppercase">Concepto / Destino</label>
            <input required type="text" className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all font-medium placeholder:text-slate-600" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} placeholder="Ej. Adelanto Orquesta Tumbao (50%)" />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-widest text-red-400 mb-3 uppercase">Monto Efectivo (S/)</label>
            <input required type="number" step="0.1" className="w-full bg-red-950/10 p-4 rounded-2xl text-red-400 border border-red-900/50 focus:border-red-500 outline-none transition-all font-black text-xl placeholder:text-red-900/30" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: e.target.value as any})} placeholder="0.00" />
          </div>
          
          <div className="md:col-span-2 flex items-end">
            <button type="submit" className="w-full bg-gradient-to-r from-red-600 to-fuchsia-600 hover:from-red-500 hover:to-fuchsia-500 p-4 rounded-2xl font-black text-white transition-all shadow-[0_10px_20px_rgba(220,38,38,0.2)] tracking-widest uppercase hover:-translate-y-1 flex justify-center items-center h-[60px]">
              APLICAR
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[#11051A] rounded-3xl border border-fuchsia-900/20 overflow-hidden shadow-xl">
        <div className="p-6 md:p-8 bg-slate-900/20 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-fuchsia-500/10 rounded-xl text-fuchsia-400"><FileText size={24}/></div>
            <h3 className="font-black text-white uppercase tracking-widest text-base">Libro Mayor de Salidas Diarias</h3>
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">{expenses.length} Registros</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-black/30 text-slate-400 text-[10px] uppercase tracking-[0.2em] border-b border-slate-800">
                <th className="p-6 font-black w-32">Registro</th>
                <th className="p-6 font-black w-48">Departamento</th>
                <th className="p-6 font-black">Justificación Descriptiva</th>
                <th className="p-6 font-black text-right w-48">Desembolso (S/)</th>
                <th className="p-6 font-black text-center w-24">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Receipt size={40} className="mx-auto mb-4 text-slate-600 opacity-50" />
                    <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">Caja Intacta</p>
                    <p className="text-slate-500 text-xs mt-2">No se han reportado salidas de dinero en el turno actual.</p>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-6 text-slate-500 text-xs font-mono font-bold tracking-wider">{new Date(exp.date).toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="p-6">
                      <span className="px-3 py-1.5 bg-slate-900 border border-slate-700/50 rounded-lg text-[10px] font-black text-slate-300 uppercase tracking-[0.1em]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-6 font-bold text-white text-sm">{exp.description}</td>
                    <td className="p-6 text-right font-black text-red-400 text-xl tracking-tight bg-red-950/5 border-l border-slate-800/30">- {exp.amount.toFixed(2)}</td>
                    <td className="p-6 text-center">
                      <button onClick={() => handleDeleteExpense(exp.id)} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Anular Gasto">
                        <Trash2 size={18} />
                      </button>
                    </td>
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
  const renderInventory = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto space-y-8">
      <SectionHeader title="Gestión de Almacén" subtitle="Ingreso de nueva mercadería y monitoreo del estado físico del stock." icon={Package} />
      
      {/* FORMULARIO DE INGRESO (SOLO ADMIN) */}
      {userRole === 'admin' && (
        <div className="bg-[#11051A] p-8 rounded-3xl border border-emerald-500/20 shadow-[0_10px_40px_rgba(16,185,129,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-[80px] pointer-events-none"></div>
          <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-white uppercase tracking-widest relative z-10 border-l-4 border-emerald-500 pl-4">
            Inyectar Empaques al Sistema
          </h3>
          
          <form onSubmit={handleAddStock} className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
            <div className="md:col-span-6">
              <label className="block text-xs font-bold tracking-widest text-slate-400 mb-3 uppercase">Búsqueda de Producto Comercial</label>
              <div className="relative">
                <select required className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-emerald-500 outline-none transition-all appearance-none font-medium" value={stockAdd.productId} onChange={e => setStockAdd({...stockAdd, productId: e.target.value})}>
                  <option value="" disabled>-- Seleccione del Catálogo Oficial --</option>
                  {catalog.map(p => <option key={p.id} value={p.id}>{p.name} (Formato: {p.type} x {p.unitsPerPackage})</option>)}
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-emerald-500/50">▼</div>
              </div>
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-xs font-bold tracking-widest text-emerald-400 mb-3 uppercase">Cantidad (Empaques)</label>
              <input required type="number" min="1" className="w-full bg-emerald-950/10 p-4 rounded-2xl text-emerald-400 border border-emerald-900/50 focus:border-emerald-500 outline-none transition-all font-black text-xl placeholder:text-emerald-900/30" value={stockAdd.packageQty || ''} onChange={e => setStockAdd({...stockAdd, packageQty: e.target.value as any})} placeholder="Ej. 10" />
            </div>
            
            <div className="md:col-span-3 flex items-end">
              <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 p-4 rounded-2xl font-black text-white transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)] tracking-widest uppercase hover:-translate-y-1 flex justify-center items-center h-[60px]">
                Consolidar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLA DE DISPONIBILIDAD (COMPARTIDA) */}
      <div className="bg-[#11051A] rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="p-6 md:p-8 bg-slate-900/20 border-b border-slate-800/80 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><BarChart2 size={24}/></div>
          <div>
            <h3 className="font-black text-white uppercase tracking-widest text-base">Disponibilidad en Vivo</h3>
            <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">Niveles de stock físico actualizados tras cada venta.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-black/30 text-slate-400 text-[10px] uppercase tracking-[0.2em] border-b border-slate-800">
                <th className="p-6 font-black">Mercadería</th>
                <th className="p-6 font-black text-center">Formato Base</th>
                <th className="p-6 font-black text-right border-l border-slate-800/50 text-white">Unidades Físicas</th>
                <th className="p-6 font-black text-right">Equivalente a Cajas</th>
                <th className="p-6 font-black text-center w-32">Semáforo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {catalog.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest">El catálogo no tiene productos</td></tr>
              ) : (
                catalog.map((prod) => {
                  const stock = inventory.find(i => i.id === prod.id)?.stockUnits || 0;
                  const cajasEnteras = Math.floor(stock / prod.unitsPerPackage);
                  const sueltos = stock % prod.unitsPerPackage;
                  
                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-6">
                        <p className="font-bold text-white text-base">{prod.name}</p>
                        <p className="text-xs text-slate-500 mt-1 font-mono">{prod.id}</p>
                      </td>
                      <td className="p-6 text-center">
                        <span className="px-3 py-1 bg-slate-900 border border-slate-700/50 rounded-lg text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {prod.type} <span className="text-[10px] text-slate-500">x{prod.unitsPerPackage}</span>
                        </span>
                      </td>
                      <td className={`p-6 text-right font-black text-3xl border-l border-slate-800/50 ${stock > 20 ? 'text-emerald-400 bg-emerald-950/5' : stock > 0 ? 'text-orange-400 bg-orange-950/5' : 'text-red-500 bg-red-950/5'}`}>
                        {stock}
                      </td>
                      <td className="p-6 text-right font-medium text-sm text-slate-300">
                        {cajasEnteras > 0 && <span className="text-white font-bold">{cajasEnteras} <span className="text-slate-500 text-[10px] uppercase font-black">{prod.type}s</span></span>}
                        {cajasEnteras > 0 && sueltos > 0 && <span className="text-slate-600 mx-2">+</span>}
                        {sueltos > 0 && <span className="text-white font-bold">{sueltos} <span className="text-slate-500 text-[10px] uppercase font-black">u.</span></span>}
                        {stock === 0 && <span className="text-slate-600 font-bold">-</span>}
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center">
                          {stock === 0 ? (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest w-24 justify-center">
                              <AlertCircle size={12}/> VACÍO
                            </span>
                          ) : stock <= 20 ? (
                            <span className="flex items-center justify-center px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest w-24">
                              CRÍTICO
                            </span>
                          ) : (
                            <span className="flex items-center justify-center px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest w-24">
                              NORMAL
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // --- VISTA 5: CONFIGURACIÓN Y CATÁLOGO MAESTRO (SÓLO ADMIN) ---
  const renderConfigurator = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto space-y-8">
      <SectionHeader title="Matriz del Catálogo" subtitle="Cimientos del sistema: Creación, configuración de empaques y fijación de precios." icon={Settings} />
      
      {/* FORMULARIO DE CREACIÓN */}
      <div className="bg-[#11051A] p-8 md:p-10 rounded-3xl border border-fuchsia-900/30 shadow-[0_10px_40px_rgba(217,70,239,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-fuchsia-600/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-white uppercase tracking-widest relative z-10 border-l-4 border-fuchsia-500 pl-4">
          Definir Nueva Ficha de Producto
        </h3>
        
        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
          <div className="md:col-span-4">
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-3 uppercase">Nombre Comercial</label>
            <input required type="text" className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all font-medium placeholder:text-slate-600" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ej. Ron Cartavio Black" />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-3 uppercase">Empaque Base</label>
            <div className="relative">
              <select className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all appearance-none font-bold" value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value})}>
                <option>Caja</option><option>Paquete</option><option>Botella</option><option>Display</option><option>Unidad</option>
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-3 uppercase" title="Cuántas unidades individuales trae el empaque seleccionado.">Unid. Internas <Info size={12} className="inline opacity-50 mb-0.5"/></label>
            <input required type="number" min="1" className="w-full bg-[#07020A] p-4 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all font-black text-center" value={newProduct.unitsPerPackage || ''} onChange={e => setNewProduct({...newProduct, unitsPerPackage: e.target.value as any})} placeholder="12" />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-widest text-slate-400 mb-3 uppercase">Costo Proveedor</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-bold">S/</span>
              <input required type="number" step="0.1" className="w-full bg-[#07020A] p-4 pl-10 rounded-2xl text-white border border-slate-800 focus:border-fuchsia-500 outline-none transition-all font-bold" value={newProduct.cost || ''} onChange={e => setNewProduct({...newProduct, cost: e.target.value as any})} placeholder="0.00" />
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold tracking-widest text-emerald-400 mb-3 uppercase">P. Venta Público</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-500/50 font-black">S/</span>
              <input required type="number" step="0.1" className="w-full bg-emerald-950/10 p-4 pl-10 rounded-2xl text-emerald-400 border border-emerald-900/50 focus:border-emerald-500 outline-none transition-all font-black text-xl placeholder:text-emerald-900/30" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: e.target.value as any})} placeholder="0.00" />
            </div>
          </div>
          
          <div className="md:col-span-12 mt-2">
            <button type="submit" className="w-full bg-gradient-to-r from-fuchsia-700 to-fuchsia-500 hover:from-fuchsia-600 hover:to-fuchsia-400 p-5 rounded-2xl font-black text-white transition-all shadow-[0_10px_30px_rgba(217,70,239,0.2)] tracking-[0.2em] uppercase hover:-translate-y-1">
              GUARDAR PRODUCTO EN EL SISTEMA
            </button>
          </div>
        </form>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-[#11051A] rounded-3xl border border-fuchsia-900/20 overflow-hidden shadow-xl">
        <div className="p-6 md:p-8 bg-slate-900/20 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-fuchsia-500/10 rounded-xl text-fuchsia-400"><Boxes size={24}/></div>
            <h3 className="font-black text-white uppercase tracking-widest text-base">Directorio de Artículos</h3>
          </div>
          <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest bg-fuchsia-950/30 px-3 py-1.5 rounded-lg border border-fuchsia-500/20">{catalog.length} SKUs Activos</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-black/30 text-slate-400 text-[10px] uppercase tracking-[0.2em] border-b border-slate-800">
                <th className="p-6 font-black w-24">SKU / ID</th>
                <th className="p-6 font-black">Identificador Comercial</th>
                <th className="p-6 font-black text-center">Matriz de Empaque</th>
                <th className="p-6 font-black text-right border-l border-slate-800/50">Costo Base</th>
                <th className="p-6 font-black text-right text-emerald-400 bg-emerald-950/10">Precio de Venta</th>
                <th className="p-6 font-black text-center w-24">Adm.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {catalog.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <Settings size={48} className="mx-auto mb-4 text-slate-600 opacity-30" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest">Base de datos en blanco</p>
                    <p className="text-slate-500 text-sm mt-2">Utilice el formulario superior para construir su catálogo.</p>
                  </td>
                </tr>
              ) : (
                catalog.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-6 text-slate-500 text-xs font-mono font-bold tracking-wider">{prod.id}</td>
                    <td className="p-6 font-bold text-white text-base group-hover:text-fuchsia-300 transition-colors">{prod.name}</td>
                    <td className="p-6 text-center">
                      <span className="px-3 py-1.5 bg-slate-900 border border-slate-700/50 rounded-lg text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        {prod.type} <span className="text-slate-500 mx-1">•</span> {prod.unitsPerPackage} u.
                      </span>
                    </td>
                    <td className="p-6 text-right font-medium text-slate-400 border-l border-slate-800/50">S/ {prod.cost.toFixed(2)}</td>
                    <td className="p-6 text-right font-black text-emerald-400 text-xl tracking-tight bg-emerald-950/5">S/ {prod.price.toFixed(2)}</td>
                    <td className="p-6 text-center">
                      <button 
                        onClick={() => handleDeleteProduct(prod.id)} 
                        className="p-2.5 text-slate-600 hover:text-white bg-transparent hover:bg-red-500/80 rounded-xl transition-all border border-transparent hover:border-red-500 shadow-sm opacity-0 group-hover:opacity-100"
                        title="Eliminar producto"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // 6. ESTRUCTURA GLOBAL DE LA APLICACIÓN (LAYOUT MAIN)
  // ============================================================================
  return (
    <div className="h-screen bg-[#07020A] text-white flex overflow-hidden font-sans selection:bg-fuchsia-500/30 selection:text-fuchsia-200">
      
      {/* OVERLAY FONDO OSCURO PARA MENÚ MÓVIL */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* MENÚ LATERAL DE NAVEGACIÓN (SIDEBAR) */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 lg:w-80 bg-[#0B0410] border-r border-fuchsia-900/20 p-6 flex flex-col justify-between h-full transform transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.6)]' : '-translate-x-full'} md:translate-x-0 overflow-y-auto custom-scrollbar`}>
        <div>
          <div className="flex justify-between items-center md:hidden mb-8 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={28} className="text-fuchsia-500" />
              <span className="font-black italic text-xl tracking-widest text-white">EL ENCANTO</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white bg-slate-900/50 p-2 rounded-xl transition-colors border border-slate-800"><X size={20} /></button>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center mb-10 mt-2">
             <div className="p-4 bg-gradient-to-br from-[#11051A] to-[#07020A] rounded-3xl border border-fuchsia-500/20 shadow-[0_0_30px_rgba(217,70,239,0.1)] mb-4">
               <ShieldCheck size={48} className="text-fuchsia-500" />
             </div>
             <h1 className="font-black italic text-2xl lg:text-3xl tracking-widest text-white drop-shadow-md text-center">EL ENCANTO</h1>
          </div>
          
          <div className={`mb-10 flex flex-col items-center justify-center py-4 rounded-2xl border border-dashed relative overflow-hidden ${userRole === 'admin' ? 'bg-fuchsia-950/20 border-fuchsia-500/30' : 'bg-cyan-950/20 border-cyan-500/30'}`}>
            <div className={`absolute top-0 left-0 w-full h-1 ${userRole === 'admin' ? 'bg-fuchsia-500' : 'bg-cyan-500'}`}></div>
            <span className="text-[9px] text-slate-500 font-black tracking-[0.3em] uppercase mb-1.5">Nivel Autorizado</span>
            <span className={`text-sm font-black uppercase tracking-[0.2em] ${userRole === 'admin' ? 'text-fuchsia-400' : 'text-cyan-400'}`}>
              MODO {userRole}
            </span>
          </div>
          
          <nav className="space-y-3">
            <div className="text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase mb-4 ml-2 mt-8">Operaciones Principales</div>
            
            <button onClick={() => {setActiveTab('panel'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-xs lg:text-sm tracking-wider ${activeTab === 'panel' ? 'bg-gradient-to-r from-fuchsia-700 to-fuchsia-600 text-white shadow-[0_5px_20px_rgba(217,70,239,0.3)]' : 'text-slate-400 hover:bg-[#13071E] hover:text-white border border-transparent hover:border-slate-800'}`}>
              <LayoutDashboard size={20} className={activeTab === 'panel' ? 'text-white' : 'text-slate-500'} /> DASHBOARD / PANEL
            </button>
            
            <button onClick={() => {setActiveTab('barra'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-xs lg:text-sm tracking-wider ${activeTab === 'barra' ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-[0_5px_20px_rgba(34,211,238,0.3)]' : 'text-slate-400 hover:bg-[#13071E] hover:text-white border border-transparent hover:border-slate-800'}`}>
              <Beer size={20} className={activeTab === 'barra' ? 'text-white' : 'text-slate-500'} /> TERMINAL CAJA (POS)
            </button>
            
            <div className="text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase mb-4 ml-2 pt-6">Administración</div>

            {userRole === 'admin' ? (
              <>
                <button onClick={() => {setActiveTab('gastos'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-xs lg:text-sm tracking-wider ${activeTab === 'gastos' ? 'bg-slate-800 text-white border border-slate-600 shadow-lg' : 'text-slate-400 hover:bg-[#13071E] hover:text-white border border-transparent hover:border-slate-800'}`}>
                  <Receipt size={20} className={activeTab === 'gastos' ? 'text-white' : 'text-slate-500'} /> CONTROL DE GASTOS
                </button>
                <button onClick={() => {setActiveTab('productos'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-xs lg:text-sm tracking-wider ${activeTab === 'productos' ? 'bg-slate-800 text-white border border-slate-600 shadow-lg' : 'text-slate-400 hover:bg-[#13071E] hover:text-white border border-transparent hover:border-slate-800'}`}>
                  <Package size={20} className={activeTab === 'productos' ? 'text-white' : 'text-slate-500'} /> ALMACÉN / STOCK
                </button>
                <button onClick={() => {setActiveTab('configurar'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-xs lg:text-sm tracking-wider ${activeTab === 'configurar' ? 'bg-slate-800 text-white border border-slate-600 shadow-lg' : 'text-slate-400 hover:bg-[#13071E] hover:text-white border border-transparent hover:border-slate-800'}`}>
                  <Settings size={20} className={activeTab === 'configurar' ? 'text-white' : 'text-slate-500'} /> MATRIZ CATÁLOGO
                </button>
              </>
            ) : (
              <button onClick={() => {setActiveTab('productos'); setIsMobileMenuOpen(false);}} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-bold text-xs lg:text-sm tracking-wider ${activeTab === 'productos' ? 'bg-slate-800 text-white border border-slate-600 shadow-lg' : 'text-slate-400 hover:bg-[#13071E] hover:text-white border border-transparent hover:border-slate-800'}`}>
                <Package size={20} className={activeTab === 'productos' ? 'text-white' : 'text-slate-500'} /> CONSULTAR STOCK
              </button>
            )}
          </nav>
        </div>
        
        <div className="pt-8 mt-auto">
          <button onClick={handleLogout} className="flex items-center justify-center gap-3 w-full text-red-400 hover:text-white text-xs lg:text-sm font-black p-5 hover:bg-red-600 rounded-2xl transition-all border border-red-900/50 bg-red-950/20 hover:shadow-[0_10px_20px_rgba(220,38,38,0.3)] tracking-widest uppercase">
            <LogOut size={18} /> CERRAR TURNO
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO FLUIDA Y PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#07020A] relative">
        {/* Luces de fondo ambientales */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-fuchsia-900/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-radial from-cyan-900/10 via-transparent to-transparent opacity-30 pointer-events-none"></div>
        
        {/* HEADER PARA CELULARES (HAMBURGUESA) */}
        <header className="md:hidden flex items-center justify-between p-5 border-b border-slate-800/80 bg-[#07020A]/90 backdrop-blur-xl sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} className="text-fuchsia-500" />
            <h1 className="font-black italic text-xl tracking-widest text-white drop-shadow-md">EL ENCANTO</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-slate-900 rounded-xl text-slate-300 hover:text-white transition-colors border border-slate-700 shadow-inner">
            <Menu size={24} />
          </button>
        </header>

        {/* ESPACIO DE TRABAJO (RENDER DE VISTAS) */}
        <main className="flex-1 p-5 md:p-8 lg:p-12 overflow-y-auto scroll-smooth relative z-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'panel' && renderDashboard()}
            {activeTab === 'barra' && renderPointOfSale()}
            {activeTab === 'gastos' && userRole === 'admin' && renderExpenses()}
            {activeTab === 'productos' && renderInventory()}
            {activeTab === 'configurar' && userRole === 'admin' && renderConfigurator()}
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #07020A; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
}
