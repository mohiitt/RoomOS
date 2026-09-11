"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { formatMoney } from "@/lib/expenses/money.ts";
import { fetchSpendSummary } from "@/lib/expenses/queries.ts";

export default function SpendSummaryPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchSpendSummary>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void fetchSpendSummary()
      .then(setData)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load summary");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxCategory = data?.categories[0]?.amount ?? 1;
  const maxMonth = data?.months[0]?.amount ?? 1;

  return (
    <div>
      <PageHeader
        title="Spend summary"
        subtitle="Category and month totals from the ledger."
        backHref="/money"
      />
      {data === null && !error ? (
        <LoadingSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : data ? (
        <div className="grid gap-5 pb-8">
          <section className="rounded-3xl bg-card p-5 ring-1 ring-border">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Total logged
            </p>
            <p className="mt-2 font-heading text-4xl">{formatMoney(data.total)}</p>
            <p className="mt-1 text-sm text-foreground/80">{data.count} expenses</p>
          </section>
          <section>
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              By category
            </h2>
            <ul className="mt-3 grid gap-3">
              {data.categories.map((row) => (
                <li key={row.category}>
                  <div className="flex justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="font-medium">{formatMoney(row.amount)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(8, (row.amount / maxCategory) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              By month
            </h2>
            <ul className="mt-3 grid gap-3">
              {data.months.map((row) => (
                <li key={row.month}>
                  <div className="flex justify-between text-sm">
                    <span>{row.month}</span>
                    <span className="font-medium">{formatMoney(row.amount)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(8, (row.amount / maxMonth) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <a
            href="/api/money/export"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium"
          >
            Download CSV
          </a>
        </div>
      ) : null}
    </div>
  );
}
