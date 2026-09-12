import { useEffect } from "react";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";

const INTRO_SOURCE = require("../assets/videos/orbgroove-opening.mp4");

export default function Intro() {
  const router = useRouter();
  const player = useVideoPlayer(INTRO_SOURCE, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const goHome = () => router.replace("/home" as any);
    // Two independent escape hatches so a stalled/undecodable video can
    // never strand the user here: playToEnd for the normal case, and
    // statusChange->error for a decode/stall failure. Tap-to-skip below
    // covers everything else (a hang with no error surfaced at all).
    const endSub = player.addListener("playToEnd", goHome);
    const statusSub = player.addListener("statusChange", (payload: { status: string }) => {
      if (payload.status === "error") goHome();
    });
    return () => {
      endSub.remove();
      statusSub.remove();
    };
  }, [player, router]);

  return (
    <Pressable
      style={{ flex: 1, backgroundColor: "#0A3B2E" }}
      onPress={() => router.replace("/home" as any)}
    >
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
      />
    </Pressable>
  );
}
