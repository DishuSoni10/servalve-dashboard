/**
 * ServAlve — Client-Side Structural Forensic Engine
 * FileReader ArrayBuffer ingest → Latin-1 corpus → platform attribution lexicon.
 */

export const HARDWARE_SAFE_MARKERS = ['Exif', 'EXIF', 'JFIF', 'Apple', 'Samsung', 'Sony']

const CHATGPT_MARKERS = ['openai', 'dall-e', 'dalle', 'c2pa']
const GEMINI_MARKERS = ['google', 'synthid', 'imagen', 'gemini']
const CANVAS_MARKERS = ['html5canvas', 'canvas', 'claude', 'anthropic', 'software']
const MOBILE_EDITOR_MARKERS = [
  'canva',
  'picsart',
  'photoroom',
  'adobe_firefly',
  'adobediscovered',
]

export function bytesToLatin1Corpus(bytes) {
  let corpus = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    const slice = bytes.subarray(i, Math.min(i + 8192, bytes.length))
    for (let j = 0; j < slice.length; j++) corpus += String.fromCharCode(slice[j])
  }
  return corpus
}

export function materializeArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result)
      const binaryString = bytesToLatin1Corpus(bytes)
      resolve({ bytes, binaryString, lower: binaryString.toLowerCase(), byteLength: bytes.length })
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsArrayBuffer(file)
  })
}

export function probeSignature(corpus, lower, needle, label = needle) {
  const idx = lower.indexOf(needle.toLowerCase())
  if (idx === -1) return null
  const excerpt = corpus
    .substring(Math.max(0, idx - 10), Math.min(corpus.length, idx + needle.length + 20))
    .replace(/[^\x20-\x7E]/g, '.')
  return { signature: label, rawMatch: needle, byteOffset: idx, excerpt: `…${excerpt}…` }
}

function probeAll(corpus, lower, needles) {
  return needles.map((n) => probeSignature(corpus, lower, n)).filter(Boolean)
}

/**
 * ALGORITHM 1 — Consumer AI engine attribution (binary substring lexicon).
 */
export function runAIAttributionScan(corpus, lower, inject = {}) {
  const attributions = []
  const allHits = []

  const add = (platform, hits) => {
    if (!hits.length) return
    attributions.push({
      platform,
      matchedSignatures: hits.map((h) => h.signature),
    })
    allHits.push(...hits)
  }

  if (inject.forceOpenAI) {
    add('ChatGPT / DALL-E 3', [
      { signature: 'openai', rawMatch: 'openai', byteOffset: -1, excerpt: '[FORCE_OPENAI]' },
      { signature: 'c2pa', rawMatch: 'c2pa', byteOffset: -1, excerpt: '[FORCE_OPENAI]' },
    ])
  } else {
    const hits = probeAll(corpus, lower, CHATGPT_MARKERS)
    if (hits.length > 0) add('ChatGPT / DALL-E 3', hits)
  }

  if (inject.forceGemini) {
    add('Google Gemini', [
      { signature: 'synthid', rawMatch: 'synthid', byteOffset: -1, excerpt: '[FORCE_GEMINI]' },
      { signature: 'google', rawMatch: 'google', byteOffset: -1, excerpt: '[FORCE_GEMINI]' },
    ])
  } else if (!attributions.length) {
    const hits = probeAll(corpus, lower, GEMINI_MARKERS)
    const hasGoogle = lower.includes('google')
    const hasSynth = lower.includes('synthid') || lower.includes('imagen') || lower.includes('gemini')
    if (hits.length > 0 && (hasSynth || (hasGoogle && hits.length >= 2))) {
      add('Google Gemini', hits)
    }
  }

  if (!attributions.length) {
    const canvasHits = probeAll(corpus, lower, CANVAS_MARKERS)
    const flatCanvas =
      lower.includes('software') &&
      !HARDWARE_SAFE_MARKERS.some((m) => lower.includes(m.toLowerCase()))
    if (canvasHits.length > 0 || flatCanvas) {
      add(
        'Claude / Canvas Export',
        canvasHits.length
          ? canvasHits
          : [probeSignature(corpus, lower, 'software', 'flat canvas software header')].filter(Boolean),
      )
    }
  }

  if (!attributions.length) {
    const editorHits = probeAll(corpus, lower, MOBILE_EDITOR_MARKERS)
    if (editorHits.length > 0) add('Mobile AI Editor (Canva / Picsart / Firefly)', editorHits)
  }

  return {
    detected: attributions.length > 0,
    attributions,
    primaryPlatform: attributions[0]?.platform ?? 'None (Authentic File)',
    matchedSignatures: [...new Set(allHits.map((h) => h.signature))],
    hits: allHits,
  }
}

/** ALGORITHM 2 — Optical hardware / EXIF envelope validation. */
export function runHardwareValidation(lower, inject = {}) {
  if (inject.forceHardwarePass) {
    return {
      verified: true,
      status: 'Verified Camera Profile',
      detail: 'Diagnostic override: hardware envelope forced PASS',
      hits: ['Exif', 'Apple'],
      synthetic: false,
    }
  }
  if (inject.stripExif) {
    return {
      verified: false,
      status: 'Stripped / Synthetic Canvas Header',
      detail: 'Diagnostic: EXIF chain stripped — no sensor or lens ISP markers',
      hits: [],
      synthetic: true,
    }
  }
  const hits = HARDWARE_SAFE_MARKERS.filter((m) => lower.includes(m.toLowerCase()))
  const verified = hits.length >= 1
  if (!verified) {
    return {
      verified: false,
      status: 'Stripped / Synthetic Canvas Header',
      detail: 'No Exif/JFIF/Apple/Samsung/Sony markers — non-optical raster envelope',
      hits: [],
      synthetic: true,
    }
  }
  return {
    verified: true,
    status: 'Verified Camera Profile',
    detail: `Hardware markers: ${hits.join(', ')}`,
    hits,
    synthetic: false,
  }
}

/** ALGORITHM 3 — Courier delivery vs reference timestamp integrity. */
export function runChronologyCheck(courierIso, referenceIso, inject = {}) {
  if (inject.forceTimelineAnomaly) {
    return {
      aligned: false,
      anomaly: true,
      deltaMs: -3600000,
      detail: 'Diagnostic override: timeline anomaly forced',
    }
  }
  const delivery = new Date(courierIso).getTime()
  const reference = new Date(referenceIso).getTime()
  if (Number.isNaN(delivery) || Number.isNaN(reference)) {
    return { aligned: true, anomaly: false, deltaMs: null, detail: 'Awaiting valid timestamps' }
  }
  const deltaMs = reference - delivery
  const anomaly = reference < delivery
  return {
    aligned: !anomaly,
    anomaly,
    deltaMs,
    detail: anomaly
      ? 'Reference time precedes courier delivery — timeline anomaly'
      : `Chronology aligned (${formatDelta(deltaMs)} post-delivery)`,
  }
}

export function formatDelta(ms) {
  if (ms == null || Number.isNaN(ms)) return '—'
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3_600_000)
  const m = Math.floor((abs % 3_600_000) / 60_000)
  const s = Math.floor((abs % 60_000) / 1000)
  return `${ms < 0 ? '−' : '+'}${h}h ${m}m ${s}s`
}

export function* streamHexStructuralLog(bytes, maxLines = 32) {
  if (!bytes.length) {
    yield '00000000  (empty buffer)'
    return
  }
  const stride = Math.max(16, Math.floor(bytes.length / maxLines))
  for (let offset = 0, line = 0; offset < bytes.length && line < maxLines; offset += stride, line++) {
    const slice = bytes.subarray(offset, Math.min(offset + 16, bytes.length))
    const hex = [...slice].map((b) => b.toString(16).padStart(2, '0')).join(' ')
    const ascii = [...slice].map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('')
    yield `${offset.toString(16).padStart(8, '0')}  ${hex.padEnd(48)}  |${ascii}|`
  }
}

export async function executeForensicPipeline(file, ctx) {
  const corpus = await materializeArrayBuffer(file)
  const inject = {
    forceOpenAI: ctx.diagnosticInject?.forceOpenAI,
    forceGemini: ctx.diagnosticInject?.forceGemini,
    stripExif: ctx.diagnosticInject?.stripExif,
    forceHardwarePass: ctx.diagnosticInject?.forceHardwarePass,
    forceTimelineAnomaly: ctx.diagnosticInject?.forceTimelineAnomaly,
  }

  const ai = runAIAttributionScan(corpus.binaryString, corpus.lower, inject)
  const hardware = runHardwareValidation(corpus.lower, inject)
  const chrono = runChronologyCheck(ctx.courierTime, ctx.referenceTime, inject)

  const fitForRefund = !ai.detected && !hardware.synthetic && !chrono.anomaly

  return {
    corpus,
    ai,
    hardware,
    chrono,
    fitForRefund,
    finalStatus: fitForRefund ? 'FIT FOR REFUND' : 'NOT FIT FOR REFUND',
    attributedPlatform: ai.primaryPlatform,
    riskScore: fitForRefund ? 5 + Math.floor(Math.random() * 10) : 90 + Math.floor(Math.random() * 8),
  }
}
