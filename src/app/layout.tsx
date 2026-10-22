import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CajuGo",
  description: "Carros usados e seminovos das melhores lojas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
