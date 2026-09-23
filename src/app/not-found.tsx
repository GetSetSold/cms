import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-6xl">Page not found</h1>
      <Link href="/" className="font-medium text-primary">Back to the home page</Link>
    </main>
  );
}
