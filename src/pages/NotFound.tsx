import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SiteLayout } from "@/components/zuma/SiteLayout";
import { useLang } from "@/context/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLang();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <SiteLayout>
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h1 className="font-display text-4xl tracking-[0.3em] mb-4 text-foreground">
          {t("notFoundTitle")}
        </h1>
        <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-6">
          {t("notFoundBody")}
        </p>
        <Link
          to="/"
          className="px-5 py-2.5 border border-primary text-primary text-[10px] tracking-[0.22em] uppercase hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          {t("notFoundBack")}
        </Link>
      </div>
    </SiteLayout>
  );
};

export default NotFound;
