import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { BIZ } from './config.js'
import { ART } from './ingredients.jsx'
import { primeAudio, slamSound, flickSound, isMuted, setMuted } from './sounds.js'
import { CLIPS, FINALES, clipKeyFor } from './clips.js'

/* ── Utilities ──────────────────────────────────────────────────────────── */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

const hash = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

const gbp = (n) => `£${n.toFixed(2)}`

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

/* ── Ambient rising embers ──────────────────────────────────────────────── */

function EmberField({ reduced }) {
  const ref = useRef(null)
  useEffect(() => {
    if (reduced) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w, h, dpr, raf, particles
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = clamp(Math.round((w * h) / 38000), 16, 46)
      particles = Array.from({ length: n }, () => spawn(true))
    }
    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 1 + Math.random() * 2.2,
      sp: 14 + Math.random() * 42,
      sw: 0.4 + Math.random() * 1.4,
      ph: Math.random() * Math.PI * 2,
      o: 0.25 + Math.random() * 0.5,
      amber: Math.random() > 0.55,
    })
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, w, h)
      const t = now / 1000
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.y -= p.sp * dt
        p.x += Math.sin(t * p.sw + p.ph) * 9 * dt
        if (p.y < -12) particles[i] = spawn(false)
        const a = p.o * (0.45 + 0.55 * Math.sin(t * 1.8 + p.ph) ** 2)
        ctx.fillStyle = p.amber
          ? `rgba(255,176,33,${a})`
          : `rgba(255,90,31,${a})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }
    resize()
    window.addEventListener('resize', resize)
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced])
  if (reduced) return null
  return <canvas className="embers-canvas" ref={ref} aria-hidden="true" />
}

/* ── Slam physics ───────────────────────────────────────────────────────────
   Hand-rolled, no tween library. Each layer is a body:
   gravity fall → impact (squash impulse, spark burst, stack quake) →
   one damped bounce → underdamped spring settle. Deselect = flick off. */

const G = 5600 // px/s² — heavy
const V0 = 620 // px/s — thrown in, not dropped
const REST = 0.24 // restitution of the single bounce
const K_SETTLE = 380
const D_SETTLE = 24
const K_SQUASH = 520
const D_SQUASH = 8.5

function Layer({ art, id, slotY, widthPx, leaving, delay, onImpact, onGone, reduced, z, register }) {
  const elRef = useRef(null)
  const slotRef = useRef(slotY)
  slotRef.current = slotY
  const heightPx = (widthPx * art.h) / 300

  const st = useRef(null)
  if (!st.current) {
    const seed = hash(id)
    st.current = {
      y: -heightPx - 80,
      v: 0,
      x: 0,
      vx: 0,
      rot: 0,
      vr: 0,
      sq: 0,
      sqv: 0,
      op: 1,
      t: 0,
      mode: 'wait',
      bounced: false,
      running: false,
      baseRot: (((seed % 9) - 4) * 0.9),
      baseX: ((seed >> 4) % 15) - 7,
    }
  }

  const loopRef = useRef()
  loopRef.current = () => {
    const s = st.current
    const el = elRef.current
    if (!el) { s.running = false; return }
    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(1 / 30, (now - last) / 1000)
      last = now
      const slot = slotRef.current

      if (s.mode === 'wait') {
        s.t += dt
        if (s.t >= delay) {
          s.mode = 'fall'
          s.v = V0
        }
      } else if (s.mode === 'fall') {
        s.v += G * dt
        s.y += s.v * dt
        if (s.y >= slot) {
          s.y = slot
          const imp = s.v
          const kick = Math.max(4.5, imp * 0.006) * (0.55 + 0.45 * (art.weight / 1.7))
          s.sqv -= kick
          if (!s.bounced) {
            onImpact(imp, art, s.baseX)
            s.bounced = true
            s.v = imp > 800 ? -imp * REST : 0
            if (s.v === 0) s.mode = 'settle'
          } else {
            s.v = 0
            s.mode = 'settle'
          }
        }
      } else if (s.mode === 'settle') {
        const a = -K_SETTLE * (s.y - slot) - D_SETTLE * s.v
        s.v += a * dt
        s.y += s.v * dt
      } else if (s.mode === 'exit') {
        s.t += dt
        s.v += G * 0.55 * dt
        s.y += s.v * dt
        s.x += s.vx * dt
        s.rot += s.vr * dt
        if (s.t > 0.1) s.op -= 2.8 * dt
        if (s.op <= 0) {
          s.running = false
          onGone(id)
          return
        }
      }

      // squash/stretch spring, plus velocity stretch while falling
      const sa = -K_SQUASH * s.sq - D_SQUASH * s.sqv
      s.sqv += sa * dt
      s.sq += s.sqv * dt
      s.sq = clamp(s.sq, -0.52, 0.34)
      const stretch = s.mode === 'fall' ? clamp(s.v * 0.00007, 0, 0.16) : 0
      const eff = s.sq + stretch

      const sy = 1 + eff
      const sx = 1 - eff * 0.75
      el.style.opacity = clamp(s.op, 0, 1)
      el.style.transform = `translate3d(${s.baseX + s.x}px, ${s.y}px, 0) rotate(${s.baseRot + s.rot}deg) scale(${sx}, ${sy})`

      const settled =
        s.mode === 'settle' &&
        Math.abs(s.y - slot) < 0.4 &&
        Math.abs(s.v) < 6 &&
        Math.abs(s.sq) < 0.004 &&
        Math.abs(s.sqv) < 0.05
      if (settled) {
        s.y = slot
        s.sq = 0
        s.sqv = 0
        el.style.transform = `translate3d(${s.baseX}px, ${slot}px, 0) rotate(${s.baseRot}deg)`
        s.running = false
        return
      }
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }

  const ensureRunning = useCallback(() => {
    const s = st.current
    if (!s.running) {
      s.running = true
      loopRef.current()
    }
  }, [])

  // Take shockwave nudges from other layers' impacts
  useEffect(() => {
    if (!register || reduced) return
    register(id, {
      nudge: (dv, dsq) => {
        const s = st.current
        if (s.mode !== 'settle') return
        s.v += dv
        s.sqv += dsq
        ensureRunning()
      },
    })
    return () => register(id, null)
  }, [id, register, reduced, ensureRunning])

  useEffect(() => {
    if (reduced) return
    ensureRunning()
  }, [slotY, reduced, ensureRunning])

  useEffect(() => {
    if (!leaving) {
      const s = st.current
      if (s.mode === 'exit') {
        // re-selected mid-flight: reset and slam back in
        s.y = -heightPx - 80
        s.v = 0
        s.x = 0
        s.vx = 0
        s.rot = 0
        s.vr = 0
        s.op = 1
        s.t = 0
        s.bounced = false
        s.mode = 'fall'
        if (!reduced) ensureRunning()
      }
      return
    }
    if (reduced) {
      const t = setTimeout(() => onGone(id), 380)
      return () => clearTimeout(t)
    }
    flickSound()
    const s = st.current
    const dir = hash(id + 'x') % 2 ? 1 : -1
    s.mode = 'exit'
    s.t = 0
    s.vx = dir * (700 + (hash(id + 'v') % 100) * 4.5)
    s.v = -420 - (hash(id + 'u') % 100) * 1.8
    s.vr = dir * (260 + (hash(id + 'r') % 100) * 2.6)
    ensureRunning()
  }, [leaving, reduced, id, onGone, ensureRunning])

  if (reduced) {
    return (
      <div
        className="layer reduced"
        ref={elRef}
        style={{
          width: widthPx,
          marginLeft: -widthPx / 2,
          zIndex: z,
          opacity: leaving ? 0 : 1,
          transform: `translate3d(${st.current.baseX}px, ${slotY}px, 0)`,
        }}
      >
        <art.C />
      </div>
    )
  }

  return (
    <div
      className="layer"
      ref={elRef}
      style={{
        width: widthPx,
        marginLeft: -widthPx / 2,
        zIndex: z,
        transformOrigin: '50% 85%',
        opacity: 0,
        transform: `translate3d(0, ${-heightPx - 80}px, 0)`,
      }}
    >
      <art.C />
    </div>
  )
}

function SoundToggle() {
  const [muted, setM] = useState(isMuted)
  const toggle = () => {
    primeAudio()
    const next = !muted
    setMuted(next)
    setM(next)
  }
  return (
    <button
      className="sound-toggle"
      aria-pressed={!muted}
      aria-label={muted ? 'Unmute slam sounds' : 'Mute slam sounds'}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
        {muted ? (
          <path d="M16 9l5 6M21 9l-5 6" />
        ) : (
          <>
            <path d="M15.5 9.5a4 4 0 0 1 0 5" />
            <path d="M18 7a8 8 0 0 1 0 10" />
          </>
        )}
      </svg>
    </button>
  )
}

/* Spark burst + dust puff at an impact point */
function Burst({ x, y, n, reduced }) {
  const parts = useMemo(() => {
    const colors = ['#FF5A1F', '#FFB021', '#FFD98A', '#FF7A45']
    return Array.from({ length: n }, (_, i) => {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4
      const dist = 34 + Math.random() * 78
      return {
        id: i,
        dx: Math.cos(ang) * dist * (Math.random() > 0.5 ? 1.4 : 1),
        dy: Math.sin(ang) * dist - Math.random() * 24,
        c: colors[i % colors.length],
        s: 3 + Math.random() * 3.5,
        d: Math.random() * 60,
      }
    })
  }, [n])
  if (reduced) return null
  return (
    <>
      <div className="dust" style={{ left: x, top: y }} />
      {parts.map((p) => (
        <span
          key={p.id}
          className="spark"
          style={{
            left: x,
            top: y,
            width: p.s,
            height: p.s,
            background: p.c,
            boxShadow: `0 0 8px ${p.c}`,
            animationDelay: `${p.d}ms`,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
          }}
        />
      ))}
    </>
  )
}

/* ── Ingredient film overlay ─────────────────────────────────────────────
   Plays a Seedance clip of the tapped ingredient slamming onto the grill,
   native audio and all, then fades back to the stack. A finale cue
   (hold: true) stays up on its last frame until tapped. */

function FilmOverlay({ cue, onActive }) {
  const videoRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!cue) return
    const v = videoRef.current
    setHeld(false)
    v.src = cue.src
    v.muted = isMuted()
    const begin = () => {
      if (cue.startAt) v.currentTime = cue.startAt
      const p = v.play()
      if (p) {
        p.catch(() => {
          v.muted = true
          v.play().catch(() => setVisible(false))
        })
      }
    }
    if (v.readyState >= 1) begin()
    else v.onloadedmetadata = begin
    const onPlaying = () => {
      setVisible(true)
      onActive(true)
    }
    const onEnded = () => {
      if (cue.hold) setHeld(true)
      else setVisible(false)
      onActive(false)
    }
    v.addEventListener('playing', onPlaying)
    v.addEventListener('ended', onEnded)
    v.addEventListener('error', onEnded)
    return () => {
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('error', onEnded)
      v.onloadedmetadata = null
    }
  }, [cue, onActive])

  const dismiss = () => {
    setVisible(false)
    setHeld(false)
    const v = videoRef.current
    if (v) v.pause()
  }

  return (
    <div
      className={`film${visible ? ' show' : ''}`}
      onClick={held ? dismiss : undefined}
      role={held ? 'button' : undefined}
      aria-label={held ? 'Back to your build' : undefined}
    >
      <video ref={videoRef} playsInline preload="auto" aria-hidden="true" />
      {held && <p className="film-hint">Tap to go back</p>}
    </div>
  )
}

/* ── The exploded stack ─────────────────────────────────────────────────── */

function Stack({ layers, reduced, armed, filmCue, soundMuteUntil }) {
  const panelRef = useRef(null)
  const quakeElRef = useRef(null)
  const quake = useRef({ e: 0, t: 0, running: false })
  const [panel, setPanel] = useState({ w: 0, h: 0 })
  const [bursts, setBursts] = useState([])
  const burstId = useRef(0)
  const initialKeys = useRef(new Set(layers.map((l) => l.key)))

  // Layers that were deselected stay mounted (same key → same physics state)
  // until their flick-off animation reports done. Computed synchronously in
  // render so an instance never unmounts for a frame in between.
  const leavingRef = useRef(new Map())
  const prevRef = useRef(layers)
  const [, forceRender] = useState(0)
  if (prevRef.current !== layers) {
    const curKeys = new Set(layers.map((l) => l.key))
    for (const l of prevRef.current) {
      if (!curKeys.has(l.key)) leavingRef.current.set(l.key, l)
    }
    for (const k of [...leavingRef.current.keys()]) {
      if (curKeys.has(k)) leavingRef.current.delete(k) // re-added while leaving
    }
    prevRef.current = layers
  }

  useEffect(() => {
    const el = panelRef.current
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setPanel({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onGone = useCallback((key) => {
    leavingRef.current.delete(key)
    forceRender((x) => x + 1)
  }, [])

  const onFilmActive = useCallback(() => {}, [])

  const bodiesRef = useRef(new Map())
  const slotMapRef = useRef(new Map())
  const register = useCallback((key, api) => {
    if (api) bodiesRef.current.set(key, api)
    else bodiesRef.current.delete(key)
  }, [])

  const kickQuake = useCallback(
    (energy) => {
      if (reduced) return
      const q = quake.current
      q.e = Math.min(30, q.e * 0.45 + energy)
      q.t = 0
      if (q.running) return
      q.running = true
      let last = performance.now()
      const frame = (now) => {
        const dt = Math.min(1 / 30, (now - last) / 1000)
        last = now
        q.t += dt
        const decay = Math.exp(-5.5 * q.t)
        const off = q.e * decay * Math.sin(30 * q.t)
        const el = quakeElRef.current
        if (el) el.style.transform = `translate3d(0, ${off}px, 0) rotate(${off * 0.045}deg)`
        if (q.e * decay < 0.25) {
          if (el) el.style.transform = ''
          q.running = false
          return
        }
        requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    },
    [reduced]
  )

  const stackW = clamp(panel.w * 0.6, 210, 350)
  const n = layers.length
  const usable = panel.h - 110
  const gap = n > 1 ? Math.min(62, usable / (n - 1)) : 0
  const contentH = (n - 1) * gap + 70
  const startY = Math.max(26, (panel.h - contentH) / 2)

  const slotFor = (i) => startY + (n - 1 - i) * gap // i counts from bottom

  const spawnBurst = useCallback(
    (imp, art, baseX, slot, key) => {
      // A playing ingredient film carries its own impact audio
      if (performance.now() > (soundMuteUntil?.current ?? 0)) slamSound(art.weight, imp)
      kickQuake(imp * 0.011 * art.weight)
      // Shockwave: layers above hop, layers below compress
      for (const [k, api] of bodiesRef.current) {
        if (k === key) continue
        const sy = slotMapRef.current.get(k)
        if (sy == null) continue
        if (sy < slot) {
          const falloff = clamp(1 - (slot - sy) / 420, 0.12, 1)
          api.nudge(-imp * 0.06 * art.weight * falloff, -imp * 0.0006 * falloff)
        } else if (sy > slot) {
          const falloff = clamp(1 - (sy - slot) / 260, 0.15, 1)
          api.nudge(imp * 0.018 * falloff, -imp * 0.0009 * falloff)
        }
      }
      const id = burstId.current++
      const wPx = stackW * art.w
      const x = panel.w / 2 + baseX + (Math.random() - 0.5) * wPx * 0.3
      const y = slot + (wPx * art.h) / 300 - 6
      const count = Math.round(6 + art.weight * 7)
      setBursts((bs) => [...bs.slice(-4), { id, x, y, n: count }])
      setTimeout(() => setBursts((bs) => bs.filter((b) => b.id !== id)), 750)
    },
    [kickQuake, panel.w, stackW]
  )

  return (
    <div className="viz" ref={panelRef} role="img" aria-label="Your order, stacked layer by layer">
      <div className="viz-bgword" aria-hidden="true">{BIZ.name}</div>
      <p className="viz-hint" aria-hidden="true">Your build</p>
      {BIZ.audio && <SoundToggle />}
      <FilmOverlay cue={filmCue} onActive={onFilmActive} />
      <div className="stack-quake" ref={quakeElRef}>
        {panel.w > 0 &&
          armed &&
          [
            ...layers.map((l, i) => ({ ...l, leaving: false, i })),
            ...[...leavingRef.current.values()].map((l) => ({ ...l, leaving: true, i: 0 })),
          ].map((l) => {
            const art = ART[l.art]
            const slot = slotFor(l.i)
            if (!l.leaving) slotMapRef.current.set(l.key, slot)
            else slotMapRef.current.delete(l.key)
            return (
              <Layer
                key={l.key}
                id={l.key}
                art={art}
                slotY={slot}
                widthPx={stackW * art.w}
                leaving={l.leaving}
                delay={initialKeys.current.has(l.key) ? l.i * 0.085 + 0.05 : 0}
                onImpact={(imp, a, bx) => spawnBurst(imp, a, bx, slot, l.key)}
                onGone={onGone}
                reduced={reduced}
                z={l.leaving ? 70 : 60 - l.i}
                register={register}
              />
            )
          })}
      </div>
      {bursts.map((b) => (
        <Burst key={b.id} x={b.x} y={b.y} n={b.n} reduced={reduced} />
      ))}
    </div>
  )
}

/* ── Animated price ─────────────────────────────────────────────────────── */

function AnimatedPrice({ value, className, reduced }) {
  const ref = useRef(null)
  const anim = useRef({ val: value, v: 0, raf: 0 })
  useEffect(() => {
    const a = anim.current
    const el = ref.current
    if (reduced) {
      a.val = value
      el.textContent = gbp(value)
      return
    }
    if (!reduced && el && Math.abs(value - a.val) > 0.001) {
      el.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.09)' }, { transform: 'scale(1)' }],
        { duration: 280, easing: 'ease-out' }
      )
    }
    cancelAnimationFrame(a.raf)
    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(1 / 30, (now - last) / 1000)
      last = now
      const acc = -140 * (a.val - value) - 18 * a.v
      a.v += acc * dt
      a.val += a.v * dt
      if (Math.abs(a.val - value) < 0.005 && Math.abs(a.v) < 0.05) {
        a.val = value
        a.v = 0
        el.textContent = gbp(value)
        return
      }
      el.textContent = gbp(Math.max(0, a.val))
      a.raf = requestAnimationFrame(frame)
    }
    a.raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(a.raf)
  }, [value, reduced])
  return (
    <span className={className} ref={ref}>
      {gbp(value)}
    </span>
  )
}

/* ── Builder ────────────────────────────────────────────────────────────── */

const defaultSelections = () => {
  const sel = {}
  for (const tab of BIZ.builder.tabs) {
    sel[tab.id] = {}
    for (const group of tab.groups) {
      if (group.pick === 'one') sel[tab.id][group.id] = [group.items[0].id]
      else sel[tab.id][group.id] = []
    }
  }
  // a tasty-looking starting build
  if (sel.kebabs?.salad) sel.kebabs.salad = ['lettuce', 'tomato']
  if (sel.kebabs?.sauce) sel.kebabs.sauce = ['garlic', 'chilli']
  if (sel.burgers?.toppings) sel.burgers.toppings = ['cheese', 'lettuce']
  if (sel.burgers?.sauce) sel.burgers.sauce = ['burger-sauce']
  return sel
}

function deriveLayers(tab, sel) {
  const out = []
  const tabSel = sel[tab.id]
  let baseMeatArt = null
  for (const group of tab.groups) {
    for (const item of group.items) {
      if (!tabSel[group.id]?.includes(item.id) || !item.layer) continue
      if (item.layer === 'BUN' || item.layer === 'BUN_SEEDED') {
        out.push({ key: 'bun-bottom', art: 'bun-bottom', order: ART['bun-bottom'].order })
        const top = item.layer === 'BUN' ? 'bun-top' : 'bun-top-seeded'
        out.push({ key: top, art: top, order: ART[top].order })
      } else if (item.layer === 'DOUBLE_MEAT') {
        // resolved after the loop, needs the base meat
        out.push({ key: 'DOUBLE_MEAT', art: 'DOUBLE_MEAT', order: 12 })
      } else {
        out.push({ key: item.layer, art: item.layer, order: ART[item.layer].order })
        if (ART[item.layer].order === 10) baseMeatArt = item.layer
      }
    }
  }
  const resolved = out
    .map((l) =>
      l.art === 'DOUBLE_MEAT'
        ? baseMeatArt
          ? { key: `double-${baseMeatArt}`, art: baseMeatArt, order: 12 }
          : null
        : l
    )
    .filter(Boolean)
  resolved.sort((a, b) => a.order - b.order)
  return resolved // bottom → top
}

function buildSummary(tab, sel) {
  const tabSel = sel[tab.id]
  const picked = (gid) => {
    const g = tab.groups.find((x) => x.id === gid)
    if (!g) return []
    return g.items.filter((i) => tabSel[gid]?.includes(i.id))
  }
  const PROPER = ['American', 'Welsh']
  const soften = (name) =>
    name
      .split(' ')
      .map((w) =>
        (w.length > 1 && w === w.toUpperCase()) || PROPER.includes(w)
          ? w
          : w.charAt(0).toLowerCase() + w.slice(1)
      )
      .join(' ')
  const joinNames = (items) => {
    const names = items.map((i) => soften(i.name))
    if (names.length === 0) return ''
    if (names.length === 1) return names[0]
    return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1]
  }
  const base = picked(tab.groups[0].id)[0]
  const bread = picked(tab.groups[1].id)[0]
  const topGroup = tab.groups[2]
  const tops = picked(topGroup.id)
  const sauces = picked('sauce')
  const extras = picked('extras')
  return { base, bread, tops, sauces, extras, joinNames }
}

function computeTotal(tab, sel) {
  let total = 0
  for (const group of tab.groups) {
    for (const item of group.items) {
      if (sel[tab.id][group.id]?.includes(item.id)) total += item.price
    }
  }
  return total
}

function Builder({ reduced }) {
  const [activeTabId, setActiveTabId] = useState(BIZ.builder.tabs[0].id)
  const [sel, setSel] = useState(defaultSelections)
  const sectionRef = useRef(null)
  const [barVisible, setBarVisible] = useState(false)
  const [armed, setArmed] = useState(false)
  const [filmCue, setFilmCue] = useState(null)
  const soundMuteUntil = useRef(0)
  const tabRefs = useRef({})

  const tab = BIZ.builder.tabs.find((t) => t.id === activeTabId)
  const layers = useMemo(() => deriveLayers(tab, sel), [tab, sel])
  const total = useMemo(() => computeTotal(tab, sel), [tab, sel])
  const summary = buildSummary(tab, sel)

  const toggle = (group, item) => {
    const cur = sel[activeTabId][group.id] || []
    // Selecting anything new plays its film; re-tapping a selected pick-one
    // item replays it (tapping a selected topping still deselects, no film).
    const selecting =
      !cur.includes(item.id) || (group.pick === 'one' && cur.includes(item.id))

    if (selecting && item.layer && !reduced) {
      const meatGroup = tab.groups[0]
      const meatItem = meatGroup.items.find((i) =>
        sel[activeTabId][meatGroup.id]?.includes(i.id)
      )
      const key = clipKeyFor(item.layer, meatItem?.layer)
      const clip = key && CLIPS[key]
      if (clip) {
        soundMuteUntil.current = performance.now() + 4000
        setFilmCue({ src: clip.src, nonce: Date.now() })
      }
    }

    setSel((prev) => {
      const c = prev[activeTabId][group.id] || []
      let next
      if (group.pick === 'one') {
        if (c.includes(item.id)) return prev
        next = [item.id]
      } else {
        next = c.includes(item.id) ? c.filter((x) => x !== item.id) : [...c, item.id]
      }
      return {
        ...prev,
        [activeTabId]: { ...prev[activeTabId], [group.id]: next },
      }
    })
  }

  const finale = FINALES[activeTabId]
  const wrapIt = () => {
    if (!finale || reduced) return
    soundMuteUntil.current = performance.now() + 9000
    setFilmCue({ src: finale.src, startAt: finale.startAt, hold: true, nonce: Date.now() })
  }

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setBarVisible(e.isIntersecting), {
      rootMargin: '-80px 0px -40px 0px',
    })
    io.observe(sectionRef.current)
    // Arm the stack the first time the builder comes into view, so the
    // intro cascade plays in front of the user, not on page load.
    const arm = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setArmed(true)
          arm.disconnect()
        }
      },
      { rootMargin: '0px 0px -15% 0px' }
    )
    arm.observe(sectionRef.current)
    return () => {
      io.disconnect()
      arm.disconnect()
    }
  }, [])

  const onTabKey = (e) => {
    const ids = BIZ.builder.tabs.map((t) => t.id)
    const idx = ids.indexOf(activeTabId)
    let next = null
    if (e.key === 'ArrowRight') next = ids[(idx + 1) % ids.length]
    if (e.key === 'ArrowLeft') next = ids[(idx - 1 + ids.length) % ids.length]
    if (next) {
      e.preventDefault()
      setActiveTabId(next)
      tabRefs.current[next]?.focus()
    }
  }

  return (
    <section
      className="builder"
      id="builder"
      aria-labelledby="builder-title"
      ref={sectionRef}
      onPointerDown={primeAudio}
    >
      <div className="builder-head">
        <h2 className="display builder-title" id="builder-title">
          Build it. <em>Watch the price.</em>
        </h2>
        <p className="builder-sub">
          Pick your meat, stack it how you want it, ring it through. What you see is what lands in
          the wrap.
        </p>
      </div>

      <div className="builder-grid">
        <div>
          <div className="tabs" role="tablist" aria-label="Kebabs or burgers">
            {BIZ.builder.tabs.map((t) => (
              <button
                key={t.id}
                ref={(el) => (tabRefs.current[t.id] = el)}
                className="tab"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={t.id === activeTabId}
                aria-controls={`panel-${t.id}`}
                tabIndex={t.id === activeTabId ? 0 : -1}
                onKeyDown={onTabKey}
                onClick={() => {
                  setActiveTabId(t.id)
                  setFilmCue(null)
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`}>
            {tab.groups.map((group) => (
              <fieldset className="group" key={group.id} style={{ border: 0 }}>
                <legend className="group-label">{group.label}</legend>
                <div className="opts">
                  {group.items.map((item) => {
                    const on = sel[activeTabId][group.id]?.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        className="opt"
                        aria-pressed={on}
                        onClick={() => toggle(group, item)}
                      >
                        {item.name}
                        <span className="p">
                          {item.price === 0 ? 'free' : `+${gbp(item.price).replace('.00', '')}`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        <div className="viz-wrap">
          <Stack
            key={activeTabId}
            layers={layers}
            reduced={reduced}
            armed={armed}
            filmCue={filmCue}
            soundMuteUntil={soundMuteUntil}
          />
          <div className="summary">
            <div className="summary-row">
              <div>
                <p className="summary-label">Your total</p>
                <AnimatedPrice value={total} className="summary-total" reduced={reduced} />
              </div>
            </div>
            <p className="summary-text" aria-live="polite">
              {summary.base ? (
                <>
                  <strong>{summary.base.name}</strong>
                  {summary.bread && <> on {summary.bread.name.toLowerCase()}</>}
                  {summary.tops.length > 0 && <> with {summary.joinNames(summary.tops)}</>}
                  {'. '}
                  {summary.sauces.length > 0 ? (
                    <>
                      {summary.joinNames(summary.sauces).replace(/^./, (c) => c.toUpperCase())}
                      {summary.joinNames(summary.sauces).includes('sauce') ? '' : ' sauce'}.{' '}
                    </>
                  ) : (
                    <span className="muted">No sauce — bold move. </span>
                  )}
                  {summary.extras.length > 0 && <>Plus {summary.joinNames(summary.extras)}.</>}
                </>
              ) : (
                <span className="muted">Pick a base to get going.</span>
              )}
            </p>
            {layers.some((l) => CLIPS[l.art]?.still) && (
              <div className="build-tiles" aria-hidden="true">
                {layers.map(
                  (l) =>
                    CLIPS[l.art]?.still && (
                      <img key={l.key} src={CLIPS[l.art].still} alt="" loading="lazy" />
                    )
                )}
              </div>
            )}
            {finale && !reduced && (
              <button className="wrap-btn" onClick={wrapIt}>
                Wrap it — watch it build
              </button>
            )}
            <a className="call-btn" href={BIZ.phoneHref}>
              Call it through <small>{BIZ.phone}</small>
            </a>
          </div>
        </div>
      </div>

      <div className={`sticky-bar${barVisible ? ' show' : ''}`} aria-hidden={!barVisible}>
        <div>
          <p className="lbl">Your total</p>
          <AnimatedPrice value={total} className="tot" reduced={reduced} />
        </div>
        <a href={BIZ.phoneHref} tabIndex={barVisible ? 0 : -1}>
          Call to order
        </a>
      </div>
    </section>
  )
}

/* ── Hero, ticker, info, footer ─────────────────────────────────────────── */

function Hero() {
  return (
    <header className="hero">
      {BIZ.heroVideoUrl ? (
        <video
          className="hero-media"
          src={BIZ.heroVideoUrl}
          poster={BIZ.heroPosterUrl || undefined}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      ) : BIZ.heroPosterUrl ? (
        <img className="hero-media" src={BIZ.heroPosterUrl} alt="" aria-hidden="true" />
      ) : (
        <div className="hero-fallback" aria-hidden="true">
          <div className="coal" />
          <div className="coal b" />
        </div>
      )}

      <div className="hero-top">
        <p className="mini display" aria-hidden="true">
          {BIZ.name.slice(0, 1)}
          <span>·</span>
        </p>
        <a className="phone" href={BIZ.phoneHref}>
          {BIZ.phone}
        </a>
      </div>

      <div className="hero-core">
        <p className="hero-kicker">
          Kebabs &amp; burgers · {BIZ.town} sea front
        </p>
        <h1 className="display hero-word">
          G<span className="o">O</span>USTO
        </h1>
        <p className="hero-strap">{BIZ.tagline}</p>
        <a className="hero-cta" href="#builder" onPointerDown={primeAudio}>
          Build yours
        </a>
      </div>

      <p className="hero-scrollcue" aria-hidden="true">
        Scroll
      </p>
    </header>
  )
}

function Ticker() {
  const chunk = (
    <div className="ticker-chunk" aria-hidden="true">
      {BIZ.ticker.map((t) => (
        <span key={t}>
          {t} <span className="dot"> ✦ </span>
        </span>
      ))}
    </div>
  )
  return (
    <div className="ticker" role="presentation">
      <div className="ticker-track">
        {chunk}
        {chunk}
      </div>
    </div>
  )
}

function InfoStrip() {
  return (
    <section className="info" aria-label="Opening hours and location">
      <div className="info-grid">
        <div>
          <h3>
            Open <span>late</span>
          </h3>
          <ul className="hours">
            {BIZ.hours.map((h) => (
              <li key={h.days}>
                <span>{h.days}</span>
                <span>{h.time}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>
            On the <span>front</span>
          </h3>
          <p>
            <strong>{BIZ.address}</strong>
            <br />
            Face the sea, follow the smell of the grill. You can't miss us.
          </p>
        </div>
        <div>
          <h3>
            Ring it <span>through</span>
          </h3>
          <p>Order ahead, skip the queue. Collection only.</p>
          <a className="big-phone display" href={BIZ.phoneHref}>
            {BIZ.phone}
          </a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <p className="wordmini">
        G<span>O</span>USTO
      </p>
      <p>
        {BIZ.town}, South Wales · Fresh cut daily · © {new Date().getFullYear()} {BIZ.name}
      </p>
    </footer>
  )
}

/* ── App ────────────────────────────────────────────────────────────────── */

export default function App() {
  const reduced = usePrefersReducedMotion()
  return (
    <>
      <EmberField reduced={reduced} />
      <div className="grain" aria-hidden="true" />
      <Hero />
      <Ticker />
      <main>
        <Builder reduced={reduced} />
      </main>
      <InfoStrip />
      <Footer />
    </>
  )
}
