import type { ReactNode } from "react";

type AdminSectionProps = {
  children: ReactNode;
  className?: string;
};

export const AdminSection = ({ children, className = "" }: AdminSectionProps) => (
  <section className={`mb-12 ${className}`.trim()}>{children}</section>
);
