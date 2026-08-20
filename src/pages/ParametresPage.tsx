import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, type Formula } from '@/lib/supabase';
import { formatPrice } from '@/lib/status';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function ParametresPage() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editPrix, setEditPrix] = useState('');
  const [addNom, setAddNom] = useState('');
  const [addPrix, setAddPrix] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Formula | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchFormulas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('formulas')
      .select('*')
      .order('prix', { ascending: true });
    if (error) {
      console.error(error);
    } else {
      setFormulas(data as Formula[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFormulas();
  }, [fetchFormulas]);

  const startEdit = (f: Formula) => {
    setEditingId(f.id);
    setEditNom(f.nom);
    setEditPrix(String(f.prix));
  };

  const saveEdit = async (id: string) => {
    const prix = parseInt(editPrix, 10);
    if (!editNom.trim() || isNaN(prix) || prix < 0) return;
    const { error } = await supabase
      .from('formulas')
      .update({
        nom: editNom.trim(),
        prix,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) {
      console.error(error);
      setToast({ type: 'error', msg: 'Erreur lors de la modification.' });
    } else {
      setEditingId(null);
      await fetchFormulas();
      setToast({ type: 'success', msg: 'Formule modifiée avec succès.' });
    }
  };

  const toggleActive = async (f: Formula) => {
    const { error } = await supabase
      .from('formulas')
      .update({ active: !f.active, updated_at: new Date().toISOString() })
      .eq('id', f.id);
    if (error) {
      console.error(error);
      setToast({ type: 'error', msg: 'Erreur lors du changement de statut.' });
    } else {
      await fetchFormulas();
      setToast({ type: 'success', msg: 'Statut de la formule mis à jour.' });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const prix = parseInt(addPrix, 10);
    if (!addNom.trim()) {
      setAddError('Le nom est obligatoire.');
      return;
    }
    if (isNaN(prix) || prix < 0) {
      setAddError('Le prix doit être un nombre valide.');
      return;
    }
    const { error } = await supabase.from('formulas').insert({
      nom: addNom.trim(),
      prix,
      active: true,
    });
    if (error) {
      setAddError(error.message);
    } else {
      setAddNom('');
      setAddPrix('');
      setAddError(null);
      await fetchFormulas();
      setToast({ type: 'success', msg: 'Formule ajoutée avec succès.' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('formulas').delete().eq('id', deleteTarget.id);
    if (error) {
      console.error(error);
      setToast({ type: 'error', msg: 'Erreur lors de la suppression.' });
    } else {
      setDeleteTarget(null);
      await fetchFormulas();
      setToast({ type: 'success', msg: 'Formule supprimée avec succès.' });
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Paramètres</h1>
      <p className="text-sm text-slate-500 mb-6">Gérez les formules d'abonnement et leurs prix.</p>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Formules */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Formules d'abonnement</h2>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Chargement…</div>
        ) : formulas.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Aucune formule.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {formulas.map((f) => (
              <div key={f.id} className="px-5 py-3 flex items-center gap-4">
                {editingId === f.id ? (
                  <>
                    <input
                      type="text"
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={editPrix}
                      onChange={(e) => setEditPrix(e.target.value)}
                      className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                    />
                    <span className="text-sm text-slate-500">Ar</span>
                    <button
                      onClick={() => saveEdit(f.id)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                      title="Enregistrer"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                      title="Annuler"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{f.nom}</p>
                      <p className="text-xs text-slate-500">{formatPrice(f.prix)}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        f.active
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                          : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-600/20'
                      }`}
                    >
                      {f.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => toggleActive(f)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
                    >
                      {f.active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => startEdit(f)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(f)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ajouter une formule */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Ajouter une formule</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={addNom}
            onChange={(e) => setAddNom(e.target.value)}
            placeholder="Nom de la formule"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={addPrix}
              onChange={(e) => setAddPrix(e.target.value)}
              placeholder="Prix (Ar)"
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
        </form>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer la formule"
        message={`Voulez-vous vraiment supprimer la formule "${deleteTarget?.nom}" ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
