import type { ReactNode } from "react";

import { PageHeader, PageShell, type PageShellProps } from "@/components/ui/page-shell";
import { cn } from "@/lib/utils/cn";

export function AdminPageShell({ children, className, width = "md", ...props }: PageShellProps) {
  return (
    <PageShell width={width} className={cn("gap-5 pb-8", className)} {...props}>
      {children}
    </PageShell>
  );
}

export function AdminPageHeader({
  title,
  description,
  icon,
  action,
  eyebrow = "Administración",
  className,
}: {
  title: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      icon={icon}
      action={action}
      teamColor="var(--pool-deep)"
      className={className}
    />
  );
}
