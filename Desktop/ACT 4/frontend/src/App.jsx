import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  RefreshCw,
  ArrowRightLeft,
  Cpu,
  KeyRound,
  LogOut,
  CheckCircle2,
  Server,
  UserCheck,
  XCircle
} from 'lucide-react';

const AUTH_API = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:4001';
const FX_API = import.meta.env.VITE_FX_SERVICE_URL || 'http://localhost:4002';
const BACKEND_API = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:4000';

/**
 * Safely decode a Base64URL JWT payload for live inspection on screen.
 */
function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (_e) {
    return null;
  }
}

export default function App() {
  // In-memory JWT state ONLY (never persisted to localStorage/sessionStorage to mitigate XSS)
  const [accessToken, setAccessToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState('admin.demo@techstore.test');
  const [password, setPassword] = useState('AdminPass123!');
  const [authStatus, setAuthStatus] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // FX Rate & Products state
  const [currentRate, setCurrentRate] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState(null);

  // Currency Converter state (POST /api/v1/rates/convert)
  const [convertAmount, setConvertAmount] = useState('1500');
  const [convertFrom, setConvertFrom] = useState('MXN');
  const [convertTo, setConvertTo] = useState('USD');
  const [convertResult, setConvertResult] = useState(null);
  const [convertHttpStatus, setConvertHttpStatus] = useState(null);

  // Admin Action Card state (POST /api/v1/rates/refresh)
  const [simulateDown, setSimulateDown] = useState(false);
  const [syncResponse, setSyncResponse] = useState(null);
  const [syncHttpStatus, setSyncHttpStatus] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);

  const decodedPayload = decodeJwtPayload(accessToken);

  const fetchRateAndCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const [rateRes, productsRes] = await Promise.all([
        fetch(`${FX_API}/api/v1/rates/current?base=USD&target=MXN`),
        fetch(`${BACKEND_API}/api/v1/products`)
      ]);

      if (rateRes.ok) {
        const rateData = await rateRes.json();
        setCurrentRate(rateData);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(Array.isArray(productsData) ? productsData : productsData.products || []);
      } else {
        setCatalogError(`Main backend responded with HTTP ${productsRes.status}`);
      }
    } catch (err) {
      setCatalogError(
        `Waiting for backend microservices (:4000 / :4002) — make sure "npm start" is running (${err.message})`
      );
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchRateAndCatalog();
    // Auto-retry once after 1.5s in case Vite boots slightly before Express under concurrently
    const timer = setTimeout(() => {
      fetchRateAndCatalog();
    }, 1500);
    return () => clearTimeout(timer);
  }, [fetchRateAndCatalog]);

  // Perform Login against services/auth-service (:4001)
  const performLogin = async (loginEmail, loginPassword) => {
    setAuthLoading(true);
    setEmail(loginEmail);
    setPassword(loginPassword);
    try {
      const res = await fetch(`${AUTH_API}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setAccessToken(data.accessToken);
        setCurrentUser(data.user);
        setAuthStatus({
          status: res.status,
          ok: true,
          message: `Authenticated as ${data.user.email} (role: ${data.user.role.toUpperCase()})`
        });
      } else {
        setAccessToken(null);
        setCurrentUser(null);
        setAuthStatus({
          status: res.status,
          ok: false,
          message: `${data.error || 'Authentication failed'}`
        });
      }
    } catch (err) {
      setAuthStatus({
        status: 500,
        ok: false,
        message: `Auth service (:4001) unreachable: ${err.message}`
      });
    } finally {
      setAuthLoading(false);
    }
  };

  // Verify current Bearer token via GET /api/v1/auth/me
  const handleVerifyMe = async () => {
    setAuthLoading(true);
    try {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const res = await fetch(`${AUTH_API}/api/v1/auth/me`, {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        setAuthStatus({
          status: res.status,
          ok: true,
          message: `GET /api/v1/auth/me verified: ${data.email} (id: ${data.id}, role: ${data.role})`
        });
      } else {
        setAuthStatus({
          status: res.status,
          ok: false,
          message: `GET /api/v1/auth/me failed: ${data.message || data.error}`
        });
      }
    } catch (err) {
      setAuthStatus({
        status: 500,
        ok: false,
        message: err.message
      });
    } finally {
      setAuthLoading(false);
    }
  };

  // Rotate HttpOnly Refresh Token Cookie (POST /api/v1/auth/refresh)
  const handleRefreshToken = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setAccessToken(data.accessToken);
        setCurrentUser(data.user);
        setAuthStatus({
          status: res.status,
          ok: true,
          message: 'Rotated HttpOnly refreshToken cookie & issued fresh 15m HS256 accessToken'
        });
      } else {
        setAuthStatus({
          status: res.status,
          ok: false,
          message: data.message || data.error || 'Refresh token invalid or missing'
        });
      }
    } catch (err) {
      setAuthStatus({
        status: 500,
        ok: false,
        message: err.message
      });
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout (POST /api/v1/auth/logout)
  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      setAccessToken(null);
      setCurrentUser(null);
      setAuthStatus({
        status: res.status,
        ok: true,
        message: 'Logged out (204 No Content). In-memory JWT cleared & HttpOnly cookie revoked.'
      });
    } catch (err) {
      setAccessToken(null);
      setCurrentUser(null);
      setAuthStatus({
        status: 500,
        ok: false,
        message: err.message
      });
    } finally {
      setAuthLoading(false);
    }
  };

  // Currency Conversion (POST /api/v1/rates/convert)
  const handleConvert = async (e, overrideBody = null) => {
    if (e) e.preventDefault();
    const payload = overrideBody || {
      amount: Number(convertAmount),
      from: convertFrom,
      to: convertTo
    };
    try {
      const res = await fetch(`${FX_API}/api/v1/rates/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setConvertHttpStatus(res.status);
      setConvertResult(data);
    } catch (err) {
      setConvertHttpStatus(500);
      setConvertResult({ error: 'NetworkError', message: err.message });
    }
  };

  // Force Banxico Rate Sync (POST /api/v1/rates/refresh)
  const handleForceBanxicoSync = async ({ useTamperedToken = false } = {}) => {
    setSyncLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (useTamperedToken) {
        headers.Authorization =
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfOWY4YTdkNmM1YjRlIiwicm9sZSI6ImFkbWluIn0.tampered_invalid_signature_xyz';
      } else if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const query = simulateDown ? '?simulateDown=true' : '';
      const res = await fetch(`${FX_API}/api/v1/rates/refresh${query}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ currency: 'USD' })
      });

      const data = await res.json();
      setSyncHttpStatus(res.status);
      setSyncResponse(data);

      if (res.status === 201) {
        await fetchRateAndCatalog();
      }
    } catch (err) {
      setSyncHttpStatus(500);
      setSyncResponse({ error: 'NetworkError', message: err.message });
    } finally {
      setSyncLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    if (!status) return 'bg-slate-800 text-slate-300 border-slate-700';
    if (status >= 200 && status < 300) return 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50';
    if (status === 401 || status === 403) return 'bg-amber-950/90 text-amber-300 border-amber-500/50';
    return 'bg-rose-950/90 text-rose-300 border-rose-500/50';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">TechStore MX</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  E3 & E4 Monorepo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-Currency Hardware Store • Banxico SIE (SF43718) • HS256 JWT & RBAC
              </p>
            </div>
          </div>

          {/* Live Rate & Microservice Status Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Banxico FIX (USD/MXN):</span>
              <span className="font-mono font-bold text-emerald-400">
                ${currentRate ? Number(currentRate.rate).toFixed(4) : '19.8540'} MXN
              </span>
              {currentRate?.stale && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/20 text-amber-300">
                  STALE
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs">
              {currentUser ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-300 font-medium">{currentUser.email}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-semibold uppercase text-[10px] ${
                      currentUser.role === 'admin'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Unauthenticated (Guest)</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 flex-1">
        {/* Top Grid: Auth Panel + Admin Banxico Sync & Currency Calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Authentication & Live JWT Inspector */}
          <section className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-semibold text-white">
                    Authentication & In-Memory JWT Inspector (:4001)
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">HS256 • HttpOnly Cookie</span>
              </div>

              {/* Quick-Fill Demo Login Buttons */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  One-Click Role Switching (Evaluator Demo Controls)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => performLogin('admin.demo@techstore.test', 'AdminPass123!')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Login as Admin (admin.demo@techstore.test)
                  </button>

                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => performLogin('customer.demo@techstore.test', 'CustomerPass123!')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow transition cursor-pointer disabled:opacity-50"
                  >
                    <UserCheck className="w-4 h-4" />
                    Login as Customer (customer.demo@techstore.test)
                  </button>

                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => performLogin('admin.demo@techstore.test', 'WrongPass999!')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Test Wrong Password (401)
                  </button>

                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleVerifyMe}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verify /auth/me
                  </button>

                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleRefreshToken}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Rotate Refresh Cookie
                  </button>

                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-rose-950/80 hover:bg-rose-900/80 text-rose-200 border border-rose-700/50 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              </div>

              {/* Manual Credentials Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  performLogin(email, password);
                }}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1"
              >
                <div className="sm:col-span-5">
                  <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="admin.demo@techstore.test"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
                <div className="sm:col-span-3 flex items-end">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    Submit Login
                  </button>
                </div>
              </form>

              {authStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${getStatusBadgeColor(
                    authStatus.status
                  )}`}
                >
                  <span>{authStatus.message}</span>
                  <span className="font-mono font-bold">HTTP {authStatus.status}</span>
                </div>
              )}
            </div>

            {/* Decoded JWT Claims Display */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Decoded In-Memory Access Token Payload (sub, role, iss, aud, exp)
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  Storage: React Memory State (XSS Safe)
                </span>
              </div>

              {decodedPayload ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">sub (User ID)</div>
                    <div className="text-xs font-mono text-indigo-300 truncate">
                      {decodedPayload.sub}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">role (RBAC)</div>
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      {decodedPayload.role}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">iss (Issuer)</div>
                    <div className="text-xs font-mono text-slate-200 truncate">
                      {decodedPayload.iss}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">exp (15m TTL)</div>
                    <div className="text-xs font-mono text-amber-300">
                      {decodedPayload.exp}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/90 p-2.5 rounded-lg overflow-x-auto border border-slate-800">
                      {JSON.stringify(decodedPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-mono py-4 text-center">
                  No active accessToken in memory. Click &quot;Login as Admin&quot; or &quot;Login as Customer&quot; above, or test unauthenticated 401 calls on the right.
                </div>
              )}
            </div>
          </section>

          {/* Right Column (5 cols): Admin Action Card (:4002) & Interactive Converter */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Admin Protected Endpoint Card */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-semibold text-white">
                    Admin Action: Banxico Rate Sync (:4002)
                  </h2>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  RBAC: admin
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Calls <code className="text-indigo-300">POST /api/v1/rates/refresh</code> on{' '}
                <code className="text-indigo-300">fx-microservice</code>. Expect{' '}
                <span className="text-emerald-400 font-semibold">201 Created</span> as Admin,{' '}
                <span className="text-amber-400 font-semibold">403 Forbidden</span> as Customer, or{' '}
                <span className="text-rose-400 font-semibold">401 Unauthorized</span> when logged out.
              </p>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateDown}
                  onChange={(e) => setSimulateDown(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  Simulate Banxico SIE Outage (<code className="text-amber-300">?simulateDown=true</code> → 502 Bad Gateway)
                </span>
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={syncLoading}
                  onClick={() => handleForceBanxicoSync({ useTamperedToken: false })}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                  Force Banxico Rate Sync (POST /api/v1/rates/refresh)
                </button>

                <button
                  type="button"
                  disabled={syncLoading}
                  onClick={() => handleForceBanxicoSync({ useTamperedToken: true })}
                  className="px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition cursor-pointer"
                  title="Send a JWT with a tampered signature to verify 401 rejection"
                >
                  Test Tampered JWT (401)
                </button>
              </div>

              {syncHttpStatus && (
                <div className="space-y-2 pt-1">
                  <div
                    className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center justify-between ${getStatusBadgeColor(
                      syncHttpStatus
                    )}`}
                  >
                    <span>Response Status</span>
                    <span className="font-bold">
                      HTTP {syncHttpStatus}{' '}
                      {syncHttpStatus === 201
                        ? 'Created'
                        : syncHttpStatus === 401
                        ? 'Unauthorized'
                        : syncHttpStatus === 403
                        ? 'Forbidden'
                        : syncHttpStatus === 502
                        ? 'Bad Gateway'
                        : ''}
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 overflow-x-auto">
                    {JSON.stringify(syncResponse, null, 2)}
                  </pre>
                </div>
              )}
            </section>

            {/* Interactive Currency Calculator Card */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-sky-400" />
                  <h2 className="text-base font-semibold text-white">
                    Interactive Currency Calculator (:4002)
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">POST /api/v1/rates/convert</span>
              </div>

              <form onSubmit={(e) => handleConvert(e)} className="grid grid-cols-12 gap-2.5">
                <div className="col-span-4">
                  <label className="block text-[11px] text-slate-400 mb-1">Amount</label>
                  <input
                    type="number"
                    step="any"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] text-slate-400 mb-1">From</label>
                  <select
                    value={convertFrom}
                    onChange={(e) => setConvertFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] text-slate-400 mb-1">To</label>
                  <select
                    value={convertTo}
                    onChange={(e) => setConvertTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                  </select>
                </div>
                <div className="col-span-2 flex items-end">
                  <button
                    type="submit"
                    className="w-full py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    Convert
                  </button>
                </div>
              </form>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() =>
                    handleConvert(null, { amount: -150, from: 'EUR', to: 'USD' })
                  }
                  className="text-amber-400 hover:text-amber-300 underline cursor-pointer text-[11px]"
                >
                  Test Invalid Input (-150 &amp; EUR → HTTP 400 ValidationError)
                </button>
              </div>

              {convertResult && (
                <div className="space-y-2">
                  <div
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center justify-between ${getStatusBadgeColor(
                      convertHttpStatus
                    )}`}
                  >
                    <span>
                      {convertResult.convertedAmount !== undefined
                        ? `${convertResult.originalAmount} ${convertResult.from} = ${convertResult.convertedAmount} ${convertResult.to}`
                        : convertResult.error}
                    </span>
                    <span className="font-bold">HTTP {convertHttpStatus}</span>
                  </div>
                  <pre className="text-[11px] font-mono bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 overflow-x-auto">
                    {JSON.stringify(convertResult, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Bottom Section: Hardware Product Catalog (Consuming Main Backend :4000 + FX Microservice :4002) */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Multi-Currency Hardware Catalog</span>
                <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  GET http://localhost:4000/api/v1/products
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Main Backend (:4000) dynamically queries FX Microservice (:4002) to enrich MXN catalog items with live USD pricing.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchRateAndCatalog}
              disabled={loadingCatalog}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCatalog ? 'animate-spin' : ''}`} />
              Refresh Catalog Prices
            </button>
          </div>

          {catalogError && products.length === 0 && (
            <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200">
              {catalogError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-slate-950/90 border border-slate-800/90 hover:border-indigo-500/40 rounded-xl p-5 flex flex-col justify-between transition group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-medium border border-indigo-500/30">
                      {product.category}
                    </span>
                    <span className="font-mono text-slate-500">{product.sku}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{product.description}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Price (MXN):</span>
                    <span className="text-base font-bold font-mono text-white">
                      ${Number(product.priceMxn).toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Converted (USD):</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      ${Number(product.priceUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                    <span>FX Rate: {product.exchangeRateUsed} MXN/USD</span>
                    <span>Stock: {product.stock} units</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
