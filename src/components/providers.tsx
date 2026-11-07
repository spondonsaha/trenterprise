"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Toaster richColors position="top-right" closeButton toastOptions={{ duration: 4000 }} />
      {children}
    </SessionProvider>
  );
}
