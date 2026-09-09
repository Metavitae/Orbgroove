import { Text, View, TouchableOpacity, LayoutChangeEvent } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame, MAX_PLAYERS } from "./context/GameContext";
import type { PlayerType } from "./context/GameContext";
import { GradientButton } from "./components/GradientButton";
import { OutlineButton } from "./components/OutlineButton";
import { colors } from "./theme";

// Fallback pool, used until (and unless) the daily-generated pool loads
// successfully. Never delete this — it's what keeps the game playable if
// the fetch fails, the JSON is missing, or it's gone stale.
const FALLBACK_SOLO_NAMES = [
  "Two Left Feets", "Reluctant Baryshnikov", "Accidental Flossing",
  "Twerkulese", "Fred Astep", "Shakira Shakira", "John Travoltage", "Beyonslay"
];

const FALLBACK_GROUP_NAMES = [
  "The Wobbling Dead", "WiFi Password", "Unexpected Turbulence",
  "Technically Dancing", "The Reluctant Beyoncés", "Sober at a Wedding",
  "Three Guys One Rhythm", "Graceful Disaster"
];

// Public content repo, updated daily by a GitHub Action (see
// /scripts/generate-player-names.mjs and .github/workflows). Served via
// jsDelivr's GitHub CDN since raw.githubusercontent.com has no real caching.
const PLAYER_NAMES_URL = "https://cdn.jsdelivr.net/gh/Metavitae/hdyd-content@main/playerNames.json";
const STALE_AFTER_MS = 1000 * 60 * 60 * 24 * 7; // 7 days — a few missed daily runs is fine, weeks of silence isn't

function isValidNameList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(n => typeof n === "string" && n.trim().length > 0)
  );
}

export default function Players() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const { players, addPlayer, mode, setMode } = useGame();
  // Crowd mode gets a one-time, vague heads-up before the roster starts —
  // shown once per game since this screen is only ever visited once per
  // game. Pure mode skips straight to "type".
  const [step, setStep] = useState<"announce" | "type" | "name">(modeParam === "crowd" ? "announce" : "type");
  const [currentType, setCurrentType] = useState<PlayerType | null>(null);
  const [shuffles, setShuffles] = useState(0);
  // Full curated pool for the current pick (up to 8); how many of them are
  // actually rendered is trimmed below to whatever fits the landscape screen
  // without scrolling — this app has a standing no-scroll rule for this kind
  // of list, so it measures real layout instead of guessing a fixed count.
  const [curatedNames, setCuratedNames] = useState<string[]>([]);
  const [soloNames, setSoloNames] = useState<string[]>(FALLBACK_SOLO_NAMES);
  const [groupNames, setGroupNames] = useState<string[]>(FALLBACK_GROUP_NAMES);

  useEffect(() => {
    if ((modeParam === "pure" || modeParam === "crowd") && modeParam !== mode) {
      setMode(modeParam);
    }
  }, [modeParam]);

  // useLocalSearchParams can resolve modeParam a render or two after mount,
  // after the step initializer above has already locked in "type" — this
  // catches that case and upgrades once. Guarded on step still being "type"
  // (its default) so it can't re-fire and re-show the announcement after the
  // player has already moved past it later in the game.
  useEffect(() => {
    if (modeParam === "crowd" && step === "type") {
      setStep("announce");
    }
  }, [modeParam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(PLAYER_NAMES_URL);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        const generatedAt = new Date(data?.generatedAt).getTime();
        const isFresh = Number.isFinite(generatedAt) && Date.now() - generatedAt < STALE_AFTER_MS;
        if (!cancelled && isFresh && isValidNameList(data.solo) && isValidNameList(data.group)) {
          setSoloNames(data.solo);
          setGroupNames(data.group);
        }
      } catch {
        // Network error, malformed JSON, missing file, etc. — the fallback
        // lists already in state stay in place, so the game never breaks.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const takenNames = players.map(p => p.name);

  const getAvailable = (type: PlayerType, taken: string[]) => {
    const pool = type === "solo" ? soloNames : groupNames;
    return pool.filter(n => !taken.includes(n));
  };

  const selectType = (type: PlayerType) => {
    setCurrentType(type);
    const available = getAvailable(type, takenNames);
    setCuratedNames(available.sort(() => Math.random() - 0.5).slice(0, 8));
    setShuffles(0);
    setStep("name");
  };

  const pickName = (name: string) => {
    if (currentType) {
      addPlayer(name, currentType);
    }
    setStep("type");
  };

  const shuffle = () => {
    if (shuffles < 2 && currentType) {
      setShuffles(shuffles + 1);
      const available = getAvailable(currentType, takenNames);
      setCuratedNames([...available].sort(() => Math.random() - 0.5).slice(0, 8));
    }
  };

  const canShuffle = shuffles < 2;

  // Runtime measurements used to fit the name list without scrolling:
  // screenHeight = this screen's total rendered height (measured once, on
  // the root View, whose padding is already known below); headerHeight and
  // shuffleHeight are the fixed chrome above/below the list; rowHeight comes
  // from actually measuring the first rendered name button, so it reflects
  // real font/padding rendering on this device rather than a guess.
  const [screenHeight, setScreenHeight] = useState<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [shuffleHeight, setShuffleHeight] = useState<number | null>(null);
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const SCREEN_PADDING = 40 + insets.bottom; // root View's padding: 20 top + 20 bottom + safe-area bottom inset
  const HEADER_MARGIN_BOTTOM = 10;
  const SHUFFLE_MARGIN_TOP = 8;
  const ROW_MARGIN_BOTTOM = 6;
  const DEFAULT_VISIBLE_NAMES = 4; // conservative guess used only until real measurements land

  const visibleNameCount = (() => {
    if (screenHeight == null || headerHeight == null || rowHeight == null) {
      return Math.min(DEFAULT_VISIBLE_NAMES, curatedNames.length);
    }
    const shuffleSpace = canShuffle ? (shuffleHeight ?? 0) + SHUFFLE_MARGIN_TOP : 0;
    const available = screenHeight - SCREEN_PADDING - headerHeight - HEADER_MARGIN_BOTTOM - shuffleSpace;
    const fit = Math.floor(available / rowHeight);
    return Math.max(1, Math.min(fit, curatedNames.length));
  })();

  const shownNames = curatedNames.slice(0, visibleNameCount);

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg, padding: 20, paddingBottom: 20 + insets.bottom, justifyContent: "center" }}
      onLayout={(e: LayoutChangeEvent) => setScreenHeight(e.nativeEvent.layout.height)}
    >
      {step === "announce" && (
        <View style={{ width: "100%", alignItems: "center" }}>
          <Text style={{ fontSize: 40, marginBottom: 20 }}>👀</Text>
          <Text style={{ color: colors.pink, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>One More Thing</Text>
          <Text style={{ color: colors.mint, fontSize: 22, fontStyle: "italic", marginBottom: 16, textAlign: "center" }}>
            The crowd's not just watching tonight.
          </Text>
          <Text style={{ color: colors.mintDim, fontSize: 14, textAlign: "center", marginBottom: 28, lineHeight: 20 }}>
            How everyone reacts while people dance? That might matter more than you think.
          </Text>
          <GradientButton label="LET'S DANCE" onPress={() => setStep("type")} style={{ width: "100%" }} />
        </View>
      )}

      {step === "type" && (
        <View style={{ width: "100%" }}>
          {players.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.pink, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>Players</Text>
              {players.map((p, i) => (
                <Text key={i} style={{ color: colors.mint, fontSize: 14, marginBottom: 4 }}>
                  {i + 1}. {p.name} <Text style={{ color: colors.mintDim, fontSize: 11 }}>({p.type})</Text>
                </Text>
              ))}
            </View>
          )}
          {players.length >= MAX_PLAYERS ? (
            <View style={{ alignItems: "center", marginBottom: 4 }}>
              <Text style={{ color: colors.pink, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>Party's Full</Text>
              <Text style={{ color: colors.mintDim, fontSize: 15, textAlign: "center" }}>
                {MAX_PLAYERS} dancers is the max for one game. Time to hit the floor!
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ color: colors.pink, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>
                {players.length === 0 ? "First Player" : "Next Player"}
              </Text>
              <Text style={{ color: colors.mint, fontSize: 26, fontStyle: "italic", marginBottom: 20, textAlign: "center" }}>Solo or Group?</Text>
              <GradientButton label="SOLO" subtitle="One dancer" onPress={() => selectType("solo")} style={{ width: "100%", marginBottom: 10 }} />
              <OutlineButton label="GROUP" subtitle="Two or more dancers" onPress={() => selectType("group")} style={{ width: "100%" }} />
            </>
          )}
          {players.length > 0 && (
            <TouchableOpacity onPress={() => router.push("/round")} style={{ marginTop: 16, alignItems: "center", padding: 10 }}>
              <Text style={{ color: colors.mintDim, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>Start Game →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {step === "name" && (
        <View style={{ width: "100%" }}>
          <Text
            style={{ color: colors.pink, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10, textAlign: "center" }}
            onLayout={(e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height)}
          >
            Pick Your Name
          </Text>
          {shownNames.map((name, i) => (
            <OutlineButton
              key={name}
              label={name}
              plain
              onPress={() => pickName(name)}
              style={{ width: "100%", marginBottom: ROW_MARGIN_BOTTOM, padding: 11 }}
              onLayout={i === 0 ? (e: LayoutChangeEvent) => setRowHeight(e.nativeEvent.layout.height + ROW_MARGIN_BOTTOM) : undefined}
            />
          ))}
          {canShuffle && (
            <TouchableOpacity
              onPress={shuffle}
              onLayout={(e: LayoutChangeEvent) => setShuffleHeight(e.nativeEvent.layout.height)}
              style={{ marginTop: SHUFFLE_MARGIN_TOP, alignItems: "center", padding: 10 }}
            >
              <Text style={{ color: colors.mintDim, fontSize: 12, letterSpacing: 3 }}>Shuffle ({2 - shuffles} left)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
