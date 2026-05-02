import { Muxer, ArrayBufferTarget } from 'webm-muxer';

// ─── WebM export — two paths ──────────────────────────────────────────────────
//
// Path A (Chrome/Edge — WebCodecs available):
//   VideoEncoder + webm-muxer: every frame gets an explicit microsecond
//   timestamp so playback speed and duration are mathematically exact.
//
// Path B (Firefox/Safari fallback — MediaRecorder):
//   captureStream(0) + requestFrame() + wall-clock-aligned timing.
//   Timing is approximate but far better than the old setTimeout approach.
//
// options: { duration, fps, resolution, exportQuality, background }
export async function exportWebM(effectFactory, params, options, onProgress) {
  const {
    duration      = 2,
    fps           = 30,
    resolution    = 1024,
    exportQuality = 'high',
    background    = 'black',
  } = options;

  if (typeof VideoEncoder !== 'undefined') {
    return exportWebM_WebCodecs(effectFactory, params, { duration, fps, resolution, exportQuality, background }, onProgress);
  } else {
    return exportWebM_MediaRecorder(effectFactory, params, { duration, fps, resolution, exportQuality, background }, onProgress);
  }
}

// ─── Path A: WebCodecs + webm-muxer ──────────────────────────────────────────
async function exportWebM_WebCodecs(effectFactory, params, options, onProgress) {
  const { duration, fps, resolution, exportQuality, background } = options;

  const off = document.createElement('canvas');
  off.width  = resolution;
  off.height = resolution;
  const ctx  = off.getContext('2d', { alpha: background === 'transparent' });

  const totalFrames = Math.ceil(duration * fps);
  const frameUs     = Math.round(1_000_000 / fps);   // microseconds per frame
  const bitrate     = resolution >= 2048 ? 25_000_000
                    : resolution >= 1024 ? 12_000_000
                    :                       5_000_000;

  // Muxer — collects encoded chunks into an in-memory ArrayBuffer
  const target = new ArrayBufferTarget();
  const muxer  = new Muxer({
    target,
    video: {
      codec:     'V_VP9',
      width:     resolution,
      height:    resolution,
      frameRate: fps,
      ...(background === 'transparent' ? { alpha: true } : {}),
    },
    firstTimestampBehavior: 'offset',
  });

  // VideoEncoder — encodes ImageBitmap frames as VP9
  let encodeError = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error:  (e)           => { encodeError = e; },
  });

  const codecString = background === 'transparent'
    ? 'vp09.00.10.08.01' // VP9 profile 1 (supports alpha)
    : 'vp09.00.10.08';   // VP9 profile 0

  encoder.configure({
    codec:       codecString,
    width:       resolution,
    height:      resolution,
    bitrate,
    framerate:   fps,
    latencyMode: 'quality',
    ...(background === 'transparent' ? { alpha: 'keep' } : {}),
  });

  // Effect instance for this export
  const effect = effectFactory();
  effect.reset?.();
  const renderOpts = { quality: exportQuality, isExport: true };
  const vc         = { width: resolution, height: resolution };

  for (let f = 0; f < totalFrames; f++) {
    if (encodeError) throw encodeError;

    // Draw frame
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, resolution, resolution);
    if (background === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, resolution, resolution);
    }
    ctx.restore();

    effect.update(ctx, vc, params, 1 / fps, renderOpts);

    // Encode with frame-accurate timestamp
    const bitmap    = await createImageBitmap(off);
    const timestamp = f * frameUs;
    const vframe    = new VideoFrame(bitmap, { timestamp, duration: frameUs });
    encoder.encode(vframe, { keyFrame: f % Math.max(1, Math.round(fps)) === 0 });
    vframe.close();
    bitmap.close();

    onProgress?.((f + 1) / totalFrames);

    // Back-pressure: don't flood the encoder queue
    if (encoder.encodeQueueSize > 6) {
      await new Promise(r => { encoder.ondequeue = () => r(); });
    } else {
      // Yield to keep the UI responsive
      await new Promise(r => setTimeout(r, 0));
    }
  }

  await encoder.flush();
  if (encodeError) throw encodeError;

  muxer.finalize();

  return new Blob([target.buffer], { type: 'video/webm' });
}

// ─── Path B: MediaRecorder fallback ──────────────────────────────────────────
// Uses captureStream(0) + explicit requestFrame() so the stream's internal
// frame counter advances only when we say so, not on the browser's schedule.
// Timing is wall-clock aligned: each frame waits until its real deadline.
async function exportWebM_MediaRecorder(effectFactory, params, options, onProgress) {
  const { duration, fps, resolution, exportQuality, background } = options;

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Neither VideoEncoder nor MediaRecorder are available in this browser.');
  }

  const off = document.createElement('canvas');
  off.width  = resolution;
  off.height = resolution;
  const ctx  = off.getContext('2d');

  const mimeType = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const bitrate = resolution >= 2048 ? 20_000_000
                : resolution >= 1024 ? 12_000_000
                :                       6_000_000;

  // captureStream(0) = manual frame requests; avoids automatic capture timing
  const stream  = off.captureStream(0);
  const track   = stream.getVideoTracks()[0];
  const chunks  = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  const donePromise = new Promise((resolve, reject) => {
    recorder.onstop  = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    recorder.onerror = e  => reject(new Error(e.error?.message ?? 'MediaRecorder error'));
  });

  const effect = effectFactory();
  effect.reset?.();
  const renderOpts  = { quality: exportQuality, isExport: true };
  const vc          = { width: resolution, height: resolution };
  const totalFrames = Math.ceil(duration * fps);
  const msPerFrame  = 1000 / fps;

  recorder.start();
  const t0 = performance.now();

  for (let f = 0; f < totalFrames; f++) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, resolution, resolution);
    if (background === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, resolution, resolution);
    }
    ctx.restore();

    effect.update(ctx, vc, params, 1 / fps, renderOpts);

    // Signal the stream to capture this canvas state as a frame
    track.requestFrame();

    onProgress?.((f + 1) / totalFrames);

    // Sleep until the exact wall-clock deadline for this frame
    const deadline = t0 + (f + 1) * msPerFrame;
    const remaining = deadline - performance.now();
    if (remaining > 1) {
      await new Promise(r => setTimeout(r, remaining));
    } else {
      // Already overdue — yield minimally so the browser can breathe
      await new Promise(r => setTimeout(r, 0));
    }
  }

  recorder.stop();
  return donePromise;
}

// ─── Single PNG frame snapshot ────────────────────────────────────────────────
export function snapshotPNG(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('toBlob returned null')),
        'image/png',
      );
    } catch (e) {
      reject(e);
    }
  });
}

// ─── Download helper ─────────────────────────────────────────────────────────
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  // Revoke after a tick so the browser has time to initiate the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
