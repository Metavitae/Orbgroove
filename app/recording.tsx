import { Text, View, Animated, StyleSheet, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { GradientButton } from "./components/GradientButton";
import { colors } from "./theme";
import { useAudioRecorder, useAudioRecorderState, RecordingPresets } from "expo-audio";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
} from "react-native-vision-camera";
import {
  usePoseDetection,
  RunningMode,
  Delegate,
  type PoseDetectionResultBundle,
  type Landmark,
} from "react-native-mediapipe-posedetection";
import { useGame } from "./context/GameContext";
import { micPermission } from "./context/micPermission";

const BASELINE_WINDOW_MS = 1000;

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export default function Recording() {
  const router = useRouter();
  const { currentPlayer, currentCountry, currentPlayerIndex, mode, addCheerScore } = useGame();
  const [phase, setPhase] = useState("countdown");
  const [count, setCount] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // The whole screen (camera preview AND the overlaid countdown/dance-name
  // text, which VisionCamera never touches) was rendering sideways on this
  // device. That rules out a VisionCamera preview-orientation setting —
  // installed v4.7.3 has no orientationSource prop, and its own docs say
  // preview orientation always follows the Activity's screen orientation,
  // not something this component configures. The real fix is app.json's
  // orientation lock being a genuine native manifest attribute
  // (android:screenOrientation) instead of "default"/unspecified, which
  // only left the runtime-only ScreenOrientation.lockAsync() call in
  // _layout.tsx as the sole guard — vulnerable to vendor camera-stack
  // rotation overrides (a known MIUI/Xiaomi quirk when a Camera opens).
  //
  // onUIRotationChanged was tried here too (counter-rotating the overlay),
  // but that's the wrong tool: it reports rotation relative to the device's
  // raw sensor for gravity-relative controls (e.g. a shutter icon), not a
  // "your layout is wrong" signal — applying it to this screen's normal RN
  // text actively rotated content that RN was already laying out correctly,
  // producing a worse version of the same bug. Removed.

  // Pose-detection capture (ported from the standalone app/pose-test.tsx
  // PoC, confirmed working there). Landmark frames accumulate here for the
  // full recording window; scoring off this data isn't wired up yet —
  // reveal.tsx still generates rhythm/physicality scores randomly. This is
  // step one: get real landmark capture running live during gameplay.
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const capturedFramesRef = useRef<{ landmarks: Landmark[]; timestampMs: number }[]>([]);

  useEffect(() => {
    if (!hasCameraPermission) requestCameraPermission();
  }, [hasCameraPermission, requestCameraPermission]);

  const onPoseResults = useCallback((result: PoseDetectionResultBundle) => {
    // Same defensive dual-shape read as pose-test.tsx — this package's
    // shipped types disagree with its own README on result shape.
    const r = result as unknown as {
      landmarks?: Landmark[][];
      results?: { landmarks: Landmark[][] }[];
      inferenceTime?: number;
    };
    const pose = (r.landmarks ?? r.results?.[0]?.landmarks ?? [])[0];
    if (!pose) return;
    capturedFramesRef.current.push({ landmarks: pose, timestampMs: r.inferenceTime ?? Date.now() });
  }, []);

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

  // Rear camera only — players face away from themselves to dance, same as
  // pose-test.tsx. The 1280x720 constraint doesn't transfer automatically
  // between screens; it must be reapplied here, same fix as pose-test.tsx.
  const cameraDevice = useCameraDevice("back");
  const cameraFormat = useCameraFormat(cameraDevice, [{ videoResolution: { width: 1280, height: 720 } }]);

  useEffect(() => {
    if (cameraDevice) poseSolution.cameraDeviceChangeHandler(cameraDevice);
  }, [poseSolution, cameraDevice]);

  useEffect(() => {
    poseSolution.resizeModeChangeHandler("cover");
  }, [poseSolution]);

  useEffect(() => {
    capturedFramesRef.current = [];
  }, []);

  // Crowd mode only: capture ambient baseline starting 2s before the dance
  // timer ends, then keep listening for the peak indefinitely — it does NOT
  // auto-stop on a timer. The host controls when capture ends by tapping
  // "SEE RESULTS"; that's the moment finishClapometer() reads the final peak
  // and stops the recorder. Never surfaces in the UI; only feeds cheerScore.
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 100);
  const captureStageRef = useRef<"idle" | "baseline" | "peak">("idle");
  const baselineSamplesRef = useRef<number[]>([]);
  const baselineValueRef = useRef(0);
  const peakRef = useRef(-Infinity);
  const clapometerActiveRef = useRef(false);

  useEffect(() => {
    if (recorderState.metering === undefined) return;
    const value = recorderState.metering;
    if (captureStageRef.current === "baseline") {
      baselineSamplesRef.current.push(value);
    } else if (captureStageRef.current === "peak") {
      if (value > peakRef.current) peakRef.current = value;
    }
  }, [recorderState.metering]);

  const startClapometer = async () => {
    if (mode !== "crowd" || !micPermission.granted) return;
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      clapometerActiveRef.current = true;

      baselineSamplesRef.current = [];
      captureStageRef.current = "baseline";
      await sleep(BASELINE_WINDOW_MS);
      const samples = baselineSamplesRef.current;
      baselineValueRef.current = samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;

      peakRef.current = -Infinity;
      captureStageRef.current = "peak"; // stays here — the metering effect keeps updating peakRef until finishClapometer stops it
    } catch {
      captureStageRef.current = "idle";
      clapometerActiveRef.current = false;
    }
  };

  const finishClapometer = async () => {
    if (!clapometerActiveRef.current) return;
    clapometerActiveRef.current = false;
    try {
      const peak = peakRef.current === -Infinity ? baselineValueRef.current : peakRef.current;
      captureStageRef.current = "idle";
      await recorder.stop();
      const cheerScore = Math.max(0, Math.round(peak - baselineValueRef.current));
      addCheerScore(currentPlayerIndex, cheerScore);
    } catch {
      // swallow — never block navigation on this
    }
  };

  // Safety net for leaving mid-capture without tapping "SEE RESULTS" — back
  // gesture, app switch, anything. finishClapometer() no-ops via
  // clapometerActiveRef if capture already ended normally, so this never
  // double-stops the recorder; it only catches the case where it's still open.
  useEffect(() => {
    return () => {
      finishClapometer();
    };
  }, []);

  useEffect(() => {
    if (phase === "countdown") {
      const interval = setInterval(() => {
        setCount(prev => {
          if (prev <= 1) { clearInterval(interval); setPhase("recording"); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "recording") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(interval); setPhase("done"); return 0; }
          const next = prev - 1;
          if (next === 2) startClapometer();
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const showCamera = phase === "recording" && hasCameraPermission && cameraDevice != null;

  return (
    <ImageBackground
      source={require("../assets/images/bg_recording.jpg")}
      resizeMode="cover"
      style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}
    >
      {showCamera && (
        <Camera
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          device={cameraDevice}
          format={cameraFormat}
          pixelFormat="rgb"
          isActive={true}
          // Default "surface-view" preview is hardware-composited and
          // ignores the app's landscape lock on this device, rendering
          // sideways (confirmed via a marker test: an RN-level rotation
          // transform correctly rotated its own wrapper view but never
          // touched the camera image behind it). "texture-view" renders
          // through a real Android View instead, so it picks up the
          // orientation lock correctly. Confirmed upright on-device.
          androidPreviewViewType="texture-view"
          frameProcessor={poseSolution.frameProcessor}
          onLayout={poseSolution.cameraViewLayoutChangeHandler}
          onOutputOrientationChanged={poseSolution.cameraOrientationChangedHandler}
          photo={true}
        />
      )}
      {/* Scrim over the stage backdrop, always on so the countdown/dance-name
          text stays legible whether or not the camera is active. */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: showCamera ? "rgba(6,20,15,0.45)" : "rgba(6,20,15,0.55)" },
        ]}
        pointerEvents="none"
      />
      {phase === "countdown" && (
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.pink, fontSize: 13, letterSpacing: 4, textTransform: "uppercase", marginBottom: 40 }}>
            {currentPlayer ? `${currentPlayer.name}, get in position!` : "Get in position!"}
          </Text>
          <Text style={{ color: colors.mint, fontSize: 160, fontWeight: "700" }}>{count}</Text>
        </View>
      )}
      {phase === "recording" && (
        <View style={{ alignItems: "center" }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 40 }}>
            <Text style={{ fontSize: 60 }}>🔴</Text>
          </Animated.View>
          <Text style={{ color: colors.mint, fontSize: 100, fontWeight: "700" }}>{timeLeft}</Text>
          <Text style={{ color: colors.pink, fontSize: 13, letterSpacing: 4, textTransform: "uppercase", marginTop: 16 }}>
            {currentCountry ? `${currentCountry.dance}!` : "Dance!"}
          </Text>
        </View>
      )}
      {phase === "done" && (
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 80, marginBottom: 24 }}>🎉</Text>
          <Text style={{ color: colors.mint, fontSize: 32, fontWeight: "700", marginBottom: 48 }}>Time's up!</Text>
          <GradientButton
            label="SEE RESULTS"
            onPress={() => {
              finishClapometer();
              router.push("/reveal");
            }}
          />
        </View>
      )}
    </ImageBackground>
  );
}
