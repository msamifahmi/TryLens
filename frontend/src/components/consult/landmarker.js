// Pemuat MediaPipe Face Landmarker (dimuat malas: hanya saat pengguna membuka pemindai wajah).
// WASM dari jsDelivr dan model dari Google Storage — butuh koneksi internet saat pertama kali dipakai.
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// opts.matrices = true -> matriks pose kepala; opts.blendshapes = true -> skor ekspresi (dipakai deteksi kedipan).
// opts.mode = "VIDEO" (bawaan, memakai pelacakan antar-frame) | "IMAGE" (tiap panggilan mendeteksi dari nol; dipakai ensemble cermin).
export async function createLandmarker(opts = {}) {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const make = (delegate) =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: opts.mode === "IMAGE" ? "IMAGE" : "VIDEO",
      numFaces: 1,
      outputFacialTransformationMatrixes: !!opts.matrices,
      outputFaceBlendshapes: !!opts.blendshapes
    });
  try {
    return await make("GPU");
  } catch {
    return make("CPU"); // beberapa perangkat tidak mendukung GPU delegate
  }
}

/** Garis penghubung titik wajah (sama dengan yang dipakai MediaPipe) untuk menggambar mesh di kanvas. */
export async function faceConnections() {
  const { FaceLandmarker: F } = await import("@mediapipe/tasks-vision");
  const pairs = (c) => (c || []).map((x) => [x.start, x.end]);
  return {
    tess: pairs(F.FACE_LANDMARKS_TESSELATION),
    oval: pairs(F.FACE_LANDMARKS_FACE_OVAL),
    eyes: [...pairs(F.FACE_LANDMARKS_LEFT_EYE), ...pairs(F.FACE_LANDMARKS_RIGHT_EYE), ...pairs(F.FACE_LANDMARKS_LEFT_IRIS), ...pairs(F.FACE_LANDMARKS_RIGHT_IRIS)],
    brows: [...pairs(F.FACE_LANDMARKS_LEFT_EYEBROW), ...pairs(F.FACE_LANDMARKS_RIGHT_EYEBROW)],
    lips: pairs(F.FACE_LANDMARKS_LIPS)
  };
}
