import React, { useState, useEffect, useMemo } from 'react';
import supabase from '../supabase/supabase';
import { Button, Card, Input, Badge } from '../components/ui/Components';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';
import { db } from '../lib/db';

const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return '—'; }
};

const Kpi = ({ icon, label, value, hint }) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 text-gray-500">
      <SafeIcon name={icon} className="w-4 h-4 text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </div>
    <div className="mt-1.5 text-2xl font-heading font-bold text-gray-900">{value ?? 0}</div>
    {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
  </Card>
);

export default function Admin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [newAdmin, setNewAdmin] = useState('');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.rpc('admin_overview');
    if (err) setError(err.message || 'No se pudo cargar el panel.');
    else setData(res);
    setLoading(false);
  };

  // Broadcast de avisos a todos los usuarios
  const [bcTitle, setBcTitle] = useState('');
  const [bcMsg, setBcMsg] = useState('');
  const [bcSending, setBcSending] = useState(false);
  const [bcResult, setBcResult] = useState(null); // { tipo, texto }

  const enviarBroadcast = async () => {
    if (bcSending || !bcTitle.trim() || !bcMsg.trim()) return;
    setBcSending(true);
    setBcResult(null);
    try {
      const res = await db.adminBroadcast(bcTitle.trim(), bcMsg.trim());
      setBcResult({ tipo: 'ok', texto: `Aviso enviado a ${res.sent} usuario(s).` });
      setBcTitle(''); setBcMsg('');
    } catch (e) {
      setBcResult({ tipo: 'error', texto: e.message || 'No se pudo enviar.' });
    } finally {
      setBcSending(false);
    }
  };

  // Códigos de regalo
  const [codes, setCodes] = useState([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [genCredits, setGenCredits] = useState(30);
  const [genCount, setGenCount] = useState(5);
  const [genNote, setGenNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null); // { codes:[], credits }

  const loadCodes = async () => {
    setCodesLoading(true);
    try { setCodes(await db.adminListPromoCodes()); }
    catch (e) { console.warn('No se pudieron cargar los códigos:', e?.message || e); }
    finally { setCodesLoading(false); }
  };

  useEffect(() => { load(); loadCodes(); }, []);

  const generarCodigos = async () => {
    if (generating) return;
    setGenerating(true);
    setLastGenerated(null);
    try {
      const res = await db.adminCreatePromoCodes({ credits: Number(genCredits), count: Number(genCount), note: genNote.trim() || null });
      setLastGenerated({ codes: res.codes || [], credits: res.credits });
      setGenNote('');
      loadCodes();
    } catch (e) {
      alert('No se pudieron generar los códigos: ' + (e.message || e));
    } finally {
      setGenerating(false);
    }
  };

  const toggleCodigo = async (id, activar) => {
    try { await db.adminSetPromoActive(id, activar); loadCodes(); }
    catch (e) { alert('No se pudo actualizar el código: ' + (e.message || e)); }
  };

  const copiar = (txt) => { try { navigator.clipboard?.writeText(txt); } catch { /* noop */ } };

  const setRole = async (email, makeAdmin) => {
    setBusy(email);
    const { error: err } = await supabase.rpc('admin_set_role', { target_email: email, make_admin: makeAdmin });
    setBusy(null);
    if (err) { alert('No se pudo actualizar el rol: ' + err.message); return; }
    setNewAdmin('');
    load();
  };

  const kpis = data?.kpis || {};
  const users = data?.users || [];
  const byPlan = data?.by_plan || [];
  const signups = data?.signups_daily || [];
  const maxSignup = Math.max(1, ...signups.map(s => s.count));

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter(u =>
      (u.email || '').toLowerCase().includes(t) || (u.name || '').toLowerCase().includes(t)
    );
  }, [q, users]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto flex items-center justify-center h-64 text-gray-400">
        <SafeIcon name="Loader" className="w-5 h-5 animate-spin mr-2" /> Cargando panel…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <Card className="p-6 border-red-200/60 bg-red-50/40">
          <div className="flex items-center gap-2 text-red-600 font-bold">
            <SafeIcon name="AlertTriangle" className="w-5 h-5" /> No autorizado
          </div>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-fadeup">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold mb-1 flex items-center gap-2">
            <SafeIcon name="Shield" className="w-6 h-6 text-primary" /> Panel de administrador
          </h2>
          <p className="text-gray-500 text-sm">Cuentas creadas y uso de la app. Solo visible para administradores.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <SafeIcon name="RefreshCw" className="w-4 h-4 mr-1.5" /> Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon="Users" label="Usuarios" value={kpis.total_users} hint={`${kpis.new_users_7d || 0} nuevos (7d)`} />
        <Kpi icon="Star" label="De pago" value={kpis.paid_users} hint={`${kpis.active_plans || 0} activos`} />
        <Kpi icon="Grid" label="Negocios" value={kpis.total_businesses} />
        <Kpi icon="FileText" label="Publicaciones" value={kpis.total_posts} hint={`${kpis.new_posts_7d || 0} nuevas (7d)`} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Registros por día */}
        <Card className="p-5 md:col-span-2">
          <h3 className="font-heading font-bold text-lg mb-4">Registros (últimos 30 días)</h3>
          {signups.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin registros en el período.</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {signups.map((s) => (
                <div key={s.day} className="flex-1 flex flex-col items-center justify-end group relative">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-primary to-[#8B5CF6] min-h-[2px] transition-all"
                    style={{ height: `${(s.count / maxSignup) * 100}%` }}
                  />
                  <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                    {fmtDate(s.day)}: {s.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Por plan */}
        <Card className="p-5">
          <h3 className="font-heading font-bold text-lg mb-4">Por plan</h3>
          <div className="space-y-2">
            {byPlan.map((p) => (
              <div key={p.plan} className="flex items-center justify-between text-sm">
                <Badge variant={p.plan === 'FREE' ? 'outline' : 'primary'}>{p.plan}</Badge>
                <span className="font-bold text-gray-800">{p.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/50 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between"><span>Historias guardadas</span><b>{kpis.total_historias || 0}</b></div>
            <div className="flex justify-between"><span>Parrillas creadas</span><b>{kpis.total_grids || 0}</b></div>
            <div className="flex justify-between"><span>Publicadas</span><b>{kpis.published_posts || 0}</b></div>
          </div>
        </Card>
      </div>

      {/* Dar acceso de admin */}
      <Card className="p-5">
        <h3 className="font-heading font-bold text-lg mb-1">Dar acceso de administrador</h3>
        <p className="text-sm text-gray-500 mb-3">Escribe el email de un usuario existente para convertirlo en admin. Solo tú (y otros admins) ven este panel.</p>
        <div className="flex gap-2">
          <Input
            value={newAdmin}
            onChange={e => setNewAdmin(e.target.value)}
            placeholder="correo@usuario.com"
            className="h-11 flex-1"
          />
          <Button
            onClick={() => setRole(newAdmin.trim(), true)}
            isLoading={busy === newAdmin.trim()}
            disabled={!newAdmin.trim()}
          >
            <SafeIcon name="Shield" className="w-4 h-4 mr-1.5" /> Hacer admin
          </Button>
        </div>
      </Card>

      {/* Enviar aviso a todos */}
      <Card className="p-5">
        <h3 className="font-heading font-bold text-lg mb-1 flex items-center gap-2">
          <SafeIcon name="Send" className="w-5 h-5 text-primary" /> Enviar aviso a todos
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Escribe un mensaje y llega a la campana de <b>todos</b> los usuarios. (Aviso dentro de la app; el push al celular con la app cerrada llega cuando activemos la app instalable.)
        </p>
        <div className="space-y-2">
          <Input value={bcTitle} onChange={e => setBcTitle(e.target.value)} placeholder="Título (ej. Nueva función 🎉)" className="h-11" />
          <textarea
            value={bcMsg}
            onChange={e => setBcMsg(e.target.value)}
            placeholder="Mensaje para tus usuarios…"
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white/60 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center gap-3">
            <Button onClick={enviarBroadcast} isLoading={bcSending} disabled={!bcTitle.trim() || !bcMsg.trim()}>
              <SafeIcon name="Send" className="w-4 h-4 mr-1.5" /> Enviar a todos
            </Button>
            {bcResult && (
              <span className={cn('text-sm', bcResult.tipo === 'ok' ? 'text-success' : 'text-red-500')}>{bcResult.texto}</span>
            )}
          </div>
        </div>
      </Card>

      {/* Códigos de regalo */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-1 gap-3">
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <SafeIcon name="Gift" className="w-5 h-5 text-primary" /> Códigos de regalo
          </h3>
          <Button variant="outline" size="sm" onClick={loadCodes} disabled={codesLoading}>
            <SafeIcon name="RefreshCw" className={cn('w-4 h-4 mr-1.5', codesLoading && 'animate-spin')} /> Actualizar
          </Button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Genera códigos para regalar publicaciones a quienes te dan feedback. El usuario debe dejar una opinión antes de canjear.
        </p>

        {/* Generador */}
        <div className="grid sm:grid-cols-[120px_120px_1fr_auto] gap-3 items-end bg-white/40 rounded-xl p-3 mb-4">
          <div>
            <label className="text-xs text-gray-400 font-medium">Publicaciones</label>
            <Input type="number" min={1} value={genCredits} onChange={e => setGenCredits(e.target.value)} className="h-10" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium">Cantidad</label>
            <Input type="number" min={1} max={200} value={genCount} onChange={e => setGenCount(e.target.value)} className="h-10" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium">Nota (opcional)</label>
            <Input value={genNote} onChange={e => setGenNote(e.target.value)} placeholder="Para quién / motivo" className="h-10" />
          </div>
          <Button onClick={generarCodigos} isLoading={generating} disabled={!genCredits || !genCount}>
            <SafeIcon name="Plus" className="w-4 h-4 mr-1.5" /> Generar
          </Button>
        </div>

        {/* Recién generados (para copiar y repartir) */}
        {lastGenerated && lastGenerated.codes.length > 0 && (
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-primary">
                {lastGenerated.codes.length} código(s) de {lastGenerated.credits} publicaciones — cópialos y repártelos:
              </p>
              <button onClick={() => copiar(lastGenerated.codes.join('\n'))} className="text-xs text-primary hover:underline flex items-center gap-1">
                <SafeIcon name="Copy" className="w-3.5 h-3.5" /> Copiar todos
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {lastGenerated.codes.map((c) => (
                <button key={c} onClick={() => copiar(c)} title="Copiar" className="font-mono text-sm bg-white border border-primary/20 rounded-lg px-2.5 py-1 hover:bg-primary/5">
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista de códigos */}
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-white/60">
                <th className="py-2 px-2 font-medium">Código</th>
                <th className="py-2 px-2 font-medium text-center">Publicaciones</th>
                <th className="py-2 px-2 font-medium text-center">Usos</th>
                <th className="py-2 px-2 font-medium">Nota</th>
                <th className="py-2 px-2 font-medium">Canjeado por</th>
                <th className="py-2 px-2 font-medium text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-white/40 hover:bg-white/40">
                  <td className="py-2.5 px-2">
                    <button onClick={() => copiar(c.code)} title="Copiar" className="font-mono font-bold text-gray-800 hover:text-primary">{c.code}</button>
                  </td>
                  <td className="py-2.5 px-2 text-center">{c.credits}</td>
                  <td className="py-2.5 px-2 text-center">{c.redeemed_count}/{c.max_redemptions}</td>
                  <td className="py-2.5 px-2 text-gray-500 max-w-[160px] truncate" title={c.note || ''}>{c.note || '—'}</td>
                  <td className="py-2.5 px-2 text-gray-500 text-xs">
                    {(c.redeemed_by || []).length === 0
                      ? '—'
                      : (c.redeemed_by || []).map((r) => r.email).join(', ')}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <button
                      onClick={() => toggleCodigo(c.id, !c.active)}
                      className={cn('text-xs font-bold transition-colors', c.active ? 'text-success hover:text-red-500' : 'text-gray-400 hover:text-success')}
                      title={c.active ? 'Desactivar' : 'Activar'}
                    >
                      {c.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400 text-sm">{codesLoading ? 'Cargando…' : 'Aún no has generado códigos.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Usuarios */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="font-heading font-bold text-lg">Usuarios ({users.length})</h3>
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" className="h-9 max-w-[220px] text-xs" />
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-white/60">
                <th className="py-2 px-2 font-medium">Usuario</th>
                <th className="py-2 px-2 font-medium">Plan</th>
                <th className="py-2 px-2 font-medium text-center">Negocios</th>
                <th className="py-2 px-2 font-medium text-center">Posts</th>
                <th className="py-2 px-2 font-medium text-center">Historias</th>
                <th className="py-2 px-2 font-medium">Registro</th>
                <th className="py-2 px-2 font-medium">Últ. actividad</th>
                <th className="py-2 px-2 font-medium text-right">Rol</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/40 hover:bg-white/40">
                  <td className="py-2.5 px-2">
                    <div className="font-medium text-gray-800">{u.name || '—'}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </td>
                  <td className="py-2.5 px-2">
                    <Badge variant={u.plan === 'FREE' ? 'outline' : 'primary'}>{u.plan}</Badge>
                    {u.plan_status === 'active' && <span className="ml-1 text-[10px] text-success">●</span>}
                  </td>
                  <td className="py-2.5 px-2 text-center">{u.negocios}</td>
                  <td className="py-2.5 px-2 text-center">{u.posts}</td>
                  <td className="py-2.5 px-2 text-center">{u.historias}</td>
                  <td className="py-2.5 px-2 text-gray-500">{fmtDate(u.created_at)}</td>
                  <td className="py-2.5 px-2 text-gray-500">{fmtDate(u.ultima_actividad)}</td>
                  <td className="py-2.5 px-2 text-right">
                    {u.is_admin ? (
                      <button
                        onClick={() => setRole(u.email, false)}
                        disabled={busy === u.email}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Quitar admin"
                      >
                        <SafeIcon name="Shield" className="w-3.5 h-3.5" /> Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => setRole(u.email, true)}
                        disabled={busy === u.email}
                        className="text-xs text-gray-400 hover:text-primary transition-colors disabled:opacity-40"
                        title="Hacer admin"
                      >
                        Hacer admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-gray-400 text-sm">Sin resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
