export const runtime = "nodejs";
import { ReferralAccountForm } from "@/components/referral/ReferralAccountForm";
import { Suspense } from "react";


export default function ReferralAccountPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ReferralAccountForm />
    </Suspense>
  );
}