import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { PublicPage, roomNames } from "../../shared/public-page";
import { PublicConversation } from "../components/chat/PublicConversation";
import { usePreferences } from "../contexts/preferences";
import { useSession } from "../contexts/session";
const JoinFlow = lazy(() => import("../components/JoinFlow"));
export default function Landing({
  joinInitially = false,
}: {
  joinInitially?: boolean;
}) {
  const params = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const requested = new URLSearchParams(location.search).get("returnTo") || "/";
  const returnSlug =
    requested.match(/^\/(?:app\/)?rooms\/([a-z-]+)$/)?.[1] || "lounge";
  const slug = params.slug || (joinInitially ? returnSlug : "lounge");
  const { theme, setTheme } = usePreferences();
  const { profile } = useSession();
  const [joining, setJoining] = useState(joinInitially);
  const [focusComposer, setFocusComposer] = useState(false);
  useEffect(() => {
    if (focusComposer && profile?.onboarding_completed) {
      const focus = () => {
        const input = document.querySelector<HTMLTextAreaElement>(
          '[aria-label="Message"]',
        );
        if (input) {
          input.focus();
          setFocusComposer(false);
          return true;
        }
        return false;
      };
      if (focus()) return;
      const observer = new MutationObserver(() => {
        if (focus()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, [focusComposer, profile]);
  if (!roomNames[slug])
    return (
      <main className="state">
        <h1>Room not found.</h1>
        <a className="button button-primary" href="/">
          Back to the lounge
        </a>
      </main>
    );
  return (
    <>
      <PublicPage
        slug={slug}
        member={!!profile?.onboarding_completed}
        onJoin={() => setJoining(true)}
        onRoom={(next) => {
          nav(next === "lounge" ? "/" : `/rooms/${next}`);
          document
            .getElementById("public-room-title")
            ?.scrollIntoView({ block: "nearest" });
        }}
        onTheme={setTheme}
        theme={theme}
        chat={
          <PublicConversation slug={slug} onJoin={() => setJoining(true)} />
        }
      />
      {joining && (
        <Suspense fallback={null}>
          <JoinFlow
            onClose={() => {
              setJoining(false);
              if (joinInitially)
                nav(slug === "lounge" ? "/" : `/rooms/${slug}`, {
                  replace: true,
                });
            }}
            onComplete={() => {
              setJoining(false);
              setFocusComposer(true);
              if (joinInitially)
                nav(slug === "lounge" ? "/" : `/rooms/${slug}`, {
                  replace: true,
                });
            }}
          />
        </Suspense>
      )}
    </>
  );
}
