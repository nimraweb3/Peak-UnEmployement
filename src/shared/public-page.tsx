import type { ReactNode, MouseEvent } from "react";
import { Brand, BrandMark } from "./brand";
import { industries } from "./config";
export const roomNames: Record<string, string> = {
  lounge: "The Unemployment Lounge",
  ...Object.fromEntries(industries.map((i) => [i.slug, i.name])),
};
export const roomDescriptions: Record<string, string> = {
  lounge: "Job searches, life updates, and everything in between.",
  tech: "Code, interviews, and the occasional missing semicolon.",
  design: "Portfolios, feedback, and life outside the brief.",
  business: "Spreadsheets closed. Conversation open.",
  marketing: "A conversation you don’t have to pitch.",
  healthcare: "Some space for the people who care.",
  education: "There’s always more to talk about.",
  engineering: "Working things out, together.",
  other: "No neat category? You’re in the right place.",
};
export function GuestPlaceholder() {
  return (
    <div className="feed-loading" role="status">
      <div className="feed-skeleton" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div className="skeleton-message" key={i}>
            <i />
            <div>
              <b />
              <span />
              <span />
            </div>
          </div>
        ))}
      </div>
      <p>Getting the conversation…</p>
    </div>
  );
}
export function PublicPage({
  slug = "lounge",
  chat,
  member = false,
  onJoin,
  onRoom,
  onTheme,
  theme = "light",
}: {
  slug?: string;
  chat?: ReactNode;
  member?: boolean;
  onJoin?: () => void;
  onRoom?: (slug: string) => void;
  onTheme?: (value: string) => void;
  theme?: string;
}) {
  const room = roomNames[slug] || roomNames.lounge;
  const join = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onJoin) {
      e.preventDefault();
      onJoin();
    }
  };
  const joinHref = `/join?returnTo=${encodeURIComponent(slug === "lounge" ? "/" : `/rooms/${slug}`)}`;
  return (
    <div className="public-site">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="public-header">
        <a href="/" aria-label="Peak Unemployment home">
          <Brand />
        </a>
        <nav aria-label="Main navigation">
          <a href="#rooms">The rooms</a>
          <a href="/community-guidelines">House rules</a>
          <select
            className="theme-select"
            aria-label="Color theme"
            value={theme}
            onChange={(e) => onTheme?.(e.target.value)}
          >
            <option value="light">Day Shift</option>
            <option value="dark">Night Shift</option>
            <option value="system">System</option>
          </select>
          {member ? (
            <a className="button button-primary" href="/app/messages">
              Your inbox <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <a className="button button-primary" href={joinHref} onClick={join}>
              Join anonymously <span aria-hidden="true">↗</span>
            </a>
          )}
        </nav>
      </header>
      <main id="main-content">
        <section className="home-grid" aria-label="Peak Unemployment community">
          <div className="home-intro">
            <span className="editorial-label">
              <span className="tiny-spark" aria-hidden="true">
                ✳
              </span>{" "}
              AFTER HOURS. OPEN TO EVERYONE.
            </span>
            <h1>
              {slug === "lounge" ? (
                <>
                  The group chat
                  <br />
                  <span className="coral-heading">
                    between jobs.
                    <svg viewBox="0 0 310 12" aria-hidden="true">
                      <path d="M3 9Q130-1 306 5" />
                    </svg>
                  </span>
                </>
              ) : (
                <>
                  {room}.<br />
                  <span className="coral-heading">Same boat.</span>
                </>
              )}
            </h1>
            <p className="intro-copy">
              No résumé. No awkward networking. Just people talking about
              everything that comes with being between jobs.
            </p>
            <div className="intro-actions">
              <a
                className="button button-primary"
                href={member ? "/app/lounge" : joinHref}
                onClick={member ? undefined : join}
              >
                {member ? "Open your lounge" : "Join anonymously"}{" "}
                <span aria-hidden="true">↗</span>
              </a>
              <a className="browse-link" href="#rooms">
                Explore rooms <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="identity-note">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="m10 2 6 3v5c0 4-6 7-6 7s-6-3-6-7V5l6-3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="m7 9 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              You can read the conversation before joining.
            </p>
            <div className="margin-note">
              <span aria-hidden="true">↳</span>
              <p>
                The internet’s unofficial
                <br />
                break room.
              </p>
            </div>
            <div className="intro-bottom">
              <BrandMark />
              <span>
                Less networking.
                <br />
                <strong>More actually talking.</strong>
              </span>
            </div>
          </div>
          <section className="home-chat" aria-labelledby="public-room-title">
            <div className="chat-topline">
              <span>THE CONVERSATION</span>
              <span className="read-badge">
                {member ? "You’re in" : "Open to read"}
              </span>
            </div>
            <header className="public-room-header">
              <span className="room-hash" aria-hidden="true">
                #
              </span>
              <div>
                <h2 id="public-room-title">{room}</h2>
                <p>{roomDescriptions[slug] || roomDescriptions.lounge}</p>
              </div>
              <a
                href="/community-guidelines"
                className="room-rules"
                aria-label="Read the community guidelines"
              >
                ↗
              </a>
            </header>
            <div className="public-chat-content" data-nosnippet="">
              {chat || (
                <>
                  <GuestPlaceholder />
                  <div className="guest-composer">
                    <span>Join to send a message</span>
                    <a
                      className="button button-primary"
                      href={joinHref}
                      onClick={join}
                    >
                      Join in <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                  <p className="public-disclosure">
                    Public room · Anyone can read. Members can reply.
                  </p>
                </>
              )}
            </div>
          </section>
        </section>
        <section className="room-directory" id="rooms">
          <div className="directory-heading">
            <div>
              <span className="eyebrow">
                SAME SITUATION. DIFFERENT GROUP CHATS.
              </span>
              <h2>
                Find your people<span className="coral-dot">.</span>
              </h2>
            </div>
            <p>Pick a room. You don’t have to stick to your industry.</p>
          </div>
          <nav className="directory-grid" aria-label="Public chatrooms">
            {[
              { slug: "lounge", name: "The main lounge", icon: "↗" },
              ...industries,
            ].map((r, i) => (
              <a
                key={r.slug}
                className={`directory-room ${slug === r.slug ? "room-selected" : ""}`}
                href={r.slug === "lounge" ? "/" : `/rooms/${r.slug}`}
                aria-current={slug === r.slug ? "page" : undefined}
                onClick={(e) => {
                  if (onRoom) {
                    e.preventDefault();
                    onRoom(r.slug);
                  }
                }}
              >
                <span
                  className={`directory-icon icon-${i % 4}`}
                  aria-hidden="true"
                >
                  {r.icon}
                </span>
                <strong>{r.name}</strong>
                <span className="directory-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </nav>
        </section>
        <aside className="house-note">
          <span className="note-icon" aria-hidden="true">
            ✳
          </span>
          <p>
            <strong>A room full of strangers. A few ground rules.</strong> Be
            kind. Keep personal details personal. Private chats only happen when
            both people say yes.
          </p>
          <a href="/community-guidelines">
            Read the house rules <span aria-hidden="true">↗</span>
          </a>
        </aside>
      </main>
      <footer className="public-footer">
        <a href="/" aria-label="Peak Unemployment home">
          <Brand />
        </a>
        <span>Not a job board. A place to talk.</span>
        <nav aria-label="Footer navigation">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/community-guidelines">Community guidelines</a>
        </nav>
        <small>Come as you are. Leave when you need to.</small>
      </footer>
    </div>
  );
}
