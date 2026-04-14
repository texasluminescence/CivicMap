import "./globals.css";
import ClientAuthWrapper from "@/components/ClientAuthWrapper";

export const metadata = {
  title: "CivicMap",
  description: "Discover and attend civic events in your community.",
  openGraph: {
    title: "CivicMap",
    description: "Discover and attend civic events in your community.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 font-sans">
        {/* Wrap all children with auth check */}
        <ClientAuthWrapper>{children}</ClientAuthWrapper>
      </body>
    </html>
  );
}
