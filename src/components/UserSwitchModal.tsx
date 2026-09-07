import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { db, ROLE_PERMISSIONS } from '../services/db';
import { X, Lock, Shield, User as UserIcon, Check, AlertCircle, LogOut } from 'lucide-react';

interface UserSwitchModalProps {
  currentUser: User;
  users: User[];
  onClose: () => void;
  onUserChanged: (user: User) => void;
  onLogout?: () => void;
}

export const UserSwitchModal: React.FC<UserSwitchModalProps> = ({
  currentUser,
  users,
  onClose,
  onUserChanged,
  onLogout,
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setPinInput('');
    setErrorMsg('');
  };

  const handleNumberClick = (num: string) => {
    if (pinInput.length < 6) {
      setPinInput((prev) => prev + num);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleVerifyPin = () => {
    if (!selectedUser) return;
    if (pinInput === selectedUser.pin) {
      db.setCurrentUser(selectedUser);
      onUserChanged(selectedUser);
      onClose();
    } else {
      setErrorMsg('PIN de seguridad incorrecto. Intente nuevamente.');
      setPinInput('');
    }
  };

  const roleColors: Record<UserRole, string> = {
    ADMINISTRADOR: 'bg-purple-50 border-purple-200 text-purple-700 font-bold',
    VENDEDOR: 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold',
    USUARIO: 'bg-blue-50 border-blue-200 text-blue-700 font-bold',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-base">Cambio Rápido de Cajero / Usuario</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!selectedUser ? (
            <div>
              <p className="text-xs text-slate-500 mb-3">
                Seleccione el perfil de usuario para iniciar turno o cambiar de cajero:
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {users
                  .filter((u) => u.activo)
                  .map((u) => {
                    const isCurrent = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition ${
                          isCurrent
                            ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 border border-slate-300">
                            {u.nombre.charAt(0)}
                            {u.apellido.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                              {u.nombre} {u.apellido}
                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                                  Activo
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">Doc: {u.docId}</div>
                          </div>
                        </div>

                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            roleColors[u.role]
                          }`}
                        >
                          {u.role}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Explicit Logout Option */}
              {onLogout && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión Activa (Salir al Login)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected User Header */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold flex items-center justify-center text-sm">
                    {selectedUser.nombre.charAt(0)}
                    {selectedUser.apellido.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {selectedUser.nombre} {selectedUser.apellido}
                    </div>
                    <div className="text-xs text-slate-500">{selectedUser.role}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold underline"
                >
                  Cambiar
                </button>
              </div>

              {/* PIN Display */}
              <div className="text-center py-2">
                <label className="text-xs text-slate-600 block mb-2 font-medium">
                  Ingrese el PIN de Seguridad:
                </label>
                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-10 h-12 rounded-xl border flex items-center justify-center text-xl font-mono transition ${
                        pinInput.length > i
                          ? 'bg-white border-emerald-500 text-slate-900 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      {pinInput.length > i ? '•' : ''}
                    </div>
                  ))}
                </div>
                {errorMsg && (
                  <p className="text-xs text-red-600 mt-2 flex items-center justify-center gap-1 font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumberClick(num)}
                    className="h-12 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-lg rounded-xl transition shadow-xs active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-12 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition flex items-center justify-center shadow-xs active:scale-95"
                >
                  Borrar
                </button>
                <button
                  type="button"
                  onClick={() => handleNumberClick('0')}
                  className="h-12 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-lg rounded-xl transition shadow-xs active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleVerifyPin}
                  disabled={pinInput.length < 4}
                  className="h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  Entrar
                </button>
              </div>

              {/* Demo Hint */}
              <div className="text-[11px] text-slate-500 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                PIN de prueba para {selectedUser.nombre}: <strong className="text-slate-800 font-mono">{selectedUser.pin}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
