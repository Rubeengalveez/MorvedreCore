import type { ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-shell";

export function AppPageHero({
  eyebrow,
  title,
  description,
  icon,
  action,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      icon={icon}
      action={action}
      className={className}
    />
  );
}
