import { BottomNav } from "@/components/layout/bottom-nav";
import {
  TopBar,
  type TopBarProps,
} from "@/components/layout/top-bar";

export type AppShellProps = TopBarProps & {
  children: React.ReactNode;
};

export function AppShell({
  ownProfile,
  activeProfile,
  linkedProfiles,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <TopBar
        ownProfile={ownProfile}
        activeProfile={activeProfile}
        linkedProfiles={linkedProfiles}
      />
      <main id="main-content" className="flex-1" style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
