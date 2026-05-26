"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { AvailabilitySlot } from "@/types/domain";

export type CalendarEvent = {
  id: number;
  startsAt: string;
  title: string;
  subtitle?: string;
  status?: string;
};

type AvailabilityCalendarProps = {
  date: Date;
  availabilitySlots: AvailabilitySlot[];
  selectedSlots: Set<string>;
  events: CalendarEvent[];
  disabled?: boolean;
  onSlotChange: (slot: string, selected: boolean) => void;
  renderEventActions?: (event: CalendarEvent) => ReactNode;
};

const START_HOUR = 8;
const END_HOUR = 24;
const STEP_MINUTES = 30;

function getSlotIso(date: Date, totalMinutes: number) {
  const slot = new Date(date);
  slot.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return slot.toISOString();
}

function formatTime(totalMinutes: number) {
  const date = new Date();
  date.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getTimeKey(iso: string) {
  const date = new Date(iso);
  return `${date.getHours()}:${date.getMinutes()}`;
}

function getTimeKeyFromMinutes(totalMinutes: number) {
  return `${Math.floor(totalMinutes / 60)}:${totalMinutes % 60}`;
}

function getDensityClass(slot?: AvailabilitySlot) {
  if (!slot) {
    return "bg-white";
  }

  if (slot.allAvailable) {
    return "bg-emerald-700 text-white";
  }

  const ratio = slot.memberCount > 0 ? slot.availableCount / slot.memberCount : 0;
  if (ratio >= 0.66) {
    return "bg-emerald-100 text-emerald-950";
  }
  if (ratio > 0) {
    return "bg-emerald-50 text-emerald-900";
  }

  return "bg-white";
}

export function AvailabilityCalendar({
  date,
  availabilitySlots,
  selectedSlots,
  events,
  disabled = false,
  onSlotChange,
  renderEventActions,
}: AvailabilityCalendarProps) {
  const [paintMode, setPaintMode] = useState<"add" | "remove" | null>(null);

  const timeSlots = useMemo(
    () =>
      Array.from(
        { length: ((END_HOUR - START_HOUR) * 60) / STEP_MINUTES },
        (_, index) => START_HOUR * 60 + index * STEP_MINUTES,
      ),
    [],
  );

  const availabilityByTime = useMemo(() => {
    const map = new Map<string, AvailabilitySlot>();
    for (const slot of availabilitySlots) {
      map.set(getTimeKey(slot.startsAt), slot);
    }
    return map;
  }, [availabilitySlots]);

  const eventsByTime = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = getTimeKey(event.startsAt);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  function paintSlot(slot: string, selected: boolean) {
    if (disabled) {
      return;
    }
    onSlotChange(slot, selected);
  }

  function beginPaint(slot: string) {
    const nextMode = selectedSlots.has(slot) ? "remove" : "add";
    setPaintMode(nextMode);
    paintSlot(slot, nextMode === "add");
  }

  function continuePaint(slot: string) {
    if (!paintMode) {
      return;
    }
    paintSlot(slot, paintMode === "add");
  }

  return (
    <div
      className="overflow-hidden rounded-md border border-[var(--border)] bg-white"
      onPointerLeave={() => setPaintMode(null)}
      onPointerUp={() => setPaintMode(null)}
    >
      <div className="grid grid-cols-[88px_minmax(0,1fr)] border-b border-[var(--border)] bg-[var(--panel-muted)]">
        <div className="border-r border-[var(--border)] px-3 py-2 text-xs font-bold uppercase text-[var(--muted)]">
          Time
        </div>
        <div className="px-3 py-2 text-xs font-bold uppercase text-[var(--muted)]">
          Availability and scrims
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto">
        {timeSlots.map((totalMinutes) => {
          const slotIso = getSlotIso(date, totalMinutes);
          const availability = availabilityByTime.get(getTimeKeyFromMinutes(totalMinutes));
          const slotEvents = eventsByTime.get(getTimeKeyFromMinutes(totalMinutes)) ?? [];
          const isSelected = selectedSlots.has(slotIso);

          return (
            <div
              key={slotIso}
              className="grid min-h-16 grid-cols-[88px_minmax(0,1fr)] border-b border-[var(--border)] last:border-b-0"
            >
              <div className="sticky left-0 border-r border-[var(--border)] bg-white px-3 py-3 text-xs font-bold text-[var(--muted)]">
                {formatTime(totalMinutes)}
              </div>
              <div className="p-2">
                <button
                  type="button"
                  disabled={disabled}
                  className={`min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm transition ${getDensityClass(availability)} ${
                    isSelected
                      ? "border-[var(--foreground)] ring-2 ring-[var(--foreground)] ring-offset-1"
                      : "border-transparent"
                  }`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    beginPaint(slotIso);
                  }}
                  onPointerEnter={() => continuePaint(slotIso)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      paintSlot(slotIso, !isSelected);
                    }
                  }}
                >
                  {availability
                    ? `${availability.availableCount}/${availability.memberCount} available`
                    : "No availability marked"}
                </button>

                {slotEvents.length > 0 ? (
                  <div className="mt-2 grid gap-2">
                    {slotEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-teal-950">{event.title}</p>
                            <p className="text-xs capitalize text-teal-800">
                              {[event.subtitle, event.status].filter(Boolean).join(" - ")}
                            </p>
                          </div>
                          {renderEventActions ? (
                            <div className="flex flex-wrap gap-2">{renderEventActions(event)}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
