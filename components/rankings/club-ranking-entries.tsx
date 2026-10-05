"use client";

import { UsersRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { CATEGORY_LABELS } from "@/lib/domain/categories";
import type { ClubRankingRow } from "@/lib/domain/club-rankings";
import { cn } from "@/lib/utils/cn";
import { mixHexWithWhite } from "@/lib/utils/color";

export function compactRankingDetail(detail: string) {
  return detail
    .replace(/ partidos?$/u, " PJ")
    .replace(/goles\/partido$/u, "G/P")
    .replace(/asistencias\/partido$/u, "A/P")
    .replace(/ por partido$/u, " /PJ")
    .replace(/ % como MVP$/u, " % MVP")
    .replace(/ goles$/u, " G")
    .replace(/ tiros$/u, " T")
    .replace(/ asistencias$/u, " A")
    .replace(/ temporadas$/u, " temp.");
}

function compactRankingUnit(unit: string) {
  return (
    (
      {
        "% victorias": "% vict.",
        "% asistencia": "% asist.",
        "por partido": "G/P",
        expulsiones: "exp.",
        expulsión: "exp.",
      } as Record<string, string>
    )[unit] ?? unit
  );
}

function RankingPortrait({
  row,
  team,
  size,
}: {
  row: ClubRankingRow;
  team: boolean;
  size: number;
}) {
  if (team)
    return (
      <span
        className="border-pool-deep/65 text-pool-deep flex shrink-0 items-center justify-center rounded-full border-2 bg-blue-50"
        style={{ width: size, height: size, borderColor: row.person.color }}
      >
        <UsersRound className="h-6 w-6" aria-hidden="true" />
      </span>
    );
  return (
    <Avatar
      src={row.person.photo}
      name={row.person.name}
      size={size}
      teamColor={row.person.color}
      style={{ backgroundColor: "#eff6ff", color: "#0A2E5C" }}
    />
  );
}

export function ClubRankingEntry({
  row,
  onOpen,
  isMe,
  team = false,
}: {
  row: ClubRankingRow;
  onOpen: () => void;
  isMe: boolean;
  team?: boolean;
}) {
  const valueSize =
    row.display.length > 6
      ? "text-base"
      : row.display.length > 4
        ? "text-xl"
        : row.display.length > 3
          ? "text-2xl"
          : "text-3xl";
  const unit = compactRankingUnit(row.unit);
  return (
    <button
      type="button"
      id={`ranking-player-${row.id}`}
      onClick={onOpen}
      aria-label={`${row.person.name}, puesto ${row.position}, ${row.display} ${row.unit}. Ver resumen`}
      className={cn(
        "border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue grid min-h-[4.5rem] w-full scroll-mt-28 grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_auto] items-center gap-x-2 rounded-xl border-2 border-l-[5px] px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2",
        isMe && "ring-ball-gold ring-2 ring-offset-1",
      )}
      style={{
        borderLeftColor: row.person.color,
        backgroundColor: mixHexWithWhite(row.person.color, 0.1),
      }}
    >
      <span
        className={cn(
          "text-center font-extrabold tabular-nums",
          row.position >= 100 ? "text-xs" : "text-base",
        )}
      >
        {row.position}.
      </span>
      <RankingPortrait row={row} team={team} size={40} />
      <span className="min-w-0">
        <span className="block text-[15px] leading-5 font-extrabold">
          <AdaptivePlayerName name={row.person.name} />
        </span>
        {!team && (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs font-bold">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.person.color }}
              aria-hidden="true"
            />
            {row.person.category ? CATEGORY_LABELS[row.person.category] : "Club"}
            {isMe && <span className="text-amber-950">· Tú</span>}
          </span>
        )}
        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] leading-[14px] font-semibold">
          <span className="whitespace-nowrap">{compactRankingDetail(row.details[0] ?? "")}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{compactRankingDetail(row.details[1] ?? "")}</span>
        </span>
      </span>
      <span className="bg-pool-deep col-start-4 row-start-1 flex min-w-14 flex-col items-center justify-center self-stretch rounded-lg px-2 py-1.5 text-white">
        <strong
          className={cn("text-ball-gold leading-none font-extrabold tabular-nums", valueSize)}
        >
          {row.display}
        </strong>
        <span className="mt-1 text-[11px] leading-3 font-bold whitespace-nowrap">{unit}</span>
      </span>
    </button>
  );
}

export function ClubRankingPodium({
  rows,
  onOpen,
  myId,
  team = false,
}: {
  rows: ClubRankingRow[];
  onOpen: (row: ClubRankingRow) => void;
  myId: string;
  team?: boolean;
}) {
  if (rows.length !== 3) return null;
  return (
    <section aria-label="Podio de la clasificación" className="pt-1">
      <ol className="grid grid-cols-3 items-end gap-1.5">
        {rows.map((row, index) => {
          const [firstName, ...surnames] = row.person.name.trim().split(/\s+/);
          const first = row.position === 1;
          const second = row.position === 2;
          const tone = first
            ? "from-[#FFE69C] via-[#F4C430] to-[#DDB126]"
            : second
              ? "from-[#F1F5F9] via-[#CBD5E1] to-[#A8B6C8]"
              : "from-[#F5D7BC] via-[#DDA676] to-[#C18B60]";
          return (
            <li
              key={row.id}
              className={index === 0 ? "order-2" : index === 1 ? "order-1" : "order-3"}
            >
              <button
                type="button"
                id={`ranking-player-${row.id}`}
                aria-label={`${row.person.name}, puesto ${row.position}, ${row.display} ${row.unit}. Ver resumen`}
                onClick={() => onOpen(row)}
                className={cn(
                  "text-pool-deep focus-visible:outline-pool-blue flex w-full min-w-0 scroll-mt-28 flex-col items-center rounded-xl text-center focus-visible:outline-2 focus-visible:outline-offset-2",
                  row.person.id === myId && "ring-ball-gold ring-2",
                )}
              >
                <RankingPortrait row={row} team={team} size={first ? 56 : 44} />
                <span
                  className={cn(
                    "mt-1.5 block w-full min-w-0 px-0.5 text-sm leading-[18px] font-extrabold",
                    team ? "h-[18px]" : "h-9",
                  )}
                  aria-hidden="true"
                >
                  {team ? (
                    <AdaptivePlayerName name={row.person.name} />
                  ) : (
                    <>
                      <span className="block">
                        <AdaptivePlayerName name={firstName!} />
                      </span>
                      <span className="block text-xs">
                        <AdaptivePlayerName name={surnames.join(" ")} />
                      </span>
                    </>
                  )}
                </span>
                {!team && (
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: row.person.color }}
                      aria-hidden="true"
                    />
                    {row.person.category ? CATEGORY_LABELS[row.person.category] : "Club"}
                  </span>
                )}
                <span
                  className={cn(
                    "border-pool-deep/65 mt-2 flex w-full flex-col items-center rounded-t-xl rounded-b-lg border-2 bg-gradient-to-b px-1 pt-2 pb-1",
                    tone,
                    first ? "h-32" : second ? "h-28" : "h-24",
                  )}
                >
                  <strong
                    className={cn(
                      "leading-none font-extrabold tabular-nums",
                      row.display.length > 6 ? "text-xl" : "text-3xl",
                    )}
                  >
                    {row.display}
                  </strong>
                  <span className="mt-1 text-[11px] leading-3 font-bold">
                    {compactRankingUnit(row.unit)}
                  </span>
                  <span className="mt-auto grid w-full gap-0.5 text-[11px] leading-[14px] font-semibold">
                    {row.details.slice(0, 2).map((detail, detailIndex) => (
                      <span key={detailIndex}>{compactRankingDetail(detail)}</span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
