# Copywriting review — 2026-11-10

Voice: casual, specific, quietly funny. Give functional labels priority over jokes. Keep safety, consent, authentication and failure states literal.

## Changes
- Kept one clear hero: “The group chat between jobs.” Added “Or just read the room. That’s fine too.”
- Rewrote community, identity and final invitation sections with shorter, more direct copy.
- Centralized room descriptions, homepage metadata and recurring chat/consent text in src/shared/copy.ts. Signed-in room screens use the same descriptions as public cards.
- Simplified anonymous joining, nickname regeneration and optional private-message explanations. The final action says “Enter the conversation” because joining preserves the current room rather than always sending people to the lounge.
- Changed inbox heading to Messages, private-chat request action to Ask to chat, and empty/request states to plain language.
- Updated profile placeholder, saved/report confirmations, theme labels, reconnecting and failed-send messages, and client/server 404 copy.
- Replaced repetitive rejection/unemployment jokes in generated nickname choices and daily prompts. Existing user content and clearly labeled sample messages are untouched.
- Updated public metadata, community-guideline introduction and headings. Detailed privacy, moderation and legal disclosures retain their substantive meaning. Private routes remain noindex.
- Existing clear navigation, validation, destructive-action confirmations and accessibility labels were retained where a rewrite added no value.

## Scope and verification
No backend, route, auth or permission behavior changed. No activity statistics or new fictional conversations added. Existing failed-message test now expects the revised wording while retaining its retry/idempotency assertions.

Visual inspection attempted after renewed user permission, but a saved browser permission/managed policy still denied localhost access. Mobile/desktop fit and screenshots remain unverified; no visual approval claimed.

Verification results: 58 unit/integration tests passed; ESLint passed; TypeScript and Vite production builds passed. Browser-test wording selectors updated; browser tests were not run because of the access restriction.
