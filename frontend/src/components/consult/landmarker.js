// Pemuat MediaPipe Face Landmarker (dimuat malas: hanya saat pengguna membuka pemindai wajah).
// WASM dari jsDelivr dan model dari Google Storage — butuh koneksi internet saat pertama kali dipakai.
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export async function createLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const make = (delegate) =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: "VIDEO",
      numFaces: 1
    });
  try {
    return await make("GPU");
  } catch {
    return make("CPU"); // beberapa perangkat tidak mendukung GPU delegate
  }
}
