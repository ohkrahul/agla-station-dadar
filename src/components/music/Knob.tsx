"use client";

import { useCallback, useRef } from "react";

/** Usable range of rotation, leaving a dead zone at the bottom like a real pot. */
const SWEEP = 270;
const START = -135;

/**
 * A rotary control that is a real slider underneath.
 *
 * Nothing about a knob is accessible by default, so this carries the slider role
 * and value, responds to arrow keys, Home and End, and drags vertically — up to
 * increase. Vertical drag rather than true angular tracking because grabbing a
 * 56px dial and swinging around its centre is fiddly with a mouse, whereas
 * pull-up/push-down is what people actually expect from a knob on screen.
 */
export function Knob({
  value,
  onChange,
  disabled,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label: string;
}) {
  const drag = useRef<{ y: number; from: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      drag.current = { y: e.clientY, from: value };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [disabled, value]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d) return;
      // 160px of travel covers the full range — fine control without hunting.
      const next = d.from + ((d.y - e.clientY) / 160) * 100;
      onChange(Math.max(0, Math.min(100, Math.round(next))));
    },
    [onChange]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const step = e.shiftKey ? 10 : 2;
      const map: Record<string, number> = {
        ArrowUp: value + step,
        ArrowRight: value + step,
        ArrowDown: value - step,
        ArrowLeft: value - step,
        Home: 0,
        End: 100,
      };
      if (!(e.key in map)) return;
      e.preventDefault();
      onChange(Math.max(0, Math.min(100, Math.round(map[e.key]))));
    },
    [disabled, onChange, value]
  );

  return (
    <div
      className="knob"
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value} percent`}
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={onKeyDown}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      {/* A value arc as well as the pointer: the angle alone is hard to read at
          this size, and the arc gives the level at a glance. Drawn with a conic
          gradient masked to a ring, so it costs no extra element. */}
      <span
        aria-hidden
        className="knob-arc"
        style={{ ["--sweep" as string]: `${(value / 100) * SWEEP}deg` }}
      />
      <span
        className="knob-mark"
        style={{ rotate: `${START + (value / 100) * SWEEP}deg` }}
      />
    </div>
  );
}
