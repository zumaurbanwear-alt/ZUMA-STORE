import { ReactNode } from "react";
import { SiteLayout } from "@/components/zuma/SiteLayout";

/**
 * Shared template for all informational/legal pages (FAQ, Shipping, Returns,
 * Terms, Privacy, Contact). Reuses the same header/typography language as
 * Shop.tsx / NotFound.tsx so no new visual style is introduced.
 */
export const InfoPage = ({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) => (
  <SiteLayout>
    <div className="pt-32 pb-24 px-6 md:px-10">
      <div className="max-w-[720px] mx-auto">
        <header className="mb-10 border-b border-border pb-4">
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.25em] text-foreground">
            {title}
          </h1>
          {intro && (
            <p className="mt-3 text-[10px] tracking-[0.08em] text-muted-foreground leading-relaxed max-w-[560px]">
              {intro}
            </p>
          )}
        </header>
        <div className="flex flex-col gap-9">{children}</div>
      </div>
    </div>
  </SiteLayout>
);

export const InfoSection = ({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) => (
  <section>
    <h2 className="text-[10px] tracking-[0.22em] uppercase text-primary-hi mb-3">
      {heading}
    </h2>
    <div className="flex flex-col gap-2.5 text-[11px] leading-[1.9] tracking-[0.02em] text-muted-foreground">
      {children}
    </div>
  </section>
);

export const InfoList = ({ items }: { items: string[] }) => (
  <ul className="flex flex-col gap-2">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2.5 text-[11px] leading-[1.9] tracking-[0.02em] text-muted-foreground">
        <span className="text-primary-hi">—</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

export const FaqItem = ({ q, a }: { q: string; a: string }) => (
  <div className="border-b border-border pb-6">
    <h3 className="text-[11px] tracking-[0.12em] uppercase text-foreground mb-2">{q}</h3>
    <p className="text-[11px] leading-[1.9] tracking-[0.02em] text-muted-foreground">{a}</p>
  </div>
);
