import PublicLayout from "./(public)/layout";
import NotFound from "./(public)/not-found";

/** Unmatched URLs get the branded 404 inside the public chrome. */
export default function RootNotFound() {
  return (
    <PublicLayout>
      <NotFound />
    </PublicLayout>
  );
}
