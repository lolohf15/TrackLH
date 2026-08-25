/**
 * Signed-out screens stand alone: no tab bar, no sidebar, no floating add
 * button — none of which mean anything before there is a ledger to add to.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col justify-center px-6 py-12 bg-bg">
      <div className="w-full max-w-[360px] mx-auto">{children}</div>
    </div>
  );
}
