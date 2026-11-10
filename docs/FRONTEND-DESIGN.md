# Frontend direction: After Hours

The internet’s unofficial break room. Implement the supplied Day Shift / Night Shift palette and existing original speech-peak identity. Use Space Grotesk for expressive headlines and DM Sans for sustained reading.

Arrival: asymmetric 38/62 split, editorial headline on the left and a full-sized public conversation on the right. A compact room chooser belongs inside the chat header, never a horizontal overflow strip.
Scroll: a short community statement, an asymmetric room directory, a tactile nickname card, and a concise invitation. Depth is reserved for room illustrations and the identity card; messages stay stable.
Motion: existing Motion library for component feedback; native document/chat scrolling; one passive, frame-scheduled scroll observer for decorative transforms. No WebGL, scroll-jacking, or new animation dependencies.
Demo: unconfigured installations clearly identify frontend-only sample activity. A typed in-memory adapter powers joining, messaging, profiles, reactions, consent and settings. No fake presence counts, automatic replies or provider verification.
Preserve: Supabase/Hono production routes, RLS and authentication. Local fixtures never travel to production APIs.
