import { AuthCard } from "@/components/auth/AuthCard";
import { ResetForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default function Reset() {
  return (
    <AuthCard title="Choose a new password">
      <ResetForm />
    </AuthCard>
  );
}
