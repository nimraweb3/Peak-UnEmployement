import { useEffect, useState } from "react";
import { usePreferences } from "../../contexts/preferences";

const lines = [
  [
    "InterviewGhost_91",
    "Got rejected from a job I don’t remember applying for.",
  ],
  ["JoblessLegend_42", "They rejected you before you remembered them 💀"],
  ["StillApplying_07", "HR said they’d get back to me. Three months ago."],
  ["Frontend404", "At this point, applying for jobs IS my job."],
];

/** Entirely local illustration. Never read by the message API. */
export function ConversationDemo() {
  const { reduced } = usePreferences();
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const change = () => setHidden(document.hidden);
    change();
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    if (!playing || hidden || reduced || step >= 8) return;
    const timer = setTimeout(
      () => setStep((s) => s + 1),
      step % 2 === 0 ? 1800 : 3600,
    );
    return () => clearTimeout(timer);
  }, [playing, hidden, reduced, step]);
  const count = reduced ? lines.length : Math.ceil(step / 2);
  return (
    <section
      className="conversation-demo"
      aria-label="Conversation demonstration"
    >
      <div className="demo-heading">
        <div>
          <span className="eyebrow">ILLUSTRATION · NOT LIVE MESSAGES</span>
          <h3>See how the conversation works.</h3>
        </div>
        {!visible && (
          <button
            className="button button-outline"
            onClick={() => {
              setVisible(true);
              setPlaying(!reduced);
            }}
          >
            Play demo
          </button>
        )}
      </div>
      {visible && (
        <>
          <div className="demo-transcript" aria-label="Fictional conversation">
            {lines.slice(0, count).map(([name, text], i) => (
              <article className="demo-message" key={name}>
                <span className="demo-avatar" aria-hidden="true">
                  {name[0]}
                </span>
                <div>
                  <strong>{name}</strong>
                  <p>{text}</p>
                  {i === 0 && (step >= 4 || reduced) && (
                    <span
                      className="demo-reaction"
                      aria-label="Illustrated reaction: skull, two"
                    >
                      💀 2
                    </span>
                  )}
                </div>
              </article>
            ))}
            {!reduced && step < 8 && (
              <p className="demo-typing">
                {playing && !hidden
                  ? `${lines[Math.min(count, 3)][0]} is typing…`
                  : "Demo paused"}
              </p>
            )}
          </div>
          <div className="demo-controls">
            {!reduced && step < 8 && (
              <button onClick={() => setPlaying((v) => !v)}>
                {playing ? "Pause demo" : "Play demo"}
              </button>
            )}
            <button
              onClick={() => {
                setStep(0);
                setPlaying(!reduced);
              }}
            >
              Replay demo
            </button>
            <button
              onClick={() => {
                setVisible(false);
                setPlaying(false);
                setStep(0);
              }}
            >
              Skip demonstration
            </button>
          </div>
          <p className="fine-print">
            Fictional people, familiar conversations. The live room above shows
            actual community messages.
          </p>
        </>
      )}
    </section>
  );
}
