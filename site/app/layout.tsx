import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Vinyl", description: "My record collection and picks" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <Link href="/" className="brand">● Vinyl</Link>
          <nav>
            <Link href="/">My Vinyl</Link>
            <Link href="/picks/">Picks</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
