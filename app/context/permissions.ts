import { Platform, PermissionsAndroid } from "react-native";
import { requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import { Camera } from "react-native-vision-camera";

// Camera + mic are requested together, in one pass, right after player
// registration (players.tsx) and after the intro video -- never at raw app
// launch. On Android this is a single PermissionsAndroid.requestMultiple
// call so both system dialogs appear back-to-back instead of being spread
// across separate screens/times.
export const permissionsState = { camera: false, microphone: false, requested: false };

export async function requestAllPermissionsOnce() {
  if (permissionsState.requested) return permissionsState;
  permissionsState.requested = true;

  if (Platform.OS === "android") {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    permissionsState.camera = results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
    permissionsState.microphone = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
  } else {
    const [cameraStatus, micResult] = await Promise.all([
      Camera.requestCameraPermission(),
      requestRecordingPermissionsAsync(),
    ]);
    permissionsState.camera = cameraStatus === "granted";
    permissionsState.microphone = micResult.granted;
  }

  if (permissionsState.microphone) {
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  }

  return permissionsState;
}
