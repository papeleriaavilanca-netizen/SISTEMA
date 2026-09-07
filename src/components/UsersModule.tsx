import React, { useState } from 'react';
import { User, UserRole, RolePermissions } from '../types';
import { db, ROLE_PERMISSIONS } from '../services/db';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Check,
  X,
  Edit2,
  Trash2,
  Key,
  Phone,
  CreditCard,
  Mail,
  AlertCircle,
} from 'lucide-react';

interface UsersModuleProps {
  users: User[];
  currentUser: User;
  canManage: boolean;
}

export const UsersModule: React.FC<UsersModuleProps> = ({
  users,
  currentUser,
  canManage,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewTab, setViewTab] = useState<'USERS' | 'PERMISSIONS'>('USERS');

  // Form Fields
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [docId, setDocId] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('VENDEDOR');
  const [activo, setActivo] = useState(true);
  const [formError, setFormError] = useState('');

  const openCreateModal = () => {
    setEditingUser(null);
    setNombre('');
    setApellido('');
    setDocId('');
    setTelefono('');
    setEmail('');
    setPin(Math.floor(1000 + Math.random() * 9000).toString());
    setRole('VENDEDOR');
    setActivo(true);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setNombre(u.nombre);
    setApellido(u.apellido);
    setDocId(u.docId);
    setTelefono(u.telefono || '');
    setEmail(u.email);
    setPin(u.pin);
    setRole(u.role);
    setActivo(u.activo);
    setFormError('');
    setShowModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setFormError('El Nombre es obligatorio.');
      return;
    }
    if (!apellido.trim()) {
      setFormError('El Apellido es obligatorio.');
      return;
    }
    if (!docId.trim()) {
      setFormError('El Documento de Identidad (Doc Id.) es obligatorio.');
      return;
    }
    if (!pin || pin.length < 4) {
      setFormError('El PIN debe tener al menos 4 dígitos numéricos.');
      return;
    }

    const payload: User = {
      id: editingUser ? editingUser.id : 'usr-' + Date.now(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      docId: docId.trim(),
      telefono: telefono.trim() || undefined,
      email: email.trim() || `${nombre.toLowerCase().replace(/\s+/g, '')}@empresa.com`,
      pin: pin.trim(),
      role,
      activo,
      creadoEn: editingUser ? editingUser.creadoEn : new Date().toISOString(),
    };

    try {
      db.saveUser(payload);
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el usuario.');
    }
  };

  const handleDeleteUser = (u: User) => {
    if (confirm(`¿Confirma eliminar al usuario ${u.nombre} ${u.apellido}?`)) {
      try {
        db.deleteUser(u.id);
      } catch (err: any) {
        alert(err.message || 'No se pudo eliminar el usuario.');
      }
    }
  };

  const permissionsList = [
    { key: 'canAccessPOS' as keyof RolePermissions, label: 'Acceso a Terminal TPV (Ventas y Cobro)' },
    { key: 'canApplyDiscounts' as keyof RolePermissions, label: 'Aplicar Descuentos en Línea de Venta' },
    { key: 'canManageRefunds' as keyof RolePermissions, label: 'Procesar Devoluciones de Clientes' },
    { key: 'canViewReports' as keyof RolePermissions, label: 'Consultar Reportes de Ventas y Cierre' },
    { key: 'canManageProducts' as keyof RolePermissions, label: 'Crear y Modificar Catálogo de Productos y Precios' },
    { key: 'canManageCategories' as keyof RolePermissions, label: 'Administrar Categorías de Productos' },
    { key: 'canManagePurchases' as keyof RolePermissions, label: 'Registrar Compras a Proveedores (Costos)' },
    { key: 'canManageInventory' as keyof RolePermissions, label: 'Ajuste Manual de Inventario y Kardex' },
    { key: 'canManageUsers' as keyof RolePermissions, label: 'Administración de Usuarios y Permisos' },
    { key: 'canManageConfig' as keyof RolePermissions, label: 'Configuración Fiscal, Empresa, Monedas e Impuestos' },
    { key: 'canViewAuditLogs' as keyof RolePermissions, label: 'Visualizar Registros de Auditoría y Seguridad' },
  ];

  const roleColors: Record<UserRole, string> = {
    ADMINISTRADOR: 'bg-purple-50 text-purple-700 border-purple-200',
    VENDEDOR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    USUARIO: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="p-4 md:p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Control de Usuarios, Roles & Seguridad
          </h2>
          <p className="text-xs text-slate-500">
            Administración de perfiles autorizados con roles: USUARIOS, VENDEDOR y ADMINISTRADOR.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewTab('USERS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewTab === 'USERS' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Usuarios ({users.length})
            </button>
            <button
              onClick={() => setViewTab('PERMISSIONS')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewTab === 'PERMISSIONS' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Matriz de Permisos
            </button>
          </div>

          {canManage && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      {viewTab === 'USERS' ? (
        /* Users List */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u) => {
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                className={`p-4 rounded-2xl border bg-white shadow-xs transition space-y-3 ${
                  isSelf ? 'border-emerald-500/60 ring-1 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm shadow-xs">
                      {u.nombre.charAt(0)}
                      {u.apellido.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        {u.nombre} {u.apellido}
                        {isSelf && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-1.5 py-0.5 rounded">
                            Tú
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${
                          roleColors[u.role]
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Editar usuario"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* User Details Grid */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-slate-400" />
                      Doc Id (Obligatorio):
                    </span>
                    <strong className="font-mono text-slate-800">{u.docId}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      Teléfono (Opcional):
                    </span>
                    <span className="text-slate-800 font-medium">{u.telefono || 'No registrado'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      Email / Usuario:
                    </span>
                    <span className="text-slate-800 truncate max-w-[170px] font-medium">{u.email}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Key className="w-3 h-3 text-slate-400" />
                      PIN Acceso TPV:
                    </span>
                    <span className="font-mono font-bold text-emerald-600">•••• ({u.pin})</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Permissions Matrix View */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Lista de Permisos Desplegada según el Rol
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control granular de privilegios asignados por jerarquía para USUARIOS, VENDEDOR y ADMINISTRADOR.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Funcionalidad / Módulo</th>
                  <th className="px-4 py-3.5 text-center">USUARIOS</th>
                  <th className="px-4 py-3.5 text-center">VENDEDOR</th>
                  <th className="px-4 py-3.5 text-center">ADMINISTRADOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissionsList.map((perm) => {
                  const allowedUser = ROLE_PERMISSIONS['USUARIO'][perm.key];
                  const allowedSeller = ROLE_PERMISSIONS['VENDEDOR'][perm.key];
                  const allowedAdmin = ROLE_PERMISSIONS['ADMINISTRADOR'][perm.key];

                  return (
                    <tr key={perm.key} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-800">{perm.label}</td>
                      <td className="px-4 py-3.5 text-center">
                        {allowedUser ? (
                          <span className="inline-flex p-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex p-1 rounded-md bg-slate-100 text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {allowedSeller ? (
                          <span className="inline-flex p-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex p-1 rounded-md bg-slate-100 text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {allowedAdmin ? (
                          <span className="inline-flex p-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex p-1 rounded-md bg-slate-100 text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                {editingUser ? 'Editar Perfil de Usuario' : 'Registrar Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Required Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre (Llenado Obligatorio) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Carlos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellido (Llenado Obligatorio) *
                  </label>
                  <input
                    type="text"
                    required
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ej. Ávila"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Doc ID & Optional Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Doc Id. (Llenado Obligatorio) *
                  </label>
                  <input
                    type="text"
                    required
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                    placeholder="Ej. V-18450123 / DNI / RIF"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono (Llenado Opcional)
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. +58 414 1234567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Email & PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email / Usuario
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@empresa.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Acceso TPV (4-6 dígitos) *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rol del Usuario en el Sistema *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['USUARIO', 'VENDEDOR', 'ADMINISTRADOR'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        role === r
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
