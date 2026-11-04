import { roomNames, roomDescriptions } from "./public-page";
export const publicPaths = [
  "/",
  "/community-guidelines",
  "/privacy",
  "/terms",
  ...Object.keys(roomNames)
    .filter((s) => s !== "lounge")
    .map((s) => `/rooms/${s}`),
];
export function pageMetadata(path: string, origin: string) {
  const titles: Record<string, [string, string]> = {
    "/": [
      "Peak Unemployment | Anonymous Chat for People Between Jobs",
      "Join Peak Unemployment, an anonymous live chat community for people between jobs. Read real conversations, find your industry, and talk with others.",
    ],
    "/community-guidelines": [
      "Community Guidelines | Peak Unemployment",
      "The house rules for Peak Unemployment: respect, privacy, consent and a conversation everyone can be part of.",
    ],
    "/privacy": [
      "Privacy & Anonymous Accounts | Peak Unemployment",
      "Understand what is public, how anonymous accounts work, what Peak Unemployment stores and how to control or delete your data.",
    ],
    "/terms": [
      "Terms of Use | Peak Unemployment",
      "Read the terms for using Peak Unemployment, an independent anonymous chat community for people between jobs.",
    ],
  };
  const slug = path.match(/^\/rooms\/([a-z-]+)$/)?.[1];
  const info =
    slug && roomNames[slug]
      ? [
          `${roomNames[slug]} Chat | Peak Unemployment`,
          `${roomDescriptions[slug]} Read public conversations and join anonymously on Peak Unemployment.`,
        ]
      : titles[path] || [
          path.startsWith("/app")
            ? "Your Community | Peak Unemployment"
            : path === "/join"
              ? "Join Anonymously | Peak Unemployment"
              : path === "/recover"
                ? "Sign In | Peak Unemployment"
                : "Page Not Found | Peak Unemployment",
          "Peak Unemployment is an anonymous community for people between jobs.",
        ];
  return {
    title: info[0],
    description: info[1],
    canonical: new URL(path, origin).href,
    image: new URL("/brand/social-share.png", origin).href,
    indexable: publicPaths.includes(path),
  };
}
export function structuredData(origin: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Peak Unemployment",
        url: origin,
        logo: new URL("/brand/app-icon.png", origin).href,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "Peak Unemployment",
        url: origin,
        description: "An anonymous chat community for people between jobs.",
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}
