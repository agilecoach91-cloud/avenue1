import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center px-4 text-center">
      <h1 className="type-display text-[2rem]">Page not found</h1>
      <p className="mt-2 text-steel">Check the link you were sent, or ask the business for their booking page.</p>
      <Link href="/" className="btn btn-ghost mt-6 justify-self-center">
        Go to the home page
      </Link>
    </main>
  );
}
