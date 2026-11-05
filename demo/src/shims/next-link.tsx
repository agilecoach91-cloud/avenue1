import type { AnchorHTMLAttributes, ReactNode } from "react";
import { navigate } from "../demo/router-core";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children?: ReactNode;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

/** next/link for the demo: client-side navigation inside the page. */
export default function Link({ href, children, onClick, prefetch: _p, replace: _r, scroll, ...rest }: Props) {
  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        if (href.startsWith("#")) {
          document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        void navigate(href, { scroll });
      }}
    >
      {children}
    </a>
  );
}
