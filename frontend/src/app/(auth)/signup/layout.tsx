import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Create an OmniTask account to start collaborating with your software engineering team.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
