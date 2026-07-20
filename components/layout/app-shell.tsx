import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar, type TopBarProps } from "@/components/layout/top-bar";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";

export type AppShellProps = TopBarProps & {
  children: React.ReactNode;
  showAttendance: boolean;
};

export function AppShell({ profile, showAttendance, children }: AppShellProps) {
  return (
    <div className="app-stage bg-paper flex min-h-dvh flex-col">
      <TopBar profile={profile} />
      <main
        id="main-content"
        className="flex-1 pt-[var(--top-bar-height)] pb-[calc(var(--bottom-nav-height)+0.5rem)]"
      >
        {children}
      </main>
      <BottomNav showAttendance={showAttendance} />
      <PwaInstallPrompt />
    </div>
  );
}
