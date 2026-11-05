export const legalContent: Record<
  string,
  { title: string; intro: string; sections: [string, string][] }
> = {
  "/community-guidelines": {
    title: "Good company. Good boundaries.",
    intro:
      "Humor without cruelty. Connection without pressure. These are the basics of being here.",
    sections: [
      [
        "Be a person to other people.",
        "No harassment, hate, threats, sexual harassment, or targeting people for who they are. Vent about an experience without turning it into abuse.",
      ],
      [
        "Protect everyone’s privacy.",
        "Do not post names, contact details, addresses, application screenshots, or identifying information about yourself or others. Public rooms can be read by anyone, including visitors who have not joined.",
      ],
      [
        "Consent comes first.",
        "Private chat is opt-in and requires an accepted request. A declined request is an answer. Do not evade a block or pressure someone to move off-platform.",
      ],
      [
        "No scams or spam.",
        "No recruitment scams, suspicious offers, repetitive promotion, or requests for money. Links are limited to one per message.",
      ],
      [
        "Celebrate the small things.",
        "All industries and stages are welcome. Employment status is self-reported, never verified. Getting a job does not make you less welcome.",
      ],
      [
        "Use the safety tools.",
        "Open a person’s profile or message menu to report or block. Moderators can remove messages and restrict accounts. Reports are private and are reviewed when an operator is available; this is not an emergency service.",
      ],
    ],
  },
  "/privacy": {
    title: "Anonymous doesn’t mean invisible.",
    intro:
      "Your public identity is a nickname. Here is what that means in practice.",
    sections: [
      [
        "What we store",
        "We store an authentication identifier, a separate public profile identifier, your chosen profile fields, messages, reactions, conversation requests, blocks, and reports. Optional account-linking email is kept by Supabase Auth and is never part of your public profile.",
      ],
      [
        "Who can see what",
        "Anyone can read public room messages, nicknames, avatars and reaction counts. Other profile fields are available only to signed-in members. Only participants can read approved private conversations through the application. Operators with database access can access stored data for service administration. Private chats are not end-to-end encrypted.",
      ],
      [
        "Your anonymous account",
        "An anonymous session is saved in this browser’s local storage. Signing out, clearing storage, or changing devices may permanently lose access unless you link an email and confirm it. Anonymous does not mean untraceable: infrastructure providers can process IP addresses and technical request information.",
      ],
      [
        "Service providers",
        "Cloudflare hosts the app and provides Turnstile abuse protection. Supabase stores authentication and community data and delivers realtime updates. No AI provider receives conversations. Optional Cloudflare Web Analytics is enabled only when the operator configures a beacon token; it does not receive chat bodies.",
      ],
      [
        "Retention and deletion",
        "Messages remain until removed or your account is deleted. Message removal clears the stored body and leaves a removed-message marker. Account deletion removes your profile and associated messages, reactions, blocks, and conversations; reports may remain with account links removed. Minimal moderation records retain the action, time, and target identifier for operator review; they do not contain message bodies. Provider backups and technical logs follow the operator’s configured retention.",
      ],
      [
        "Your controls",
        "Edit your profile, turn off new private requests, block people, and delete your account in Settings. Blocking hides public content between signed-in accounts, but does not prevent reading it as a guest. Public posts can be copied by visitors or other members. Avoid sharing sensitive personal information. The operator must publish a privacy contact and retention schedule before opening this deployment to a public community.",
      ],
    ],
  },
  "/terms": {
    title: "A little common ground.",
    intro:
      "Peak Unemployment is an independent social community, not a recruitment service or professional advice provider.",
    sections: [
      [
        "Using the community",
        "Use the service respectfully and follow the community guidelines. You are responsible for content you submit and must have the right to share it. This initial community is intended for adults aged 18 and older.",
      ],
      [
        "No promises about employment",
        "We do not verify employment status, provide job placement, or promise outcomes. Community posts reflect members’ opinions. This is not professional financial, legal, career, or mental-health treatment.",
      ],
      [
        "Your content",
        "You retain ownership of your content. You allow the service to store and display it to the audiences you choose so the community can function. Do not submit confidential or unlawful content.",
      ],
      [
        "Availability and moderation",
        "The service is provided as available and may have free-tier limits or interruptions. Moderators may remove content or restrict accounts for abuse. Anonymous accounts cannot be recovered without a linked sign-in method.",
      ],
      [
        "Leaving",
        "You can delete your account and associated data in Settings. For operational or privacy requests, the deploying operator must provide contact information before public launch. These starter terms must be reviewed and adapted to the operator and jurisdiction before launch.",
      ],
    ],
  },
};
