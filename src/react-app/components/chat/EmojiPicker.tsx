import { useEffect, useRef, useState } from "react";

const categories = {
  Faces: [
    ["😀", "Smile"],
    ["😂", "Laugh"],
    ["😊", "Happy"],
    ["😭", "Crying"],
    ["💀", "Skull"],
    ["😅", "Relieved"],
    ["🤔", "Thinking"],
    ["🙃", "Upside down"],
    ["😴", "Sleepy"],
    ["😎", "Cool"],
    ["🥹", "Holding back tears"],
    ["😤", "Frustrated"],
    ["🤯", "Mind blown"],
    ["🥳", "Party"],
    ["😬", "Grimace"],
    ["🫠", "Melting"],
  ],
  Gestures: [
    ["👍", "Thumbs up"],
    ["👎", "Thumbs down"],
    ["👋", "Wave"],
    ["🙌", "Hooray"],
    ["👏", "Clap"],
    ["🤝", "Handshake"],
    ["🫂", "Hug"],
    ["🤞", "Fingers crossed"],
    ["✌️", "Peace"],
    ["💪", "Strong"],
    ["🙏", "Thanks"],
    ["🤷", "Shrug"],
  ],
  Things: [
    ["❤️", "Heart"],
    ["💜", "Purple heart"],
    ["🎉", "Celebrate"],
    ["🔥", "Fire"],
    ["☕", "Coffee"],
    ["🍕", "Pizza"],
    ["🍿", "Popcorn"],
    ["🌱", "Seedling"],
    ["✨", "Sparkles"],
    ["💼", "Work"],
    ["💻", "Laptop"],
    ["📨", "Email"],
    ["✅", "Check"],
    ["🚀", "Rocket"],
    ["🎯", "Target"],
    ["📝", "Note"],
  ],
};
export const reactionLabels: Record<string, string> = {
  "💜": "Purple heart",
  "😂": "Laugh",
  "🫂": "Hug",
  "🎉": "Celebrate",
  "🔥": "Fire",
};

export function EmojiPicker({
  onSelect,
  onClose,
  canInsert,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  canInsert: (emoji: string) => boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<keyof typeof categories>("Faces");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [onClose]);
  const items = search
    ? Object.values(categories)
        .flat()
        .filter(([, name]) => name.toLowerCase().includes(search.toLowerCase()))
    : categories[category];
  return (
    <div
      className="emoji-panel"
      ref={root}
      role="group"
      aria-label="Choose an emoji"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="emoji-search">
        <input
          aria-label="Search emojis"
          placeholder="Search emojis"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" aria-label="Close emoji picker" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="emoji-categories" aria-label="Emoji categories">
        {Object.keys(categories).map((key) => (
          <button
            type="button"
            aria-pressed={category === key && !search}
            key={key}
            onClick={() => {
              setCategory(key as keyof typeof categories);
              setSearch("");
            }}
          >
            {key}
          </button>
        ))}
      </div>
      <div
        className="emoji-grid"
        onKeyDown={(e) => {
          if (
            ![
              "ArrowRight",
              "ArrowLeft",
              "ArrowDown",
              "ArrowUp",
              "Home",
              "End",
            ].includes(e.key)
          )
            return;
          const buttons = Array.from(
            e.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          if (index < 0 || !buttons.length) return;
          e.preventDefault();
          const next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? buttons.length - 1
                : (index +
                    ({
                      ArrowRight: 1,
                      ArrowLeft: -1,
                      ArrowDown: 6,
                      ArrowUp: -6,
                    }[e.key] || 0) +
                    buttons.length) %
                  buttons.length;
          buttons[next]?.focus();
        }}
      >
        {items.map(([emoji, label]) => (
          <button
            type="button"
            key={emoji}
            title={label}
            aria-label={label}
            disabled={!canInsert(emoji)}
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      {!items.length && <p>No emojis found. Try “coffee” or “laugh”.</p>}
    </div>
  );
}
