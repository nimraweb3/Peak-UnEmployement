import { useId } from "react";
export function ThemeControl({
  value,
  onChange,
}: {
  value: string;
  onChange?: (value: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="theme-control">
      <legend className="sr-only">Color theme</legend>
      {[
        ["light", "Day Shift", "☀"],
        ["dark", "Night Shift", "☾"],
        ["system", "System", "◐"],
      ].map(([key, label, icon]) => (
        <label key={key} className={value === key ? "selected" : ""}>
          <input
            type="radio"
            name={name}
            value={key}
            checked={value === key}
            onChange={() => onChange?.(key)}
          />
          <span aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
