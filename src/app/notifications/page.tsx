import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader title="Notifications" subtitle="What changed while you were out." />
      <EmptyState
        title="No notifications yet."
        description="In-app alerts for expenses, chores, and expiring food come after the core modules."
      />
    </div>
  );
}
