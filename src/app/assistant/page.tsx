import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function AssistantPage() {
  return (
    <div>
      <PageHeader title="Assistant" subtitle="Ask about the apartment in plain language." />
      <EmptyState
        title="Not yet."
        description="The assistant waits until balances, food, chores, and issues are real data."
      />
    </div>
  );
}
