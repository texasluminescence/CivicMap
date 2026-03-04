import "./globals.css";
import ClientAuthWrapper from "../components/ClientAuthWrapper"; // import the client wrapper

export const metadata = {
  title: "CivicMap",
  description: "Get involved in local events",
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
