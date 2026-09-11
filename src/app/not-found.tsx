import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-3xl">That page is not here</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Check the link, or head back to Home.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Home
      </Link>
    </div>
  );
}
