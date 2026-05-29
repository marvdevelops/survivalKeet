import * as FileSystem from 'expo-file-system/legacy';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

// ─── Constants ────────────────────────────────────────────────────────────────

const BEEP_PATH = (FileSystem.documentDirectory ?? '') + 'cpr_beep.wav';

// 880 Hz sine wave — 60 ms — 8-bit PCM, 8000 Hz, mono
const SAMPLE_RATE = 8000;
const BEEP_FREQ   = 880;
const BEEP_SECS   = 0.06; // 60 ms

// ─── WAV generation ───────────────────────────────────────────────────────────

function _generateBeepWavBase64(): string {
  const numSamples = Math.floor(SAMPLE_RATE * BEEP_SECS); // 480 samples
  const buf  = new Uint8Array(44 + numSamples);
  const view = new DataView(buf.buffer);

  // RIFF header
  buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46; // "RIFF"
  view.setUint32(4, 36 + numSamples, true);
  buf[8]  = 0x57; buf[9]  = 0x41; buf[10] = 0x56; buf[11] = 0x45; // "WAVE"

  // fmt chunk
  buf[12] = 0x66; buf[13] = 0x6d; buf[14] = 0x74; buf[15] = 0x20; // "fmt "
  view.setUint32(16, 16, true); // subchunk1 size
  view.setUint16(20,  1, true); // PCM
  view.setUint16(22,  1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true); // sample rate
  view.setUint32(28, SAMPLE_RATE, true); // byte rate (1 byte × 8000/s)
  view.setUint16(32,  1, true); // block align
  view.setUint16(34,  8, true); // bits per sample

  // data chunk
  buf[36] = 0x64; buf[37] = 0x61; buf[38] = 0x74; buf[39] = 0x61; // "data"
  view.setUint32(40, numSamples, true);

  // Sine-wave PCM samples with 20% fade-out
  for (let i = 0; i < numSamples; i++) {
    const t       = i / SAMPLE_RATE;
    const fadePct = i / numSamples;
    const envelope = fadePct < 0.8 ? 1.0 : 1.0 - (fadePct - 0.8) / 0.2;
    const sample   = 128 + Math.round(80 * envelope * Math.sin(2 * Math.PI * BEEP_FREQ * t));
    buf[44 + i] = Math.max(0, Math.min(255, sample));
  }

  // Uint8Array → base64
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary);
}

// ─── Runtime state ────────────────────────────────────────────────────────────

let _sound:  Audio.Sound | null = null;
let _ready = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates the beep WAV on first run, sets up audio mode, and pre-loads the
 * Sound instance.  Call this when the CPR modal opens.
 */
export async function initCprBeep(): Promise<void> {
  try {
    // Write beep file to disk on first use
    const info = await FileSystem.getInfoAsync(BEEP_PATH);
    if (!info.exists) {
      const b64 = _generateBeepWavBase64();
      await FileSystem.writeAsStringAsync(BEEP_PATH, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    // Configure audio session — must play even when iOS silent switch is on
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS:    true,
      interruptionModeIOS:     InterruptionModeIOS.DoNotMix,
      staysActiveInBackground: false,
      shouldDuckAndroid:       true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    });

    // Pre-load sound
    await _unloadSound();
    const { sound } = await Audio.Sound.createAsync(
      { uri: BEEP_PATH },
      { shouldPlay: false, volume: 0.9 }
    );
    _sound = sound;
    _ready = true;
  } catch {
    // Audio is best-effort — CPR timer still works without sound
    _ready = false;
  }
}

/**
 * Plays one short beep.  Call on each CPR metronome tick.
 * Safe to call even if initCprBeep() failed.
 */
export async function playCprBeep(): Promise<void> {
  if (!_ready || !_sound) return;
  try {
    await _sound.replayAsync();
  } catch {
    // Ignore playback errors
  }
}

/**
 * Unloads the Sound instance.  Call when the CPR modal closes.
 */
export async function cleanupCprBeep(): Promise<void> {
  _ready = false;
  await _unloadSound();
}

async function _unloadSound(): Promise<void> {
  if (_sound) {
    try {
      await _sound.stopAsync();
      await _sound.unloadAsync();
    } catch { /* ignore */ }
    _sound = null;
  }
}
