import React, { useState, useMemo } from 'react';
import { ClientDebt, CurrencyConfig, CompanyConfig, ClientData } from '../types';
import { db } from '../services/db';
import { formatCurrency, generateDebtWhatsAppReminder } from '../utils/formatters';
import {
  X,
  Search,
  Phone,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  ArrowRight,
  User,
  CreditCard,
  FileText,
  Building2,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AccountsReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyConfig;
  company: CompanyConfig;
  initialClientDocId?: string;
  onLoadDebtToTicket?: (client: ClientData, debtAmount: number) => void;
  onSelectClient?: (client: ClientData) => void;
  onSendWhatsAppReminder?: (client: ClientData, debts: ClientDebt[]) => void;
}

export const AccountsReceivableModal: React.FC<AccountsReceivableModalProps> = ({
  isOpen,
  onClose,
  currency,
  company,
  initialClientDocId,
  onLoadDebtToTicket,
  onSelectClient,
  onSendWhatsAppReminder,
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState(initialClientDocId || '');
  const [statusFilter, setStatusFilter] = useState<'PENDIENTE' | 'TODOS' | 'PAGADO'>('PENDIENTE');
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  // Payment Abono Modal State
  const [payingDebt, setPayingDebt] = useState<ClientDebt | null>(null);
  const [abonoAmountPrimary, setAbonoAmountPrimary] = useState<string>('');
  const [abonoMethod, setAbonoMethod] = useState<string>('PAGO_MOVIL_TRANSFERENCIA');
  const [abonoRefCode, setAbonoRefCode] = useState<string>('');
  const [abonoNotes, setAbonoNotes] = useState<string>('');

  // Phone input modal if client doesn't have phone
  const [phonePromptClient, setPhonePromptClient] = useState<ClientData | null>(null);
  const [phonePromptInput, setPhonePromptInput] = useState<string>('');

  // Fetch all debts from db
  const allDebts = useMemo(() => {
    return db.getClientDebts();
  }, [isOpen, payingDebt]);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allDebts.filter((d) => {
      // Status filter
      if (statusFilter === 'PENDIENTE' && d.estado !== 'PENDIENTE') return false;
      if (statusFilter === 'PAGADO' && d.estado !== 'PAGADO') return false;

      // Text search
      if (!q) return true;
      return (
        d.clienteNombre.toLowerCase().includes(q) ||
        d.clienteDocId.toLowerCase().includes(q) ||
        d.numeroTicket.toLowerCase().includes(q) ||
        (d.clienteTelefono && d.clienteTelefono.includes(q))
      );
    });
  }, [allDebts, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const pendingDebts = allDebts.filter((d) => d.estado === 'PENDIENTE' && d.saldoPendientePrincipal > 0.009);
    const totalPrincipal = pendingDebts.reduce((sum, d) => sum + d.saldoPendientePrincipal, 0);
    const totalReferencia = totalPrincipal * currency.tasaCambio;
    const uniqueClients = new Set(pendingDebts.map((d) => d.clienteDocId.toLowerCase())).size;

    return {
      totalPrincipal,
      totalReferencia,
      uniqueClients,
      pendingCount: pendingDebts.length,
    };
  }, [allDebts, currency.tasaCambio]);

  // Handle WhatsApp Reminder
  const handleTriggerWhatsApp = (debt: ClientDebt) => {
    const client: ClientData = {
      nombre: debt.clienteNombre,
      docId: debt.clienteDocId,
      telefono: debt.clienteTelefono,
    };

    if (onSendWhatsAppReminder) {
      onSendWhatsAppReminder(client, [debt]);
      return;
    }

    if (!client.telefono || client.telefono.trim().length < 7) {
      setPhonePromptClient(client);
      setPhonePromptInput('');
      return;
    }

    const cleanPhone = client.telefono.replace(/[^0-9]/g, '');
    const clientPendingDebts = db.getPendingClientDebts(client.docId);
    const debtsToSend = clientPendingDebts.length > 0 ? clientPendingDebts : [debt];
    const totalP = debtsToSend.reduce((sum, d) => sum + d.saldoPendientePrincipal, 0);
    const totalRef = totalP * currency.tasaCambio;

    const message = generateDebtWhatsAppReminder(
      client,
      debtsToSend,
      totalP,
      totalRef,
      company,
      currency
    );

    const url = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Submit phone prompt and launch WhatsApp
  const handleSavePhoneAndSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phonePromptClient || !phonePromptInput.trim()) return;

    const updatedClient: ClientData = {
      ...phonePromptClient,
      telefono: phonePromptInput.trim(),
    };
    db.saveClient(updatedClient);

    const cleanPhone = updatedClient.telefono!.replace(/[^0-9]/g, '');
    const clientPendingDebts = db.getPendingClientDebts(updatedClient.docId);
    const totalP = clientPendingDebts.reduce((sum, d) => sum + d.saldoPendientePrincipal, 0);
    const totalRef = totalP * currency.tasaCambio;

    const message = generateDebtWhatsAppReminder(
      updatedClient,
      clientPendingDebts,
      totalP,
      totalRef,
      company,
      currency
    );

    setPhonePromptClient(null);
    const url = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Start Abono Modal
  const handleOpenAbonoModal = (debt: ClientDebt) => {
    setPayingDebt(debt);
    setAbonoAmountPrimary(debt.saldoPendientePrincipal.toFixed(2));
    setAbonoMethod('PAGO_MOVIL_TRANSFERENCIA');
    setAbonoRefCode('');
    setAbonoNotes('');
  };

  // Submit Abono
  const handleSaveAbono = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;

    const amount = parseFloat(abonoAmountPrimary);
    if (!amount || amount <= 0) {
      alert('Por favor ingrese un monto válido mayor a 0');
      return;
    }

    if (amount > payingDebt.saldoPendientePrincipal + 0.01) {
      alert(`El monto ingresado ($${amount.toFixed(2)}) supera el saldo pendiente de $${payingDebt.saldoPendientePrincipal.toFixed(2)}`);
      return;
    }

    db.addDebtPayment(payingDebt.id, amount, abonoMethod, abonoRefCode || undefined, abonoNotes || undefined);
    setPayingDebt(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Control de Cuentas por Cobrar (Deudas por Cliente)
              </h3>
              <p className="text-xs text-slate-400">
                Gestión estricta de créditos otorgados, abonos y recordatorios WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total por Cobrar ($)
            </span>
            <span className="text-xl font-black text-rose-600">
              {formatCurrency(stats.totalPrincipal, currency.monedaPrincipal)}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              En Moneda Referencia
            </span>
            <span className="text-xl font-bold text-emerald-600">
              {formatCurrency(stats.totalReferencia, currency.monedaReferencia)}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Clientes con Deuda
            </span>
            <span className="text-xl font-black text-slate-900">
              {stats.uniqueClients} cliente{stats.uniqueClients !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Facturas a Crédito
            </span>
            <span className="text-xl font-black text-amber-600">
              {stats.pendingCount} pendiente{stats.pendingCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, C.I./RIF, o ticket #..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl focus:outline-none focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-semibold mr-1">Filtrar:</span>
            {(['PENDIENTE', 'TODOS', 'PAGADO'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter === 'PENDIENTE' ? 'Pendientes' : filter === 'PAGADO' ? 'Pagadas' : 'Todas'}
              </button>
            ))}
          </div>
        </div>

        {/* Debts Table / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredDebts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-2 opacity-60" />
              <p className="text-base font-bold text-slate-700">No se encontraron cuentas por cobrar</p>
              <p className="text-xs text-slate-500">
                {statusFilter === 'PENDIENTE'
                  ? 'No hay facturas con saldo deudor pendiente bajo este criterio.'
                  : 'No existen registros que coincidan con la búsqueda.'}
              </p>
            </div>
          ) : (
            filteredDebts.map((debt) => {
              const isExpanded = expandedDebtId === debt.id;
              const hasAbonos = debt.historialAbonos && debt.historialAbonos.length > 0;
              const isPaid = debt.estado === 'PAGADO' || debt.saldoPendientePrincipal <= 0.009;

              return (
                <div
                  key={debt.id}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    isPaid
                      ? 'border-slate-200 bg-slate-50/70'
                      : 'border-amber-200 bg-white hover:border-amber-400 shadow-xs'
                  }`}
                >
                  <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-sm truncate">
                            {debt.clienteNombre}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono font-bold">
                            {debt.clienteDocId}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isPaid ? 'Solvente' : 'Deuda Activa'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                          <span className="font-bold text-slate-700">Ticket: #{debt.numeroTicket}</span>
                          <span>•</span>
                          <span>{new Date(debt.fecha).toLocaleDateString('es-VE')}</span>
                          {debt.clienteTelefono && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">{debt.clienteTelefono}</span>
                            </>
                          )}
                        </div>

                        {debt.notas && (
                          <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-1">
                            {debt.notas}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle: Financials */}
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-right flex-shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Total</span>
                        <span className="text-xs font-bold text-slate-700">
                          {formatCurrency(debt.montoTotalPrincipal, currency.monedaPrincipal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Abonado</span>
                        <span className="text-xs font-bold text-emerald-600">
                          {formatCurrency(debt.montoAbonadoPrincipal, currency.monedaPrincipal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-500 font-extrabold uppercase block">Saldo Pendiente</span>
                        <span className="text-sm font-black text-rose-600">
                          {formatCurrency(debt.saldoPendientePrincipal, currency.monedaPrincipal)}
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {formatCurrency(debt.saldoPendientePrincipal * currency.tasaCambio, currency.monedaReferencia)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end flex-shrink-0">
                      {/* WhatsApp Reminder */}
                      <button
                        type="button"
                        onClick={() => handleTriggerWhatsApp(debt)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Enviar recordatorio de cobro por WhatsApp"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      {/* Register Abono if not paid */}
                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => handleOpenAbonoModal(debt)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          title="Registrar abono o pago parcial a esta deuda"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Abonar</span>
                        </button>
                      )}

                      {/* Load to current POS ticket if pending */}
                      {!isPaid && onLoadDebtToTicket && (
                        <button
                          type="button"
                          onClick={() => {
                            const clientData: ClientData = {
                              nombre: debt.clienteNombre,
                              docId: debt.clienteDocId,
                              telefono: debt.clienteTelefono,
                            };
                            onLoadDebtToTicket(clientData, debt.saldoPendientePrincipal);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Cargar saldo deudor directamente a la factura en el TPV"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="hidden md:inline">Cargar a Factura</span>
                        </button>
                      )}

                      {/* History toggle */}
                      {hasAbonos && (
                        <button
                          type="button"
                          onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                          className="px-2 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                          title="Ver historial de abonos"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Abonos History */}
                  {isExpanded && hasAbonos && (
                    <div className="bg-slate-100/80 px-4 py-3 border-t border-slate-200">
                      <p className="text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wide">
                        Historial de Abonos Registrados:
                      </p>
                      <div className="space-y-1.5">
                        {debt.historialAbonos!.map((abono, idx) => (
                          <div
                            key={abono.id || idx}
                            className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400 font-bold">#{idx + 1}</span>
                              <span className="text-slate-500">
                                {new Date(abono.fecha).toLocaleString('es-VE')}
                              </span>
                              <span className="font-semibold text-slate-700">
                                ({abono.metodoPago.replace(/_/g, ' ')})
                              </span>
                              {abono.referenciaBancaria && (
                                <span className="font-mono text-slate-500 text-[10.5px]">
                                  Ref: {abono.referenciaBancaria}
                                </span>
                              )}
                              {abono.ticketCobro && (
                                <span className="text-emerald-700 font-bold">
                                  Liquidado en #{abono.ticketCobro}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-black text-emerald-700">
                                +{formatCurrency(abono.montoPrincipal, currency.monedaPrincipal)}
                              </span>
                              <span className="text-[10px] text-slate-500 ml-1.5">
                                ({formatCurrency(abono.montoReferencia, currency.monedaReferencia)})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando {filteredDebts.length} de {allDebts.length} registros de crédito
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* SUBMODAL: REGISTRAR ABONO */}
      {payingDebt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
            <div className="px-6 py-4 bg-amber-500 text-slate-950 flex items-center justify-between font-black">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <h4 className="text-base font-black">Registrar Abono a Deuda</h4>
              </div>
              <button
                type="button"
                onClick={() => setPayingDebt(null)}
                className="p-1 rounded-lg hover:bg-amber-600/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAbono} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <p className="font-bold text-slate-800">
                  Cliente: <span className="font-normal">{payingDebt.clienteNombre} ({payingDebt.clienteDocId})</span>
                </p>
                <p className="font-bold text-slate-800 mt-1">
                  Ticket original: <span className="font-normal">#{payingDebt.numeroTicket}</span>
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold">
                  <span className="text-slate-600">Saldo Pendiente:</span>
                  <span className="text-rose-600 font-black">
                    {formatCurrency(payingDebt.saldoPendientePrincipal, currency.monedaPrincipal)} (
                    {formatCurrency(payingDebt.saldoPendientePrincipal * currency.tasaCambio, currency.monedaReferencia)})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Monto a Abonar ({currency.monedaPrincipal.simbolo})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    {currency.monedaPrincipal.simbolo}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={payingDebt.saldoPendientePrincipal}
                    required
                    value={abonoAmountPrimary}
                    onChange={(e) => setAbonoAmountPrimary(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {parseFloat(abonoAmountPrimary) > 0 && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    Equivalente: {formatCurrency(parseFloat(abonoAmountPrimary) * currency.tasaCambio, currency.monedaReferencia)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Método de Pago
                </label>
                <select
                  value={abonoMethod}
                  onChange={(e) => setAbonoMethod(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="PAGO_MOVIL_TRANSFERENCIA">Pago Móvil / Transferencia</option>
                  <option value="EFECTIVO_PRINCIPAL">Efectivo ($)</option>
                  <option value="EFECTIVO_REFERENCIA">Efectivo (Bs.)</option>
                  <option value="TARJETA">Punto de Venta / Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  N° de Referencia / Comprobante
                </label>
                <input
                  type="text"
                  value={abonoRefCode}
                  onChange={(e) => setAbonoRefCode(e.target.value)}
                  placeholder="Ej. REF-987654"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                  Notas / Observaciones
                </label>
                <input
                  type="text"
                  value={abonoNotes}
                  onChange={(e) => setAbonoNotes(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-xs cursor-pointer"
                >
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMODAL: SOLICITAR NÚMERO WHATSAPP SI NO LO TIENE */}
      {phonePromptClient && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                <h4 className="text-sm font-bold">Enviar Recordatorio WhatsApp</h4>
              </div>
              <button
                type="button"
                onClick={() => setPhonePromptClient(null)}
                className="p-1 rounded-lg hover:bg-emerald-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePhoneAndSend} className="p-5 space-y-3">
              <p className="text-xs text-slate-600">
                El cliente <strong className="text-slate-800">{phonePromptClient.nombre}</strong> no tiene un número registrado. Ingrese el número de WhatsApp para enviar el recordatorio y guardarlo en su ficha:
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número de WhatsApp (con código de país/área)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={phonePromptInput}
                  onChange={(e) => setPhonePromptInput(e.target.value)}
                  placeholder="Ej. +584121234567 o 04141234567"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPhonePromptClient(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
