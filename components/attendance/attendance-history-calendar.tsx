import { Check, Minus, X } from "lucide-react";

import { getAttendanceDayKey } from "@/lib/domain/attendance";
import type { AttendanceHistoryRecord } from "@/lib/domain/attendance-history";
import { getMonthCells, weekdayShort } from "@/lib/domain/calendar";
import { cn } from "@/lib/utils/cn";

type DayStatus = "present" | "absent" | "mixed";

function getDayStatus(records: AttendanceHistoryRecord[]): DayStatus | null {
  if (records.length === 0) return null;
  const attended = records.filter((record) => record.present).length;
  if (attended === records.length) return "present";
  if (attended === 0) return "absent";
  return "mixed";
}

export function AttendanceHistoryCalendar({
  year,
  month,
  records,
}: {
  year: number;
  month: number;
  records: AttendanceHistoryRecord[];
}) {
  const recordsByDay = new Map<string, AttendanceHistoryRecord[]>();
  for (const record of records) {
    const day = getAttendanceDayKey(record.scheduled_at);
    const dayRecords = recordsByDay.get(day) ?? [];
    dayRecords.push(record);
    recordsByDay.set(day, dayRecords);
  }

  return (
    <div className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-2.5 sm:p-3">
      <div
        aria-hidden="true"
        className="text-ink-600 grid grid-cols-7 pb-1 text-center text-xs font-extrabold uppercase"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
          <span key={weekday}>{weekdayShort(weekday)}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendario de asistencia">
        {getMonthCells(year, month).map((cell) => {
          const dayRecords = recordsByDay.get(cell.iso) ?? [];
          const status = getDayStatus(dayRecords);
          const label =
            status === "present"
              ? `${cell.iso}: asistió`
              : status === "absent"
                ? `${cell.iso}: no asistió`
                : status === "mixed"
                  ? `${cell.iso}: asistencia parcial`
                  : `${cell.iso}: sin lista registrada`;
          return (
            <div
              key={cell.iso}
              role="gridcell"
              aria-label={label}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center rounded-lg border p-1 text-center",
                !cell.inMonth && "border-transparent opacity-15",
                cell.inMonth && !status && "border-ink-200/70 bg-paper text-ink-700",
                cell.inMonth &&
                  status === "present" &&
                  "border-success/40 bg-success/10 text-pool-deep",
                cell.inMonth && status === "absent" && "border-danger/45 bg-danger/10 text-danger",
                cell.inMonth &&
                  status === "mixed" &&
                  "border-pool-blue/40 bg-pool-foam text-pool-deep",
              )}
            >
              <span className="font-mono text-sm leading-none font-extrabold tabular-nums">
                {cell.day}
              </span>
              {cell.inMonth ? (
                <span className="mt-1 flex h-4 items-center justify-center" aria-hidden="true">
                  {status === "present" ? (
                    <Check className="text-success h-4 w-4" />
                  ) : status === "absent" ? (
                    <X className="text-danger h-4 w-4" />
                  ) : status === "mixed" ? (
                    <Minus className="text-pool-blue h-4 w-4" />
                  ) : null}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
