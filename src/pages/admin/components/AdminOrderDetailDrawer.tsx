import { StatusDot } from "../orders/StatusDot";
import { RETURN_ELIGIBLE_STATUSES, TIMELINE_STEPS, mapEventToStep, translateStatus } from "../orders/orderStatus";
import type { AdminOrder, AdminOrderEvent } from "../orders/types";
import type { OrderItem } from "@/types/order";

type AdminOrderDetailDrawerProps = {
  selectedOrder: AdminOrder | null;
  loadingEvents: boolean;
  orderEvents: AdminOrderEvent[];
  confirmingOrderFor: string | null;
  creatingShipmentFor: string | null;
  creatingReturnFor: string | null;
  savingRefund: boolean;
  savingNotes: boolean;
  notesDraft: string;
  onClose: () => void;
  onConfirmOrder: (order: AdminOrder) => void;
  onCreateShipment: (order: AdminOrder) => void;
  onCreateReturn: (order: AdminOrder) => void;
  onToggleRefund: () => void;
  onSaveNotes: () => void;
  onNotesChange: (value: string) => void;
};

export const AdminOrderDetailDrawer = ({
  selectedOrder,
  loadingEvents,
  orderEvents,
  confirmingOrderFor,
  creatingShipmentFor,
  creatingReturnFor,
  savingRefund,
  savingNotes,
  notesDraft,
  onClose,
  onConfirmOrder,
  onCreateShipment,
  onCreateReturn,
  onToggleRefund,
  onSaveNotes,
  onNotesChange,
}: AdminOrderDetailDrawerProps) => {
  if (!selectedOrder) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 z-40" />

      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-background border-l border-border z-50 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-display tracking-[0.15em] text-primary-hi">
            #{selectedOrder.display_id}
          </div>

          <button
            onClick={onClose}
            className="border border-border px-2 py-1 text-[9px] uppercase tracking-[0.1em]"
          >
            Fermer
          </button>
        </div>

        <div className="text-[9px] uppercase tracking-[0.15em] flex items-center gap-1.5 mb-4">
          <StatusDot status={selectedOrder.status?.trim().toLowerCase()} />
          {translateStatus(selectedOrder.status)}
        </div>

        {selectedOrder.shipping_label_url && (
          <a
            href={selectedOrder.shipping_label_url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              block
              border
              border-primary
              px-2
              py-1.5
              text-[9px]
              text-center
              uppercase
              tracking-[0.1em]
              mb-4
              hover:bg-primary
              hover:text-primary-foreground
            "
          >
            Bordereau
          </a>
        )}

        <div className="space-y-3 mb-4">
          <div className="border border-border p-3">
            <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">CLIENT</div>
            <div className="space-y-1.5">
              <div>
                <div className="text-[8px] uppercase text-muted-foreground">Nom</div>
                <div className="mt-0.5 text-xs">{selectedOrder.customer_name}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase text-muted-foreground">Téléphone</div>
                <div className="mt-0.5 text-xs">{selectedOrder.customer_phone}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase text-muted-foreground">Email</div>
                <div className="mt-0.5 text-xs break-all">{selectedOrder.customer_email}</div>
              </div>
            </div>
          </div>

          <div className="border border-border p-3">
            <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">LIVRAISON</div>
            <div className="space-y-1.5">
              <div>
                <div className="text-[8px] uppercase text-muted-foreground">Ville</div>
                <div className="mt-0.5 text-xs">{selectedOrder.customer_city}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase text-muted-foreground">District</div>
                <div className="mt-0.5 text-xs">{selectedOrder.customer_district ?? "—"}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase text-muted-foreground">Adresse</div>
                <div className="mt-0.5 text-xs leading-relaxed">{selectedOrder.customer_address}</div>
              </div>
            </div>
          </div>

          {selectedOrder.tracking_number && (
            <div className="border border-border p-3">
              <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">SENDIT</div>
              <div className="space-y-1.5">
                <div>
                  <div className="text-[8px] uppercase text-muted-foreground">Tracking</div>
                  <div className="mt-0.5 text-xs font-display tracking-[0.1em]">
                    {selectedOrder.tracking_number}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] uppercase text-muted-foreground">Status</div>
                  <div className="mt-0.5 text-xs uppercase flex items-center gap-1.5">
                    <StatusDot status={selectedOrder.shipping_status} />
                    {translateStatus(selectedOrder.shipping_status)}
                  </div>
                </div>

                {selectedOrder.pickup_code && (
                  <>
                    <div className="pt-1.5 border-t border-border mt-1.5">
                      <div className="text-[8px] uppercase text-muted-foreground">Pickup</div>
                      <div className="mt-0.5 text-xs font-display tracking-[0.1em]">
                        {selectedOrder.pickup_code}
                      </div>
                    </div>

                    <div>
                      <div className="text-[8px] uppercase text-muted-foreground">Pickup status</div>
                      <div className="mt-0.5 text-xs uppercase flex items-center gap-1.5">
                        <StatusDot status={selectedOrder.pickup_status} />
                        {translateStatus(selectedOrder.pickup_status)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedOrder.status?.trim().toLowerCase() === "pending" && !selectedOrder.tracking_number && (
          <button
            onClick={() => onConfirmOrder(selectedOrder)}
            disabled={confirmingOrderFor === selectedOrder.id}
            className="w-full border border-primary py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-50 mb-4"
          >
            {confirmingOrderFor === selectedOrder.id ? "VALIDATION..." : "VALIDER LA COMMANDE"}
          </button>
        )}

        {selectedOrder.status?.trim().toLowerCase() === "confirmed" && !selectedOrder.tracking_number && (
          <button
            onClick={() => onCreateShipment(selectedOrder)}
            disabled={creatingShipmentFor === selectedOrder.id}
            className="w-full border border-primary py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-50 mb-4"
          >
            {creatingShipmentFor === selectedOrder.id ? "CREATION..." : "CREER LE COLIS"}
          </button>
        )}

        {(selectedOrder.return_code || selectedOrder.shipping_status_return) && (
          <div className="border border-red-600 p-3 mb-4">
            <div className="text-[9px] text-red-600 uppercase tracking-[0.15em] mb-2">⚠ Retour</div>
            <div className="space-y-1.5 text-xs">
              {selectedOrder.return_code && (
                <div>
                  <span className="text-[8px] uppercase text-muted-foreground block">Code retour</span>
                  {selectedOrder.return_code}
                </div>
              )}
              {selectedOrder.return_status && (
                <div>
                  <span className="text-[8px] uppercase text-muted-foreground block">Status</span>
                  <span className="flex items-center gap-1.5">
                    <StatusDot status={selectedOrder.return_status} />
                    {selectedOrder.return_status}
                  </span>
                </div>
              )}
              {selectedOrder.shipping_status_return && (
                <div>
                  <span className="text-[8px] uppercase text-muted-foreground block">Status Sendit</span>
                  {selectedOrder.shipping_status_return}
                </div>
              )}
              {selectedOrder.return_reason && (
                <div>
                  <span className="text-[8px] uppercase text-muted-foreground block">Raison</span>
                  {selectedOrder.return_reason}
                </div>
              )}
              {selectedOrder.return_created_at && (
                <div>
                  <span className="text-[8px] uppercase text-muted-foreground block">Demandé le</span>
                  {new Date(selectedOrder.return_created_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedOrder.tracking_number &&
          !selectedOrder.return_code &&
          RETURN_ELIGIBLE_STATUSES.includes(selectedOrder.shipping_status) && (
            <button
              onClick={() => onCreateReturn(selectedOrder)}
              disabled={creatingReturnFor === selectedOrder.id}
              className="w-full border border-red-600 text-red-600 py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-red-600 hover:text-white disabled:opacity-50 mb-4"
            >
              {creatingReturnFor === selectedOrder.id ? "DEMANDE..." : "DEMANDER UN RETOUR"}
            </button>
          )}

        <div className="border-t border-border pt-3 mb-4 flex justify-between items-end">
          <div>
            <div className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground mb-1">PRODUITS</div>
            <div className="text-xs">
              {(selectedOrder.order_items ?? [])
                .map((item: OrderItem) => `${item.product_name} ×${item.quantity}`)
                .join(", ")}
            </div>
          </div>

          <div className="text-right">
            <div className="text-base font-display text-primary-hi">{selectedOrder.total} MAD</div>
            <div className="text-[8px] uppercase text-muted-foreground">
              {selectedOrder.subtotal} + {selectedOrder.shipping_fee} livraison
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border border-border p-3 mb-4">
          <div>
            <div className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Remboursement</div>
            <div className="text-xs">{selectedOrder.refunded ? "Remboursée" : "Non remboursée"}</div>
          </div>

          <button
            onClick={onToggleRefund}
            disabled={savingRefund}
            className={`
              border px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] disabled:opacity-50
              ${selectedOrder.refunded
                ? "border-border hover:bg-muted"
                : "border-primary hover:bg-primary hover:text-primary-foreground"}
            `}
          >
            {savingRefund
              ? "..."
              : selectedOrder.refunded
              ? "MARQUER NON REMBOURSÉE"
              : "MARQUER REMBOURSÉE"}
          </button>
        </div>

        <div className="mb-4">
          <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">Notes admin</div>
          <textarea
            value={notesDraft}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            placeholder="Note interne, visible uniquement par toi..."
            className="w-full border border-border p-2 text-xs bg-transparent resize-none"
          />

          <button
            onClick={onSaveNotes}
            disabled={savingNotes || notesDraft === (selectedOrder.admin_notes ?? "")}
            className="mt-2 border border-primary px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          >
            {savingNotes ? "ENREGISTREMENT..." : "ENREGISTRER LA NOTE"}
          </button>
        </div>

        <div>
          <div className="text-[8px] uppercase tracking-[0.2em] text-primary-hi mb-2">HISTORIQUE</div>

          {loadingEvents ? (
            <div className="text-xs text-muted-foreground">Chargement...</div>
          ) : (
            <div className="space-y-2">
              {TIMELINE_STEPS.map((step) => {
                if (step.key === "created") {
                  return (
                    <div key={step.key} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0 bg-black" />
                      <span>{step.label}</span>
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : ""}
                      </span>
                    </div>
                  );
                }

                const matched = orderEvents.find((e) => {
                  const eventKey = e.event ?? e.event_type ?? "";
                  return mapEventToStep(eventKey) === step.key;
                });

                return (
                  <div key={step.key} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${matched ? "bg-black" : "bg-gray-300"}`} />
                    <span className={matched ? "" : "text-muted-foreground"}>{step.label}</span>
                    {matched && (
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {new Date(matched.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
