import React, { useState } from 'react';
import { CompanyConfig, CurrencyConfig, Tax, SecurityConfig } from '../types';
import { db } from '../services/db';
import {
  Settings,
  Building,
  DollarSign,
  Receipt,
  Database,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Download,
  Upload,
  RotateCcw,
  Wifi,
  ShieldCheck,
  Lock,
  Clock,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

interface ConfigModuleProps {
  company: CompanyConfig;
  currency: CurrencyConfig;
  taxes: Tax[];
  canManage: boolean;
}

export const ConfigModule: React.FC<ConfigModuleProps> = ({
  company,
  currency,
  taxes,
  canManage,
}) => {
  const [activeTab, setActiveTab] = useState<'EMPRESA' | 'MONEDA' | 'IMPUESTOS' | 'SEGURIDAD' | 'DATABASE'>('EMPRESA');
  const [savedSuccess, setSavedSuccess] = useState('');

  // Security Form State
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(() => db.getSecurityConfig());
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(securityConfig.autoLogoutEnabled);
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(securityConfig.autoLogoutMinutes.toString());
  const [masterUsername, setMasterUsername] = useState(securityConfig.masterUsername || 'admin');
  const [masterPassword, setMasterPassword] = useState(securityConfig.masterPassword || 'master');

  // Company Form State
  const [nombre, setNombre] = useState(company.nombre);
  const [rif, setRif] = useState(company.rif);
  const [nit, setNit] = useState(company.nit);
  const [direccion, setDireccion] = useState(company.direccion);
  const [telefono, setTelefono] = useState(company.telefono);
  const [email, setEmail] = useState(company.email);
  const [instagram, setInstagram] = useState(company.redesSociales.instagram || '');
  const [whatsapp, setWhatsapp] = useState(company.redesSociales.whatsapp || '');
  const [facebook, setFacebook] = useState(company.redesSociales.facebook || '');
  const [sitioWeb, setSitioWeb] = useState(company.redesSociales.sitioWeb || '');
  const [mensajePie, setMensajePie] = useState(company.mensajePieTicket || '');

  // Currency Form State
  const [codPrim, setCodPrim] = useState(currency.monedaPrincipal.codigo);
  const [simbPrim, setSimbPrim] = useState(currency.monedaPrincipal.simbolo);
  const [nomPrim, setNomPrim] = useState(currency.monedaPrincipal.nombre);
  const [codRef, setCodRef] = useState(currency.monedaReferencia.codigo);
  const [simbRef, setSimbRef] = useState(currency.monedaReferencia.simbolo);
  const [nomRef, setNomRef] = useState(currency.monedaReferencia.nombre);
  const [tasaCambio, setTasaCambio] = useState(currency.tasaCambio.toString());

  // Taxes Form State
  const [newTaxNombre, setNewTaxNombre] = useState('');
  const [newTaxPorcentaje, setNewTaxPorcentaje] = useState('16');

  const flashSuccess = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(''), 3000);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateCompany({
      nombre,
      rif,
      nit,
      direccion,
      telefono,
      email,
      redesSociales: {
        instagram,
        whatsapp,
        facebook,
        sitioWeb,
      },
      mensajePieTicket: mensajePie,
    });
    flashSuccess('Datos de la Empresa guardados exitosamente.');
  };

  const handleSaveCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(tasaCambio);
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('La tasa de cambio debe ser un número mayor a 0');
      return;
    }

    db.updateCurrency({
      monedaPrincipal: {
        codigo: codPrim.trim().toUpperCase(),
        simbolo: simbPrim.trim(),
        nombre: nomPrim.trim(),
        decimales: 2,
      },
      monedaReferencia: {
        codigo: codRef.trim().toUpperCase(),
        simbolo: simbRef.trim(),
        nombre: nomRef.trim(),
        decimales: 2,
      },
      tasaCambio: rateNum,
      ultimaActualizacionTasa: new Date().toISOString(),
      modoAutoActualizar: currency.modoAutoActualizar,
    });
    flashSuccess('Configuración de Monedas y Tasa guardada.');
  };

  const handleAddTax = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(newTaxPorcentaje);
    if (!newTaxNombre.trim() || isNaN(pct) || pct < 0) return;

    db.saveTax({
      id: 'tax-' + Date.now(),
      nombre: newTaxNombre.trim(),
      porcentaje: pct,
      activo: true,
      esPredeterminado: false,
    });
    setNewTaxNombre('');
    setNewTaxPorcentaje('16');
    flashSuccess('Impuesto agregado correctamente.');
  };

  const handleDeleteTax = (id: string) => {
    if (confirm('¿Eliminar este impuesto?')) {
      db.deleteTax(id);
      flashSuccess('Impuesto eliminado.');
    }
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(autoLogoutMinutes, 10);
    if (isNaN(mins) || mins < 1) {
      alert('El tiempo de inactividad debe ser al menos 1 minuto');
      return;
    }
    const updated: SecurityConfig = {
      autoLogoutEnabled,
      autoLogoutMinutes: mins,
      masterUsername: masterUsername.trim() || 'admin',
      masterPassword: masterPassword.trim() || 'master',
    };
    db.updateSecurityConfig(updated);
    setSecurityConfig(updated);
    flashSuccess('Configuración de Seguridad y Cierre Automático guardada correctamente.');
  };

  const handleExportJson = () => {
    const jsonStr = db.exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-tpv-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        db.importDatabaseJson(text);
        flashSuccess('Base de datos restaurada con éxito.');
      } catch (err: any) {
        alert(err.message || 'Error al restaurar archivo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDefaults = () => {
    if (
      confirm(
        'ATENCIÓN: ¿Está seguro de reiniciar la base de datos a los valores de fábrica de prueba? Se restablecerán productos, compras y ventas.'
      )
    ) {
      db.resetToFactoryDefaults();
      flashSuccess('Sistema restaurado a valores iniciales.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            Configuración General del Sistema
          </h2>
          <p className="text-xs text-slate-500">
            Parámetros fiscales, perfil de empresa, multimoneda, aranceles y respaldo de datos.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs">
            <Check className="w-4 h-4" />
            {savedSuccess}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: 'EMPRESA', label: '1. Empresa & RIF/NIT', icon: Building },
          { id: 'MONEDA', label: '2. Monedas & Tasa', icon: DollarSign },
          { id: 'IMPUESTOS', label: '3. Aranceles e Impuestos', icon: Receipt },
          { id: 'SEGURIDAD', label: '4. Seguridad & Cierre Auto', icon: ShieldCheck },
          { id: 'DATABASE', label: '5. Base de Datos & Respaldo', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                isSelected
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                  : 'bg-slate-100 text-slate-500 hover:text-slate-800 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMPRESA */}
      {activeTab === 'EMPRESA' && (
        <form onSubmit={handleSaveCompany} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              Datos Fiscales de la Empresa
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Esta información se imprime en todos los tickets fiscales de venta y en el mensaje de WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Razón Social / Nombre Comercial *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RIF (Registro de Información Fiscal) *
              </label>
              <input
                type="text"
                required
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                placeholder="Ej. J-31245678-9"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIT (Número de Identificación Tributaria) *
              </label>
              <input
                type="text"
                required
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                placeholder="Ej. 0614-250890-101-2"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono Principal *</label>
              <input
                type="text"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Fiscal Completa *</label>
              <input
                type="text"
                required
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp de Atención</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+58414..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Instagram</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@papeleria_avila"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Facebook</label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sitio Web</label>
              <input
                type="text"
                value={sitioWeb}
                onChange={(e) => setSitioWeb(e.target.value)}
                placeholder="www.empresa.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mensaje de Agradecimiento / Garantía (Pie de Ticket)
              </label>
              <textarea
                rows={2}
                value={mensajePie}
                onChange={(e) => setMensajePie(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={!canManage}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Guardar Datos de Empresa
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MONEDA */}
      {activeTab === 'MONEDA' && (
        <form onSubmit={handleSaveCurrency} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Configuración de Multimoneda & Tasa de Cambio
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura la moneda principal (base contable) y la moneda de referencia para visualización y cobros duales.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Moneda Principal */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-emerald-700 block">Moneda Principal (Base Contable)</span>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Código ISO (Ej. USD, EUR, VES)</label>
                <input
                  type="text"
                  required
                  value={codPrim}
                  onChange={(e) => setCodPrim(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Símbolo (Ej. $, €)</label>
                <input
                  type="text"
                  required
                  value={simbPrim}
                  onChange={(e) => setSimbPrim(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Descriptivo</label>
                <input
                  type="text"
                  required
                  value={nomPrim}
                  onChange={(e) => setNomPrim(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Moneda de Referencia */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-emerald-700 block">Moneda de Referencia (Visualización Dual)</span>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Código ISO (Ej. VES, COP, USD)</label>
                <input
                  type="text"
                  required
                  value={codRef}
                  onChange={(e) => setCodRef(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Símbolo (Ej. Bs., $)</label>
                <input
                  type="text"
                  required
                  value={simbRef}
                  onChange={(e) => setSimbRef(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Descriptivo</label>
                <input
                  type="text"
                  required
                  value={nomRef}
                  onChange={(e) => setNomRef(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Tasa de Cambio Principal */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Tasa de Cambio Oficial (1 {codPrim} equivale a cuántos {codRef}):
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={tasaCambio}
                  onChange={(e) => setTasaCambio(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-mono">{codRef}</span>
              </div>
              <span className="text-xs text-slate-500">
                Última actualización: {new Date(currency.ultimaActualizacionTasa).toLocaleString('es-VE')}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={!canManage}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Guardar Monedas & Tasa
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: IMPUESTOS */}
      {activeTab === 'IMPUESTOS' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Catálogo de Aranceles e Impuestos (IVA)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Define los impuestos fiscales seleccionables al registrar productos o servicios en el sistema.
            </p>
          </div>

          {/* Add Tax Form */}
          {canManage && (
            <form onSubmit={handleAddTax} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Impuesto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. IVA General (16%) o IGTF"
                  value={newTaxNombre}
                  onChange={(e) => setNewTaxNombre(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="w-32">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Porcentaje (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={newTaxPorcentaje}
                  onChange={(e) => setNewTaxPorcentaje(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Impuesto
              </button>
            </form>
          )}

          {/* Taxes Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-4 py-3">Nombre del Impuesto</th>
                  <th className="px-4 py-3">Porcentaje Aplicable</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Predeterminado</th>
                  {canManage && <th className="px-4 py-3 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxes.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{t.nombre}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600">{t.porcentaje}%</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        Activo
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.esPredeterminado ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                          Predeterminado
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteTax(t.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar impuesto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SEGURIDAD & CIERRE AUTOMATICO */}
      {activeTab === 'SEGURIDAD' && (
        <form onSubmit={handleSaveSecurity} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Seguridad del Sistema & Cierre Automático por Inactividad
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control de acceso obligatorio, temporizador de inactividad, enrutamiento por roles y credenciales maestras.
            </p>
          </div>

          {/* Section 1: Auto Logout Inactivity Settings */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Cierre de Sesión Automático por Inactividad</h4>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                    Monitorea continuamente la ausencia de movimiento del ratón, pulsaciones de teclas, clics y toques en pantalla. Cuando transcurre el tiempo sin actividad, el sistema cierra la sesión y vuelve a la pantalla de Login para salvaguardar la caja y datos financieros.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={autoLogoutEnabled}
                  onChange={(e) => setAutoLogoutEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Inactivity Duration Controls */}
            {autoLogoutEnabled && (
              <div className="pt-3 border-t border-slate-200/80 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Tiempo límite de inactividad antes de cerrar sesión:
                </label>

                {/* Preset Quick Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '2 min (Alto Riesgo)', value: 2 },
                    { label: '5 min', value: 5 },
                    { label: '10 min (Recomendado)', value: 10 },
                    { label: '15 min', value: 15 },
                    { label: '30 min', value: 30 },
                    { label: '60 min', value: 60 },
                  ].map((preset) => {
                    const isSelected = autoLogoutMinutes === preset.value.toString();
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setAutoLogoutMinutes(preset.value.toString())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom numeric input */}
                <div className="max-w-xs flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="1"
                    max="480"
                    required
                    value={autoLogoutMinutes}
                    onChange={(e) => setAutoLogoutMinutes(e.target.value)}
                    className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-600 font-medium">minutos de inactividad</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Master Credentials for Initial Setup */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Credenciales de Acceso Maestro & Configuración Inicial</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Utilice estas credenciales para la configuración inicial y el acceso de superadministrador. Por defecto: usuario <strong>admin</strong> y clave <strong>master</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Usuario Maestro *
                </label>
                <input
                  type="text"
                  required
                  value={masterUsername}
                  onChange={(e) => setMasterUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Identificador principal de acceso</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clave Master *
                </label>
                <input
                  type="text"
                  required
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="master"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Contraseña para inicialización y privilegios totales</span>
              </div>
            </div>
          </div>

          {/* Section 3: Smart Role Redirection Policy Overview */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 text-slate-700 space-y-2">
            <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Políticas de Enrutamiento Automático Activas
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-emerald-100 shadow-2xs">
                <div className="font-bold text-purple-700 mb-0.5">ADMINISTRADOR</div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  Redirección directa al <strong>Dashboard de Estadísticas</strong> para supervisar ventas, finanzas e inventario.
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-emerald-100 shadow-2xs">
                <div className="font-bold text-emerald-700 mb-0.5">VENDEDOR</div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  Redirección automática a la <strong>Página de Ventas (TPV)</strong> para atención inmediata en mostrador.
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-emerald-100 shadow-2xs">
                <div className="font-bold text-slate-700 mb-0.5">USUARIO / ALMACÉN</div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  Redirección al <strong>Catálogo de Productos</strong> y control de existencias.
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Guardar Configuración de Seguridad
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: BASE DE DATOS & RESPALDO */}
      {activeTab === 'DATABASE' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Gestión de Base de Datos Propia & Sincronización
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Almacenamiento persistente, sincronización automática periódica y respaldo exportable en formato JSON.
            </p>
          </div>

          {/* Sync status card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Sincronización Online Automática Activa</div>
                <div className="text-xs text-slate-500">
                  Última sincronización local: {new Date().toLocaleTimeString('es-VE')}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                db.simulateOnlineSync();
                flashSuccess('Sincronización online forzada completada.');
              }}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition"
            >
              Sincronizar Ahora
            </button>
          </div>

          {/* Export & Import Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-600" />
                Exportar Copia de Seguridad (.JSON)
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Descarga un respaldo íntegro de productos, clientes, configuración, ventas, compras y auditoría.
              </p>
              <button
                onClick={handleExportJson}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Backup JSON
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                Restaurar Copia de Seguridad
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Restaura el sistema seleccionando un archivo JSON exportado previamente.
              </p>
              <label className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Cargar Archivo JSON</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          {/* Factory Reset */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-red-600">Restablecer Datos Iniciales de Prueba</div>
              <p className="text-[11px] text-slate-500">
                Reinicia la base de datos con los datos de papelería, productos, tasas y usuarios de muestra.
              </p>
            </div>
            <button
              onClick={handleResetDefaults}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar de Fábrica
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
