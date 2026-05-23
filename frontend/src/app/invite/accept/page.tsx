"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useAcceptInvitation, useVerifyInvitationStatus } from "@/api/organizations";
import { useLogoutMutation, useAuthProfile } from "@/api/auth";
import { useIsMounted } from "@/hooks/useIsMounted";

const INVITE_TOKEN_KEY = "pending_invite_token";

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Keeps Suspense boundary active
  void searchParams;

  // Retrieve token from URL or fall back to localStorage on client mount (lazy initializer)
  const [token] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const urlT = new URLSearchParams(window.location.search).get("token");
      if (urlT) {
        localStorage.setItem(INVITE_TOKEN_KEY, urlT);
        return urlT;
      }
      return localStorage.getItem(INVITE_TOKEN_KEY);
    }
    return null;
  });

  const acceptInvitation = useAcceptInvitation();
  const logoutMutation = useLogoutMutation();
  const isMounted = useIsMounted();
  
  // Directly load the authentication profile via React Query to bypass Zustand hydration lag
  const { data: profileData, isLoading: isProfileLoading } = useAuthProfile();
  const user = profileData?.data;

  // Query status of the invitation token to check if user has an account
  const { data: statusResponse, isLoading: isStatusLoading, error: statusError } = useVerifyInvitationStatus(token);
  const statusData = statusResponse?.data;

  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState("");

  // Determine status and error message dynamically (no duplicate useState/useEffect needed!)
  let status: "loading" | "success" | "error" | "email_mismatch" = "loading";
  let errorMessage = "";

  // Show no token error ONLY if component is mounted and no token was resolved from either URL or localStorage
  if (isMounted && !token) {
    status = "error";
    errorMessage = "Invalid invitation link. No token found.";
  } else if (statusError) {
    status = "error";
    errorMessage = "Invalid or expired invitation link.";
  } else if (acceptInvitation.isError) {
    const apiError = acceptInvitation.error as unknown as {
      response?: {
        status?: number;
        data?: {
          message?: string;
        };
      };
      message?: string;
    };

    const errorMsg = apiError.response?.data?.message || 
                     apiError.message || 
                     "Failed to accept the invitation. It may have expired or already been used.";
                     
    const isEmailMismatch = apiError.response?.status === 403 || 
                            errorMsg.toLowerCase().includes("please log in with that email") || 
                            errorMsg.toLowerCase().includes("sent to");
                            
    status = isEmailMismatch ? "email_mismatch" : "error";
    errorMessage = errorMsg;
  } else if (acceptInvitation.isSuccess) {
    status = "success";
  } else if (isProfileLoading || isStatusLoading || acceptInvitation.isPending) {
    status = "loading";
  }

  useEffect(() => {
    // Wait until query params are resolved and auth profile is loaded
    if (!token || isProfileLoading || isStatusLoading || !statusData || statusError) {
      return;
    }

    if (!user) {
      // Save the token and redirect based on userExists status
      localStorage.setItem(INVITE_TOKEN_KEY, token);
      
      const userExists = statusData.userExists;
      if (userExists) {
        router.replace(`/login?redirect=/invite/accept`);
      } else {
        router.replace(`/signup?redirect=/invite/accept`);
      }
      return;
    }

    // User is authenticated — attempt to accept the invitation
    if (acceptInvitation.isIdle) {
      acceptInvitation.mutate(token, {
        onSuccess: (response) => {
          if (response.success) {
            setOrgName(response.data.orgName ?? "the organization");
            setOrgId(response.data.orgId);
            // Clean up any stored token
            localStorage.removeItem(INVITE_TOKEN_KEY);
            // Auto redirect after 2.5s
            setTimeout(() => {
              router.push(`/organizations/${response.data.orgId}`);
            }, 2500);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, isProfileLoading, isStatusLoading, statusData, statusError, acceptInvitation]);

  // Clean up any stale invite token from localStorage if acceptance or validation fails with an error
  useEffect(() => {
    if (status === "error" && typeof window !== "undefined") {
      localStorage.removeItem(INVITE_TOKEN_KEY);
    }
  }, [status]);

  // Prevent rendering and wait until component has hydrated, and auth profile/status are loaded
  if (!isMounted || isProfileLoading || (token && isStatusLoading && status !== "error")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative gradients */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo showText href={null} />
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Accepting Invitation</h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Please wait while we process your invitation…
                </p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">You&apos;re in! 🎉</h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  You have successfully joined <span className="font-semibold text-foreground">{orgName}</span>.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Redirecting you to the workspace…
                </p>
              </div>
              <Button
                className="mt-2 rounded-xl px-8 h-11 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                onClick={() => router.push(`/organizations/${orgId}`)}
              >
                Go to Workspace
              </Button>
            </div>
          )}

          {status === "email_mismatch" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
                <LogIn className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Wrong Account</h1>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {errorMessage}
                </p>
              </div>
              <div className="flex flex-col gap-2.5 w-full">
                <Button
                  className="rounded-xl h-11 font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                  disabled={logoutMutation.isPending}
                  onClick={() => {
                    if (token) localStorage.setItem(INVITE_TOKEN_KEY, token);
                    logoutMutation.mutate(undefined, {
                      onSuccess: () => {
                        router.push("/login?redirect=/invite/accept");
                      },
                    });
                  }}
                >
                  {logoutMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    "Sign in with the correct account"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl h-10 text-muted-foreground"
                  disabled={logoutMutation.isPending}
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Invitation Failed</h1>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {errorMessage || "This invitation link is invalid or has expired."}
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-xl h-11 px-8 font-semibold transition-all"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    }>
      <InviteAcceptContent />
    </Suspense>
  );
}
