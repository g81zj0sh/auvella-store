import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { completeLogin } from "@/lib/customerAuth";

/*
 * /account/callback — Shopify's hosted login redirects here with
 * ?code=&state= after the customer verifies their email code.
 */

export const Route = createFileRoute("/account/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setFailed(true);
      return;
    }
    completeLogin(code, state).then((ok) => {
      if (ok) {
        navigate({ to: "/account", replace: true });
      } else {
        setFailed(true);
      }
    });
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-white">
      {failed ? (
        <div className="text-center">
          <p className="font-serif text-xl font-light text-[#0a0a0a]">
            Sign-in didn't complete
          </p>
          <p className="mt-2 text-[13px] text-[#888888]">
            The link may have expired — please try signing in again.
          </p>
          <a
            href="/account"
            className="mt-6 inline-flex h-11 items-center bg-[#0a0a0a] px-8 text-[11px] uppercase tracking-[0.18em] text-white"
          >
            Back to Account
          </a>
        </div>
      ) : (
        <Loader2 className="h-6 w-6 animate-spin text-[#0a0a0a]" />
      )}
    </div>
  );
}
