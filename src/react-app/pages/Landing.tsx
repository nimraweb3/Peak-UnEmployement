import { lazy, Suspense, useState } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router";
import { PublicPage, roomNames } from "../../shared/public-page";
import { appDestination } from "../lib/destination";
import { ConversationDemo } from "../components/chat/ConversationDemo";
import { PublicConversation } from "../components/chat/PublicConversation";
import { usePreferences } from "../contexts/preferences";
import { useSession } from "../contexts/session";
import { useAfterHoursMotion } from "../hooks/useAfterHoursMotion";
const JoinFlow = lazy(() => import("../components/JoinFlow"));
export default function Landing({
  joinInitially = false,
}: {
  joinInitially?: boolean;
}) {
  useAfterHoursMotion();
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
  if (profile?.onboarding_completed)
    return (
      <Navigate
        to={appDestination(params.slug ? `/rooms/${params.slug}` : requested)}
        replace
      />
    );
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
          <>
            {slug === "lounge" &&
            import.meta.env.VITE_HOMEPAGE_CHAT_MODE !== "live" ? (
              <ConversationDemo />
            ) : (
              <PublicConversation slug={slug} onJoin={() => setJoining(true)} />
            )}
            <div className="demo-join">
              <button
                className="button button-primary"
                onClick={() => setJoining(true)}
              >
                Join anonymously to reply
              </button>
            </div>
          </>
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
              nav(
                appDestination(
                  slug === "lounge" ? requested : `/rooms/${slug}`,
                ),
                { replace: true },
              );
            }}
          />
        </Suspense>
      )}
    </>
  );
}
