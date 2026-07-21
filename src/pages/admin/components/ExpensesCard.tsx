import { useNavigate } from "react-router-dom";

export const ExpensesCard = () => {
  const nav = useNavigate();

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center border border-border p-5">
        <div>
          <h2 className="font-display text-lg tracking-[0.25em]">DÉPENSES</h2>
          <p className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground mt-1">
            Suivi personnel — hors système de la boutique
          </p>
        </div>
        <button
          type="button"
          onClick={() => nav("/zm-portal-x92-depenses")}
          className="px-4 py-2 border border-primary text-primary text-[10px] tracking-[0.22em] uppercase hover:bg-primary hover:text-primary-foreground"
        >
          Ouvrir
        </button>
      </div>
    </section>
  );
};
