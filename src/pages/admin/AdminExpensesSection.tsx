import { ExpensesCard } from "@/pages/admin/components/ExpensesCard";

// Purely personal tracking — no Supabase table, no API. The actual
// table/list lives on its own page (AdminDepenses.tsx) so it doesn't
// clutter the store dashboard; this is just the entry point.
export const AdminExpensesSection = () => <ExpensesCard />;
