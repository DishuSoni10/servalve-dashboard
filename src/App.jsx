/**
 * ServAlve — Enterprise Refund Integrity Dashboard
 * Single-surface React app · Tailwind CSS · Framer Motion viewport springs.
 * Forensic byte pipeline imported from ./forensics/engine.js (browser-native FileReader).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Fingerprint,
  Globe,
  Shield,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import {
  executeForensicPipeline,
  formatDelta,
  streamHexStructuralLog,
} from './forensics/engine.js'

const GITHUB = 'https://github.com/servalve/servalve-dashboard'
const MOCK_GPS = { lat: 37.774929, lng: -122.419418 }
const SPRING = { type: 'spring', stiffness: 100, damping: 20 }
const CARD = 'rounded-[24px] border border-[#E2E8F0] bg-white shadow-sm'

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function dtLocal(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function GitHubIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

/** Viewport scale spring — cards breathe in as they enter center frame */
function ScrollCard({ children, className = '' }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0.5 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: false, amount: 0.45, margin: '-8% 0px -8% 0px' }}
      transition={SPRING}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function RiskDial({ score, pass }) {
  const r = 58
  const circ = 2 * Math.PI * r
  const [v, setV] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(score))
    return () => cancelAnimationFrame(id)
  }, [score])
  const stroke = pass ? '#064E3B' : '#b45348'
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg className="-rotate-90" viewBox="0 0 128 128" width="100%" height="100%">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <motion.circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (v / 100) * circ }}
          transition={SPRING}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-semibold" style={{ color: stroke }}>
          {Math.round(v)}
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Risk Index
        </span>
      </div>
    </div>
  )
}

/** Decorative slow-scrolling hex heartbeat beside ingest pipeline */
function FloatingHexHud() {
  const [lines, setLines] = useState(() => Array.from({ length: 24 }, () => randomHexLine()))

  useEffect(() => {
    const id = setInterval(() => {
      setLines((prev) => [...prev.slice(-22), randomHexLine(), randomHexLine()])
    }, 420)
    return () => clearInterval(id)
  }, [])

  const doubled = [...lines, ...lines]

  return (
    <div className="pointer-events-none relative hidden h-full min-h-[320px] overflow-hidden rounded-[20px] border border-[#E2E8F0]/80 bg-white/40 backdrop-blur-sm lg:block">
      <div className="absolute inset-0 bg-gradient-to-b from-[#064E3B]/5 via-transparent to-[#10B981]/10" />
      <p className="relative z-10 border-b border-[#E2E8F0]/60 px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#064E3B]/70">
        Hex Viewport
      </p>
      <div className="relative h-[calc(100%-2.5rem)] overflow-hidden opacity-70">
        <div className="hex-scroll-inner font-mono text-[10px] leading-loose text-[#10B981]/80">
          {doubled.map((line, i) => (
            <div key={i} className="px-4 py-0.5">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function randomHexLine() {
  const off = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(8, '0')
  const bytes = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  ).join(' ')
  return `0x${off}  ${bytes}  · heartbeat`
}

function NetworkRibbon() {
  const metrics = [
    { label: 'Global Integrity', value: '99.98%', mono: true },
    { label: 'Average Latency', value: '142ms', mono: true },
    { label: 'AI Signatures Indexed', value: '14,204', mono: true },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.05 }}
      className="border-b border-[#E2E8F0] bg-white/90"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-12 py-4">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#064E3B]">
          Network Status
        </span>
        <div className="flex flex-wrap gap-10">
          {metrics.map((m) => (
            <div key={m.label} className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">{m.label}</p>
              <p className="font-mono text-sm font-semibold text-[#064E3B]">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function App() {
  const [orderId, setOrderId] = useState('ORD-2026-88421')
  const [deliveryTime, setDeliveryTime] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() - 2)
    return dtLocal(d)
  })
  const [referenceTime, setReferenceTime] = useState(() => dtLocal())
  const [deviceId] = useState(uuid)
  const [gps, setGps] = useState({ ...MOCK_GPS, live: false })

  const [diag, setDiag] = useState({
    forceChatGPT: false,
    forceGemini: false,
    forceHardwarePass: false,
    forceTimelineAnomaly: false,
  })
  const [modalOpen, setModalOpen] = useState(false)

  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState(null)
  const [report, setReport] = useState(null)
  const [logs, setLogs] = useState([])
  const [drag, setDrag] = useState(false)

  const fileRef = useRef(null)
  const logEnd = useRef(null)

  const log = useCallback((line) => setLogs((p) => [...p.slice(-100), line]), [])

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, live: true })
        log(`[GPS] WGS84 ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`)
      },
      () => log('[GPS] mock fallback coordinates'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [log])

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const diagnosticInject = {
    forceOpenAI: diag.forceChatGPT,
    forceGemini: diag.forceGemini,
    forceHardwarePass: diag.forceHardwarePass,
    forceTimelineAnomaly: diag.forceTimelineAnomaly,
    stripExif: false,
  }

  const analyze = async (file) => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
    setReport(null)
    setLogs([])
    setScanning(true)
    log(`[INGEST] ${file.name}`)
    log('[SYS] FileReader.readAsArrayBuffer')

    const result = await executeForensicPipeline(file, {
      courierTime: deliveryTime,
      referenceTime,
      diagnosticInject,
    })

    for (const line of streamHexStructuralLog(result.corpus.bytes)) {
      log(line)
      await new Promise((r) => setTimeout(r, 20))
    }
    result.ai.hits.forEach((h) =>
      log(`[MATCH] ${h.signature} @ 0x${h.byteOffset >= 0 ? h.byteOffset.toString(16) : 'diag'}`),
    )
    log(`[VERDICT] ${result.finalStatus}`)
    setReport(result)
    setScanning(false)
  }

  const input =
    'mt-3 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAF9] px-4 py-3.5 text-sm shadow-inner outline-none focus:border-[#10B981]/50 focus:ring-2 focus:ring-[#10B981]/15'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAF9' }}>
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-12 py-8">
          <button type="button" onClick={() => setModalOpen(true)} className="text-left">
            <h1
              className="font-serif font-bold leading-none text-[#064E3B]"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '48px',
              }}
            >
              ServAlve
            </h1>
            <p
              className="mt-3 max-w-xl font-sans text-[#6B7280]"
              style={{ fontSize: '16px', letterSpacing: '0.1em' }}
            >
              From Upload to Approval — Seeing truth in every transaction
            </p>
          </button>
          <button
            type="button"
            onClick={() => window.open(GITHUB, '_blank', 'noopener,noreferrer')}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E2E8F0] text-[#064E3B] shadow-sm transition hover:border-[#10B981]/40 hover:shadow-md"
            aria-label="GitHub"
          >
            <GitHubIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <NetworkRibbon />

      <div className="mx-auto max-w-7xl space-y-12 p-12">
        {/* Section 1 */}
        <div className="grid gap-12 lg:grid-cols-2">
          <ScrollCard className={`${CARD} p-10`}>
            <h2
              className="font-serif text-xl font-bold text-[#064E3B]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Merchant Intel
            </h2>
            <div className="mt-10 space-y-10">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                  Order ID
                </span>
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className={`${input} font-mono`}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                  Courier Delivery Time
                </span>
                <input
                  type="datetime-local"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className={`${input} font-mono`}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                  Photo Reference Time
                </span>
                <input
                  type="datetime-local"
                  value={referenceTime}
                  onChange={(e) => setReferenceTime(e.target.value)}
                  className={`${input} font-mono`}
                />
              </label>
            </div>
          </ScrollCard>

          <ScrollCard className={`${CARD} p-10`}>
            <h2
              className="font-serif text-xl font-bold text-[#064E3B]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Telemetry Sync
            </h2>
            <div className="mt-10 space-y-10">
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAF9] p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Device ID</p>
                <p className="mt-4 font-mono text-sm text-[#064E3B]">{deviceId}</p>
              </div>
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAF9] p-6">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    <Globe className="h-4 w-4 text-[#10B981]" />
                    Live GPS Sync
                  </span>
                  <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1">
                    <span className="gps-beacon h-2 w-2 rounded-full bg-[#10B981]" />
                    <span className="text-[11px] font-semibold text-[#064E3B]">Telemetry Active</span>
                  </span>
                </div>
                <p className="mt-4 font-mono text-sm text-slate-700">
                  {gps.lat.toFixed(6)}°, {gps.lng.toFixed(6)}°
                </p>
              </div>
            </div>
          </ScrollCard>
        </div>

        {/* Section 2 — Evidence Ingestion + Hex HUD */}
        <ScrollCard className={`${CARD} p-10`}>
          <h2
            className="font-serif text-xl font-bold text-[#064E3B]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Evidence Ingestion Pipeline
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">ArrayBuffer structural indexer with live hex heartbeat</p>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
            <div
              className={`relative min-h-[300px] overflow-hidden rounded-[20px] border-2 border-dashed transition ${
                drag ? 'border-[#10B981] bg-emerald-50/40' : 'border-[#E2E8F0] bg-[#F8FAF9]'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                const f = e.dataTransfer.files?.[0]
                if (f) analyze(f)
              }}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) analyze(f)
                  e.target.value = ''
                }}
              />
              {preview ? (
                <div className="relative flex min-h-[300px] items-center justify-center p-6">
                  <img src={preview} alt="" className="max-h-[280px] object-contain" />
                  {scanning && (
                    <div className="pointer-events-none absolute inset-0 bg-[#10B981]/10">
                      <div className="holo-beam-thick absolute left-0 right-0 bg-gradient-to-r from-transparent via-[#10B981] to-transparent" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center gap-4">
                  <Upload className="h-10 w-10 text-[#10B981]" />
                  <p className="font-medium text-[#064E3B]">Drop evidence or click to ingest</p>
                  <p className="font-mono text-xs text-[#6B7280]">openai · synthid · canva · Exif</p>
                </div>
              )}
            </div>
            <FloatingHexHud />
          </div>
        </ScrollCard>

        {/* Section 3 */}
        <div className="grid gap-12 lg:grid-cols-2">
          <ScrollCard>
            <article
              className={`${CARD} p-10 ${report?.fitForRefund ? 'verdict-pass-glow ring-1 ring-[#10B981]/25' : ''}`}
            >
              <h2
                className="font-serif text-xl font-bold text-[#064E3B]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Integrity Report
              </h2>
              {!report ? (
                <div className="mt-16 py-16 text-center text-[#6B7280]">
                  <Fingerprint className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                  <p className="text-sm">Awaiting forensic adjudication</p>
                </div>
              ) : (
                <div className="mt-10 space-y-8">
                  <RiskDial score={report.riskScore} pass={report.fitForRefund} />
                  <p
                    className={`text-center text-sm font-bold ${report.fitForRefund ? 'text-[#064E3B]' : 'text-[#b45348]'}`}
                  >
                    {report.finalStatus}
                  </p>
                  <Badge
                    label="Hardware Metadata"
                    pass={report.hardware.verified}
                    text={report.hardware.status}
                    icon={Camera}
                  />
                  <Badge
                    label="Signature Engine"
                    pass={!report.ai.detected}
                    text={
                      report.ai.detected
                        ? `Fail — ${report.attributedPlatform}`
                        : 'Pass — No AI Provenance'
                    }
                    icon={Shield}
                  />
                  <Badge
                    label="Timeline Integrity"
                    pass={!report.chrono.anomaly}
                    text={report.chrono.anomaly ? 'Anomaly Detected' : 'Match'}
                    icon={Clock}
                    extra={
                      report.chrono.anomaly && (
                        <span className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Timeline Anomaly Detected
                        </span>
                      )
                    }
                  />
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAF9] p-5">
                    <p className="text-xs font-semibold uppercase text-[#6B7280]">Attributed AI Platform</p>
                    <p className="mt-2 font-mono text-sm text-[#064E3B]">{report.attributedPlatform}</p>
                  </div>
                </div>
              )}
            </article>
          </ScrollCard>

          <ScrollCard className={`${CARD} flex flex-col overflow-hidden p-0`}>
            <div className="border-b border-[#E2E8F0] px-10 py-8">
              <h2
                className="font-serif text-xl font-bold text-[#064E3B]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Binary Forensic Console
              </h2>
            </div>
            <pre className="min-h-[480px] flex-1 overflow-y-auto bg-[#1e293b] p-8 font-mono text-[11px] leading-relaxed text-[#10B981]">
              {logs.length === 0 ? (
                <span className="text-slate-500">{'// awaiting stream…'}</span>
              ) : (
                logs.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith('[MATCH]')
                        ? 'text-red-300'
                        : /^[0-9a-f]{8}\s/.test(line)
                          ? 'text-cyan-300/90'
                          : 'text-slate-400'
                    }
                  >
                    {line}
                  </div>
                ))
              )}
              <div ref={logEnd} />
            </pre>
          </ScrollCard>
        </div>
      </div>

      {/* Demo Override Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#064E3B]/20 p-6 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING}
            className="w-full max-w-md rounded-[24px] border border-[#E2E8F0] bg-white p-10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <h3
                className="font-serif text-xl font-bold text-[#064E3B]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Demo Override
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8 space-y-5">
              <DiagRow
                label="Force ChatGPT Attribution"
                checked={diag.forceChatGPT}
                onChange={(v) => setDiag((d) => ({ ...d, forceChatGPT: v }))}
              />
              <DiagRow
                label="Force Gemini Attribution"
                checked={diag.forceGemini}
                onChange={(v) => setDiag((d) => ({ ...d, forceGemini: v }))}
              />
              <DiagRow
                label="Force Hardware Pass"
                checked={diag.forceHardwarePass}
                onChange={(v) => setDiag((d) => ({ ...d, forceHardwarePass: v }))}
              />
              <DiagRow
                label="Force Timeline Anomaly"
                checked={diag.forceTimelineAnomaly}
                onChange={(v) => setDiag((d) => ({ ...d, forceTimelineAnomaly: v }))}
              />
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="mt-8 w-full rounded-xl bg-[#064E3B] py-3.5 text-sm font-semibold text-white hover:bg-[#047857]"
            >
              Apply &amp; Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function Badge({ label, pass, text, icon: Icon, extra }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${pass ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/40'}`}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">{label}</p>
      <div className="mt-3 flex gap-3">
        {pass ? (
          <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
        ) : (
          <XCircle className="h-5 w-5 text-[#b45348]" />
        )}
        <Icon className="h-4 w-4 text-slate-400" />
        <div>
          <p className={`text-sm font-semibold ${pass ? 'text-[#064E3B]' : 'text-[#9f2d2d]'}`}>{text}</p>
          {extra}
        </div>
      </div>
    </div>
  )
}

function DiagRow({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAF9] p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[#064E3B]"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}
