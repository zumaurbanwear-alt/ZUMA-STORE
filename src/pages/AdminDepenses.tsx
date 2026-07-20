import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// 100% local — no Supabase table, no API route. Everything lives in the
// browser's localStorage on whichever machine is used to enter expenses.
// This is intentional (personal tracking, not part of the store's data
// model), but it also means it does NOT sync across devices/browsers.
// ---------------------------------------------------------------------------

type Expense = {
  id: string;
  nom: string;
  produits: string;
  prix: number;
  date: string; // ISO yyyy-mm-dd
};

const STORAGE_KEY = "zuma_depenses_v1";

const loadExpenses = (): Expense[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveExpenses = (items: Expense[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const monthKey = (isoDate: string) => isoDate.slice(0, 7); // yyyy-mm

const formatDateFr = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
};

const monthLabelFr = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

const AdminDepenses = () => {
  const nav = useNavigate();
  const { user, isAdmin, loading } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthKey(todayIso()));
  const [exporting, setExporting] = useState(false);

  const [form, setForm] = useState({ nom: "", produits: "", prix: "", date: todayIso() });

  useEffect(() => {
    if (loading) return;
    if (!user) nav("/zm-portal-x92-login");
  }, [user, loading, nav]);

  useEffect(() => {
    setExpenses(loadExpenses());
  }, []);

  const availableMonths = useMemo(() => {
    const keys = new Set(expenses.map((e) => monthKey(e.date)));
    keys.add(monthKey(todayIso()));
    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1)); // most recent first
  }, [expenses]);

  const filtered = useMemo(
    () =>
      expenses
        .filter((e) => monthKey(e.date) === selectedMonth)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [expenses, selectedMonth]
  );

  const total = useMemo(() => filtered.reduce((sum, e) => sum + (Number.isFinite(e.prix) ? e.prix : 0), 0), [filtered]);

  const addExpense = () => {
    const prixNum = parseFloat(form.prix.replace(",", "."));
    if (!form.nom.trim() || !form.date || !Number.isFinite(prixNum)) return;

    const next: Expense = {
      id: crypto.randomUUID(),
      nom: form.nom.trim(),
      produits: form.produits.trim(),
      prix: prixNum,
      date: form.date,
    };
    const updated = [...expenses, next];
    setExpenses(updated);
    saveExpenses(updated);
    setForm({ nom: "", produits: "", prix: "", date: form.date });
    setSelectedMonth(monthKey(form.date));
  };

  const deleteExpense = (id: string) => {
    if (!window.confirm("Supprimer cette dépense ?")) return;
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    saveExpenses(updated);
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Dépenses — ${monthLabelFr(selectedMonth)}`, 14, 16);

      autoTable(doc, {
        startY: 22,
        head: [["Nom", "Produits", "Prix (MAD)", "Date"]],
        body: filtered.map((e) => [e.nom, e.produits || "—", e.prix.toFixed(2), formatDateFr(e.date)]),
        foot: [["", "", "Total", `${total.toFixed(2)} MAD`]],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [20, 20, 20] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
      });

      doc.save(`depenses-${selectedMonth}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background grid place-items-center text-muted-foreground text-xs">Loading...</div>;
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl tracking-[0.25em] mb-3">ACCESS DENIED</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your account does not have admin privileges. Contact the store owner.
          </p>
          <button onClick={() => supabase.auth.signOut().then(() => nav("/zm-portal-x92-login"))} className="mt-6 px-5 py-2 border border-primary text-primary text-[10px] tracking-[0.22em] uppercase hover:bg-primary hover:text-primary-foreground">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <header className="flex justify-between items-center mb-10 border-b border-border pb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.3em]">DÉPENSES</h1>
          <p className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground mt-1">
            Suivi personnel — stocké localement sur cet appareil
          </p>
        </div>
        <button onClick={() => nav("/zm-portal-x92")} className="px-4 py-2 border border-border text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi">
          ← Retour admin
        </button>
      </header>

      {/* Add form */}
      <section className="mb-8 border border-border p-4">
        <h2 className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-3">Ajouter une dépense</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Nom"
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            className="bg-transparent border border-border px-3 py-2 text-xs"
          />
          <input
            type="text"
            placeholder="Produits"
            value={form.produits}
            onChange={(e) => setForm((f) => ({ ...f, produits: e.target.value }))}
            className="bg-transparent border border-border px-3 py-2 text-xs"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Prix (MAD)"
            value={form.prix}
            onChange={(e) => setForm((f) => ({ ...f, prix: e.target.value }))}
            className="bg-transparent border border-border px-3 py-2 text-xs"
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="bg-transparent border border-border px-3 py-2 text-xs"
          />
          <button
            type="button"
            onClick={addExpense}
            className="border border-primary text-primary text-[10px] tracking-[0.2em] uppercase px-3 py-2 hover:bg-primary hover:text-primary-foreground"
          >
            Ajouter
          </button>
        </div>
      </section>

      {/* Filter + export */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Mois :</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border border-border px-3 py-2 text-xs capitalize"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m} className="capitalize">
                {monthLabelFr(m)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={exportPdf}
          disabled={exporting || filtered.length === 0}
          className="px-4 py-2 border border-border text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi disabled:opacity-40"
        >
          {exporting ? "Export..." : "Exporter en PDF"}
        </button>
      </div>

      {/* Table */}
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Nom</th>
              <th className="px-3 py-2 text-left">Produits</th>
              <th className="px-3 py-2 text-left">Prix (MAD)</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Aucune dépense pour ce mois.
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-muted/20">
                <td className="px-3 py-2">{e.nom}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.produits || "—"}</td>
                <td className="px-3 py-2">{e.prix.toFixed(2)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatDateFr(e.date)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => deleteExpense(e.id)}
                    className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground hover:text-red-500"
                  >
                    Suppr.
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-muted/20 font-medium">
                <td className="px-3 py-2" colSpan={2}>Total</td>
                <td className="px-3 py-2 text-primary-hi">{total.toFixed(2)} MAD</td>
                <td className="px-3 py-2" colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default AdminDepenses;
