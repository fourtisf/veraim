# Generates the ad's soundtrack (ambient pad, soft pulse, hits) timed to ad.html.
#   python3 audio.py out.wav
import sys, wave
import numpy as np

SR = 44100
DUR = 39.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def hz(note):  # "A2" -> Hz
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + (o - 4) * 12) / 12)

def env(n, a, r):
    e = np.ones(n)
    ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai) ** 2
    if ri: e[-ri:] *= np.linspace(1, 0, ri) ** 1.5
    return e

def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
    R[i:i + len(sig)] += sig * gain * (1 + min(0, pan))

def pad(notes, t0, dur, gain=0.05):
    n = int(dur * SR); t = np.arange(n) / SR
    for k, note in enumerate(notes):
        f = hz(note)
        for side, det in ((-0.6, 0.997), (0.6, 1.003)):
            s = sum(np.sin(2 * np.pi * f * det * h * t + k) / h ** 1.6 for h in range(1, 7))
            s *= 1 + 0.15 * np.sin(2 * np.pi * 0.2 * t + k)  # slow movement
            add(s * env(n, 0.9, 1.2), t0, gain / len(notes) ** 0.5, side)

def pluck(note, t0, gain=0.05, pan=0.0):
    n = int(0.9 * SR); t = np.arange(n) / SR; f = hz(note)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.1 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 5)
    s[:120] *= np.linspace(0, 1, 120)
    add(s, t0, gain, pan)

def kick(t0, gain=0.5):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 80 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    add(s, t0, gain)

def hat(t0, gain=0.03, pan=0.3):
    n = int(0.06 * SR)
    s = np.diff(rng.standard_normal(n + 1)) * np.exp(-np.arange(n) / SR * 70)
    add(s, t0, gain, pan)

def smooth(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same")

def whoosh(t_peak, length=0.9, gain=0.12):
    n = int(length * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    lo = smooth(noise, 40); hi = noise - smooth(noise, 6)
    shape = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 3
    add((lo * 2.2 + hi * 0.25) * shape, t_peak - length * 0.6, gain, -0.3)
    add((lo * 2.2 + hi * 0.25) * shape[::-1][::-1], t_peak - length * 0.55, gain * 0.8, 0.3)

def boom(t0, gain=0.7):
    n = int(2.5 * SR); t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t * 12)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    add(s, t0, gain)
    tail = smooth(rng.standard_normal(n), 60) * np.exp(-t * 3) * 1.5
    add(tail, t0, gain * 0.25)

def shimmer(t0, notes, gain=0.03):
    for k, note in enumerate(notes):
        pluck(note, t0 + k * 0.07, gain, (-0.5 + k / max(1, len(notes) - 1)))

def ding(t0, gain=0.09):
    for k, note in enumerate(["E5", "B5"]):
        n = int(1.4 * SR); t = np.arange(n) / SR; f = hz(note)
        s = (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 3.5)
        add(s, t0 + k * 0.09, gain)

# --- arrangement (times match the scenes in ad4.html)
AM9 = ["A2", "E3", "G3", "B3", "C4"]; FM7 = ["F2", "C3", "E3", "A3", "C4"]; CM7 = ["C3", "G3", "B3", "E4"]; G6 = ["G2", "D3", "E3", "B3"]
pad(AM9, 0.0, 2.6, 0.045)
whoosh(1.0, 1.2, 0.09); boom(1.1, 0.45); shimmer(1.2, ["A4", "C5", "E5", "G5"], 0.026)   # logo
pad(CM7, 2.2, 2.2, 0.05)
prog = [AM9, FM7, CM7, G6]
arp = [["A3", "E4", "B4", "C5"], ["F3", "C4", "A4", "E5"], ["C4", "G4", "B4", "E5"], ["G3", "D4", "B4", "E5"]]
t = 4.0; i = 0
while t < 31.6:
    pad(prog[i % 4], t, 2.8, 0.05)
    for b in range(4):
        tb = t + b * 0.5
        if tb >= 31.6: break
        kick(tb, 0.3 if b % 2 == 0 else 0.2); hat(tb + 0.25, 0.02, 0.35)
        for e in range(2):
            pluck(arp[i % 4][(b * 2 + e) % 4], tb + e * 0.25, 0.02, (-0.4, 0.4)[e])
    t += 2.0; i += 1
for tw in (4.0, 9.2, 15.2, 21.8, 26.8):
    whoosh(tw + 0.2, 0.8, 0.08)
hat(13.8, 0.09, 0.0); hat(13.82, 0.05, 0.2)      # click "Is it safe?"
shimmer(16.4, ["E5", "A5", "C6"], 0.022)          # the answer
hat(30.5, 0.09, 0.0); hat(30.52, 0.05, 0.2)      # click MetaMask
whoosh(31.7, 1.2, 0.11); boom(31.75, 0.6)         # $VERAIM
shimmer(31.9, ["A4", "C5", "E5", "G5", "B5"], 0.028)
pad(["F2", "C3", "A3", "E4"], 31.6, 2.6, 0.06)
pad(["C2", "G2", "D3", "E4", "G4"], 34.0, 5.0, 0.065)
shimmer(34.2, ["C5", "D5", "E5", "G5"], 0.022)

# light reverb (exponential noise tail), gentle fade in/out, normalise
ir_n = int(1.8 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 3.2); ir /= np.abs(ir).sum() / 6
def conv(x):
    m = 1 << int(np.ceil(np.log2(len(x) + ir_n)))
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[: len(x)]
L = L + 0.22 * conv(L); R = R + 0.22 * conv(R)
fade = np.ones(N); fi = int(0.3 * SR); fo = int(0.9 * SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.1) * 0.84; R = np.tanh(R / peak * 1.1) * 0.84
out = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "soundtrack.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("ok")
