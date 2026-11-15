import { industries } from "./config";
export const roomNames: Record<string, string> = {
  lounge: "The Unemployment Lounge",
  ...Object.fromEntries(industries.map((r) => [r.slug, r.name])),
};
export { roomDescriptions } from "./copy";
