#!/usr/bin/env python3
"""Render the five original, public DOBBY interface cues as mono PCM WAV."""
import argparse
import io
import math
import struct
import wave
from pathlib import Path

RATE = 24000
OUTPUT = Path(__file__).resolve().parents[1] / "essai-stitch-v7/assets/audio"

# Warm resonances. Each partial has its own decay and quieter upper register.
ROUND = ((1, 1, 1), (2, .14, .84), (3, .045, .57))
GLASS = ((1, 1, 1), (2.01, .18, .72), (2.83, .075, .45), (4.06, .018, .30))
BREATH = ((1, 1, 1), (1.51, .20, .72), (2, .11, .80), (2.98, .024, .36))

# A gesture is (onset, length, Hz, end Hz, relative gain, attack, timbre).
CUES = {
    "confirm": (.220, -16, (
        (0, .220, 392, 392, 1, .019, ROUND),
    )),
    "reward": (.490, -15, (
        (0, .270, 349, 349, .82, .023, GLASS),
        (.094, .270, 440, 440, .92, .025, GLASS),
        (.183, .307, 523.25, 523.25, .78, .029, GLASS),
    )),
    "transition": (.410, -17, (
        (0, .410, 293.66, 392, .72, .045, BREATH),
        (.041, .369, 440, 349.23, .28, .058, BREATH),
    )),
    "notification": (.330, -16, (
        (0, .198, 330, 330, .72, .024, ROUND),
        (.103, .227, 261.63, 261.63, 1, .032, ROUND),
    )),
    "timer": (.560, -14, (
        (0, .211, 329.63, 329.63, .81, .027, ROUND),
        (.132, .211, 392, 392, .87, .027, ROUND),
        (.264, .296, 440, 440, 1, .029, ROUND),
    )),
}


def shape(progress):
    return (1 - math.cos(math.pi * min(1, max(0, progress)))) / 2


def voice(time, start, duration, low, high, level, attack, partials):
    t = time - start
    if t <= 0 or t >= duration:
        return 0
    phase = math.tau * (low * t + .5 * (high - low) * t * t / duration)
    edge = shape(t / attack) * shape((duration - t) / .063)
    return level * edge * sum(
        strength * math.exp(-3.35 * t / (duration * decay)) * math.sin(ratio * phase)
        for ratio, strength, decay in partials
    )


def render(duration, peak_dbfs, notes):
    samples = [sum(voice(frame / RATE, *note) for note in notes)
               for frame in range(round(duration * RATE))]
    level = 32767 * 10 ** (peak_dbfs / 20) / max(map(abs, samples))
    pcm = struct.pack(f"<{len(samples)}h", *(round(sample * level) for sample in samples))
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        wav.writeframes(pcm)
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify the checked-in files byte for byte")
    args = parser.parse_args()
    if not args.check:
        OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, score in CUES.items():
        path = OUTPUT / f"{name}.wav"
        data = render(*score)
        if args.check:
            if not path.is_file() or path.read_bytes() != data:
                raise SystemExit(f"{path.name}: WAV différent de sa source")
        else:
            path.write_bytes(data)
        print(f"{path.name}: {len(data)} octets")


if __name__ == "__main__":
    main()
