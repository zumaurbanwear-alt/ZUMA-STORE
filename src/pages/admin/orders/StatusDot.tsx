import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from "./orderStatus";

export const StatusDot = ({ status }: { status: string | null | undefined }) => {
  const key = (status ?? "").trim().toLowerCase();
  const color = STATUS_COLORS[key] ?? DEFAULT_STATUS_COLOR;

  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
};
