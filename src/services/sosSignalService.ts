import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

// ─── Types ────────────────────────────────────────────────────────────────────

type TorchCallback = (on: boolean) => void;

// ─── Morse SOS pattern ────────────────────────────────────────────────────────
// ··· — — — ···
// Each entry: [durationMs, torchOn]

const SOS_PATTERN: [number, boolean][] = [
  // 3 short  (·)
  [300, true],  [200, false],
  [300, true],  [200, false],
  [300, true],  [600, false],  // inter-group gap
  // 3 long   (—)
  [900, true],  [200, false],
  [900, true],  [200, false],
  [900, true],  [600, false],  // inter-group gap
  // 3 short  (·)
  [300, true],  [200, false],
  [300, true],  [200, false],
  [300, true],  [2000, false], // pause before repeat
];

// ─── Torch state (subscriber pattern) ────────────────────────────────────────
// The torch MUST be controlled by a mounted CameraView (expo-camera requirement).
// This service fires a callback that the SosSignalScreen component wires to its
// CameraView `enableTorch` prop.

let _torchCallback: TorchCallback | null = null;
let _sosTimeoutId:  ReturnType<typeof setTimeout> | null = null;
let _sosRunning = false;

export function registerTorchCallback(cb: TorchCallback): void {
  _torchCallback = cb;
}

export function unregisterTorchCallback(): void {
  _torchCallback = null;
}

export function isSosRunning(): boolean {
  return _sosRunning;
}

function _setTorch(on: boolean): void {
  _torchCallback?.(on);
}

function _clearSosTimer(): void {
  if (_sosTimeoutId !== null) {
    clearTimeout(_sosTimeoutId);
    _sosTimeoutId = null;
  }
}

/** Runs the SOS morse pattern on the torch, looping indefinitely. */
function _runPattern(index: number): void {
  if (!_sosRunning) return;

  const [duration, torchOn] = SOS_PATTERN[index];
  _setTorch(torchOn);

  _sosTimeoutId = setTimeout(() => {
    const next = (index + 1) % SOS_PATTERN.length;
    _runPattern(next);
  }, duration);
}

export function startFlashlightSos(): void {
  if (_sosRunning) return;
  _sosRunning = true;
  _runPattern(0);
}

export function stopFlashlightSos(): void {
  _sosRunning = false;
  _clearSosTimer();
  _setTorch(false);
}

// ─── Audio alarm ──────────────────────────────────────────────────────────────

let _sound: Audio.Sound | null = null;
let _audioRunning = false;

export function isAudioRunning(): boolean {
  return _audioRunning;
}

/**
 * Plays the alarm sound at maximum volume, looping continuously.
 * Uses assets/sounds/alarm.mp3 — add this file to the assets directory.
 * Fails silently if the file is missing or audio is unavailable.
 */
export async function startAudioAlarm(): Promise<void> {
  if (_audioRunning) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,                              // play even on silent switch
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,       // required field — alarm interrupts other audio
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    });

    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/sounds/alarm.mp3'),
      {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      }
    );

    _sound = sound;
    // Explicit playAsync in case shouldPlay didn't start it on the new arch
    await sound.playAsync();
    _audioRunning = true;
  } catch {
    // Audio is best-effort — never crash the app
    _audioRunning = false;
  }
}

export async function stopAudioAlarm(): Promise<void> {
  _audioRunning = false;
  if (_sound) {
    try {
      await _sound.stopAsync();
      await _sound.unloadAsync();
    } catch { /* ignore */ }
    _sound = null;
  }
}

/** Stops both torch SOS and audio alarm. */
export function stopAllSosSignals(): void {
  stopFlashlightSos();
  stopAudioAlarm().catch(() => null);
}
