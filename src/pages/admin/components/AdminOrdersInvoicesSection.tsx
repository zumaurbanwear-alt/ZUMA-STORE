import { StatusDot } from "../orders/StatusDot";
import { translateStatus } from "../orders/orderStatus";
import type { AdminInvoice } from "../orders/types";

type AdminOrdersInvoicesSectionProps = {
  invoices: AdminInvoice[];
  loadingInvoices: boolean;
  invoicesPage: number;
  invoicesLastPage: number;
  invoicesTotal: number;
  invoiceSearch: string;
  invoiceStartDate: string;
  invoiceEndDate: string;
  onInvoiceSearchChange: (value: string) => void;
  onInvoiceStartDateChange: (value: string) => void;
  onInvoiceEndDateChange: (value: string) => void;
  onFilterInvoices: () => void;
  onPrevInvoicePage: () => void;
  onNextInvoicePage: () => void;
  onOpenInvoiceDetail: (code: string) => void;
};

export const AdminOrdersInvoicesSection = ({
  invoices,
  loadingInvoices,
  invoicesPage,
  invoicesLastPage,
  invoicesTotal,
  invoiceSearch,
  invoiceStartDate,
  invoiceEndDate,
  onInvoiceSearchChange,
  onInvoiceStartDateChange,
  onInvoiceEndDateChange,
  onFilterInvoices,
  onPrevInvoicePage,
  onNextInvoicePage,
  onOpenInvoiceDetail,
}: AdminOrdersInvoicesSectionProps) => (
  <section className="mb-12">
    <h2 className="font-display text-base tracking-[0.2em] mb-3">
      FACTURES SENDIT ({invoicesTotal})
    </h2>

    <div className="flex flex-wrap items-center gap-2 mb-3">
      <input
        type="date"
        value={invoiceStartDate}
        onChange={(e) => onInvoiceStartDateChange(e.target.value)}
        className="border border-border px-2 py-1.5 text-xs bg-transparent"
      />

      <input
        type="date"
        value={invoiceEndDate}
        onChange={(e) => onInvoiceEndDateChange(e.target.value)}
        className="border border-border px-2 py-1.5 text-xs bg-transparent"
      />

      <input
        type="text"
        value={invoiceSearch}
        onChange={(e) => onInvoiceSearchChange(e.target.value)}
        placeholder="Code / commentaire..."
        className="border border-border px-3 py-1.5 text-xs flex-1 min-w-[160px] bg-transparent"
      />

      <button
        onClick={onFilterInvoices}
        className="border border-primary px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground"
      >
        Filtrer
      </button>
    </div>

    <div className="border border-border divide-y divide-border">
      {loadingInvoices ? (
        <div className="p-3 text-xs text-muted-foreground">Chargement...</div>
      ) : invoices.length === 0 ? (
        <div className="p-3 text-xs text-muted-foreground">Aucune facture</div>
      ) : (
        invoices.map((inv) => (
          <div
            key={inv.code}
            onClick={() => onOpenInvoiceDetail(inv.code ?? "")}
            className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/10"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-display tracking-[0.1em] shrink-0">
                {inv.code}
              </span>
              <span className="text-[9px] text-muted-foreground shrink-0">
                {inv.date}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[9px] uppercase flex items-center gap-1.5">
                <StatusDot status={inv.status} />
                {translateStatus(inv.status)}
              </span>
              <span className="text-xs font-display text-primary-hi w-20 text-right">
                {inv.amount} MAD
              </span>
            </div>
          </div>
        ))
      )}
    </div>

    <div className="flex items-center justify-between mt-3 text-[10px] uppercase tracking-[0.15em]">
      <button
        onClick={onPrevInvoicePage}
        disabled={invoicesPage <= 1}
        className="border border-border px-3 py-1 disabled:opacity-40"
      >
        ←
      </button>

      <span className="text-muted-foreground normal-case tracking-normal">
        Page {invoicesPage} / {invoicesLastPage} ({invoicesTotal} factures)
      </span>

      <button
        onClick={onNextInvoicePage}
        disabled={invoicesPage >= invoicesLastPage}
        className="border border-border px-3 py-1 disabled:opacity-40"
      >
        →
      </button>
    </div>
  </section>
);
