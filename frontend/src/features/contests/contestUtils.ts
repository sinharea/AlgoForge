import { format } from "date-fns";
import { ContestListItem, ContestStatus } from "./contestTypes";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export type ContestTimeDisplay = {
  label: "Starts in" | "Ends in" | "Ended on";
  value: string;
  tone: "warning" | "success" | "neutral";
  isPast: boolean;
};

type ContestTiming = Pick<ContestListItem, "startTime" | "endTime" | "duration">;

export function getContestEndTime(contest: ContestTiming): number {
  if (contest.endTime) {
    return contest.endTime;
  }
  return contest.startTime + contest.duration * MINUTE;
}

export function getContestStatus(
  contest: ContestTiming,
  now = Date.now()
): ContestStatus {
  if (now < contest.startTime) {
    return "upcoming";
  }

  if (now < getContestEndTime(contest)) {
    return "live";
  }

  return "past";
}

export function formatCountdown(totalMs: number): string {
  const safeMs = Math.max(totalMs, 0);
  const totalSeconds = Math.floor(safeMs / SECOND);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  parts.push(`${hours}h`, `${minutes}m`, `${seconds}s`);

  return parts.join(" ");
}

export function getContestTimeDisplay(contest: ContestTiming, now: number): ContestTimeDisplay {
  const endTime = getContestEndTime(contest);

  if (now < contest.startTime) {
    return {
      label: "Starts in",
      value: formatCountdown(contest.startTime - now),
      tone: "warning",
      isPast: false,
    };
  }

  if (now < endTime) {
    return {
      label: "Ends in",
      value: formatCountdown(endTime - now),
      tone: "success",
      isPast: false,
    };
  }

  return {
    label: "Ended on",
    value: format(endTime, "MMM d, yyyy 'at' h:mm a"),
    tone: "neutral",
    isPast: true,
  };
}
