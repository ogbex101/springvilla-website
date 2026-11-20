import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function Forgot() {
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one." footer={<Link href="/admin/login" className="underline">Back to sign in</Link>}>
      <ForgotForm />
    </AuthCard>
  );
}
