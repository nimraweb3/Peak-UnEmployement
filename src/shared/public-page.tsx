import { useState, type ReactNode, type MouseEvent } from "react";
import { Brand, BrandMark } from "./brand";
import { industries, nickname } from "./config";
export const roomNames: Record<string, string> = {
  lounge: "The Unemployment Lounge",
  ...Object.fromEntries(industries.map((r) => [r.slug, r.name])),
};
export { roomDescriptions } from "./copy";
import { roomDescriptions, copy } from "./copy";
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
      <p>{copy.chat.loading}</p>
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
  const [alias, setAlias] = useState("LateCoffee_91");
  const [identityVersion, setIdentityVersion] = useState(0);
  const room = roomNames[slug] || roomNames.lounge;
  const joinHref =
    "/join?returnTo=" +
    encodeURIComponent(slug === "lounge" ? "/" : "/rooms/" + slug);
  const join = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onJoin) {
      e.preventDefault();
      onJoin();
    }
  };
  const changeRoom = (e: MouseEvent<HTMLAnchorElement>, next: string) => {
    e.currentTarget.closest("details")?.removeAttribute("open");
    if (onRoom) {
      e.preventDefault();
      onRoom(next);
    }
  };
  return (
    <div className="after-hours">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="ah-header">
        <a href="/" aria-label="Peak Unemployment home">
          <Brand />
        </a>
        <nav aria-label="Main navigation">
          <a href="#rooms">Find your people</a>
          <a href="/community-guidelines">House rules</a>
        </nav>
        <div className="ah-header-actions">
          <select
            aria-label="Color theme"
            className="theme-select"
            value={theme}
            onChange={(e) => onTheme?.(e.target.value)}
          >
            <option value="light">Day Shift</option>
            <option value="dark">Night Shift</option>
            <option value="system">Match device</option>
          </select>
          <a className="ah-signin" href={member ? "/app/messages" : "/auth?returnTo=" + encodeURIComponent(slug === "lounge" ? "/app/lounge" : "/rooms/"+slug)}>
            {member ? "Your inbox" : "Sign in"}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      <main id="main-content">
        <section
          className="ah-arrival"
          aria-label="Peak Unemployment community"
        >
          <div className="ah-intro">
            <div className="ah-kicker">
              <span className="ah-small-mark" aria-hidden="true">
                ↳
              </span>{" "}
              The internet’s unofficial break room
            </div>
            <h1>
              The group chat
              <br />
              <span>between jobs.</span>
            </h1>
            <p className="ah-lede">
              No résumé. No awkward networking. Just people talking about
              everything that comes with being between jobs.
            </p>
            <div className="ah-actions">
              <a
                className="button button-primary"
                href={member ? "/app/lounge" : joinHref}
                onClick={member ? undefined : join}
              >
                {member ? "Back to the lounge" : "Join anonymously"}
                <span aria-hidden="true">↗</span>
              </a>
              <a href="#rooms" className="ah-text-link">
                Explore rooms <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="ah-read-note">
              <span aria-hidden="true">◎</span> Or just read the room. That’s
              fine too.
            </p>
            <div className="ah-desk-object" aria-hidden="true" data-depth="18">
              <div className="ah-object-shadow" />
              <div className="ah-object-back" />
              <div className="ah-object-front">
                <BrandMark />
                <span>
                  OFF THE CLOCK.
                  <br />
                  <strong>STILL IN THE CHAT.</strong>
                </span>
                <i>↗</i>
              </div>
              <span className="ah-object-caption">
                Your job title can sit this one out.
              </span>
            </div>
          </div>
          <section
            className="home-chat ah-conversation"
            aria-labelledby="public-room-title"
          >
            <div className="ah-chat-label">
              <span>
                <i aria-hidden="true" /> The conversation
              </span>
              <a href="/community-guidelines">House rules ↗</a>
            </div>
            <header className="public-room-header">
              <div className="ah-room-symbol" aria-hidden="true">
                #
              </div>
              <div>
                <h2 id="public-room-title">{room}</h2>
                <p>{roomDescriptions[slug]}</p>
              </div>
            </header>
            <details className="ah-room-switcher">
              <summary>
                <span>#{slug === "lounge" ? " main lounge" : " " + slug}</span>
                <span>
                  Change room <span aria-hidden="true">⌄</span>
                </span>
              </summary>
              <nav aria-label="Public chatrooms">
                {[
                  { slug: "lounge", name: "The main lounge" },
                  ...industries,
                ].map((r) => (
                  <a
                    key={r.slug}
                    href={r.slug === "lounge" ? "/" : "/rooms/" + r.slug}
                    aria-current={slug === r.slug ? "page" : undefined}
                    onClick={(e) => changeRoom(e, r.slug)}
                  >
                    <span aria-hidden="true">#</span>
                    {r.name}
                    {slug === r.slug && <span aria-hidden="true">✓</span>}
                  </a>
                ))}
              </nav>
            </details>
            <div className="public-chat-content" data-nosnippet="">
              {chat || (
                <>
                  <GuestPlaceholder />
                  <div className="guest-composer">
                    <span>Join to say something</span>
                    <a
                      className="button button-primary"
                      href={joinHref}
                      onClick={join}
                    >
                      Join in
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
        <section
          className="ah-community reveal-section"
          aria-label="About the community"
        >
          <span className="ah-section-label">01 / A little company</span>
          <h2>
            Some days you need advice.
            <br />
            Some days you just <span>need to complain.</span>
          </h2>
          <p>Both are welcome. So is talking about something else entirely.</p>
          <div className="ah-community-note" data-depth="-14">
            <span aria-hidden="true">↳</span> No introductions
            <br />
            that sound like a pitch.
          </div>
        </section>
        <section className="ah-discovery reveal-section" id="rooms">
          <div className="ah-section-heading">
            <div>
              <span className="ah-section-label">
                02 / Find a familiar corner
              </span>
              <h2>
                Find your people<span>.</span>
              </h2>
            </div>
            <p>Different industries. Surprisingly similar problems.</p>
          </div>
          <nav className="ah-room-directory" aria-label="Industry discovery">
            {industries.map((r, i) => (
              <a
                className={"ah-room-card room-art-" + i}
                href={"/rooms/" + r.slug}
                key={r.slug}
                onClick={(e) => changeRoom(e, r.slug)}
                aria-current={slug === r.slug ? "page" : undefined}
                data-tilt=""
              >
                <div className="ah-room-art" aria-hidden="true">
                  <span>{r.icon}</span>
                  <i />
                  <b>{String(i + 1).padStart(2, "0")}</b>
                </div>
                <div className="ah-room-card-copy">
                  <h3>{r.name}</h3>
                  <p>{roomDescriptions[r.slug]}</p>
                  <span className="ah-room-enter">
                    Enter room <span aria-hidden="true">↗</span>
                  </span>
                </div>
              </a>
            ))}
          </nav>
        </section>
        <section
          className="ah-identity reveal-section"
          aria-labelledby="identity-title"
        >
          <div className="ah-identity-copy">
            <span className="ah-section-label">03 / A name, not a résumé</span>
            <h2 id="identity-title">
              No real names.
              <br />
              <span>No awkward intros.</span>
            </h2>
            <p>
              Pick a nickname and join a conversation. Share as much or as
              little about yourself as you like.
            </p>
            <ul>
              <li>Your email never appears on your public profile.</li>
              <li>Private message requests start off.</li>
              <li>You decide which private chats to accept.</li>
            </ul>
            <a href="/privacy" className="ah-text-link">
              The details on privacy ↗
            </a>
          </div>
          <div className="ah-identity-stage" data-tilt="">
            <div className="ah-identity-underlay" aria-hidden="true" />
            <div
              className={"ah-identity-card identity-" + (identityVersion % 3)}
            >
              <span className="ah-card-label">Hello, I’m</span>
              <div className="ah-avatar-sculpture" aria-hidden="true">
                <span />
                <i />
                <b />
              </div>
              <strong aria-live="polite">{alias}</strong>
              <span className="ah-card-caption">
                Nickname preview · no account created
              </span>
              <button
                className="button button-outline"
                onClick={() => {
                  setAlias(nickname());
                  setIdentityVersion((v) => v + 1);
                }}
              >
                ↻ Try another
              </button>
            </div>
          </div>
        </section>
        <section className="ah-invitation">
          <div>
            <span className="ah-section-label">Pull up a chair.</span>
            <h2>Still here? Come say hi.</h2>
          </div>
          <a
            className="button button-primary"
            href={member ? "/app/lounge" : joinHref}
            onClick={member ? undefined : join}
          >
            {member ? "Open your lounge" : "Join anonymously"}
            <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
      <footer className="ah-footer">
        <a href="/" aria-label="Peak Unemployment home">
          <Brand />
        </a>
        <span>A place to talk.</span>
        <nav aria-label="Footer navigation">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/community-guidelines">Community guidelines</a>
        </nav>
      </footer>
    </div>
  );
}
