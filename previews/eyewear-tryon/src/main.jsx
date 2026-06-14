import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import SAMPLE_PHOTO from "./sample-portrait.jpg";
import "./styles.css";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const FRAMES = [
  {
    id: "signal",
    name: "Signal 01",
    shape: "round",
    color: "#ff5a36",
    lens: "rgba(255, 90, 54, 0.12)",
  },
  {
    id: "mono",
    name: "Mono 02",
    shape: "square",
    color: "#121c25",
    lens: "rgba(18, 28, 37, 0.08)",
  },
  {
    id: "cobalt",
    name: "Cobalt 03",
    shape: "soft",
    color: "#2766ff",
    lens: "rgba(39, 102, 255, 0.12)",
  },
];

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawTryOn(canvas, landmarks, frame, showLandmarks) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks?.length) return;

  if (showLandmarks) {
    ctx.save();
    ctx.fillStyle = "rgba(221, 255, 53, 0.72)";
    for (let index = 0; index < landmarks.length; index += 8) {
      const point = landmarks[index];
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, 1.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const leftPupil = landmarks[468] ?? landmarks[33];
  const rightPupil = landmarks[473] ?? landmarks[263];
  const leftTemple = landmarks[127] ?? landmarks[33];
  const rightTemple = landmarks[356] ?? landmarks[263];
  const toPoint = (point) => ({
    x: point.x * canvas.width,
    y: point.y * canvas.height,
  });
  const lp = toPoint(leftPupil);
  const rp = toPoint(rightPupil);
  const lt = toPoint(leftTemple);
  const rt = toPoint(rightTemple);
  const center = {
    x: (lp.x + rp.x) / 2,
    y: (lp.y + rp.y) / 2,
  };
  const angle = Math.atan2(rp.y - lp.y, rp.x - lp.x);
  const faceWidth = Math.hypot(rt.x - lt.x, rt.y - lt.y);
  const width = faceWidth * 1.08;
  const lensWidth = width * 0.395;
  const lensHeight = width * (frame.shape === "round" ? 0.31 : 0.285);
  const halfGap = width * 0.038;
  const strokeWidth = Math.max(3.2, width * 0.018);

  ctx.save();
  ctx.translate(center.x, center.y + lensHeight * 0.08);
  ctx.rotate(angle);
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = frame.color;
  ctx.fillStyle = frame.lens;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const drawLens = (x) => {
    if (frame.shape === "round") {
      ctx.beginPath();
      ctx.ellipse(
        x,
        0,
        lensWidth / 2,
        lensHeight / 2,
        0,
        0,
        Math.PI * 2,
      );
    } else {
      const radius = frame.shape === "soft" ? lensHeight * 0.34 : lensHeight * 0.16;
      roundedRect(
        ctx,
        x - lensWidth / 2,
        -lensHeight / 2,
        lensWidth,
        lensHeight,
        radius,
      );
    }
    ctx.fill();
    ctx.stroke();
  };

  const lensOffset = halfGap + lensWidth / 2;
  drawLens(-lensOffset);
  drawLens(lensOffset);

  ctx.beginPath();
  ctx.moveTo(-halfGap, -lensHeight * 0.04);
  ctx.quadraticCurveTo(0, -lensHeight * 0.22, halfGap, -lensHeight * 0.04);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-halfGap - lensWidth, -lensHeight * 0.12);
  ctx.lineTo(-width * 0.55, -lensHeight * 0.2);
  ctx.moveTo(halfGap + lensWidth, -lensHeight * 0.12);
  ctx.lineTo(width * 0.55, -lensHeight * 0.2);
  ctx.stroke();
  ctx.restore();
}

function App() {
  const [modelState, setModelState] = useState("loading");
  const [mode, setMode] = useState("sample");
  const [photoUrl, setPhotoUrl] = useState(SAMPLE_PHOTO);
  const [cameraRatio, setCameraRatio] = useState("4 / 3");
  const [selectedFrame, setSelectedFrame] = useState(FRAMES[0]);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [message, setMessage] = useState("Loading the browser vision model...");
  const [metrics, setMetrics] = useState({
    inference: null,
    landmarks: 0,
  });

  const landmarkerRef = useRef(null);
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const lastLandmarksRef = useRef(null);
  const frameRef = useRef(selectedFrame);
  const showLandmarksRef = useRef(showLandmarks);

  useEffect(() => {
    frameRef.current = selectedFrame;
    if (lastLandmarksRef.current && canvasRef.current) {
      drawTryOn(
        canvasRef.current,
        lastLandmarksRef.current,
        selectedFrame,
        showLandmarksRef.current,
      );
    }
  }, [selectedFrame]);

  useEffect(() => {
    showLandmarksRef.current = showLandmarks;
    if (lastLandmarksRef.current && canvasRef.current) {
      drawTryOn(
        canvasRef.current,
        lastLandmarksRef.current,
        frameRef.current,
        showLandmarks,
      );
    }
  }, [showLandmarks]);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function createLandmarker(delegate) {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate,
        },
        runningMode: "IMAGE",
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.5,
      });
    }

    async function initialize() {
      try {
        let delegate = "GPU";
        let landmarker;
        try {
          landmarker = await createLandmarker(delegate);
        } catch {
          delegate = "CPU";
          landmarker = await createLandmarker(delegate);
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setModelState("ready");
        setMessage("Face model ready. Landmarking the sample...");
      } catch (error) {
        console.error(error);
        setModelState("error");
        setMessage("The vision model could not load. Check the connection and retry.");
      }
    }

    initialize();
    return () => {
      cancelled = true;
      stopCamera();
      landmarkerRef.current?.close();
    };
  }, [stopCamera]);

  const detectPhoto = useCallback(async () => {
    const landmarker = landmarkerRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!landmarker || !image?.complete || !image.naturalWidth || !canvas) return;

    try {
      await landmarker.setOptions({ runningMode: "IMAGE" });
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const started = performance.now();
      const result = landmarker.detect(image);
      const inference = performance.now() - started;
      const landmarks = result.faceLandmarks?.[0];
      lastLandmarksRef.current = landmarks ?? null;
      drawTryOn(canvas, landmarks, frameRef.current, showLandmarksRef.current);
      setMetrics((current) => ({
        ...current,
        inference,
        landmarks: landmarks?.length ?? 0,
      }));
      setMessage(
        landmarks
          ? "Face locked. Choose another frame or inspect the landmarks."
          : "No face detected. Try a front-facing, well-lit photo.",
      );
    } catch (error) {
      console.error(error);
      setMessage("Photo analysis failed. Try a different image.");
    }
  }, []);

  useEffect(() => {
    if (modelState === "ready" && mode !== "camera") detectPhoto();
  }, [detectPhoto, mode, modelState, photoUrl]);

  const useSample = () => {
    stopCamera();
    setMode("sample");
    setPhotoUrl(SAMPLE_PHOTO);
    setMessage("Loading the sample portrait...");
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    stopCamera();
    setMode("upload");
    setPhotoUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setMessage("Analyzing the uploaded photo locally...");
    event.target.value = "";
  };

  const startCamera = async () => {
    if (!landmarkerRef.current) return;
    stopCamera();
    setMessage("Waiting for camera permission...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const video = videoRef.current;
      if (!video) throw new Error("Camera surface did not mount");
      video.srcObject = stream;
      await video.play();
      setCameraRatio(`${video.videoWidth} / ${video.videoHeight}`);
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      await landmarkerRef.current.setOptions({ runningMode: "VIDEO" });
      setMessage("Camera live. Face landmarks stay on this device.");
      lastVideoTimeRef.current = -1;

      const render = () => {
        if (!streamRef.current || !landmarkerRef.current || !videoRef.current) return;
        if (
          videoRef.current.readyState >= 2 &&
          videoRef.current.currentTime !== lastVideoTimeRef.current
        ) {
          const started = performance.now();
          const result = landmarkerRef.current.detectForVideo(
            videoRef.current,
            started,
          );
          const inference = performance.now() - started;
          const landmarks = result.faceLandmarks?.[0];
          lastVideoTimeRef.current = videoRef.current.currentTime;
          lastLandmarksRef.current = landmarks ?? null;
          drawTryOn(
            canvasRef.current,
            landmarks,
            frameRef.current,
            showLandmarksRef.current,
          );
          setMetrics((current) => ({
            ...current,
            inference,
            landmarks: landmarks?.length ?? 0,
          }));
        }
        animationRef.current = requestAnimationFrame(render);
      };
      render();
    } catch (error) {
      console.error(error);
      setMode("sample");
      setMessage("Camera access was unavailable. The photo path still works.");
    }
  };

  return (
    <div className="site-shell">
      <div className="noise" />
      <div className="proposal-strip">
        <span>Working technical proof</span>
        <span>React + MediaPipe / client-side inference</span>
      </div>

      <header>
        <a className="brand" href="#top" aria-label="Optic Shift home">
          OPTIC<span>/</span>SHIFT
        </a>
        <div className="status-chip">
          <i className={modelState === "ready" ? "ready" : ""} />
          {modelState === "ready" ? "Model ready" : "Loading model"}
        </div>
      </header>

      <main id="top">
        <section className="intro">
          <div>
            <p className="eyebrow">Browser-native eyewear try-on / proof 01</p>
            <h1>
              Find the frame.
              <span>Keep the face.</span>
            </h1>
          </div>
          <p className="lede">
            A lightweight proof that maps 478 face landmarks, aligns a 2-D frame,
            and keeps image processing inside the browser. Camera and photo paths
            share one embeddable rendering system.
          </p>
        </section>

        <section className="workbench">
          <div className="viewer-column">
            <div
              className={`viewer ${mode === "camera" ? "is-camera" : ""}`}
              style={{ "--camera-ratio": cameraRatio }}
            >
              {mode === "camera" ? (
                <video ref={videoRef} muted playsInline aria-label="Live camera preview" />
              ) : (
                <img
                  ref={imageRef}
                  src={photoUrl}
                  alt="Portrait used for the eyewear alignment demo"
                  onLoad={detectPhoto}
                />
              )}
              <canvas ref={canvasRef} aria-hidden="true" />
              <div className="corner corner-a" />
              <div className="corner corner-b" />
              <div className="viewer-badge">
                {mode === "camera" ? "LIVE / VIDEO" : "STILL / IMAGE"}
              </div>
            </div>

            <div className="viewer-message" aria-live="polite">
              <span>{message}</span>
              <button
                type="button"
                onClick={() => setShowLandmarks((current) => !current)}
                disabled={!metrics.landmarks}
              >
                {showLandmarks ? "Hide mesh" : "Inspect mesh"}
              </button>
            </div>
          </div>

          <aside className="controls">
            <div className="control-heading">
              <span>01</span>
              <h2>Input</h2>
            </div>
            <div className="input-grid">
              <button
                className={mode === "sample" ? "selected" : ""}
                type="button"
                onClick={useSample}
              >
                Sample
              </button>
              <button
                className={mode === "upload" ? "selected" : ""}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </button>
              <button
                className={mode === "camera" ? "selected" : ""}
                type="button"
                onClick={startCamera}
                disabled={modelState !== "ready"}
              >
                Camera
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
              />
            </div>

            <div className="control-heading frame-heading">
              <span>02</span>
              <h2>Frame</h2>
            </div>
            <div className="frames">
              {FRAMES.map((frame) => (
                <button
                  key={frame.id}
                  className={selectedFrame.id === frame.id ? "selected" : ""}
                  type="button"
                  onClick={() => setSelectedFrame(frame)}
                >
                  <i style={{ "--swatch": frame.color }} />
                  <span>{frame.name}</span>
                  <b>{frame.shape}</b>
                </button>
              ))}
            </div>

            <div className="metrics">
              <div>
                <span>Landmarks</span>
                <strong>{metrics.landmarks || "—"}</strong>
              </div>
              <div>
                <span>Inference</span>
                <strong>
                  {metrics.inference === null ? "—" : `${metrics.inference.toFixed(0)}ms`}
                </strong>
              </div>
              <div>
                <span>Backend</span>
                <strong>Local</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="system-grid">
          <article>
            <span>01 / Privacy</span>
            <h3>Local by default</h3>
            <p>
              Photos and camera frames are processed in the browser. This proof
              does not upload, retain, or identify the person in view.
            </p>
          </article>
          <article>
            <span>02 / Integration</span>
            <h3>One product API</h3>
            <p>
              A production component can accept product ID, transparent frame
              artwork, colour variant, calibration data, and analytics hooks.
            </p>
          </article>
          <article>
            <span>03 / Validation</span>
            <h3>Measure, then promise</h3>
            <p>
              Final latency and pixel-offset targets require an agreed device
              matrix and labelled fixtures. This demo exposes the instrumentation
              path without inventing results.
            </p>
          </article>
        </section>
      </main>

      <footer>
        <strong>OPTIC/SHIFT</strong>
        <p>
          Independent coded proposal. Sample portrait by Christopher Campbell on
          Unsplash. No affiliation with the prospective client.
        </p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
