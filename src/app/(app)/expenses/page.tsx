import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { formatMoney, formatDate } from "@/lib/money";
import { createExpense, deleteExpense } from "@/app/actions/expenses";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Rent", "Salaries", "Transport", "Utilities", "Marketing", "Supplies", "Other"];

export default async function ExpensesPage() {
  const business = await getBusiness();
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [expenses, monthTotal] = await Promise.all([
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 100 }),
    prisma.expense.aggregate({ where: { date: { gte: startMonth } }, _sum: { amount: true } }),
  ]);

  const money = (n: number) => formatMoney(n, business.currencyCode, business.currencyLocale);
  const today = now.toISOString().slice(0, 10);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category || "Other";
    byCategory.set(key, (byCategory.get(key) ?? 0) + e.amount);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {money(monthTotal._sum.amount ?? 0)} recorded this month
        </p>
      </header>

      <form action={createExpense} className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Log an expense</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <input id="description" name="description" required className="field" placeholder="Shop rent for November" />
          </div>
          <div>
            <label className="label" htmlFor="amount">Amount</label>
            <input id="amount" name="amount" inputMode="decimal" required className="field" placeholder="0.00" />
          </div>
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" name="date" type="date" defaultValue={today} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" className="field" defaultValue="Other">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="payee">Paid to</label>
            <input id="payee" name="payee" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="paymentMethod">Method</label>
            <select id="paymentMethod" name="paymentMethod" className="field" defaultValue="Cash">
              <option>Cash</option>
              <option>Transfer</option>
              <option>Card</option>
              <option>POS</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes</label>
            <input id="notes" name="notes" className="field" />
          </div>
        </div>
        <div className="mt-4">
          <button type="submit" className="btn btn-primary">Save expense</button>
        </div>
      </form>

      {byCategory.size > 0 ? (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Where it goes</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...byCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => (
                <li key={cat} className="flex items-center justify-between rounded-lg bg-[var(--bg)] px-3 py-2 text-sm">
                  <span>{cat}</span>
                  <span className="font-medium">{money(total)}</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <div className="card overflow-x-auto">
        {expenses.length === 0 ? (
          <p className="p-5 text-sm text-[var(--muted)]">No expenses logged yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Paid to</th>
                <th>Method</th>
                <th className="num">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="text-[var(--muted)]">{formatDate(e.date)}</td>
                  <td className="font-medium">{e.description}</td>
                  <td className="text-[var(--muted)]">{e.category ?? "—"}</td>
                  <td className="text-[var(--muted)]">{e.payee ?? "—"}</td>
                  <td className="text-[var(--muted)]">{e.paymentMethod}</td>
                  <td className="num">{money(e.amount)}</td>
                  <td>
                    <form action={deleteExpense} className="flex justify-end">
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)]">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
