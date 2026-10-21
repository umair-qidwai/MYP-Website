import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

const isInternal = (href: string) =>
  href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/media/") && !href.startsWith("/admin") && !href.startsWith("/api/");

export const isExternal = (href: string) => /^https?:\/\//i.test(href);

/** Internal paths use client-side navigation; external links open safely in a new tab. */
export function SmartLink({ href, children, ...rest }: { href: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  if (isInternal(href)) {
    return (
      <Link to={href} {...rest}>
        {children}
      </Link>
    );
  }
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
