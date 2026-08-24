import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Recover your OmniTask account password.",
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
