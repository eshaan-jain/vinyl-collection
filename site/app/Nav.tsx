"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname() ?? "/";
  const onRecs = path.startsWith("/picks");
  return (
    <header className="nav">
      <nav aria-label="Main">
        <Link href="/" aria-current={onRecs ? undefined : "page"}>My Vinyls</Link>
        <Link href="/picks/" aria-current={onRecs ? "page" : undefined}>Recs</Link>
      </nav>
    </header>
  );
}
