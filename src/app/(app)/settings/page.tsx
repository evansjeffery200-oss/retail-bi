import { getBusiness } from "@/lib/business";
import { saveBusiness } from "@/app/actions/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const business = await getBusiness();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Store identity, currency and tax</p>
      </header>

      <form action={saveBusiness} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="name">Store name</label>
          <input id="name" name="name" defaultValue={business.name} className="field" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="currencyCode">Currency code</label>
            <input id="currencyCode" name="currencyCode" defaultValue={business.currencyCode} className="field" placeholder="NGN" />
          </div>
          <div>
            <label className="label" htmlFor="currencyLocale">Currency locale</label>
            <input id="currencyLocale" name="currencyLocale" defaultValue={business.currencyLocale} className="field" placeholder="en-NG" />
          </div>
        </div>

        <div className="rounded-lg bg-[var(--bg)] p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="taxEnabled" defaultChecked={business.taxEnabled} className="h-4 w-4" />
            Charge tax on sales
          </label>
          <div className="mt-3 max-w-[160px]">
            <label className="label" htmlFor="taxRate">Tax rate (%)</label>
            <input id="taxRate" name="taxRate" defaultValue={business.taxRate} inputMode="decimal" className="field" />
          </div>
        </div>

        <button type="submit" className="btn btn-primary">Save settings</button>
      </form>

      <div className="card p-5 text-sm text-[var(--muted)]">
        <h2 className="mb-2 text-sm font-semibold text-[var(--ink)]">About logins</h2>
        <p>
          This build has one account. To change your password, run{" "}
          <code className="rounded bg-[var(--bg)] px-1.5 py-0.5">npm run db:seed</code> again with a new{" "}
          <code className="rounded bg-[var(--bg)] px-1.5 py-0.5">INITIAL_PASSWORD</code>: the seed updates the
          existing account rather than creating a second one.
        </p>
      </div>
    </div>
  );
}
