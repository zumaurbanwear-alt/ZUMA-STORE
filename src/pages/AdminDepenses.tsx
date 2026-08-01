import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signOutAdmin } from "@/lib/supabaseAuth";
import { supabase } from "@/integrations/supabase/client";

type Expense = {
  id: string;
  nom: string;
  produits: string | null;
  prix: number;
  date: string; // ISO yyyy-mm-dd
  mode_paiement: "cash" | "bancaire" | null;
};

type CashMovement = {
  id: string;
  type: "cash" | "bancaire";
  montant: number;
  note: string | null;
  date: string;
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
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthKey(todayIso()));
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ nom: "", produits: "", prix: "", date: todayIso(), mode_paiement: "cash" as "cash" | "bancaire" | "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [autoCashRevenue, setAutoCashRevenue] = useState(0);
  const [autoBancaireRevenue, setAutoBancaireRevenue] = useState(0);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addMoneyForm, setAddMoneyForm] = useState({
    type: "cash" as "cash" | "bancaire",
    montant: "",
  });
  const [savingMoney, setSavingMoney] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) nav("/zm-portal-x92-login");
  }, [user, loading, nav]);

  const loadExpenses = async () => {
    setFetching(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("depenses")
      .select("id, nom, produits, prix, date, mode_paiement")
      .order("date", { ascending: false });

    if (error) {
      setFetchError(error.message);
    } else {
      setExpenses((data as Expense[]) ?? []);
    }
    setFetching(false);
  };

  const loadCashMovements = async () => {
    const { data, error } = await supabase
      .from("cash_movements")
      .select("id, type, montant, note, date")
      .order("date", { ascending: false });

    if (error) {
      setFetchError(error.message);
      return;
    }
    setCashMovements((data as CashMovement[]) ?? []);
  };

  // Commandes livrées en main propre (hors Sendit) = payées cash.
  // Commandes livrées via Sendit = COD reversé sur le compte bancaire.
  // On ne compte que les commandes réellement livrées (shipping_status
  // DELIVERED), pas juste confirmées — l'argent n'est encaissé qu'à la
  // livraison.
  const loadDeliveredOrdersRevenue = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("total, subtotal, shipping_provider, shipping_status")
      .eq("shipping_status", "DELIVERED");

    if (error) {
      setFetchError(error.message);
      return;
    }

    let cashSum = 0;
    let bancaireSum = 0;

    for (const o of data ?? []) {
      if (o.shipping_provider === "sendit") {
        // Sendit retient les frais de livraison sur sa facture — seul le
        // prix du produit (subtotal) arrive vraiment sur le compte.
        bancaireSum += Number(o.subtotal) || 0;
      } else {
        // Main propre : le client paie tout en cash, livraison incluse.
        cashSum += Number(o.total) || 0;
      }
    }

    setAutoCashRevenue(cashSum);
    setAutoBancaireRevenue(bancaireSum);
  };

  useEffect(() => {
    if (!loading && user && isAdmin) {
      loadExpenses();
      loadCashMovements();
      loadDeliveredOrdersRevenue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isAdmin]);

  const cashBalance = useMemo(
    () =>
      autoCashRevenue +
      cashMovements
        .filter((m) => m.type === "cash")
        .reduce((s, m) => s + (Number(m.montant) || 0), 0) -
      expenses
        .filter((e) => e.mode_paiement === "cash")
        .reduce((s, e) => s + (Number(e.prix) || 0), 0),
    [cashMovements, autoCashRevenue, expenses]
  );

  const bancaireBalance = useMemo(
    () =>
      autoBancaireRevenue +
      cashMovements
        .filter((m) => m.type === "bancaire")
        .reduce((s, m) => s + (Number(m.montant) || 0), 0) -
      expenses
        .filter((e) => e.mode_paiement === "bancaire")
        .reduce((s, e) => s + (Number(e.prix) || 0), 0),
    [cashMovements, autoBancaireRevenue, expenses]
  );

  const addMoney = async () => {
    const montantNum = parseFloat(addMoneyForm.montant.replace(",", "."));
    if (!Number.isFinite(montantNum) || montantNum === 0) return;

    setSavingMoney(true);
    const { data, error } = await supabase
      .from("cash_movements")
      .insert({
        type: addMoneyForm.type,
        montant: montantNum,
        date: todayIso(),
      })
      .select("id, type, montant, note, date")
      .single();
    setSavingMoney(false);

    if (error) {
      setFetchError(error.message);
      return;
    }

    setCashMovements((prev) => [data as CashMovement, ...prev]);
    setAddMoneyForm({ type: "cash", montant: "" });
    setShowAddMoney(false);
  };

  const availableMonths = useMemo(() => {
    const keys = new Set(expenses.map((e) => monthKey(e.date)));
    keys.add(monthKey(todayIso()));
    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1)); // most recent first
  }, [expenses]);

  const filtered = useMemo(
    () => expenses.filter((e) => monthKey(e.date) === selectedMonth),
    [expenses, selectedMonth]
  );

  const total = useMemo(() => filtered.reduce((sum, e) => sum + (Number.isFinite(e.prix) ? e.prix : 0), 0), [filtered]);

  const saveExpense = async () => {
    const prixNum = parseFloat(form.prix.replace(",", "."));
    if (!form.nom.trim() || !form.date || !Number.isFinite(prixNum)) return;

    setSaving(true);

    if (editingId) {
      const { data, error } = await supabase
        .from("depenses")
        .update({
          nom: form.nom.trim(),
          produits: form.produits.trim() || null,
          prix: prixNum,
          date: form.date,
          mode_paiement: form.mode_paiement || null,
        })
        .eq("id", editingId)
        .select("id, nom, produits, prix, date, mode_paiement")
        .single();
      setSaving(false);

      if (error) {
        setFetchError(error.message);
        return;
      }

      setExpenses((prev) => prev.map((e) => (e.id === editingId ? (data as Expense) : e)));
      setSelectedMonth(monthKey(form.date));
      setEditingId(null);
      setForm({ nom: "", produits: "", prix: "", date: form.date, mode_paiement: "cash" });
      return;
    }

    const { data, error } = await supabase
      .from("depenses")
      .insert({
        nom: form.nom.trim(),
        produits: form.produits.trim() || null,
        prix: prixNum,
        date: form.date,
        mode_paiement: form.mode_paiement || null,
      })
      .select("id, nom, produits, prix, date, mode_paiement")
      .single();
    setSaving(false);

    if (error) {
      setFetchError(error.message);
      return;
    }

    setExpenses((prev) => [data as Expense, ...prev]);
    setSelectedMonth(monthKey(form.date));
    setForm({ nom: "", produits: "", prix: "", date: form.date, mode_paiement: "cash" });
  };

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({ nom: e.nom, produits: e.produits ?? "", prix: String(e.prix), date: e.date, mode_paiement: e.mode_paiement ?? "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ nom: "", produits: "", prix: "", date: todayIso(), mode_paiement: "cash" });
  };

  const deleteExpense = async (id: string) => {
    if (!window.confirm("Supprimer cette dépense ?")) return;
    const { error } = await supabase.from("depenses").delete().eq("id", id);
    if (error) {
      setFetchError(error.message);
      return;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (editingId === id) cancelEdit();
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
        head: [["Nom", "Produits", "Prix (MAD)", "Mode", "Date"]],
        body: filtered.map((e) => [e.nom, e.produits || "—", e.prix.toFixed(2), e.mode_paiement ?? "Non renseigné", formatDateFr(e.date)]),
        foot: [["", "", "Total", "", `${total.toFixed(2)} MAD`]],
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
          <button onClick={() => signOutAdmin().then(() => nav("/zm-portal-x92-login"))} className="mt-6 px-5 py-2 border border-primary text-primary text-[10px] tracking-[0.22em] uppercase hover:bg-primary hover:text-primary-foreground">
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
            Suivi personnel 
          </p>
        </div>
        <button onClick={() => nav("/zm-portal-x92")} className="flex items-center gap-1.5 px-4 py-2 border border-border text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-primary-hi">
          <ChevronLeft className="w-3 h-3 shrink-0" />
          Retour admin
        </button>
      </header>

      {fetchError && (
        <div className="mb-6 border border-red-500/40 bg-red-500/10 text-red-500 text-xs px-4 py-3">
          {fetchError}
        </div>
      )}

      {/* Cash / bancaire tracker */}
      <section className="mb-8 border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
            Solde
          </h2>
          <button
            type="button"
            onClick={() => setShowAddMoney((s) => !s)}
            className="border border-primary text-primary text-[10px] tracking-[0.2em] uppercase px-3 py-2 hover:bg-primary hover:text-primary-foreground"
          >
            Ajouter argent
          </button>
        </div>

        <div className="border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Bancaire</th>
                <th className="px-3 py-2 text-left">Cash</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 text-primary-hi text-sm">
                  {bancaireBalance.toFixed(2)} MAD
                </td>
                <td className="px-3 py-2 text-primary-hi text-sm">
                  {cashBalance.toFixed(2)} MAD
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-[9px] text-muted-foreground mt-2">
          Calcul auto : commandes livrées en main propre (produit + livraison) → cash,
          commandes livrées via Sendit (produit seul, hors frais Sendit) → bancaire,
          moins les dépenses selon leur mode de paiement. Les ajustements manuels s'ajoutent aussi.
        </div>

        {showAddMoney && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
            <div className="relative">
              <select
                value={addMoneyForm.type}
                onChange={(e) =>
                  setAddMoneyForm((f) => ({
                    ...f,
                    type: e.target.value as "cash" | "bancaire",
                  }))
                }
                className="w-full appearance-none bg-transparent border border-border pl-3 pr-8 py-2 text-xs"
              >
                <option value="cash">Cash</option>
                <option value="bancaire">Bancaire</option>
              </select>
              <ChevronDown className="w-3 h-3 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Montant (MAD)"
              value={addMoneyForm.montant}
              onChange={(e) =>
                setAddMoneyForm((f) => ({ ...f, montant: e.target.value }))
              }
              className="bg-transparent border border-border px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={addMoney}
              disabled={savingMoney}
              className="border border-primary text-primary text-[10px] tracking-[0.2em] uppercase px-3 py-2 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              {savingMoney ? "..." : "Confirmer"}
            </button>
          </div>
        )}
      </section>

      {/* Add / edit form */}
      <section className="mb-8 border border-border p-4">
        <h2 className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-3">
          {editingId ? "Modifier la dépense" : "Ajouter une dépense"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
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
          <div className="relative">
            <select
              value={form.mode_paiement}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  mode_paiement: e.target.value as "cash" | "bancaire" | "",
                }))
              }
              className="w-full appearance-none bg-transparent border border-border pl-3 pr-8 py-2 text-xs"
            >
              <option value="cash">Cash</option>
              <option value="bancaire">Bancaire</option>
              <option value="">Non renseigné</option>
            </select>
            <ChevronDown className="w-3 h-3 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button
            type="button"
            onClick={saveExpense}
            disabled={saving}
            className="border border-primary text-primary text-[10px] tracking-[0.2em] uppercase px-3 py-2 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {saving ? "..." : editingId ? "Enregistrer" : "Ajouter"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="border border-border text-muted-foreground text-[10px] tracking-[0.2em] uppercase px-3 py-2 hover:text-primary-hi disabled:opacity-50"
            >
              Annuler
            </button>
          )}
        </div>
      </section>

      {/* Filter + export */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Mois :</label>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-transparent border border-border pl-3 pr-8 py-2 text-xs capitalize"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="capitalize">
                  {monthLabelFr(m)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
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
              <th className="px-3 py-2 text-left">Mode</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fetching && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">Chargement...</td>
              </tr>
            )}
            {!fetching && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Aucune dépense pour ce mois.
                </td>
              </tr>
            )}
            {!fetching && filtered.map((e) => (
              <tr key={e.id} className={`hover:bg-muted/20 ${editingId === e.id ? "bg-muted/30" : ""}`}>
                <td className="px-3 py-2">{e.nom}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.produits || "—"}</td>
                <td className="px-3 py-2">{e.prix.toFixed(2)}</td>
                <td className="px-3 py-2 text-muted-foreground capitalize">{e.mode_paiement ?? "Non renseigné"}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatDateFr(e.date)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => startEdit(e)}
                    className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground hover:text-primary-hi mr-3"
                  >
                    Modifier
                  </button>
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
                <td className="px-3 py-2" colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default AdminDepenses;
