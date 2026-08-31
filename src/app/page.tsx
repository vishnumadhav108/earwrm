import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

export default function Home() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
