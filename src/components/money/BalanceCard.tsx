import { formatMoney, signedMoney } from "@/lib/expenses/money.ts";

export function BalanceCard({
  youOwe,
  youAreOwed,
  net,
}: {
  youOwe: number;
  youAreOwed: number;
  net: number;
}) {
  return (
    <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
      <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Your balance
      </p>
      <p className="mt-2 font-heading text-4xl">{signedMoney(net)}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {net > 0 ? "You are owed overall" : net < 0 ? "You owe overall" : "Settled up"}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">You owe</dt>
          <dd className="text-lg font-medium">{formatMoney(youOwe)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">You are owed</dt>
          <dd className="text-lg font-medium">{formatMoney(youAreOwed)}</dd>
        </div>
      </dl>
    </section>
  );
}
