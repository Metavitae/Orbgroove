import { Text, View, StyleSheet, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission } from "react-native-vision-camera";
import {
  usePoseDetection,
  RunningMode,
  Delegate,
  type PoseDetectionResultBundle,
  type Landmark,
} from "react-native-mediapipe-posedetection";
import { GradientButton } from "./components/GradientButton";
import { OutlineButton } from "./components/OutlineButton";
import { colors, fonts, textOnImageShadow } from "./theme";
import { RIBBONS } from "./lib/ribbons";
import { matchAt } from "./lib/poseMatch";
import { uprightPose } from "./lib/upright";
import { useFramingCoach, FRAMING_TEXT, sayNext } from "./lib/framingCoach";

// Solo practice with Ribbons: Ribbons' pre-rendered routine (portrait video,
// with the song) on the left, the player's FRONT camera on the right -- the
// player has to see Ribbons, unlike a game round where the phone faces the
// dancer with its back -- and a live meter for how closely they follow.
// Nothing here is stored or scored; it is practice only.

type DanceKey = keyof typeof RIBBONS;

export default function Lesson() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dance, setDance] = useState<DanceKey | null>(null);
  const [result, setResult] = useState<{ match: number; seenShare: number } | null>(null);
  const [runId, setRunId] = useState(0);

  if (dance && !result) {
    return (
      <DanceStage
        key={runId}
        danceKey={dance}
        onFinish={(r) => setResult(r)}
        onQuit={() => setDance(null)}
      />
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/bg_pregame.jpg")}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, paddingBottom: 24 + Math.max(insets.bottom, 24) }}
    >
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim }} pointerEvents="none" />
      {!result && (
        <View style={{ width: "100%", alignItems: "center" }}>
          <Text style={{ color: colors.pink, fontSize: 13, fontFamily: fonts.labelMedium, letterSpacing: 4, textTransform: "uppercase", marginBottom: 12, ...textOnImageShadow }}>Practice with Ribbons</Text>
          <Text style={{ color: colors.mint, fontSize: 32, fontFamily: fonts.displaySemiBold, fontStyle: "italic", marginBottom: 28, textAlign: "center", ...textOnImageShadow }}>Pick a dance, then copy Ribbons</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
            {(Object.keys(RIBBONS) as DanceKey[]).map((k) => (
              <OutlineButton key={k} label={RIBBONS[k].label.toUpperCase()} onPress={() => { setDance(k); setRunId((n) => n + 1); }} style={{ minWidth: 200 }} />
            ))}
          </View>
          <OutlineButton label="BACK" onPress={() => router.back()} style={{ marginTop: 24, opacity: 0.8 }} />
        </View>
      )}
      {result && (
        <View style={{ width: "100%", alignItems: "center" }}>
          <Text style={{ color: colors.pink, fontSize: 13, fontFamily: fonts.labelMedium, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8, ...textOnImageShadow }}>{dance ? RIBBONS[dance].label : ""} with Ribbons</Text>
          {result.seenShare < 0.3 ? (
            <Text style={{ color: colors.mint, fontSize: 30, fontFamily: fonts.displayBold, textAlign: "center", marginBottom: 24, ...textOnImageShadow }}>
              We couldn't see you most of the time.{"\n"}Step back so your whole body fits in the camera.
            </Text>
          ) : (
            <>
              <Text style={{ color: colors.mint, fontSize: 96, fontFamily: fonts.displayBold, ...textOnImageShadow }}>{Math.round(result.match * 100)}%</Text>
              <Text style={{ color: colors.mint, fontSize: 22, fontFamily: fonts.displaySemiBold, marginBottom: 24, textAlign: "center", ...textOnImageShadow }}>
                {result.match >= 0.7 ? "You're dancing like Ribbons!" : result.match >= 0.4 ? "Getting there. Go again?" : "Keep practicing, you've got this."}
              </Text>
            </>
          )}
          <View style={{ flexDirection: "row", gap: 16 }}>
            <GradientButton label="AGAIN" onPress={() => { setResult(null); setRunId((n) => n + 1); }} style={{ paddingHorizontal: 40 }} />
            <OutlineButton label="OTHER DANCE" onPress={() => { setResult(null); setDance(null); }} style={{ paddingHorizontal: 24 }} />
            <OutlineButton label="HOME" onPress={() => router.replace("/home" as any)} style={{ paddingHorizontal: 24 }} />
          </View>
        </View>
      )}
    </ImageBackground>
  );
}

function DanceStage({ danceKey, onFinish, onQuit }: { danceKey: DanceKey; onFinish: (r: { match: number; seenShare: number }) => void; onQuit: () => void }) {
  const insets = useSafeAreaInsets();
  const dance = RIBBONS[danceKey];
  const [phase, setPhase] = useState<"framing" | "countdown" | "dance">("framing");
  const [count, setCount] = useState(3);
  const [meter, setMeter] = useState<number | null>(null);
  // Parent passes a fresh callback each render; read it through a ref so the
  // dance effect below never re-runs (and restarts the video) because of it.
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const player = useVideoPlayer(dance.video, (p) => { p.loop = false; });

  // Live match: smoothed in a ref at pose rate (~20 fps), shown 5x a second.
  const smoothRef = useRef<number | null>(null);
  const statsRef = useRef({ sum: 0, n: 0, seen: 0, total: 0 });
  const dancingRef = useRef(false);
  const latestPoseRef = useRef<{ pose: Landmark[]; at: number } | null>(null);

  const onPoseResults = useCallback((result: PoseDetectionResultBundle) => {
    // Same defensive dual-shape read as recording.tsx -- the package's types
    // disagree with its README on the result shape.
    const r = result as unknown as { landmarks?: Landmark[][]; results?: { landmarks: Landmark[][] }[] };
    const raw = (r.landmarks ?? r.results?.[0]?.landmarks ?? [])[0];
    const pose = raw ? uprightPose(raw) : undefined;
    if (pose) latestPoseRef.current = { pose, at: Date.now() };
    if (!dancingRef.current) return;
    const st = statsRef.current;
    st.total++;
    const m = pose ? matchAt(dance.timeline, pose, player.currentTime) : null;
    if (m === null) return;
    st.seen++;
    st.sum += m;
    st.n++;
    smoothRef.current = smoothRef.current === null ? m : smoothRef.current * 0.8 + m * 0.2;
  }, [dance, player]);

  const onPoseError = useCallback((error: { code: number; message: string }) => {
    console.error("Pose detection error:", error.code, error.message);
  }, []);

  const poseSolution = usePoseDetection(
    { onResults: onPoseResults, onError: onPoseError },
    RunningMode.LIVE_STREAM,
    "pose_landmarker_lite.task",
    {
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      delegate: Delegate.GPU,
      fpsMode: 20,
    }
  );

  const { hasPermission, requestPermission } = useCameraPermission();
  useEffect(() => { if (!hasPermission) requestPermission(); }, [hasPermission, requestPermission]);
  const cameraDevice = useCameraDevice("front");
  const cameraFormat = useCameraFormat(cameraDevice, [{ videoResolution: { width: 1280, height: 720 } }]);
  useEffect(() => { if (cameraDevice) poseSolution.cameraDeviceChangeHandler(cameraDevice); }, [poseSolution, cameraDevice]);
  useEffect(() => { poseSolution.resizeModeChangeHandler("cover"); }, [poseSolution]);

  const framing = useFramingCoach(phase === "framing", latestPoseRef, () => setPhase("countdown"));

  // Counted out loud too: the player can't see the screen from across the room.
  useEffect(() => {
    if (phase === "countdown" && count > 0) sayNext(String(count));
    if (phase === "dance") sayNext("Dance!");
  }, [phase, count]);

  useEffect(() => {
    if (phase !== "countdown") return;
    const t = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { clearInterval(t); setPhase("dance"); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "dance") return;
    dancingRef.current = true;
    player.currentTime = 0;
    player.play();
    const show = setInterval(() => setMeter(smoothRef.current), 200);
    const finish = () => {
      dancingRef.current = false;
      const st = statsRef.current;
      onFinishRef.current({ match: st.n ? st.sum / st.n : 0, seenShare: st.total ? st.seen / st.total : 0 });
    };
    const endSub = player.addListener("playToEnd", finish);
    return () => { clearInterval(show); endSub.remove(); dancingRef.current = false; };
  }, [phase, player]);

  useEffect(() => () => { try { player.pause(); } catch {} }, [player]);

  const pct = meter === null ? null : Math.round(meter * 100);
  const meterColor = pct === null ? colors.mintDim : pct >= 70 ? "#38E56B" : pct >= 40 ? "#D8FF33" : colors.pink;

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.bg, paddingBottom: insets.bottom }}>
      {/* The player */}
      <View style={{ flex: 1 }}>
        {hasPermission && cameraDevice != null && (
          <Camera
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            device={cameraDevice}
            format={cameraFormat}
            pixelFormat="rgb"
            isActive={true}
            // texture-view respects the app's landscape lock (see recording.tsx)
            androidPreviewViewType="texture-view"
            frameProcessor={poseSolution.frameProcessor}
            onLayout={poseSolution.cameraViewLayoutChangeHandler}
            onOutputOrientationChanged={poseSolution.cameraOrientationChangedHandler}
          />
        )}
        <View style={{ position: "absolute", top: 16, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.pink, fontSize: 13, fontFamily: fonts.labelMedium, letterSpacing: 3, textTransform: "uppercase", ...textOnImageShadow }}>{dance.label} · copy Ribbons</Text>
          <OutlineButton label="STOP" onPress={onQuit} style={{ paddingHorizontal: 18, paddingVertical: 8 }} />
        </View>
        {phase === "framing" ? (
          <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(6,20,15,0.45)", padding: 16 }}>
            <Text style={{ color: colors.pink, fontSize: 13, fontFamily: fonts.labelMedium, letterSpacing: 4, textTransform: "uppercase", marginBottom: 12, ...textOnImageShadow }}>Get in the picture, head to feet</Text>
            <Text style={{ color: colors.mint, fontSize: 36, fontFamily: fonts.displayBold, textAlign: "center", marginBottom: 24, ...textOnImageShadow }}>{FRAMING_TEXT[framing]}</Text>
            <OutlineButton label="START ANYWAY" onPress={() => setPhase("countdown")} style={{ paddingVertical: 10 }} />
          </View>
        ) : phase === "countdown" ? (
          <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(6,20,15,0.45)" }}>
            <Text style={{ color: colors.pink, fontSize: 13, fontFamily: fonts.labelMedium, letterSpacing: 4, textTransform: "uppercase", marginBottom: 12, ...textOnImageShadow }}>Step back so we can see all of you</Text>
            <Text style={{ color: colors.mint, fontSize: 140, fontFamily: fonts.displayBold, ...textOnImageShadow }}>{count}</Text>
          </View>
        ) : (
          <View style={{ position: "absolute", left: 16, right: 16, bottom: 16, alignItems: "center" }}>
            <Text style={{ color: meterColor, fontSize: 44, fontFamily: fonts.displayBold, ...textOnImageShadow }}>{pct === null ? "Where are you?" : `${pct}%`}</Text>
            <View style={{ width: "100%", height: 14, borderRadius: 7, backgroundColor: "rgba(6,20,15,0.6)", overflow: "hidden", marginTop: 6 }}>
              <View style={{ width: `${pct ?? 0}%`, height: "100%", backgroundColor: meterColor }} />
            </View>
            <Text style={{ color: colors.mint, fontSize: 12, fontFamily: fonts.labelMedium, letterSpacing: 2, textTransform: "uppercase", marginTop: 6, ...textOnImageShadow }}>Match with Ribbons</Text>
          </View>
        )}
      </View>
      {/* Ribbons: portrait panel, full height, on the right. The camera has to be
          the left-hand panel: its texture view draws from the screen's left
          edge whatever its box's x offset, so on the right it covered
          Ribbons and left its own box empty (found on-device 2026-09-26). */}
      <View style={{ height: "100%", aspectRatio: 9 / 16, backgroundColor: colors.bg }}>
        <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} />
      </View>
    </View>
  );
}
