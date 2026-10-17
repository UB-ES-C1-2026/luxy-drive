import type { ReactNode } from "react";
import { Globe } from "./icons";
import { cx, focusRing } from "./utils";

export type FooterColumn = {
  title: string;
  links: { label: string; href: string }[];
};

export type FooterProps = {
  columns: FooterColumn[];
  /** Extra en la banda legal (redes sociales, etc.). */
  legalExtra?: ReactNode;
  className?: string;
};

/** Pie blanco con 3 columnas de enlaces y banda legal. */
export function Footer({ columns, legalExtra, className }: FooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer className={cx("border-t border-hairline bg-canvas", className)}>
      <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-title-sm text-ink">{column.title}</p>
              <ul className="mt-3 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className={cx("rounded-sm text-body-sm text-ink hover:underline", focusRing)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-hairline pt-6 text-caption-sm text-muted md:flex-row md:items-center md:justify-between">
          <p>© {year} LuxyDrive · Proyecto académico de la Universitat de Barcelona</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Globe aria-hidden className="size-4" />
              Español (ES)
            </span>
            <span>€ EUR</span>
            {legalExtra}
          </div>
        </div>
      </div>
    </footer>
  );
}
