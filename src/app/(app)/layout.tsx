import Link from "next/link";
import Nav from "@/components/Nav";
import { requireSession } from "@/lib/auth";
import { getBusiness } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const business = await getBusiness();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[210px_1fr]">
      <aside className="md:sticky md:top-0 md:h-screen bg-[#0e1512] md:flex md:flex-col">
        <div className="flex items-center gap-2.5 px-4 pt-4 md:pt-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
            R
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{business.name}</p>
            <p className="text-[11px] text-white/45">{business.currencyCode}</p>
          </div>
        </div>

        <div className="mt-3 md:mt-5">
          <Nav />
        </div>

        <div className="mt-auto hidden px-4 pb-5 md:block">
          <p className="mb-2 truncate text-[11px] text-white/40">{session.email}</p>
          <form action="/api/logout" method="post">
            <button type="submit" className="text-xs font-medium text-white/60 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
