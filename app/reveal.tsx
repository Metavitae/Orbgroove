import { Text, View, Animated, ImageBackground, LayoutChangeEvent } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./context/GameContext";
import { GradientButton } from "./components/GradientButton";
import { OutlineButton } from "./components/OutlineButton";
import { colors, fonts, textOnImageShadow } from "./theme";
import { genreForDance } from "./lib/danceGenreMap";
import { computeMovesScore, computeRhythmScore, computeBeatAlignmentScore, type Pose } from "./lib/danceScoring";
import { RECORDING_WINDOW_SEC } from "./lib/constants";
import poseReferenceData from "../assets/data/pose-reference.json";

const REFERENCE_POSES = poseReferenceData as Record<string, { label: string; landmarks: Pose }[]>;

// Old random ranges, kept as the fallback for any dance without reference
// pose data yet (see app/lib/danceGenreMap.ts) and as the floor/ceiling feel
// for real scores below, so the UI's bar-fill math (rhythmScore/40,
// physScore/60) keeps behaving the same regardless of which path scored.
function randomRhythmScore() {
  return Math.floor(Math.random() * 40) + 20;
}
function randomPhysScore() {
  return Math.floor(Math.random() * 60) + 20;
}

// bg_reveal.jpg's native pixel dimensions, and the two LED-screen frame
// outlines' bounding boxes within it (measured directly off the source
// image, as fractions of its width/height) -- used below to place the
// YOUR MOVES / PRO MOVES cards precisely inside those frames regardless of
// how ImageBackground's resizeMode="cover" crops the art to fit the device.
const BG_IMAGE_SIZE = { width: 1376, height: 768 };
const LEFT_FRAME = { left: 102 / 1376, right: 713 / 1376, top: 144 / 768, bottom: 537 / 768 };
const RIGHT_FRAME = { left: 722 / 1376, right: 1271 / 1376, top: 144 / 768, bottom: 537 / 768 };
// bg_score.jpg's single screen-frame outline (same native 1376x768 size as
// bg_reveal.jpg) -- used only on the "scores" phase, which shows one result,
// not a comparison, so it gets its own single-screen background.
const SCORE_FRAME = { left: 187 / 1376, right: 1184 / 1376, top: 136 / 768, bottom: 622 / 768 };

type FrameFractions = { left: number; right: number; top: number; bottom: number };

// Mirrors resizeMode="cover"'s own crop math: the image is scaled up until it
// fully covers the container on both axes, then centered, so whichever axis
// overflows gets symmetric edges cropped off. Converts a frame's
// image-relative fractions into container-relative pixels so a card can be
// absolutely positioned to land exactly inside that frame's drawn outline.
function frameRectInContainer(container: { width: number; height: number }, frame: FrameFractions) {
  const scale = Math.max(container.width / BG_IMAGE_SIZE.width, container.height / BG_IMAGE_SIZE.height);
  const displayedW = BG_IMAGE_SIZE.width * scale;
  const displayedH = BG_IMAGE_SIZE.height * scale;
  const cropX = (displayedW - container.width) / 2;
  const cropY = (displayedH - container.height) / 2;
  return {
    left: frame.left * displayedW - cropX,
    top: frame.top * displayedH - cropY,
    width: (frame.right - frame.left) * displayedW,
    height: (frame.bottom - frame.top) * displayedH,
  };
}

export default function Reveal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    players,
    currentPlayer,
    currentPlayerIndex,
    currentRoundIndex,
    roundCount,
    currentCountry,
    capturedFrames,
    danceTrack,
    addScore,
    nextPlayerTurn,
    nextRound,
    setCurrentPlayerIndex,
  } = useGame();
  const [phase, setPhase] = useState("suspense");
  // Full ImageBackground box size (not the padded content area) -- needed to
  // compute where the two LED-screen frames in bg_reveal.jpg actually land
  // once resizeMode="cover" crops it to fit this device.
  const [bgContainerSize, setBgContainerSize] = useState<{ width: number; height: number } | null>(null);
  const rhythmAnim = useRef(new Animated.Value(0)).current;
  const physAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  // Real scoring when the round's dance has reference pose data (see
  // app/lib/danceGenreMap.ts) and the recording actually captured usable
  // frames; falls back to the original random placeholder otherwise, so an
  // uncovered dance (most of the 32-country list, still) plays exactly like
  // it did before this was wired up rather than scoring everyone a flat 0.
  //
  // Rhythm specifically has three tiers, in order of preference: real
  // beat-alignment against the track that actually played (danceTrack is
  // only set when the round's genre had music -- see app/lib/danceMusic.ts
  // and recording.tsx), then the energy/oscillation proxy for a genre with
  // pose coverage but no music yet, then the plain random fallback.
  const [rhythmScore] = useState(() => {
    const beatNorm = danceTrack
      ? computeBeatAlignmentScore(capturedFrames, danceTrack.grid.beatTimesSec, danceTrack.startTimestampMs, RECORDING_WINDOW_SEC)
      : null;
    if (beatNorm !== null) return Math.round(beatNorm * 40) + 20;
    const rhythmNorm = computeRhythmScore(capturedFrames);
    return rhythmNorm !== null ? Math.round(rhythmNorm * 40) + 20 : randomRhythmScore();
  });
  const [physScore] = useState(() => {
    const genre = currentCountry ? genreForDance(currentCountry.dance) : null;
    const referencePoses = genre ? REFERENCE_POSES[genre]?.map(p => p.landmarks) ?? [] : [];
    const movesNorm =
      referencePoses.length > 0
        ? computeMovesScore(capturedFrames.map(f => f.pose), referencePoses)
        : null;
    return movesNorm !== null ? Math.round(movesNorm * 60) + 20 : randomPhysScore();
  });
  const scoredRef = useRef(false);

  useEffect(() => {
    setTimeout(() => setPhase("splitscreen"), 2000);
  }, []);

  useEffect(() => {
    if (phase === "scores") {
      Animated.parallel([
        Animated.timing(rhythmAnim, { toValue: rhythmScore / 40, duration: 1400, useNativeDriver: false }),
        Animated.timing(physAnim, { toValue: physScore / 60, duration: 1400, useNativeDriver: false }),
        Animated.timing(textAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
      ]).start();

      if (!scoredRef.current) {
        scoredRef.current = true;
        addScore(currentPlayerIndex, rhythmScore + physScore);
      }
    }
  }, [phase]);

  const rhythmHeight = rhythmAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const physHeight = physAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const textTranslateY = textAnim.interpolate({ inputRange: [0, 1], outputRange: [120, 0] });
  const textSize = textAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 22] });
  const textLetterSpacing = textAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 8] });

  const handleNext = () => {
    const isLastPlayerOfRound = currentPlayerIndex === players.length - 1;

    if (!isLastPlayerOfRound) {
      nextPlayerTurn();
      router.push("/round");
      return;
    }

    const isFinalRound = currentRoundIndex + 1 >= roundCount;
    if (isFinalRound) {
      router.push("/winner");
      return;
    }

    nextRound();
    setCurrentPlayerIndex(0);
    router.push("/leaderboard");
  };

  return (
    <ImageBackground
      source={phase === "scores" ? require("../assets/images/bg_score.jpg") : require("../assets/images/bg_reveal.jpg")}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, paddingBottom: 24 + Math.max(insets.bottom, 24) }}
      onLayout={(e: LayoutChangeEvent) => setBgContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim }} pointerEvents="none" />

      {phase === "splitscreen" && bgContainerSize && (
        <>
          {[
            { frame: LEFT_FRAME, emoji: "🕺", label: "YOUR MOVES", color: colors.mint },
            { frame: RIGHT_FRAME, emoji: "💃", label: "PRO MOVES", color: colors.cyan },
          ].map(({ frame, emoji, label, color }) => {
            const rect = frameRectInContainer(bgContainerSize, frame);
            return (
              <View
                key={label}
                style={{
                  position: "absolute",
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                pointerEvents="none"
              >
                <Text style={{ fontSize: 60 }}>{emoji}</Text>
                <Text style={{ color, fontSize: 15, fontFamily: fonts.labelBold, marginTop: 12, letterSpacing: 2, ...textOnImageShadow }}>{label}</Text>
              </View>
            );
          })}
        </>
      )}

      {phase === "suspense" && (
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.pink, fontSize: 16, fontFamily: fonts.labelMedium, letterSpacing: 4, textTransform: "uppercase", marginBottom: 24, ...textOnImageShadow }}>Calculating...</Text>
          <Text style={{ fontSize: 80 }}>⚡</Text>
        </View>
      )}

      {phase === "splitscreen" && (
        // Same fix as the scores phase below: flex:1 + space-between instead of
        // a centered block of fixed-height content, so the comparison cards
        // shrink to fit whatever height is actually available instead of
        // pushing SEE MY SCORE past the bottom edge on a shorter screen.
        <View style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: colors.mint, fontSize: 20, fontFamily: fonts.displayBold, marginBottom: 8, textAlign: "center", ...textOnImageShadow }}>{currentPlayer ? currentPlayer.name : ""}</Text>
            <Text style={{ color: colors.pink, fontSize: 14, fontFamily: fonts.labelMedium, letterSpacing: 4, textTransform: "uppercase", textAlign: "center", ...textOnImageShadow }}>How did you do?</Text>
          </View>
          {/* Spacer matching the two video-comparison cards' old flow height --
              the actual cards are rendered as siblings below, absolutely
              positioned to sit precisely inside the two LED-screen frame
              outlines baked into bg_reveal.jpg (see FRAME_RECTS below), not
              just centered/floating over the image. */}
          <View style={{ flex: 1, minHeight: 0, marginVertical: 16 }} />
          <OutlineButton label="SEE MY SCORE" onPress={() => setPhase("scores")} style={{ paddingHorizontal: 32, paddingVertical: 14 }} />
        </View>
      )}

      {phase === "scores" && bgContainerSize && (() => {
        const rect = frameRectInContainer(bgContainerSize, SCORE_FRAME);
        // On this device's wide aspect ratio, resizeMode="cover" crops so
        // little off the sides that the frame's own bottom edge lands at
        // ~92% of screen height -- almost no room left below it for the
        // NEXT button, which sits in the normal flex flow beneath this
        // absolutely-positioned box. Rather than let content fill the
        // frame's full measured height (pushing the Rhythm/Moves labels
        // down behind the opaque button), cap this box's height so it
        // always leaves room for the button + its margin + the safe-area
        // inset, regardless of device aspect ratio.
        const NEXT_BUTTON_RESERVED = 90;
        const availableHeight = bgContainerSize.height - rect.top - insets.bottom - NEXT_BUTTON_RESERVED;
        const boxHeight = Math.min(rect.height, Math.max(availableHeight, 0));
        return (
          <View
            style={{ position: "absolute", left: rect.left, top: rect.top, width: rect.width, height: boxHeight }}
            pointerEvents="none"
          >
            {/* flex:1 + default (stretch) cross-axis at every level, no
                percentage heights -- percentage-height resolution proved
                unreliable here (labels were being clipped below the visible
                frame), whereas plain flex stretch through a chain of
                determinate-height parents is unambiguous. */}
            <View style={{ flex: 1, flexDirection: "row", padding: 24 }}>
              <View style={{ flexDirection: "row", flex: 1 }}>
                <View style={{ flex: 1, alignItems: "center", marginRight: 12 }}>
                  <View style={{ width: 44, flex: 1, backgroundColor: colors.card, borderRadius: 8, justifyContent: "flex-end", overflow: "hidden", marginBottom: 8 }}>
                    <Animated.View style={{ width: 44, height: rhythmHeight, backgroundColor: colors.cyan }} />
                  </View>
                  <Text style={{ color: colors.mint, fontSize: 12, fontFamily: fonts.labelMedium, letterSpacing: 2, textTransform: "uppercase", ...textOnImageShadow }}>Rhythm</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View style={{ width: 44, flex: 1, backgroundColor: colors.card, borderRadius: 8, justifyContent: "flex-end", overflow: "hidden", marginBottom: 8 }}>
                    <Animated.View style={{ width: 44, height: physHeight, backgroundColor: colors.pink }} />
                  </View>
                  <Text style={{ color: colors.mint, fontSize: 12, fontFamily: fonts.labelMedium, letterSpacing: 2, textTransform: "uppercase", ...textOnImageShadow }}>Moves</Text>
                </View>
              </View>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 28 }}>
                <Animated.Text style={{ color: colors.pink, fontFamily: fonts.displayBold, textTransform: "uppercase", transform: [{ translateY: textTranslateY }], fontSize: textSize, letterSpacing: textLetterSpacing, ...textOnImageShadow }}>
                  YOUR{"\n"}SCORE
                </Animated.Text>
              </View>
            </View>
          </View>
        );
      })()}

      {phase === "scores" && (
        // flex:1 (not a fixed/centered height) so this always fills exactly the
        // space available under the safe-area padding above. The bars/YOUR
        // SCORE content itself is rendered as an absolutely-positioned sibling
        // above, sized to sit precisely inside bg_score.jpg's single frame
        // outline -- this flow just reserves the heading above and button
        // below it, same spacer pattern as the splitscreen phase.
        <View style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.mint, fontSize: 20, fontFamily: fonts.displayBold, marginBottom: 12, textAlign: "center", ...textOnImageShadow }}>{currentPlayer ? currentPlayer.name : ""}</Text>
          <View style={{ flex: 1, minHeight: 0, width: "100%" }} />
          <GradientButton label="NEXT" onPress={handleNext} style={{ width: "100%", marginTop: 16 }} />
        </View>
      )}

    </ImageBackground>
  );
}
