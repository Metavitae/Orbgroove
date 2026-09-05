import { useEffect } from "react";
import { View } from "react-native";
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
    const sub = player.addListener("playToEnd", () => {
      router.replace("/home" as any);
    });
    return () => sub.remove();
  }, [player, router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0A3B2E" }}>
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
      />
    </View>
  );
}
