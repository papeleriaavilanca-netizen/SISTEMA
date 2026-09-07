import React, { useState } from 'react';
import { Category, Product } from '../types';
import { db } from '../services/db';
import { Tags, Plus, Edit2, Trash2, Check, AlertCircle, Package } from 'lucide-react';

interface CategoriesModuleProps {
  categories: Category[];
  products: Product[];
  canManage: boolean;
}

export const CategoriesModule: React.FC<CategoriesModuleProps> = ({
  categories,
  products,
  canManage,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('indigo');
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    setEditingCat(null);
    setNombre('');
    setDescripcion('');
    setColor('indigo');
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setNombre(cat.nombre);
    setDescripcion(cat.descripcion || '');
    setColor(cat.color || 'indigo');
    setFormError('');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setFormError('El nombre de la categoría es obligatorio.');
      return;
    }

    const payload: Category = {
      id: editingCat ? editingCat.id : 'cat-' + Date.now(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      color,
    };

    db.saveCategory(payload);
    setShowModal(false);
  };

  const handleDelete = (cat: Category) => {
    try {
      if (confirm(`¿Confirma eliminar la categoría "${cat.nombre}"?`)) {
        db.deleteCategory(cat.id);
      }
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar la categoría.');
    }
  };

  const colorOptions = [
    { id: 'indigo', bg: 'bg-indigo-600', text: 'text-indigo-400' },
    { id: 'emerald', bg: 'bg-emerald-600', text: 'text-emerald-400' },
    { id: 'blue', bg: 'bg-blue-600', text: 'text-blue-400' },
    { id: 'amber', bg: 'bg-amber-600', text: 'text-amber-400' },
    { id: 'purple', bg: 'bg-purple-600', text: 'text-purple-400' },
    { id: 'rose', bg: 'bg-rose-600', text: 'text-rose-400' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Tags className="w-5 h-5 text-emerald-600" />
            Gestión de Categorías
          </h2>
          <p className="text-xs text-slate-500">
            Organiza el catálogo de productos para una navegación rápida y ergonómica en el TPV.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
        )}
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const productCount = products.filter((p) => p.categoriaId === cat.id && p.activo).length;

          return (
            <div
              key={cat.id}
              className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3 hover:border-slate-300 hover:shadow-xs transition shadow-2xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                    <Tags className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">{cat.nombre}</h3>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>{productCount} productos asociados</span>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                      title="Editar categoría"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {cat.descripcion && (
                <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {cat.descripcion}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Tags className="w-4 h-4 text-emerald-600" />
                {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-xl flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Papelería & Oficina"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Breve detalle de los artículos que incluye..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
