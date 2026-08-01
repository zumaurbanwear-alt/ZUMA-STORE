import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Period = "mois" | "annee";

// CA - dépenses, sur le mois ou l'année en cours (bascule via le petit
// sélecteur). Séparé du reste du dashboard car les stats du dashboard ne
// regardent que les 30 derniers jours (limite volontaire côté requête) —
// le calcul "année" a besoin de sa propre requête sur une période plus
// large, donc son propre state/fetch plutôt que de réutiliser `stats`.
export const AdminProfitSection = () => {
  const [period, setPeriod] = useState<Period>("mois");
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const now = new Date();
      const start =
        period === "mois"
          ? new Date(now.getFullYear(), now.getMonth(), 1)
          : new Date(now.getFullYear(), 0, 1);

      const startIso = start.toISOString();
      const startDateStr = start.toISOString().slice(0, 10);

      const [ordersRes, depensesRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total, created_at, refunded, shipping_status, shipping_status_return, return_code, pickup_code, status, shipping_provider, shipping_fee")
          .gte("created_at", startIso)
          .limit(10000),
        supabase.from("depenses").select("prix, date").gte("date", startDateStr).limit(10000),
      ]);

      if (cancelled) return;

      if (ordersRes.error) {
        console.error(ordersRes.error);
      }
      if (depensesRes.error) {
        console.error(depensesRes.error);
      }

      // Le CA du bénéfice brut ne compte que les commandes réellement
      // LIVRÉES — une commande juste confirmée reste à risque d'annulation
      // jusqu'à la livraison, donc pas de CA "en dur" tant que ce n'est
      // pas encaissé. On garde quand même le check !refunded pour exclure
      // une commande livrée puis remboursée après coup. On déduit aussi les
      // frais Sendit (livraison, etc.) que Sendit retient directement sur
      // sa facture — mais seulement pour les commandes réellement
      // expédiées via Sendit ; les commandes remises en main propre n'ont
      // pas de facture Sendit à déduire.
      const validOrders = (ordersRes.data ?? []).filter(
        (o) => o.shipping_status === "DELIVERED" && !o.refunded
      );

      const totalRevenue = validOrders.reduce(
        (s, o) => s + (Number(o.total) || 0),
        0
      );

      const totalSenditFees = validOrders
        .filter((o) => o.shipping_provider === "sendit")
        .reduce((s, o) => s + (Number(o.shipping_fee) || 0), 0);

      const totalExpenses =
        (depensesRes.data ?? []).reduce((s, d) => s + (Number(d.prix) || 0), 0) +
        totalSenditFees;

      setRevenue(totalRevenue);
      setExpenses(totalExpenses);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [period]);

  const profit = revenue - expenses;

  return (
    <div className="border border-border p-3 mb-12 flex items-center justify-between flex-wrap gap-3">
      <div>
        <div className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
          BÉNÉFICE BRUT — {period === "mois" ? "CE MOIS-CI" : "CETTE ANNÉE"}
        </div>
        <div className="text-lg font-display text-primary-hi">
          {loading ? "..." : `${profit.toFixed(2)} MAD`}
        </div>
        {!loading && (
          <div className="text-[8px] text-muted-foreground mt-1">
            {revenue.toFixed(2)} MAD CA (commandes livrées) − {expenses.toFixed(2)} MAD dépenses (dont frais Sendit)
          </div>
        )}
      </div>

      <div className="flex border border-border">
        <button
          onClick={() => setPeriod("mois")}
          className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.1em] ${
            period === "mois" ? "bg-primary text-primary-foreground" : ""
          }`}
        >
          Mois
        </button>
        <button
          onClick={() => setPeriod("annee")}
          className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.1em] border-l border-border ${
            period === "annee" ? "bg-primary text-primary-foreground" : ""
          }`}
        >
          Année
        </button>
      </div>
    </div>
  );
};
