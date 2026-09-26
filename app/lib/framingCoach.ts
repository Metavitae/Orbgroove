// Spoken "get in the picture" coach, run before a round or a practice dance.
//
// The phone sits across the room, so players can't read the screen: the
// coach looks at the live pose and SAYS what to do ("Step back", "Come a
// little closer") until it sees the whole body, head to feet, for a moment.
// Then it says "Perfect, stay there", counts down out loud, and the caller
// starts the dance. Chancla's call (2026-09-26): a voice, not a beep.
import { useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";

type Lm = { x: number; y: number; visibility?: number };

export type FramingStatus = "none" | "back" | "closer" | "good";

export const FRAMING_TEXT: Record<FramingStatus, string> = {
  none: "I can't see you. Stand in front of the phone.",
  back: "Step back.",
  closer: "Come a little closer.",
  good: "Perfect, stay there!",
};

const MIN_VIS = 0.6;
const NOSE = 0, L_SH = 11, R_SH = 12, L_HIP = 23, R_HIP = 24, L_ANK = 27, R_ANK = 28;
// Head-to-ankle span as a share of frame height. Below this the player is
// so small the pose model gets unreliable.
const MIN_BODY_HEIGHT = 0.4;
const EDGE = 0.02;

const CHECK_MS = 400;
const POSE_STALE_MS = 1000;
const HOLD_GOOD_MS = 1200; // whole body seen this long before we accept
const REPEAT_MS = 4000; // repeat an unchanged instruction this often

export function framingOf(pose: Lm[] | null | undefined): FramingStatus {
  if (!pose || pose.length < 29) return "none";
  const vis = (i: number) => (pose[i].visibility ?? 1) >= MIN_VIS;
  if (![L_SH, R_SH, L_HIP, R_HIP].every(vis)) return "none";
  const headIn = vis(NOSE) && pose[NOSE].y > EDGE;
  const feetIn = vis(L_ANK) && vis(R_ANK) && pose[L_ANK].y < 1 - EDGE && pose[R_ANK].y < 1 - EDGE;
  if (!headIn || !feetIn) return "back";
  const height = Math.max(pose[L_ANK].y, pose[R_ANK].y) - pose[NOSE].y;
  return height < MIN_BODY_HEIGHT ? "closer" : "good";
}

// Interrupts whatever is being said -- for instructions that replace the last one.
export function say(text: string) {
  Speech.stop();
  Speech.speak(text, { language: "en-US", rate: 1.0 });
}

// Queued after whatever is being said -- for the countdown, so "3" never
// cuts off "Perfect, stay there!".
export function sayNext(text: string) {
  Speech.speak(text, { language: "en-US", rate: 1.1 });
}

// `active` = coaching now. `latestPose` is written by the caller's pose
// callback (with its capture time). Calls onReady once, after "Perfect,
// stay there" has been said.
export function useFramingCoach(
  active: boolean,
  latestPose: React.MutableRefObject<{ pose: Lm[]; at: number } | null>,
  onReady: () => void
) {
  const [status, setStatus] = useState<FramingStatus>("none");
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!active) return;
    let lastSaid: FramingStatus | null = null;
    let lastSaidAt = 0;
    let goodSince: number | null = null;
    let done = false;
    const timer = setInterval(() => {
      if (done) return;
      const now = Date.now();
      const lp = latestPose.current;
      const s = lp && now - lp.at < POSE_STALE_MS ? framingOf(lp.pose) : "none";
      setStatus(s);
      if (s === "good") {
        if (goodSince === null) goodSince = now;
        if (now - goodSince >= HOLD_GOOD_MS) {
          done = true;
          say(FRAMING_TEXT.good);
          onReadyRef.current();
        }
        return;
      }
      goodSince = null;
      if (s !== lastSaid || now - lastSaidAt >= REPEAT_MS) {
        say(FRAMING_TEXT[s]);
        lastSaid = s;
        lastSaidAt = now;
      }
    }, CHECK_MS);
    return () => clearInterval(timer);
  }, [active, latestPose]);

  useEffect(() => () => { Speech.stop(); }, []);

  return status;
}
