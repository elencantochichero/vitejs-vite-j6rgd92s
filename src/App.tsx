import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Receipt,
  ClipboardList,
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  Settings,
  BarChart3,
  Wine,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  deleteDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';

// CONFIGURACIÓN REAL DE FIREBASE (El Encanto Chichero)
const firebaseConfig = {
  apiKey: 'AIzaSyCUKgsGqEczaaTyrMp_3AyLFyndV4AVRxc',
  authDomain: 'el-encanto-chichero.firebaseapp.com',
  projectId: 'el-encanto-chichero',
  storageBucket: 'el-encanto-chichero.firebasestorage.app',
  messagingSenderId: '260505767576',
  appId: '1:260505767576:web:eaf4635cde1d3cded58aed',
  measurementId: 'G-Z0B4GZKZMH',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  // ==========================================
  // ESTADOS DE SEGURIDAD Y LOGIN
  // ==========================================
  const [user, setUser] = useState<{ role: 'admin' | 'staff' } | null>(null);
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'admin' | 'staff' | null>(null);

  // ==========================================
  // ESTADOS DEL SISTEMA
  // ==========================================
  const [activeTab, setActiveTab] = useState('dashboard');
  const [productos, setProductos] = useState<any[]>([]);
  const [estructura, setEstructura] = useState<any>({});
  const [cuadres, setCuadres] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);

  // ==========================================
  // CARGA DE DATOS DESDE FIRESTORE EN TIEMPO REAL
  // ==========================================
  useEffect(() => {
    const unsubCuadres = onSnapshot(collection(db, 'cuadres'), (snapshot) => {
      setCuadres(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubGastos = onSnapshot(collection(db, 'gastos'), (snapshot) => {
      setGastos(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProductos = onSnapshot(
      collection(db, 'productos'),
      (snapshot) => {
        if (!snapshot.empty)
          setProductos(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          );
      }
    );

    const unsubEstructura = onSnapshot(
      collection(db, 'estructura_gastos'),
      (snapshot) => {
        if (!snapshot.empty) setEstructura(snapshot.docs[0].data());
      }
    );

    return () => {
      unsubCuadres();
      unsubGastos();
      unsubProductos();
      unsubEstructura();
    };
  }, []);

  // Lógica de Login
  const handleLogin = () => {
    if (loginRole === 'admin' && password === '1admin') {
      setUser({ role: 'admin' });
      setActiveTab('dashboard');
    } else if (loginRole === 'staff' && password === 'personal') {
      setUser({ role: 'staff' });
      setActiveTab('dashboard');
    } else {
      alert('Contraseña incorrecta, inténtalo nuevamente.');
    }
  };

  // Utilidades
  const formatSoles = (m: number) =>
    `S/ ${parseFloat((m as any) || 0).toFixed(2)}`;
  const fechasDisponibles = useMemo(() => {
    const fechas = [
      ...new Set([
        ...cuadres.map((c) => c.fecha),
        ...gastos.map((g) => g.fecha),
      ]),
    ]
      .sort()
      .reverse();
    return fechas.length > 0
      ? fechas
      : [new Date().toISOString().split('T')[0]];
  }, [cuadres, gastos]);

  const [fechaFiltro, setFechaFiltro] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (
      fechasDisponibles.length > 0 &&
      !fechasDisponibles.includes(fechaFiltro)
    )
      setFechaFiltro(fechasDisponibles[0]);
  }, [fechasDisponibles]);

  // Filtros del Dashboard
  const [filtroProdIngreso, setFiltroProdIngreso] = useState('TODOS');
  const [filtroProveedor, setFiltroProveedor] = useState('TODOS');
  const [filtroGasto, setFiltroGasto] = useState('TODOS');

  // ==========================================
  // MOTOR FINANCIERO: CÁLCULOS AL MILÍMETRO
  // ==========================================
  const analisis = useMemo(() => {
    const cuadresDia = cuadres.filter((c) => c.fecha === fechaFiltro);
    const gastosDia = gastos.filter((g) => g.fecha === fechaFiltro);

    let ingresosBarra = 0;
    let costoReposicion = 0;
    let costoCortesias = 0;
    let ventasPorProducto: any = {};
    let ingresosPorProductoID: any = {};
    let deudaPorProveedor: any = {};

    cuadresDia.forEach((c) => {
      const p = productos.find((x) => x.id === c.productoId);
      if (!p) return;

      const totInicio =
        Number(c.cajasInicio || 0) * p.factor + Number(c.unidInicio || 0);
      const totAdd =
        Number(c.cajasAdd || 0) * p.factor + Number(c.unidAdd || 0);
      const totFin =
        Number(c.cajasFin || 0) * p.factor + Number(c.unidFin || 0);

      const udsConsumidas = totInicio + totAdd - totFin;
      const vNeta = udsConsumidas - Number(c.cortesias || 0);

      const ingresoProducto = vNeta * p.precio;
      const costoUnidad = p.costo / p.factor;
      const deudaProducto = (udsConsumidas / p.factor) * p.costo;

      ingresosBarra += ingresoProducto;
      costoReposicion += deudaProducto;
      costoCortesias += Number(c.cortesias || 0) * costoUnidad;

      ventasPorProducto[p.nombre] = (ventasPorProducto[p.nombre] || 0) + vNeta;
      ingresosPorProductoID[p.id] =
        (ingresosPorProductoID[p.id] || 0) + ingresoProducto;
      deudaPorProveedor[p.proveedor] =
        (deudaPorProveedor[p.proveedor] || 0) + deudaProducto;
    });

    const totalGastos = gastosDia.reduce(
      (sum, g) => sum + Number(g.monto || 0),
      0
    );
    const desgloseGastos = gastosDia.reduce((acc: any, g) => {
      acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.monto || 0);
      return acc;
    }, {});
    const utilidadNeta = ingresosBarra - costoReposicion - totalGastos;

    const estadoStock = productos.map((p) => {
      const cuadresDeEsteProd = [...cuadres]
        .filter((c) => c.productoId === p.id)
        .sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
      const stockCajas =
        cuadresDeEsteProd.length > 0 ? cuadresDeEsteProd[0].cajasFin : 0;
      return { ...p, stockCajas, alerta: stockCajas <= p.stockMin };
    });

    const topVentas = Object.entries(ventasPorProducto).sort(
      (a: any, b: any) => b[1] - a[1]
    );
    const proveedoresUnicos = [...new Set(productos.map((p) => p.proveedor))];
    const tiposGastosUnicos = [...new Set(gastosDia.map((g) => g.tipo))];
    const categoriasGastosUnicas = [
      ...new Set(gastosDia.map((g) => g.categoria)),
    ];

    return {
      ingresosBarra,
      costoReposicion,
      costoCortesias,
      totalGastos,
      utilidadNeta,
      desgloseGastos,
      topVentas,
      estadoStock,
      ingresosPorProductoID,
      deudaPorProveedor,
      proveedoresUnicos,
      tiposGastosUnicos,
      categoriasGastosUnicas,
      gastosDia,
    };
  }, [cuadres, gastos, productos, fechaFiltro]);

  const ingresoMostrado =
    filtroProdIngreso === 'TODOS'
      ? analisis.ingresosBarra
      : analisis.ingresosPorProductoID[filtroProdIngreso] || 0;
  const deudaMostrada =
    filtroProveedor === 'TODOS'
      ? analisis.costoReposicion
      : analisis.deudaPorProveedor[filtroProveedor] || 0;
  const gastosMostrados =
    filtroGasto === 'TODOS'
      ? analisis.totalGastos
      : analisis.gastosDia
          .filter(
            (g) =>
              `TIPO:${g.tipo}` === filtroGasto ||
              `CAT:${g.categoria}` === filtroGasto
          )
          .reduce((sum, g) => sum + Number(g.monto || 0), 0);

  // ==========================================
  // ESTADOS DE FORMULARIOS
  // ==========================================
  const [gastoTipo, setGastoTipo] = useState('Gastos Directos');
  const [gastoCat, setGastoCat] = useState('Artistas');
  const [gastoDesc, setGastoDesc] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');

  const [cDate, setCDate] = useState(new Date().toISOString().split('T')[0]);
  const [cProd, setCProd] = useState('');
  const [cInC, setCInC] = useState('');
  const [cInU, setCInU] = useState('');
  const [cAdC, setCAdC] = useState('');
  const [cAdU, setCAdU] = useState('');
  const [cFiC, setCFiC] = useState('');
  const [cFiU, setCFiU] = useState('');
  const [cCort, setCCort] = useState('');

  // ==========================================
  // FUNCIONES DE GUARDADO (FIREBASE)
  // ==========================================
  const registrarGasto = async () => {
    if (!gastoMonto || parseFloat(gastoMonto) <= 0)
      return alert('Monto inválido');
    try {
      await addDoc(collection(db, 'gastos'), {
        fecha: cDate,
        tipo: gastoTipo,
        categoria: gastoCat,
        descripcion: gastoDesc || 'Sin descripción',
        monto: parseFloat(gastoMonto),
      });
      setGastoDesc('');
      setGastoMonto('');
      alert('Gasto registrado en la nube.');
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const registrarCuadre = async () => {
    if (!cProd) return alert('Selecciona producto');
    try {
      await addDoc(collection(db, 'cuadres'), {
        fecha: cDate,
        productoId: cProd,
        cajasInicio: parseInt(cInC || '0'),
        unidInicio: parseInt(cInU || '0'),
        cajasAdd: parseInt(cAdC || '0'),
        unidAdd: parseInt(cAdU || '0'),
        cajasFin: parseInt(cFiC || '0'),
        unidFin: parseInt(cFiU || '0'),
        cortesias: parseInt(cCort || '0'),
      });
      setCProd('');
      setCInC('');
      setCInU('');
      setCAdC('');
      setCAdU('');
      setCFiC('');
      setCFiU('');
      setCCort('');
      alert('Cuadre guardado en la base de datos.');
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const eliminarReg = async (col: string, id: string) => {
    if (confirm('¿Eliminar permanentemente?'))
      await deleteDoc(doc(db, col, id));
  };

  // ==========================================
  // RENDER 1: PANTALLA DE LOGIN
  // ==========================================
  if (!user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#080310',
          padding: '20px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            backgroundColor: '#120721',
            padding: '40px',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '400px',
            border: '1px solid rgba(255,0,255,0.3)',
            boxShadow: '0 0 40px rgba(255,0,255,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
              color: '#ff00ff',
            }}
          >
            <ShieldCheck size={72} />
          </div>
          <h2
            style={{
              color: '#fff',
              textAlign: 'center',
              marginBottom: '30px',
              fontWeight: '900',
              fontStyle: 'italic',
              letterSpacing: '1px',
            }}
          >
            EL ENCANTO CHICHERO
          </h2>

          {!loginRole ? (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
            >
              <button
                onClick={() => setLoginRole('admin')}
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: '#ff00ff',
                  color: '#000',
                  borderRadius: '12px',
                  fontWeight: '900',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                Administrador
              </button>
              <button
                onClick={() => setLoginRole('staff')}
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: '#00ffff',
                  color: '#000',
                  borderRadius: '12px',
                  fontWeight: '900',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                Staff / Barra
              </button>
            </div>
          ) : (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
            >
              <p
                style={{
                  color: loginRole === 'admin' ? '#ff00ff' : '#00ffff',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                Acceso {loginRole}
              </p>
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: '#000',
                  color: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #333',
                  textAlign: 'center',
                  outline: 'none',
                }}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button
                onClick={handleLogin}
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: '#10b981',
                  color: '#000',
                  borderRadius: '12px',
                  fontWeight: '900',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                INGRESAR
              </button>
              <button
                onClick={() => {
                  setLoginRole(null);
                  setPassword('');
                }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  marginTop: '10px',
                }}
              >
                Volver atrás
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: SISTEMA PRINCIPAL PROTEGIDO
  // ==========================================
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#080310',
        color: '#f3f4f6',
        display: 'flex',
        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
        fontFamily: 'sans-serif',
      }}
    >
      {/* SIDEBAR CON RESTRICCIONES DE ROL */}
      <aside
        style={{
          width: window.innerWidth < 768 ? '100%' : '280px',
          backgroundColor: '#120721',
          borderRight: '1px solid rgba(255,0,255,0.2)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: '900',
              fontStyle: 'italic',
              color: '#fff',
              textTransform: 'uppercase',
              marginBottom: '5px',
            }}
          >
            El Encanto
          </h1>
          <span
            style={{
              fontSize: '10px',
              color: user.role === 'admin' ? '#ff00ff' : '#00ffff',
              letterSpacing: '2px',
              padding: '4px 10px',
              backgroundColor:
                user.role === 'admin'
                  ? 'rgba(255,0,255,0.1)'
                  : 'rgba(0,255,255,0.1)',
              borderRadius: '20px',
              border:
                user.role === 'admin'
                  ? '1px solid rgba(255,0,255,0.2)'
                  : '1px solid rgba(0,255,255,0.2)',
            }}
          >
            ROL: {user.role.toUpperCase()}
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 20px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              cursor: 'pointer',
              backgroundColor:
                activeTab === 'dashboard' ? '#ff00ff' : 'transparent',
              color: activeTab === 'dashboard' ? '#000' : '#9ca3af',
            }}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('cuadre')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 20px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              cursor: 'pointer',
              backgroundColor:
                activeTab === 'cuadre' ? '#ff00ff' : 'transparent',
              color: activeTab === 'cuadre' ? '#000' : '#9ca3af',
            }}
          >
            <ClipboardList size={18} /> Control Barra
          </button>

          {/* BOTONES EXCLUSIVOS DEL ADMINISTRADOR */}
          {user.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('gastos')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  backgroundColor:
                    activeTab === 'gastos' ? '#ff00ff' : 'transparent',
                  color: activeTab === 'gastos' ? '#000' : '#9ca3af',
                }}
              >
                <Receipt size={18} /> Gastos & Staff
              </button>
              <button
                onClick={() => setActiveTab('productos')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  backgroundColor:
                    activeTab === 'productos' ? '#ff00ff' : 'transparent',
                  color: activeTab === 'productos' ? '#000' : '#9ca3af',
                }}
              >
                <Package size={18} /> Productos
              </button>
              <button
                onClick={() => setActiveTab('config')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  backgroundColor:
                    activeTab === 'config' ? '#ff00ff' : 'transparent',
                  color: activeTab === 'config' ? '#000' : '#9ca3af',
                }}
              >
                <Settings size={18} /> Configurar
              </button>
            </>
          )}
        </nav>

        <button
          onClick={() => {
            setUser(null);
            setPassword('');
            setLoginRole(null);
          }}
          style={{
            marginTop: 'auto',
            background: 'none',
            border: 'none',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            fontWeight: 'bold',
            padding: '10px',
          }}
        >
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#150a25',
                padding: '24px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: '900',
                    fontStyle: 'italic',
                    margin: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  Cierre <span style={{ color: '#00ffff' }}>Financiero</span>
                </h2>
              </div>
              <div>
                <span
                  style={{
                    color: '#ff00ff',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    marginRight: '10px',
                  }}
                >
                  FECHA:
                </span>
                <select
                  style={{
                    backgroundColor: '#000',
                    border: '2px solid rgba(255,0,255,0.3)',
                    color: '#fff',
                    padding: '10px',
                    borderRadius: '10px',
                    outline: 'none',
                  }}
                  value={fechaFiltro}
                  onChange={(e) => {
                    setFechaFiltro(e.target.value);
                    setFiltroProdIngreso('TODOS');
                    setFiltroProveedor('TODOS');
                    setFiltroGasto('TODOS');
                  }}
                >
                  {fechasDisponibles.map((f: any) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tarjetas KPI */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
              }}
            >
              {/* TARJETA INGRESOS - VISIBLE PARA ADMIN Y STAFF */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0a1a2f, #040a14)',
                  padding: '24px',
                  borderRadius: '24px',
                  border: '1px solid rgba(0,255,255,0.3)',
                }}
              >
                <p
                  style={{
                    color: '#00ffff',
                    fontSize: '10px',
                    fontWeight: '900',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                  }}
                >
                  Ingresos de Barra
                </p>
                <select
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(0,255,255,0.2)',
                    color: '#fff',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    marginBottom: '15px',
                  }}
                  value={filtroProdIngreso}
                  onChange={(e) => setFiltroProdIngreso(e.target.value)}
                >
                  <option value="TODOS">Todos</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '32px', fontWeight: '900', margin: 0 }}>
                  {formatSoles(ingresoMostrado)}
                </p>
              </div>

              {/* TARJETAS RESTANTES - SOLO VISIBLES PARA ADMIN */}
              {user.role === 'admin' && (
                <>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #2f0a0a, #140404)',
                      padding: '24px',
                      borderRadius: '24px',
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}
                  >
                    <p
                      style={{
                        color: '#f87171',
                        fontSize: '10px',
                        fontWeight: '900',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        marginBottom: '10px',
                      }}
                    >
                      Costo Reposición
                    </p>
                    <select
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: '#fff',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        marginBottom: '15px',
                      }}
                      value={filtroProveedor}
                      onChange={(e) => setFiltroProveedor(e.target.value)}
                    >
                      <option value="TODOS">Todos</option>
                      {analisis.proveedoresUnicos.map((prov: any) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                    <p
                      style={{ fontSize: '32px', fontWeight: '900', margin: 0 }}
                    >
                      {formatSoles(deudaMostrada)}
                    </p>
                  </div>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #2f1a0a, #140a04)',
                      padding: '24px',
                      borderRadius: '24px',
                      border: '1px solid rgba(249,115,22,0.3)',
                    }}
                  >
                    <p
                      style={{
                        color: '#fb923c',
                        fontSize: '10px',
                        fontWeight: '900',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        marginBottom: '10px',
                      }}
                    >
                      Gastos Evento & Staff
                    </p>
                    <select
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(249,115,22,0.2)',
                        color: '#fff',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        marginBottom: '15px',
                      }}
                      value={filtroGasto}
                      onChange={(e) => setFiltroGasto(e.target.value)}
                    >
                      <option value="TODOS">Todos</option>
                      <optgroup label="Clasificación">
                        {analisis.tiposGastosUnicos.map((t: any) => (
                          <option key={`TIPO:${t}`} value={`TIPO:${t}`}>
                            {t}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Categoría">
                        {analisis.categoriasGastosUnicas.map((c: any) => (
                          <option key={`CAT:${c}`} value={`CAT:${c}`}>
                            {c}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <p
                      style={{ fontSize: '32px', fontWeight: '900', margin: 0 }}
                    >
                      {formatSoles(gastosMostrados)}
                    </p>
                  </div>
                  <div
                    style={{
                      background:
                        analisis.utilidadNeta >= 0
                          ? 'linear-gradient(135deg, #0a2f15, #041408)'
                          : 'linear-gradient(135deg, #2f0a0a, #140404)',
                      padding: '24px',
                      borderRadius: '24px',
                      border:
                        analisis.utilidadNeta >= 0
                          ? '1px solid rgba(16,185,129,0.5)'
                          : '1px solid rgba(239,68,68,0.5)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <p
                      style={{
                        color:
                          analisis.utilidadNeta >= 0 ? '#34d399' : '#f87171',
                        fontSize: '10px',
                        fontWeight: '900',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Utilidad Real Neta
                    </p>
                    <div style={{ marginTop: '20px' }}>
                      <p
                        style={{
                          fontSize: '36px',
                          fontWeight: '900',
                          margin: 0,
                        }}
                      >
                        {formatSoles(analisis.utilidadNeta)}
                      </p>
                      <p
                        style={{
                          fontSize: '10px',
                          color: '#9ca3af',
                          margin: '5px 0 0 0',
                        }}
                      >
                        Cálculo total global
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Gráficos de Datos (Visibles para AMBOS) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#150a25',
                  padding: '24px',
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    color: '#ff00ff',
                    textTransform: 'uppercase',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '15px',
                  }}
                >
                  <AlertTriangle size={18} /> Status de Stock
                </h3>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {analisis.estadoStock.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        backgroundColor: p.alerta
                          ? 'rgba(239,68,68,0.1)'
                          : 'rgba(0,0,0,0.4)',
                        borderColor: p.alerta
                          ? 'rgba(239,68,68,0.3)'
                          : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: p.alerta ? '#f87171' : '#d1d5db',
                          }}
                        >
                          {p.nombre}
                        </span>
                        {p.alerta && (
                          <div
                            style={{
                              fontSize: '9px',
                              color: '#ef4444',
                              fontWeight: '900',
                              textTransform: 'uppercase',
                            }}
                          >
                            Reabastecer
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontWeight: '900',
                          color: p.alerta ? '#f87171' : '#fff',
                        }}
                      >
                        {p.stockCajas}{' '}
                        <small
                          style={{ fontWeight: 'normal', fontSize: '10px' }}
                        >
                          cj
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#150a25',
                  padding: '24px',
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    color: '#00ffff',
                    textTransform: 'uppercase',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '15px',
                  }}
                >
                  <BarChart3 size={18} /> Top Productos
                </h3>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {analisis.topVentas.length > 0 ? (
                    analisis.topVentas.map(([nombre, cant]: any, i) => (
                      <div
                        key={nombre}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '12px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                          <span
                            style={{ color: '#6b7280', marginRight: '5px' }}
                          >
                            #{i + 1}
                          </span>{' '}
                          {nombre}
                        </span>
                        <span style={{ color: '#00ffff', fontWeight: '900' }}>
                          {cant}{' '}
                          <small style={{ fontSize: '9px', color: '#6b7280' }}>
                            u
                          </small>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p
                      style={{
                        color: '#6b7280',
                        fontSize: '12px',
                        textAlign: 'center',
                      }}
                    >
                      Sin ventas registradas.
                    </p>
                  )}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#150a25',
                  padding: '24px',
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    color: '#fb923c',
                    textTransform: 'uppercase',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '15px',
                  }}
                >
                  <Wine size={18} /> Fugas y Cortesías
                </h3>
                <div
                  style={{
                    backgroundColor: 'rgba(249,115,22,0.1)',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid rgba(249,115,22,0.2)',
                    marginBottom: '15px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '10px',
                      color: 'rgba(249,115,22,0.8)',
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      margin: '0 0 5px 0',
                    }}
                  >
                    Costo Pérdida en Cortesías
                  </p>
                  <p
                    style={{
                      fontSize: '28px',
                      color: '#fb923c',
                      fontWeight: '900',
                      margin: 0,
                    }}
                  >
                    {formatSoles(analisis.costoCortesias)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTROL DE BARRA (Visible para AMBOS) */}
        {activeTab === 'cuadre' && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: '900',
                fontStyle: 'italic',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Control de <span style={{ color: '#00ffff' }}>Barra</span>
            </h2>
            <div
              style={{
                backgroundColor: '#150a25',
                padding: '24px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                }}
              >
                <div style={{ gridColumn: '1 / -1' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#ff00ff',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    Fecha y Producto
                  </label>
                  <div
                    style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
                  >
                    <input
                      type="date"
                      style={{
                        flex: 1,
                        minWidth: '150px',
                        backgroundColor: '#000',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        outline: 'none',
                      }}
                      value={cDate}
                      onChange={(e) => setCDate(e.target.value)}
                    />
                    <select
                      style={{
                        flex: 2,
                        minWidth: '200px',
                        backgroundColor: '#000',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        outline: 'none',
                      }}
                      value={cProd}
                      onChange={(e) => setCProd(e.target.value)}
                    >
                      <option value="">Seleccionar Producto...</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} (x{p.factor})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(0,255,255,0.05)',
                    padding: '15px',
                    borderRadius: '15px',
                    border: '1px solid rgba(0,255,255,0.2)',
                  }}
                >
                  <p
                    style={{
                      color: '#00ffff',
                      fontSize: '10px',
                      fontWeight: '900',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      marginBottom: '10px',
                    }}
                  >
                    1. Apertura
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="number"
                      placeholder="Cj"
                      style={{
                        width: '50%',
                        backgroundColor: '#000',
                        textAlign: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                      }}
                      value={cInC}
                      onChange={(e) => setCInC(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Ud"
                      style={{
                        width: '50%',
                        backgroundColor: '#000',
                        textAlign: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                      }}
                      value={cInU}
                      onChange={(e) => setCInU(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(249,115,22,0.05)',
                    padding: '15px',
                    borderRadius: '15px',
                    border: '1px solid rgba(249,115,22,0.2)',
                  }}
                >
                  <p
                    style={{
                      color: '#fb923c',
                      fontSize: '10px',
                      fontWeight: '900',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      marginBottom: '10px',
                    }}
                  >
                    2. Extrañado
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="number"
                      placeholder="Cj"
                      style={{
                        width: '50%',
                        backgroundColor: '#000',
                        textAlign: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                      }}
                      value={cAdC}
                      onChange={(e) => setCAdC(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Ud"
                      style={{
                        width: '50%',
                        backgroundColor: '#000',
                        textAlign: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                      }}
                      value={cAdU}
                      onChange={(e) => setCAdU(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(16,185,129,0.05)',
                    padding: '15px',
                    borderRadius: '15px',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  <p
                    style={{
                      color: '#34d399',
                      fontSize: '10px',
                      fontWeight: '900',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      marginBottom: '10px',
                    }}
                  >
                    3. Cierre
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="number"
                      placeholder="Cj"
                      style={{
                        width: '50%',
                        backgroundColor: '#000',
                        textAlign: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                      }}
                      value={cFiC}
                      onChange={(e) => setCFiC(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Ud"
                      style={{
                        width: '50%',
                        backgroundColor: '#000',
                        textAlign: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                      }}
                      value={cFiU}
                      onChange={(e) => setCFiU(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: '#f87171',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      Cortesías (Unds)
                    </label>
                    <input
                      type="number"
                      placeholder="Regaladas"
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#fff',
                        outline: 'none',
                      }}
                      value={cCort}
                      onChange={(e) => setCCort(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={registrarCuadre}
                    style={{
                      flex: 2,
                      minWidth: '200px',
                      backgroundColor: '#00ffff',
                      color: '#000',
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      marginTop: '22px',
                    }}
                  >
                    GUARDAR REGISTRO
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                overflowX: 'auto',
                backgroundColor: '#150a25',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <table
                style={{
                  width: '100%',
                  textAlign: 'left',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                }}
              >
                <thead
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#ff00ff',
                    textTransform: 'uppercase',
                  }}
                >
                  <tr>
                    <th style={{ padding: '16px' }}>Fecha</th>
                    <th style={{ padding: '16px' }}>Producto</th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>
                      Ini
                    </th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>
                      Add
                    </th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>
                      Fin
                    </th>
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#f87171',
                      }}
                    >
                      Mermas
                    </th>
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#34d399',
                      }}
                    >
                      Venta Real
                    </th>
                    {user.role === 'admin' && (
                      <th style={{ padding: '16px', textAlign: 'right' }}>
                        Efectivo Caja
                      </th>
                    )}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cuadres
                    .slice()
                    .reverse()
                    .map((c) => {
                      const p = productos.find((x) => x.id === c.productoId);
                      if (!p) return null;
                      const totIni =
                        Number(c.cajasInicio || 0) * p.factor +
                        Number(c.unidInicio || 0);
                      const totAdd =
                        Number(c.cajasAdd || 0) * p.factor +
                        Number(c.unidAdd || 0);
                      const totFin =
                        Number(c.cajasFin || 0) * p.factor +
                        Number(c.unidFin || 0);
                      const vReal =
                        totIni + totAdd - totFin - Number(c.cortesias || 0);
                      return (
                        <tr
                          key={c.id}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <td style={{ padding: '16px', color: '#9ca3af' }}>
                            {c.fecha}
                          </td>
                          <td style={{ padding: '16px', fontWeight: 'bold' }}>
                            {p.nombre}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            {totIni}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            {totAdd}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            {totFin}
                          </td>
                          <td
                            style={{
                              padding: '16px',
                              textAlign: 'center',
                              color: '#f87171',
                              fontWeight: 'bold',
                            }}
                          >
                            {c.cortesias || 0}
                          </td>
                          <td
                            style={{
                              padding: '16px',
                              textAlign: 'center',
                              color: '#34d399',
                              fontWeight: 'bold',
                            }}
                          >
                            {vReal}
                          </td>
                          {user.role === 'admin' && (
                            <td
                              style={{
                                padding: '16px',
                                textAlign: 'right',
                                color: '#00ffff',
                                fontWeight: '900',
                              }}
                            >
                              {formatSoles(vReal * p.precio)}
                            </td>
                          )}
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <button
                              onClick={() => eliminarReg('cuadres', c.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB GASTOS (SOLO ADMIN) */}
        {user.role === 'admin' && activeTab === 'gastos' && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: '900',
                fontStyle: 'italic',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Gastos y <span style={{ color: '#ff00ff' }}>Staff</span>
            </h2>
            <div
              style={{
                backgroundColor: '#150a25',
                padding: '24px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#9ca3af',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    Clasificación
                  </label>
                  <select
                    style={{
                      width: '100%',
                      backgroundColor: '#000',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      outline: 'none',
                    }}
                    value={gastoTipo}
                    onChange={(e) => {
                      setGastoTipo(e.target.value);
                      setGastoCat(estructura[e.target.value]?.[0] || '');
                    }}
                  >
                    {Object.keys(estructura).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#9ca3af',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    Categoría
                  </label>
                  <select
                    style={{
                      width: '100%',
                      backgroundColor: '#000',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      outline: 'none',
                    }}
                    value={gastoCat}
                    onChange={(e) => setGastoCat(e.target.value)}
                  >
                    {(estructura[gastoTipo] || []).map((c: any) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#9ca3af',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    Detalle de Pago
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pago orquesta"
                    style={{
                      width: '100%',
                      backgroundColor: '#000',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      outline: 'none',
                    }}
                    value={gastoDesc}
                    onChange={(e) => setGastoDesc(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#00ffff',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    Monto (S/)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      backgroundColor: '#000',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(0,255,255,0.3)',
                      color: '#fff',
                      outline: 'none',
                    }}
                    value={gastoMonto}
                    onChange={(e) => setGastoMonto(e.target.value)}
                  />
                </div>
                <button
                  onClick={registrarGasto}
                  style={{
                    flex: 'none',
                    backgroundColor: '#ff00ff',
                    color: '#000',
                    borderRadius: '10px',
                    border: 'none',
                    padding: '0 24px',
                    cursor: 'pointer',
                    marginTop: '22px',
                  }}
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div
              style={{
                overflowX: 'auto',
                backgroundColor: '#150a25',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <table
                style={{
                  width: '100%',
                  textAlign: 'left',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                }}
              >
                <thead
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#fb923c',
                    textTransform: 'uppercase',
                  }}
                >
                  <tr>
                    <th style={{ padding: '16px' }}>Fecha</th>
                    <th style={{ padding: '16px' }}>Categoría</th>
                    <th style={{ padding: '16px' }}>Descripción</th>
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'right',
                        color: '#f87171',
                      }}
                    >
                      Egreso (S/)
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {gastos
                    .slice()
                    .reverse()
                    .map((g) => (
                      <tr
                        key={g.id}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <td style={{ padding: '16px', color: '#9ca3af' }}>
                          {g.fecha}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 'bold' }}>
                          {g.categoria}
                        </td>
                        <td style={{ padding: '16px' }}>{g.descripcion}</td>
                        <td
                          style={{
                            padding: '16px',
                            textAlign: 'right',
                            color: '#f87171',
                            fontWeight: '900',
                          }}
                        >
                          -{formatSoles(g.monto)}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button
                            onClick={() => eliminarReg('gastos', g.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB PRODUCTOS Y CONFIG (SOLO ADMIN) */}
        {user.role === 'admin' &&
          (activeTab === 'productos' || activeTab === 'config') && (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}
            >
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: '900',
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                Gestión de{' '}
                <span
                  style={{
                    color: activeTab === 'productos' ? '#00ffff' : '#ff00ff',
                  }}
                >
                  Catálogo y Ajustes
                </span>
              </h2>

              {activeTab === 'productos' && (
                <div
                  style={{
                    backgroundColor: '#150a25',
                    padding: '24px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <form
                    style={{
                      display: 'flex',
                      gap: '15px',
                      flexWrap: 'wrap',
                      alignItems: 'flex-end',
                    }}
                    onSubmit={async (e: any) => {
                      e.preventDefault();
                      const data = new FormData(e.target);
                      const nuevoId = `PRD-${Date.now().toString().slice(-4)}`;
                      await setDoc(doc(db, 'productos', nuevoId), {
                        id: nuevoId,
                        nombre: data.get('nombre'),
                        proveedor: data.get('proveedor') || 'General',
                        factor: Number(data.get('factor')),
                        costo: Number(data.get('costo')),
                        precio: Number(data.get('precio')),
                        stockMin: Number(data.get('stockMin')),
                      });
                      e.target.reset();
                      alert('Producto agregado.');
                    }}
                  >
                    <div style={{ flex: 2, minWidth: '150px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          color: '#9ca3af',
                          marginBottom: '5px',
                        }}
                      >
                        Nombre
                      </label>
                      <input
                        name="nombre"
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          color: '#fff',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '100px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          color: '#9ca3af',
                          marginBottom: '5px',
                        }}
                      >
                        Proveedor
                      </label>
                      <input
                        name="proveedor"
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          color: '#fff',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          color: '#9ca3af',
                          marginBottom: '5px',
                        }}
                      >
                        Factor/Cj
                      </label>
                      <input
                        name="factor"
                        type="number"
                        required
                        defaultValue="12"
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          color: '#fff',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          color: '#9ca3af',
                          marginBottom: '5px',
                        }}
                      >
                        Costo Cj
                      </label>
                      <input
                        name="costo"
                        type="number"
                        step="0.1"
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          color: '#fff',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          color: '#00ffff',
                          marginBottom: '5px',
                        }}
                      >
                        Venta Ud
                      </label>
                      <input
                        name="precio"
                        type="number"
                        step="0.1"
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(0,255,255,0.1)',
                          border: '1px solid rgba(0,255,255,0.3)',
                          color: '#00ffff',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          color: '#ef4444',
                          marginBottom: '5px',
                        }}
                      >
                        Alerta Min
                      </label>
                      <input
                        name="stockMin"
                        type="number"
                        required
                        defaultValue="3"
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444',
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#00ffff',
                        color: '#000',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      AÑADIR
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'config' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px',
                  }}
                >
                  {Object.entries(estructura).map(([t, cats]: any) => (
                    <div
                      key={t}
                      style={{
                        backgroundColor: '#150a25',
                        padding: '24px',
                        borderRadius: '24px',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <h4
                        style={{
                          color: '#ff00ff',
                          margin: '0 0 15px 0',
                          textTransform: 'uppercase',
                        }}
                      >
                        {t}
                      </h4>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginBottom: '15px',
                        }}
                      >
                        {cats.map((c: any) => (
                          <span
                            key={c}
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              padding: '5px 10px',
                              borderRadius: '5px',
                              fontSize: '12px',
                            }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      <input
                        placeholder="+ Nueva Categoría (Enter)"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          backgroundColor: '#000',
                          border: '1px solid rgba(255,0,255,0.3)',
                          color: '#fff',
                          outline: 'none',
                        }}
                        onKeyDown={async (e: any) => {
                          if (
                            e.key === 'Enter' &&
                            e.target.value.trim() !== ''
                          ) {
                            const newE = {
                              ...estructura,
                              [t]: [...estructura[t], e.target.value.trim()],
                            };
                            setEstructura(newE);
                            await setDoc(
                              doc(db, 'estructura_gastos', 'config_general'),
                              newE
                            );
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </main>
    </div>
  );
}
