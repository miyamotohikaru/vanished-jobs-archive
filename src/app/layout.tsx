import type { Metadata } from "next";
import { Playfair_Display, Shippori_Mincho, IBM_Plex_Mono, Jost } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TabBar from "@/components/TabBar";
import { LangProvider } from "@/lib/lang";
import ScrollRestorer from "@/components/ScrollRestorer";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const shippori = Shippori_Mincho({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-shippori",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});

const jost = Jost({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-jost",
});

export const metadata: Metadata = {
  title: "消滅職業図鑑 | Vanished Jobs Archive.",
  description:
    "「コンピュータ」は、かつて人間の職業だった。消えた職業151種を、こすくまくんと記録する図鑑。",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${playfair.variable} ${shippori.variable} ${plexMono.variable} ${jost.variable} antialiased`}
      >
        <LangProvider>
          <ScrollRestorer />
          <Header />
          <main className="overflow-x-hidden pb-20 md:overflow-x-visible md:pb-0">
            {children}
          </main>
          <Footer />
          <TabBar />
        </LangProvider>
      </body>
    </html>
  );
}
