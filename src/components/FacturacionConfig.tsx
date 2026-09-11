import React, { useState, useEffect } from 'react';
import { CurrencyConfig, CurrencyItem, BankAccount, PaymentMethodItem } from '../types';
import { db } from '../services/db';
import {
  Coins,
  Building2,
  Wallet,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  AlertCircle,
  ArrowRightLeft,
  Copy,
  Smartphone,
  CreditCard,
  Banknote,
  Receipt,
  Landmark,
  ShieldCheck,
  Star,
  CheckCircle2,
} from 'lucide-react';

interface FacturacionConfigProps {
  canManage: boolean;
  currency: CurrencyConfig;
  onFlashSuccess: (msg: string) => void;
}

export const FacturacionConfig: React.FC<FacturacionConfigProps> = ({
  canManage,
  currency,
  onFlashSuccess,
}) => {
  const [subTab, setSubTab] = useState<'MONEDAS' | 'CUENTAS' | 'METODOS_PAGO'>('MONEDAS');

  // Subscriptions to DB state
  const [currencies, setCurrencies] = useState<CurrencyItem[]>(() => db.getCurrencies());
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => db.getBankAccounts());
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>(() => db.getPaymentMethodsConfig());

  // Refresh data on DB changes
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setCurrencies([...db.getCurrencies()]);
      setBankAccounts([...db.getBankAccounts()]);
      setPaymentMethods([...db.getPaymentMethodsConfig()]);
    });
    return unsub;
  }, []);

  // -------------------------------------------------------------
  // VARIANT 1: MONEDAS STATE & HANDLERS
  // -------------------------------------------------------------
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyItem | null>(null);
  const [currCodigo, setCurrCodigo] = useState('');
  const [currNombre, setCurrNombre] = useState('');
  const [currSimbolo, setCurrSimbolo] = useState('');
  const [currDecimales, setCurrDecimales] = useState('2');
  const [currValorTasa, setCurrValorTasa] = useState('1.0');
  const [currEsPrincipal, setCurrEsPrincipal] = useState(false);
  const [currEsReferencia, setCurrEsReferencia] = useState(false);
  const [currActiva, setCurrActiva] = useState(true);

  // Quick Reference Rate editor
  const [refRateInput, setRefRateInput] = useState(currency.tasaCambio.toString());

  useEffect(() => {
    setRefRateInput(currency.tasaCambio.toString());
  }, [currency.tasaCambio]);

  const openNewCurrencyModal = () => {
    setEditingCurrency(null);
    setCurrCodigo('');
    setCurrNombre('');
    setCurrSimbolo('');
    setCurrDecimales('2');
    setCurrValorTasa('1.0');
    setCurrEsPrincipal(false);
    setCurrEsReferencia(false);
    setCurrActiva(true);
    setShowCurrencyModal(true);
  };

  const openEditCurrencyModal = (item: CurrencyItem) => {
    setEditingCurrency(item);
    setCurrCodigo(item.codigo);
    setCurrNombre(item.nombre);
    setCurrSimbolo(item.simbolo);
    setCurrDecimales(item.decimales.toString());
    setCurrValorTasa(item.valorTasa.toString());
    setCurrEsPrincipal(item.esPrincipal);
    setCurrEsReferencia(item.esReferencia);
    setCurrActiva(item.activa);
    setShowCurrencyModal(true);
  };

  const handleSaveCurrencyForm = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(currValorTasa);
    if (!currCodigo.trim() || !currNombre.trim() || !currSimbolo.trim()) {
      alert('Por favor complete todos los campos obligatorios de la moneda.');
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('El valor de la tasa debe ser un número mayor a 0.');
      return;
    }

    const newItem: CurrencyItem = {
      id: editingCurrency ? editingCurrency.id : 'curr-' + Date.now(),
      codigo: currCodigo.trim().toUpperCase(),
      nombre: currNombre.trim(),
      simbolo: currSimbolo.trim(),
      decimales: parseInt(currDecimales, 10) || 2,
      valorTasa: currEsPrincipal ? 1.0 : rateNum,
      esPrincipal: currEsPrincipal,
      esReferencia: currEsReferencia,
      activa: currActiva,
    };

    db.saveCurrencyItem(newItem);
    setShowCurrencyModal(false);
    onFlashSuccess(editingCurrency ? 'Moneda actualizada correctamente.' : 'Nueva moneda creada con éxito.');
  };

  const handleDeleteCurrency = (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de eliminar la moneda "${name}"?`)) return;
    const res = db.deleteCurrencyItem(id);
    if (res.success) {
      onFlashSuccess(`Moneda "${name}" eliminada.`);
    } else {
      alert(res.error || 'No se pudo eliminar la moneda.');
    }
  };

  const handleSetPrincipal = (id: string) => {
    db.setPrincipalCurrency(id);
    onFlashSuccess('Moneda Principal actualizada.');
  };

  const handleSetReferencia = (id: string) => {
    db.setReferenceCurrency(id);
    onFlashSuccess('Moneda de Referencia actualizada.');
  };

  const handleSaveRefRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(refRateInput);
    if (isNaN(parsed) || parsed <= 0) {
      alert('Por favor ingrese una tasa válida mayor a 0.');
      return;
    }
    db.updateReferenceRate(parsed);
    onFlashSuccess('Tasa de cambio de la moneda de referencia actualizada.');
  };

  // -------------------------------------------------------------
  // VARIANT 2: CUENTAS BANCARIAS STATE & HANDLERS
  // -------------------------------------------------------------
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankBanco, setBankBanco] = useState('');
  const [bankCodigo, setBankCodigo] = useState('');
  const [bankDocId, setBankDocId] = useState('');
  const [bankNumero, setBankNumero] = useState('');
  const [bankTitular, setBankTitular] = useState('');
  const [bankTelefono, setBankTelefono] = useState('');
  const [bankTipo, setBankTipo] = useState<'CORRIENTE' | 'AHORRO' | 'VIRTUAL' | 'EFECTIVO'>('CORRIENTE');
  const [bankActiva, setBankActiva] = useState(true);

  // Common Venezuelan Bank Presets
  const bankPresets = [
    { banco: 'Banesco Banco Universal', codigo: '0134' },
    { banco: 'Banco de Venezuela (BDV)', codigo: '0102' },
    { banco: 'Banco Mercantil', codigo: '0105' },
    { banco: 'BBVA Provincial', codigo: '0108' },
    { banco: 'Banco Nacional de Crédito (BNC)', codigo: '0191' },
    { banco: 'Bancaribe', codigo: '0114' },
    { banco: 'Banco Exterior', codigo: '0115' },
    { banco: 'Caja Tienda / Efectivo', codigo: '0001' },
  ];

  const openNewBankModal = () => {
    const comp = db.getCompany();
    setEditingBank(null);
    setBankBanco('');
    setBankCodigo('');
    setBankDocId(comp.rif || '');
    setBankNumero('');
    setBankTitular(comp.nombre || '');
    setBankTelefono(comp.telefono || '');
    setBankTipo('CORRIENTE');
    setBankActiva(true);
    setShowBankModal(true);
  };

  const openEditBankModal = (account: BankAccount) => {
    setEditingBank(account);
    setBankBanco(account.banco);
    setBankCodigo(account.codigo);
    setBankDocId(account.documentoId);
    setBankNumero(account.numeroCuenta);
    setBankTitular(account.titular);
    setBankTelefono(account.telefono || '');
    setBankTipo(account.tipo || 'CORRIENTE');
    setBankActiva(account.activa);
    setShowBankModal(true);
  };

  const handleSaveBankForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankBanco.trim() || !bankCodigo.trim() || !bankDocId.trim() || !bankNumero.trim() || !bankTitular.trim()) {
      alert('Por favor complete todos los datos obligatorios de la cuenta bancaria (Banco, Código, Documento ID, Número de Cuenta, Titular).');
      return;
    }

    const newAccount: BankAccount = {
      id: editingBank ? editingBank.id : 'bank-' + Date.now(),
      banco: bankBanco.trim(),
      codigo: bankCodigo.trim(),
      documentoId: bankDocId.trim().toUpperCase(),
      numeroCuenta: bankNumero.trim(),
      titular: bankTitular.trim(),
      telefono: bankTelefono.trim(),
      tipo: bankTipo,
      activa: bankActiva,
    };

    db.saveBankAccount(newAccount);
    setShowBankModal(false);
    onFlashSuccess(editingBank ? 'Cuenta bancaria actualizada correctamente.' : 'Nueva cuenta bancaria registrada.');
  };

  const handleDeleteBank = (id: string, banco: string) => {
    if (!window.confirm(`¿Está seguro de eliminar la cuenta bancaria de "${banco}"?`)) return;
    const res = db.deleteBankAccount(id);
    if (res.success) {
      onFlashSuccess(`Cuenta bancaria "${banco}" eliminada.`);
    } else {
      alert(res.error || 'No se pudo eliminar la cuenta bancaria.');
    }
  };

  // -------------------------------------------------------------
  // VARIANT 3: MÉTODOS DE PAGO STATE & HANDLERS
  // -------------------------------------------------------------
  const [showPmModal, setShowPmModal] = useState(false);
  const [editingPm, setEditingPm] = useState<PaymentMethodItem | null>(null);
  const [pmNombre, setPmNombre] = useState('');
  const [pmTipo, setPmTipo] = useState<PaymentMethodItem['tipo']>('PAGO_MOVIL');
  const [pmMonedaId, setPmMonedaId] = useState('');
  const [pmCuentaId, setPmCuentaId] = useState('');
  const [pmRequiereRef, setPmRequiereRef] = useState(true);
  const [pmInstrucciones, setPmInstrucciones] = useState('');
  const [pmActivo, setPmActivo] = useState(true);

  const openNewPmModal = () => {
    setEditingPm(null);
    setPmNombre('');
    setPmTipo('PAGO_MOVIL');
    // Default to reference currency or first currency
    const refCurr = currencies.find((c) => c.esReferencia) || currencies[0];
    setPmMonedaId(refCurr ? refCurr.id : '');
    // Default to first bank account
    setPmCuentaId(bankAccounts[0] ? bankAccounts[0].id : '');
    setPmRequiereRef(true);
    setPmInstrucciones('');
    setPmActivo(true);
    setShowPmModal(true);
  };

  const openEditPmModal = (pm: PaymentMethodItem) => {
    setEditingPm(pm);
    setPmNombre(pm.nombre);
    setPmTipo(pm.tipo);
    setPmMonedaId(pm.monedaId);
    setPmCuentaId(pm.cuentaId);
    setPmRequiereRef(pm.requiereReferencia);
    setPmInstrucciones(pm.instrucciones || '');
    setPmActivo(pm.activo);
    setShowPmModal(true);
  };

  const handleSavePmForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmNombre.trim()) {
      alert('Por favor ingrese el nombre del método de pago.');
      return;
    }
    if (!pmMonedaId) {
      alert('Debe vincular el método de pago al menos a una moneda.');
      return;
    }
    if (!pmCuentaId) {
      alert('Debe vincular el método de pago a una cuenta bancaria.');
      return;
    }

    const selectedCurrency = currencies.find((c) => c.id === pmMonedaId);

    const newPm: PaymentMethodItem = {
      id: editingPm ? editingPm.id : 'pm-' + Date.now(),
      nombre: pmNombre.trim(),
      tipo: pmTipo,
      monedaId: pmMonedaId,
      monedaCodigo: selectedCurrency ? selectedCurrency.codigo : undefined,
      cuentaId: pmCuentaId,
      requiereReferencia: pmRequiereRef,
      activo: pmActivo,
      instrucciones: pmInstrucciones.trim(),
    };

    const res = db.savePaymentMethodConfig(newPm);
    if (res.success) {
      setShowPmModal(false);
      onFlashSuccess(editingPm ? 'Método de pago modificado.' : 'Nuevo método de pago guardado.');
    } else {
      alert(res.error || 'Error al guardar el método de pago.');
    }
  };

  const handleDeletePm = (id: string, nombre: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el método de pago "${nombre}"?`)) return;
    const res = db.deletePaymentMethodConfig(id);
    if (res.success) {
      onFlashSuccess(`Método de pago "${nombre}" eliminado.`);
    } else {
      alert(res.error || 'No se pudo eliminar el método de pago.');
    }
  };

  // Helper to copy account number
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onFlashSuccess(`${label} copiado al portapapeles`);
  };

  const principalCurrency = currencies.find((c) => c.esPrincipal) || currencies[0];
  const referenceCurrency = currencies.find((c) => c.esReferencia) || currencies[1] || currencies[0];

  return (
    <div className="space-y-6">
      {/* Top Banner / Subtabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Receipt className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Módulo de Facturación & Finanzas</h2>
                <p className="text-xs text-slate-500">
                  Configuración central de monedas, cuentas bancarias institucionales y métodos de pago del sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Subtabs Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSubTab('MONEDAS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'MONEDAS'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>1. Monedas & Tasa</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-700">
                {currencies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('CUENTAS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'CUENTAS'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>2. Cuentas Bancarias</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-700">
                {bankAccounts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('METODOS_PAGO')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'METODOS_PAGO'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>3. Métodos de Pago</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-700">
                {paymentMethods.length}
              </span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* SUBTAB 1: MONEDAS */}
        {/* ------------------------------------------------------- */}
        {subTab === 'MONEDAS' && (
          <div className="pt-5 space-y-6">
            {/* Quick Currency Roles & Conversion Rate Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Moneda Principal Card */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold">
                    <Star className="w-3.5 h-3.5 fill-white" />
                    Moneda Principal (Base Contable)
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 font-mono">Tasa fija: 1.00</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {principalCurrency?.codigo || 'USD'}
                  </span>
                  <span className="text-sm font-bold text-emerald-800">
                    ({principalCurrency?.simbolo || '$'})
                  </span>
                  <span className="text-xs text-slate-600 truncate">
                    {principalCurrency?.nombre || 'Dólar Estadounidense'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Todos los precios base de catálogo, inventario y costos de compra se calculan y guardan en esta moneda.
                </p>
              </div>

              {/* Moneda de Referencia Card */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Moneda de Referencia (Visualización Dual)
                  </span>
                  <span className="text-[11px] font-bold text-blue-700 font-mono">
                    1 {principalCurrency?.codigo} = {currency.tasaCambio} {referenceCurrency?.codigo}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {referenceCurrency?.codigo || 'VES'}
                  </span>
                  <span className="text-sm font-bold text-blue-800">
                    ({referenceCurrency?.simbolo || 'Bs.'})
                  </span>
                  <span className="text-xs text-slate-600 truncate">
                    {referenceCurrency?.nombre || 'Bolívar Digital'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Utilizada para cotizaciones automáticas en tiempo real, tickets de venta al cliente y recepción en moneda nacional.
                </p>
              </div>

              {/* Tasa de Referencia Direct Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Asignar Valor a Moneda de Referencia</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(currency.ultimaActualizacionTasa).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <form onSubmit={handleSaveRefRate} className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      1 {principalCurrency?.codigo} =
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      disabled={!canManage}
                      value={refRateInput}
                      onChange={(e) => setRefRateInput(e.target.value)}
                      className="w-full pl-20 pr-12 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 font-mono">
                      {referenceCurrency?.codigo}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={!canManage}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Actualizar Tasa Oficial
                  </button>
                </form>
              </div>
            </div>

            {/* Currencies Table Header & Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Listado de Monedas Registradas</h3>
                <p className="text-xs text-slate-500">
                  Crea, edita o elimina monedas y define cuál actúa como base contable y cuál como referencia dual.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewCurrencyModal}
                disabled={!canManage}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Nueva Moneda
              </button>
            </div>

            {/* Currencies Grid/List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currencies.map((curr) => {
                const isPrincipal = curr.esPrincipal;
                const isReferencia = curr.esReferencia;

                return (
                  <div
                    key={curr.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isPrincipal
                        ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/20'
                        : isReferencia
                        ? 'bg-blue-50/40 border-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shadow-xs ${
                            isPrincipal
                              ? 'bg-emerald-600 text-white'
                              : isReferencia
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {curr.simbolo}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black font-mono text-slate-900">{curr.codigo}</span>
                            {!curr.activa && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-600 font-bold">
                                Inactiva
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-600 block line-clamp-1">{curr.nombre}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditCurrencyModal(curr)}
                          disabled={!canManage}
                          title="Editar Moneda"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCurrency(curr.id, curr.nombre)}
                          disabled={!canManage || isPrincipal || isReferencia}
                          title={
                            isPrincipal || isReferencia
                              ? 'No se puede eliminar la moneda principal o de referencia activa'
                              : 'Eliminar Moneda'
                          }
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isPrincipal || isReferencia
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Roles Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                      {isPrincipal && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Principal (Base)
                        </span>
                      )}
                      {isReferencia && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                          Referencia
                        </span>
                      )}
                      {!isPrincipal && !isReferencia && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          Moneda Auxiliar
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono ml-auto font-bold">
                        Tasa: {curr.valorTasa}
                      </span>
                    </div>

                    {/* Quick Assign Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2">
                      <button
                        type="button"
                        disabled={!canManage || isPrincipal}
                        onClick={() => handleSetPrincipal(curr.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                          isPrincipal
                            ? 'bg-emerald-100/50 text-emerald-800 opacity-60 cursor-default'
                            : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 cursor-pointer'
                        }`}
                      >
                        <Star className="w-3 h-3" />
                        {isPrincipal ? 'Es Principal' : 'Hacer Principal'}
                      </button>

                      <button
                        type="button"
                        disabled={!canManage || isReferencia || isPrincipal}
                        onClick={() => handleSetReferencia(curr.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                          isReferencia
                            ? 'bg-blue-100/50 text-blue-800 opacity-60 cursor-default'
                            : isPrincipal
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 cursor-pointer'
                        }`}
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        {isReferencia ? 'Es Referencia' : 'Hacer Referencia'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- */}
        {/* SUBTAB 2: CUENTAS BANCARIAS */}
        {/* ------------------------------------------------------- */}
        {subTab === 'CUENTAS' && (
          <div className="pt-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cuentas Bancarias de la Empresa</h3>
                <p className="text-xs text-slate-500">
                  Registra los datos bancarios requeridos para procesar transferencias, pago móvil y depósitos (Banco, Código, Documento ID, Número de Cuenta, Titular).
                </p>
              </div>
              <button
                type="button"
                onClick={openNewBankModal}
                disabled={!canManage}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Nueva Cuenta Bancaria
              </button>
            </div>

            {/* Bank Accounts Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map((acc) => {
                // Count how many payment methods use this account
                const linkedPms = paymentMethods.filter((pm) => pm.cuentaId === acc.id);

                return (
                  <div
                    key={acc.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 space-y-4 shadow-xs transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                          <Landmark className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{acc.banco}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                              Cód: {acc.codigo}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {acc.tipo === 'EFECTIVO' ? 'Caja / Custodia' : `Cuenta ${acc.tipo || 'CORRIENTE'}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditBankModal(acc)}
                          disabled={!canManage}
                          title="Editar Cuenta"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBank(acc.id, acc.banco)}
                          disabled={!canManage}
                          title="Eliminar Cuenta"
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Account Details Box */}
                    <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Número de Cuenta:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-slate-900 tracking-wider">
                            {acc.numeroCuenta}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(acc.numeroCuenta, 'Número de cuenta')}
                            title="Copiar número"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Titular:</span>
                        <span className="font-bold text-slate-800">{acc.titular}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Documento de ID:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800">{acc.documentoId}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(acc.documentoId, 'Documento de ID')}
                            title="Copiar ID"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {acc.telefono && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            Teléfono Pago Móvil:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800">{acc.telefono}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(acc.telefono || '', 'Teléfono')}
                              title="Copiar teléfono"
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Linked Payment Methods Tag */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-slate-500">
                        {linkedPms.length === 0
                          ? 'Sin métodos de pago vinculados'
                          : `${linkedPms.length} método(s) de pago vinculado(s)`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold ${
                          acc.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {acc.activa ? 'Cuenta Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- */}
        {/* SUBTAB 3: MÉTODOS DE PAGO */}
        {/* ------------------------------------------------------- */}
        {subTab === 'METODOS_PAGO' && (
          <div className="pt-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Configuración de Métodos de Pago</h3>
                <p className="text-xs text-slate-500">
                  Cada método de pago debe estar vinculado al menos a una moneda y una cuenta bancaria para garantizar la correcta recaudación y cuadre de caja.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewPmModal}
                disabled={!canManage}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Nuevo Método de Pago
              </button>
            </div>

            {/* Methods Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethods.map((pm) => {
                const linkedCurrency = currencies.find((c) => c.id === pm.monedaId);
                const linkedAccount = bankAccounts.find((a) => a.id === pm.cuentaId);

                return (
                  <div
                    key={pm.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4.5 space-y-3.5 shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                            {pm.tipo === 'EFECTIVO' ? (
                              <Banknote className="w-5 h-5" />
                            ) : pm.tipo === 'PAGO_MOVIL' ? (
                              <Smartphone className="w-5 h-5" />
                            ) : pm.tipo === 'PUNTO_VENTA' ? (
                              <CreditCard className="w-5 h-5" />
                            ) : pm.tipo === 'DIGITAL_ZELLE' ? (
                              <Wallet className="w-5 h-5" />
                            ) : (
                              <Landmark className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">{pm.nombre}</h4>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {pm.tipo.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditPmModal(pm)}
                            disabled={!canManage}
                            title="Editar Método"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePm(pm.id, pm.nombre)}
                            disabled={!canManage}
                            title="Eliminar Método"
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Linked Entities Information */}
                      <div className="mt-3.5 space-y-2 text-xs">
                        {/* Moneda Vinculada */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Moneda:</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1 font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            {linkedCurrency ? `${linkedCurrency.codigo} (${linkedCurrency.simbolo})` : 'No asignada'}
                          </span>
                        </div>

                        {/* Cuenta Bancaria Vinculada */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-slate-500 font-medium">
                            <span>Cuenta Receptora:</span>
                            <span className="font-bold text-slate-800">
                              {linkedAccount ? linkedAccount.banco : 'No asignada'}
                            </span>
                          </div>
                          {linkedAccount && (
                            <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                              <span>{linkedAccount.documentoId}</span>
                              <span>Nro: ...{linkedAccount.numeroCuenta.slice(-6)}</span>
                            </div>
                          )}
                        </div>

                        {/* Instructions if any */}
                        {pm.instrucciones && (
                          <div className="p-2 bg-amber-50/50 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                            <span className="font-bold block text-[10px] text-amber-700 uppercase">Instrucciones al Cobrar:</span>
                            {pm.instrucciones}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Badges */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${
                          pm.requiereReferencia
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {pm.requiereReferencia ? 'Requiere Referencia' : 'Sin Referencia'}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${
                          pm.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {pm.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* MODAL: CREAR / EDITAR MONEDA */}
      {/* ======================================================= */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingCurrency ? 'Editar Moneda' : 'Nueva Moneda'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCurrencyModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrencyForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código ISO *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="USD, VES, EUR"
                    value={currCodigo}
                    onChange={(e) => setCurrCodigo(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black font-mono uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Símbolo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="$, Bs., €"
                    value={currSimbolo}
                    onChange={(e) => setCurrSimbolo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo de la Moneda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Dólar Estadounidense, Bolívar Digital, Euro"
                  value={currNombre}
                  onChange={(e) => setCurrNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Decimales
                  </label>
                  <select
                    value={currDecimales}
                    onChange={(e) => setCurrDecimales(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="0">0 (Sin centavos)</option>
                    <option value="2">2 (Estándar .00)</option>
                    <option value="4">4 (.0000)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tasa respecto a Base *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    disabled={currEsPrincipal}
                    value={currEsPrincipal ? '1.00' : currValorTasa}
                    onChange={(e) => setCurrValorTasa(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Roles Toggles */}
              <div className="p-3 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currEsPrincipal}
                    onChange={(e) => {
                      setCurrEsPrincipal(e.target.checked);
                      if (e.target.checked) {
                        setCurrEsReferencia(false);
                        setCurrValorTasa('1.0');
                      }
                    }}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Establecer como Moneda Principal (Base de Inventario)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currEsReferencia}
                    disabled={currEsPrincipal}
                    onChange={(e) => {
                      setCurrEsReferencia(e.target.checked);
                      if (e.target.checked) {
                        setCurrEsPrincipal(false);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Establecer como Moneda de Referencia (Visualización Dual en Factura)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currActiva}
                    onChange={(e) => setCurrActiva(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Moneda Activa para Operaciones
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCurrencyModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Guardar Moneda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: CREAR / EDITAR CUENTA BANCARIA */}
      {/* ======================================================= */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingBank ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Bank Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                Selección Rápida de Entidad Bancaria:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {bankPresets.map((bp) => (
                  <button
                    key={bp.codigo}
                    type="button"
                    onClick={() => {
                      setBankBanco(bp.banco);
                      setBankCodigo(bp.codigo);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 rounded-lg text-[11px] font-medium text-slate-700 transition cursor-pointer"
                  >
                    {bp.banco.split(' ')[0]} ({bp.codigo})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveBankForm} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Institución Bancaria (BANCO) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Banesco Banco Universal"
                    value={bankBanco}
                    onChange={(e) => setBankBanco(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código (CODIGO) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0134, 0102"
                    value={bankCodigo}
                    onChange={(e) => setBankCodigo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número de Cuenta (NUMERO DE CUENTA) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="0134-0001-22-0001234567 (20 dígitos)"
                  value={bankNumero}
                  onChange={(e) => setBankNumero(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-black tracking-wider text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Documento de Identidad / RIF (DOCUMENTO DE ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="J-12345678-9 o V-12345678"
                    value={bankDocId}
                    onChange={(e) => setBankDocId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono Pago Móvil
                  </label>
                  <input
                    type="text"
                    placeholder="0414-1234567"
                    value={bankTelefono}
                    onChange={(e) => setBankTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titular de la Cuenta (TITULAR) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nombre de la empresa o titular"
                  value={bankTitular}
                  onChange={(e) => setBankTitular(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Cuenta
                  </label>
                  <select
                    value={bankTipo}
                    onChange={(e) => setBankTipo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CORRIENTE">Cuenta Corriente</option>
                    <option value="AHORRO">Cuenta de Ahorros</option>
                    <option value="VIRTUAL">Cuenta Virtual / Digital</option>
                    <option value="EFECTIVO">Caja / Bóveda Efectivo</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bankActiva}
                      onChange={(e) => setBankActiva(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Cuenta Activa para Operaciones
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Guardar Cuenta Bancaria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: CREAR / EDITAR MÉTODO DE PAGO */}
      {/* ======================================================= */}
      {showPmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingPm ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPmModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePmForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Método de Pago *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pago Móvil Banesco, Punto de Venta Mercantil, Efectivo Divisas"
                  value={pmNombre}
                  onChange={(e) => setPmNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Método de Pago *
                </label>
                <select
                  value={pmTipo}
                  onChange={(e) => setPmTipo(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="PAGO_MOVIL">Pago Móvil Interbancario</option>
                  <option value="EFECTIVO">Efectivo en Caja</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="PUNTO_VENTA">Punto de Venta / Tarjeta Débito/Crédito</option>
                  <option value="BIOPAGO">BioPago / Huella</option>
                  <option value="DIGITAL_ZELLE">Zelle / Dólares Digitales</option>
                  <option value="OTRO">Otro Método</option>
                </select>
              </div>

              {/* Moneda Vinculada (MANDATORY) */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-900">
                    1. Moneda Vinculada (Obligatorio) *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    Al menos una moneda
                  </span>
                </div>
                <select
                  required
                  value={pmMonedaId}
                  onChange={(e) => setPmMonedaId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Seleccione una moneda --</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} ({c.simbolo}) - {c.nombre} {c.esPrincipal ? '[Principal]' : c.esReferencia ? '[Referencia]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cuenta Bancaria Vinculada (MANDATORY) */}
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-blue-900">
                    2. Cuenta Bancaria Vinculada (Obligatorio) *
                  </label>
                  <span className="text-[10px] text-blue-700 font-medium">
                    Destino de los fondos
                  </span>
                </div>
                <select
                  required
                  value={pmCuentaId}
                  onChange={(e) => setPmCuentaId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccione una cuenta bancaria --</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.banco} ({a.codigo}) - {a.titular} - ...{a.numeroCuenta.slice(-6)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requiere Referencia & Status */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pmRequiereRef}
                    onChange={(e) => setPmRequiereRef(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    ¿Requiere ingresar N° de Referencia Bancaria al procesar el pago?
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pmActivo}
                    onChange={(e) => setPmActivo(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Método Activo en Caja
                  </span>
                </label>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instrucciones o Datos para el Cliente (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Enviar comprobante al WhatsApp 0414-1234567 indicando N° de venta."
                  value={pmInstrucciones}
                  onChange={(e) => setPmInstrucciones(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPmModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Guardar Método de Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
