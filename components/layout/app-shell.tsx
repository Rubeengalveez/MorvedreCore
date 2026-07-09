import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar, type TopBarProps } from "@/components/layout/top-bar";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";

export type AppShellProps = TopBarProps & {
  children: React.ReactNode;
};

export function AppShell({ ownProfile, activeProfile, linkedProfiles, children }: AppShellProps) {
  return (
    <div className="app-stage bg-paper flex min-h-dvh flex-col">
      <TopBar
        ownProfile={ownProfile}
        activeProfile={activeProfile}
        linkedProfiles={linkedProfiles}
      />
      <main
        id="main-content"
        className="flex-1"
        style={{ paddingBottom: "calc(var(--bottom-nav-height) + 10px)" }}
      >
        {children}
      </main>
      <BottomNav />
      <PwaInstallPrompt />
    </div>
  );
}
