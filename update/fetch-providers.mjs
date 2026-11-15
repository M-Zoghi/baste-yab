#!/usr/bin/env node
/**
 * fetch-providers.mjs — refreshes src/data/providers/*.json
 *
 * Adapters:
 *  • samantel  — public API (verified 2026-11): POST /api/mediator/samantel/
 *    form-encoded `method=getpackagebyproduct&productId=1`; rial priceNoTax,
 *    verified price = priceNoTax × 1.1 (10% VAT added at the gateway).
 *  • aptel     — TWO parts (verified 2026-11-06/15, thanks to HAR captures):
 *    A) PUBLIC — GET https://www.aptel.ir/api/ep/query?scope=public — no
 *       login needed and reachable from outside Iran → auto-refreshes.
 *       Prices in RIAL (÷10 → toman, pre-tax). packageType: 1=internet,
 *       2=combo (voice+sms), 12=roaming (ترکیه/عراق). Same package is listed
 *       twice under two channel families (Azartel_* / AptelPrime_*) → deduped.
 *       `internetDescription` is authoritative for the volume
 *       (packageVolumne has at least one data bug: 200 MB listed as 200 000).
 *    B) PORTAL — «آپتل من» (my.aptel.ir → the Negintel ecare platform at
 *       services.negintel.com) needs a logged-in Bearer token → its
 *       «ویژه آپتل من» discount packs refresh ONLY from a HAR capture
 *       (QueryPackagesVGroupInfoByPlanId + QueryPromotionProducts are read;
 *       billing/inbox/telemetry in the same file are never touched):
 *         node update/fetch-providers.mjs --only aptel --input my.aptel.ir.har
 *       They live in `personalized.samples` (informational, shown next to the
 *       ranking — public prices are NOT personalized), and a www.aptel.ir HAR
 *       also feeds part A manually when the API is unreachable.
 *  • mci       — THREE sources, merged (shop + portal verified 2026-11-06/14
 *    from HAR captures; overlapping packs priced IDENTICALLY on both):
 *    A) SHOP — official MCI shop REST API:
 *       GET https://shop.mci.ir/api/search/v1/products?category=19&page=N&size=16
 *       (paginated until isLast). JSON, no login. 48 products vs the marketing
 *       page's 30 — includes انارستان, combo and صبحانت packs the portal
 *       doesn't list. `price` is RIAL pre-tax (÷10 → toman; cross-checked
 *       identical to the mci.ir catalog); the SPA cart charges
 *       `discountPrice ?? price` (verified in main-*.js) and the app config
 *       states taxPercentage=10. Volume attribute «حجم» is MB. PURCHASABILITY:
 *       only productStatus === "ACTIVE" items are sold; anything else goes to
 *       `excluded`. needToLogin="true" packs stay ranked with a note.
 *       GEO-BLOCKED outside Iran → refresh manually: save the HAR (or the
 *       paginated JSON) and run
 *         node update/fetch-providers.mjs --only mci --input <file.har|products.json>
 *       A fresh shop capture (≤14 days) always beats the fallback below.
 *    B) PORTAL — my.mci.ir («همراه‌من») customer catalog, MERGED into mci.json
 *       (adds ~19 shop-absent packs: روبیکا, نامحدود/FUP, آی‌نو, ۶-to-۱۲
 *       windows, بلندمدت, همه‌چیزتمام) and into a NEW mci-modem.json (8
 *       data-SIM packs, like rightel-tdlte). NO LOGIN EXISTS ON THE WIRE: the
 *       2026-11-14 logged-in HAR (313 entries) shows the browser sends NO
 *       Authorization header and NO cookie to any my.mci.ir endpoint — only
 *       `version` + `platform` custom headers. The catalog personalizes
 *       solely via the ?phoneNumber= query parameter:
 *         GET https://my.mci.ir/api/unit/v1/customer/units/normal/internet
 *         GET https://my.mci.ir/api/unit/v1/customer/units/normal/modem_bundle
 *       Responses carry ZERO personal data (verified: no msisdn/balance/name
 *       fields — pure catalog), so the phone number is the only personal bit:
 *       it is read from the MCI_PHONE env var or the gitignored
 *       update/my.mci.txt (never a CLI arg, never logged, never committed).
 *       Usage-personalized sections (madaar_firoozeyi «پیشنهادی», fandom
 *       «همراهی» — their own rules say «پیشنهادی به مشترکین بنا به الگوی
 *       مصرف») are SKIPPED. Prices RIAL pre-tax (price × 1.1 = taxAmount);
 *       volume/duration parse from the Persian offer name («سی روزه» = 30d).
 *       GEO-BLOCKED outside Iran → refresh from Iran (phone config) or via
 *       --input with a my.mci.ir HAR (works from anywhere).
 *       Portal-only packs (offered by the portal but NOT by shop.mci.ir) are
 *       stamped portalOnly:true + buyUrl → the همراه من packages page, so the
 *       site can label them «فروش فقط از اپ همراه من / my.mci.ir» — the web
 *       shop cannot sell them. Modem packs are portal-only by definition.
 *    C) FALLBACK — mci.ir/internet-plans marketing page (reachable outside
 *       Iran, auto-refreshes daily): server-side .package-list-item cards,
 *       prices in TOMAN pre-tax, purchasability = خرید آنلاین button carries a
 *       data-package-code (dead listings keep a disabled button → excluded).
 *       Bootstrap only: fires when no shop capture exists at all (or the shop
 *       capture is >14 days old); portal packs always ride along on top.
 *  • irancell  — TWO public catalog JSONs (no login, prices in TOMAN pre-tax;
 *    the page's own modal computes total = price × 1.1 from vat_percentage=0.1):
 *      mobile  GET https://irancell.ir/e/products/5e16bf95d11fd7209ba56b20
 *      TD-LTE  GET https://irancell.ir/e/products/5e16bfacd11fd7209ba56b22
 *    Both REACHABLE from GitHub Actions (user-verified 2026-11-15) → both
 *    auto-refresh daily. Spec buy_of_app="no" marks packs sold on the website
 *    only (not in the MyIrancell app) — kept in the ranking with a note.
 *    ON TOP of the mobile web catalog, the my.irancell.ir app/portal sells
 *    EXTRA packs (discounted ۲–۷صبح/۶–۱۲ windows, app-only sizes, hourly,
 *    فوتبالی پلاس, جونیور). Its catalog API needs a logged-in Bearer token
 *    (401 otherwise) → portal part refreshes from a HAR captured inside Iran:
 *      node update/fetch-providers.mjs --only irancell --input my.irancell.ir.har
 *    and portal-only packs (stamped portalOnly:true + buyUrl → my.irancell.ir)
 *    ride along on every automatic web refresh. The offers payload is a plain
 *    package catalog — no personal data is read or written from the HAR.
 *  • irancell-tdlte — the TD-LTE catalog above → irancell-tdlte.json
 *    (traffic spec is MB; «N مگابیت اقتصادی» speed plans report
 *    traffic="unlimited" but the desc HTML carries the true GB cap).
 *  • rightel   — portal API with an anonymous website token (verified from HAR
 *    captures 2026-11-07 AND 2026-11-14; payloads byte-identical — prices
 *    unchanged that week). package.rightel.ir/packagesList is an Angular SPA
 *    that first authenticates as the shared "website" user:
 *      POST https://portal-api.rightel.ir/user-management/api/v1/auth/authenticate
 *      body {"username":"website"} → {"data":{"token":"<JWT>"}}
 *    (JWT roles [Website], valid 24 h) and only then calls
 *      GET https://portal-api.rightel.ir/extra-package/api/v1/extra-package-direct/web-site/purchasable-package?d=<ms>
 *    with `Authorization: Bearer <token>`. The 2026-11-07 HAR export hid the
 *    header (Chrome strips Authorization on HAR export) so the first adapter
 *    called the API without it; the 2026-11-14 capture's OPTIONS preflight
 *    proves the GET asks for the `authorization` header — the adapter now
 *    reproduces the full two-step flow (with a no-token fallback in case the
 *    endpoint itself stays open). CORS *. `data[]` = 126 items in 7 channel
 *    categories: internet (72) → rightel.json; Modem (13, DATA sims) →
 *    rightel-tdlte.json; Hybrid «رایتا» (4) → mobile combos;
 *    Call/SMS/International/Roaming (37) have no data volume → excluded.
 *    Prices in RIAL pre-tax (÷10 → toman). Structured amounts
 *    (internetAmount …) are all null — volume/duration parse from the Persian
 *    name «N روزه/ماهه/ساله X گیگابایت/مگابایت».
 *    PURCHASABILITY: the endpoint returns only purchasable packages (all 126
 *    pass). POSTPAID/PREPAID twins are identical (the lone extra
 *    creditAmount=49000 on id 99 is never rendered by the SPA) → deduped to
 *    one card; time-window packs (۲–۷ صبح / ۶–۱۲) stay ranked with a note.
 *    GEO-BLOCKED outside Iran (verified: all *.rightel.ir hosts time out
 *    from outside) → refresh manually:
 *      node update/fetch-providers.mjs --only rightel --input <file.har|data.json>
 *  • tci / asiatech — geo-blocked outside Iran or login-gated;
 *    waiting for captures (see DATA.md).
 *
 * Usage: node update/fetch-providers.mjs [--only samantel]
 *        node update/fetch-providers.mjs --only aptel --input my.aptel.ir.har
 *          («آپتل من» portal samples from the HAR; the public catalog
 *           still live-fetches — a www.aptel.ir HAR feeds it too)
 *        node update/fetch-providers.mjs --only irancell --input my.irancell.ir.har
 *          [--fetched-at 2026-11-15T10:41:55Z]  (portal refresh from Iran;
 *           web part still live-fetches — or stale-keeps — automatically)
 *        node update/fetch-providers.mjs --only mci --input my.mci.ir.har
 *          (portal/shop HAR refresh — works from anywhere; the my.mci.ir
 *           phone number is only needed for LIVE fetches: MCI_PHONE env or
 *           update/my.mci.txt, gitignored, never committed)
 * Exit 0 even if some adapters fail (partial refresh is fine); failed
 * providers keep their previous file.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const DATA_DIR = path.join(ROOT, 'src', 'data', 'providers');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const iranOnly = process.argv.includes('--iran');
const IRAN_ONLY_IDS = new Set(['mci', 'irancell', 'rightel']);

const faDigits = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const enDigits = (s) => String(s ?? '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const round = (n) => Math.round(n);
const pct = (price, oldPrice) => (oldPrice && oldPrice > price ? round((1 - price / oldPrice) * 100) : null);

async function writeProvider(id, doc) {
  await mkdir(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, `${id}.json`);
  await writeFile(file, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
  const kinds = {};
  for (const p of doc.packages) kinds[p.kind ?? 'internet'] = (kinds[p.kind ?? 'internet'] || 0) + 1;
  console.log(`✓ ${id}: ${doc.packages.length} packages (${Object.entries(kinds).map(([k, v]) => `${k}:${v}`).join(', ')}) → ${path.relative(ROOT, file)}`);
}

async function keepExisting(id, reason) {
  try {
    const prev = JSON.parse(await readFile(path.join(DATA_DIR, `${id}.json`), 'utf-8'));
    console.log(`• ${id}: kept existing capture (${reason}) — ${prev.packages.length} packages`);
  } catch {
    console.log(`• ${id}: no data yet (${reason})`);
  }
}

/* ─────────── samantel ─────────── */
async function fetchSamantel() {
  const body = new URLSearchParams({ method: 'getpackagebyproduct', productId: '1' });
  const res = await fetch('https://payment.samantel.ir/api/mediator/samantel/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: 'https://payment.samantel.ir/package',
      'User-Agent': UA,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errCode !== 0 || !Array.isArray(json.result)) {
    throw new Error(`API errCode=${json.errCode} ${json.errDesc || ''}`);
  }
  const RIAL = 10;
  const packages = [];
  const excluded = [];
  for (const o of json.result) {
    const gb = (o.totaldata || 0) > 0 ? o.totaldata : (o.daydata || 0) + (o.nightdata || 0);
    const days = o.expireDay || 0;
    const price = (o.priceNoTax || 0) / RIAL;           // toman, pre-tax (as printed)
    const oldPrice = (o.oldPriceNoTax || 0) / RIAL;
    if (!(gb > 0) || !(days > 0) || !(price > 0)) {
      excluded.push({ title: o.OfferName || o.ussdName || o.id || '?', reason: 'بدون حجم داده یا قیمت' });
      continue;
    }
    const isRoaming = o.type === 'ROAMING';
    packages.push({
      id: String(o.OfferID ?? o.id),
      title: faDigits(o.OfferName || o.ussdName || `${gb} گیگ ${days} روزه`),
      kind: isRoaming ? 'roaming' : 'internet',
      gb, days, price,
      oldPrice: oldPrice > price ? round(oldPrice) : null,
      discountPct: pct(price, oldPrice),
      group: (o.groupName || '').replace(/ی /g, 'ی‌') || null, // «بسته‌های …»
      regulatoryCode: o.regulator || null,
      ussd: null,
      note: o.type === 'NIGHT' ? 'شبانه' : null,
    });
  }
  packages.sort((a, b) => (a.price / a.gb) - (b.price / b.gb));
  await writeProvider('samantel', {
    schema: 2,
    provider: {
      id: 'samantel', nameFa: 'سامانتل', nameEn: 'Samantel', category: 'mobile',
      tech: 'اپراتور مجازی · 4G/5G · TD-LTE', regions: ['سراسری'], accent: '#EA5B0C', site: 'https://samantel.ir',
      buyUrl: 'https://payment.samantel.ir/package',
    },
    source: { kind: 'api', endpoint: 'POST /api/mediator/samantel/ (getpackagebyproduct, productId=1)', fetchedAt: new Date().toISOString() },
    prices: { unit: 'toman', includesTax: false },
    packages, excluded,
  });
}

/* ─────────── aptel — public packages API (live/HAR) + «آپتل من» portal (HAR) ─────────── */
const APTEL_URL = 'https://www.aptel.ir/api/ep/query?scope=public';
const APTEL_STALE_DAYS = 14; // public API unreachable → keep the previous capture up to this age

/** "20 گیگابایت" / "500 مگابایت" (fa or en digits) → GB; null if unparseable. */
function aptelDescGB(desc) {
  const m = enDigits(desc).match(/([\d.]+)\s*(گیگابایت|گیگ|مگابایت|مگ)/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (!isFinite(v) || v <= 0) return null;
  return m[2].startsWith('گیگ') ? v : v / 1024;
}

/** Gregorian ISO date → Jalali «YYYY/MM/DD» (the site's own calendar — for
    the personalized.source line, matching the 2026-11-06 capture's format). */
function aptelJalali(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const gy = d.getUTCFullYear(); const gm = d.getUTCMonth() + 1; const gd = d.getUTCDate();
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
    + Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053); days %= 12053;
  jy += 4 * Math.floor(days / 1461); days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

/** One aptel item — the public API, the «آپتل من» catalog and the promotions
    all share this shape (the portal re-numbers packageId but carries the same
    fields). Returns the mapped record or null when volume/duration can't be
    parsed. price is TOMAN; price 0 = free gift (portal only, never public). */
function aptelMapItem(it) {
  const title = String(it.packageName || '').replace(/\s+/g, ' ').trim();
  // volume: description is authoritative (packageVolumne has a 200MB→200000 bug)
  let gb = aptelDescGB(it.internetDescription || '');
  const fieldGB = Number(it.packageVolumne) > 0 ? Number(it.packageVolumne) / 1024 : null;
  if (gb == null) gb = fieldGB;
  let days = parseInt(enDigits(it.packageInitialDeltaDays), 10);
  if (!Number.isFinite(days) || days <= 0) {
    const m = enDigits(title).match(/(\d+)\s*روزه/);
    days = m ? parseInt(m[1], 10) : 0;
  }
  const price = round((Number(it.packagePrice) || 0) / 10); // rial → toman, pre-tax
  if (!(gb > 0) || !(days > 0)) return null;
  const kind = it.packageType === 2 ? 'combo' : it.packageType === 12 ? 'roaming' : 'internet';
  const oldPrice = Number(it.showBeforePrice) > 0 ? round(Number(it.showBeforePrice) / 10) : null;
  let note = null;
  if (kind === 'combo') {
    const min = enDigits(it.voiceCallOutDoorDescription || '').trim();
    const sms = enDigits(String(it.smsCount ?? '')).trim() || enDigits((it.smsDescription || '').replace(/\s*عدد/, '')).trim();
    note = `ترکیبی: ${faDigits(min || '۰')} تماس + ${faDigits(sms || '۰')} پیامک`;
  } else if (kind === 'roaming') {
    const dest = /ترکیه/.test(title) ? 'ترکیه' : /عراق/.test(title) ? 'عراق' : 'بین‌الملل';
    note = `رومینگ ${dest}`;
  }
  return {
    id: `aptel-${it.packageId}`,
    title: faDigits(title),
    rawTitle: title,
    kind, gb: Math.round(gb * 10000) / 10000, days, price,
    oldPrice,
    discountPct: oldPrice ? pct(price, oldPrice) : null,
    isGift: it.isGift === true || price === 0,
    note,
  };
}

/** public items → { packages, excluded } (Azartel_* / AptelPrime_* channel-twin
    dedupe — exactly the pre-2026-11-16 ranking behavior) */
function aptelPublicPacks(items) {
  const packages = [];
  const excluded = [];
  const seen = new Set(); // dedupe Azartel_*/AptelPrime_* channel twins
  for (const it of items) {
    const p = aptelMapItem(it);
    if (!p) {
      excluded.push({ title: String(it.packageName || '').replace(/\s+/g, ' ').trim() || it.packageCode || '?', reason: 'حجم یا مدت نامشخص' });
      continue;
    }
    if (p.price <= 0) { excluded.push({ title: p.rawTitle, reason: 'قیمت صفر یا نامشخص' }); continue; }
    const key = `${p.kind}|${p.gb.toFixed(4)}|${p.days}|${p.price}|${p.rawTitle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    packages.push({
      id: p.id,
      title: p.title,
      kind: p.kind,
      gb: p.gb,
      days: p.days,
      price: p.price,
      oldPrice: p.oldPrice,
      discountPct: p.discountPct,
      group: null,
      regulatoryCode: it.craCode ? String(it.craCode) : null,
      ussd: it.ussd || null,
      note: p.note,
    });
  }
  packages.sort((a, b) => (a.price / a.gb) - (b.price / b.gb));
  return { packages, excluded };
}

/** live public catalog (first page + pagination) */
async function aptelPublicItems() {
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'x-session-scope': 'site',
    Referer: 'https://www.aptel.ir/packages',
    'User-Agent': UA,
  };
  const first = await fetch(APTEL_URL, { headers, signal: AbortSignal.timeout(20000) });
  if (!first.ok) throw new Error(`HTTP ${first.status}`);
  const firstJson = await first.json();
  if (!firstJson?.ok || !Array.isArray(firstJson?.result?.items)) {
    throw new Error(`API ok=${firstJson?.ok}`);
  }
  const items = [...firstJson.result.items];
  const totalPages = Number(firstJson.result.pagination?.totalpages ?? 1);
  for (let page = 1; page < totalPages; page++) { // future-proof: >300 packages
    const r = await fetch(`${APTEL_URL}&page=${page}`, { headers, signal: AbortSignal.timeout(20000) });
    if (!r.ok) break;
    const j = await r.json();
    if (!j?.ok || !Array.isArray(j?.result?.items)) break;
    items.push(...j.result.items);
  }
  return items;
}

/** «آپتل من» portal — the my.aptel.ir web app talks to the Negintel ecare
    platform (services.negintel.com) with a logged-in Bearer token, so this
    part refreshes ONLY from a HAR capture. Just the two package catalogs are
    read (QueryPackagesVGroupInfoByPlanId + QueryPromotionProducts — each pack
    is listed under 2 product groups, deduped by packageId); billing, inbox
    and telemetry requests in the same HAR are never touched, and no personal
    data from the capture is written. Origin/Referer, when present, must point
    at aptel — the same platform also serves other MVNO portals. */
function aptelPortalFromHar(raw) {
  if (!raw?.log?.entries) throw new Error('not a HAR');
  const catalog = new Map(); // packageId → item
  const promos = new Map();  // packageId → item
  let capturedAt = null;
  for (const e of raw.log.entries) {
    const url = String(e.request?.url || '');
    if (!url.includes('QueryPackagesVGroupInfoByPlanId') && !url.includes('QueryPromotionProducts')) continue;
    if ((e.response?.status || 0) !== 200) continue;
    let host = '';
    try { host = new URL(url).host.toLowerCase(); } catch { continue; }
    if (host !== 'services.negintel.com' && !host.endsWith('.negintel.com')) continue;
    const hs = e.request?.headers || [];
    const org = String(hs.find((h) => /^origin$/i.test(h.name || ''))?.value || '');
    const ref = String(hs.find((h) => /^referer$/i.test(h.name || ''))?.value || '');
    const brand = `${org} ${ref}`.toLowerCase();
    if (brand && !/aptel\.ir/.test(brand)) continue; // another MVNO's portal on the same platform
    let text = e.response.content?.text || '';
    if (!text) continue; // the browser logs the same call twice — keep the one with a body
    if (e.response.content.encoding === 'base64') text = Buffer.from(text, 'base64').toString('utf8');
    let d = null;
    try { d = JSON.parse(text); } catch { continue; }
    if (!Array.isArray(d?.Result)) continue;
    const into = url.includes('QueryPromotionProducts') ? promos : catalog;
    for (const it of d.Result) if (it?.packageId != null && !into.has(it.packageId)) into.set(it.packageId, it);
    const t = Date.parse(e.startedDateTime || '');
    if (Number.isFinite(t) && (capturedAt === null || t > capturedAt)) capturedAt = t;
  }
  if (!catalog.size && !promos.size) {
    throw new Error('no QueryPackagesVGroupInfoByPlanId / QueryPromotionProducts responses found in HAR');
  }
  return { catalog: [...catalog.values()], promos: [...promos.values()], fetchedAt: capturedAt ? new Date(capturedAt).toISOString() : null };
}

/** portal catalog + promotions → the informational `personalized` samples.
    Logged-in-only deals are NOT in the public API. Two kinds, exactly like
    the hand-curated 2026-11-06 list, but now derived from the capture:
    • «ویژه آپتل من» promo packs (strike-through original price + discount badge)
    • plain-looking packs that are simply cheaper than the public catalog
      (e.g. the AptelPrime «۱۰ گیگ ۳۰ روزه» that actually grants 20 GB at
      80,000 — the public 20GB/30d costs 170,000)
    Plus the free install gift (price 0). Packs the public list already sells
    at the same kind/gb/days/price are the same product renumbered and are NOT
    repeated (the portal re-numbers every packageId). The UI shows the samples
    next to the public ranking instead of mixing them into it — public prices
    are NOT personalized. */
function aptelPersonalizedFromPortal(portal, publicPackages) {
  const publicSpecs = new Set(publicPackages.map((p) => `${p.kind}|${p.gb}|${p.days}|${p.price}`));
  const samples = [];
  const seen = new Set();
  const push = (s) => { if (!seen.has(s.title)) { seen.add(s.title); samples.push(s); } };
  const noPublicTwin = (p) => !publicSpecs.has(`${p.kind}|${p.gb}|${p.days}|${p.price}`);
  const titleGb = (t) => { const m = enDigits(t).match(/(\d+(?:\.\d+)?)\s*گیگ/); return m ? parseFloat(m[1]) : null; };

  /* 1) «ویژه آپتل من» discount packs — portal catalog, no public twin */
  const special = [];
  for (const it of portal.catalog) {
    const p = aptelMapItem(it);
    if (!p || p.isGift || p.price <= 0 || !noPublicTwin(p)) continue;
    special.push(p);
  }
  special.sort((a, b) => b.gb - a.gb);
  for (const p of special) {
    push({ title: p.title, gb: p.gb, days: p.days, price: p.price, oldPrice: p.oldPrice, discountPct: p.discountPct });
  }

  /* 2) buyable portal-only promotions — keep the portal's wording, append the
        real volume when the title's «N گیگ» disagrees with the actual grant */
  for (const it of portal.promos) {
    const p = aptelMapItem(it);
    if (!p || p.isGift || p.price <= 0 || !noPublicTwin(p)) continue;
    const tg = titleGb(p.rawTitle);
    const title = tg != null && Math.abs(tg - p.gb) / Math.max(tg, p.gb) > 0.05
      ? `${p.title} (${faDigits(String(p.gb))} گیگ واقعی)`
      : p.title;
    push({ title: `${title} · فقط پنل مشترکین`, gb: p.gb, days: p.days, price: p.price, oldPrice: p.oldPrice, discountPct: p.discountPct });
  }

  /* 3) free install gifts (price 0, with a data volume — the 60-minute voice
        gift carries no volume and stays out) */
  for (const it of [...portal.catalog, ...portal.promos]) {
    const p = aptelMapItem(it);
    if (!p || !p.isGift || p.gb <= 0) continue;
    push({ title: p.title, gb: p.gb, days: p.days, price: 0, oldPrice: null, discountPct: null });
  }

  const capturedAt = portal.fetchedAt || new Date().toISOString();
  return {
    applies: true,
    note: 'قیمت‌های فهرست بالا عمومی است (بدون ورود). با ورود به «آپتل من»، بسته‌های ویژه‌ی ۳۰ روزه با تخفیف، هدیه‌ی نصب و حتی نسخه‌های ارزان‌تر بعضی بسته‌های معمولی (مثل ۲۰ گیگ ۸۰٬۰۰۰ به‌جای ۱۷۰٬۰۰۰) نمایش داده می‌شود.',
    source: `ضمیمه‌ی پنل مشترکین my.aptel.ir — برداشت ${faDigits(aptelJalali(capturedAt))} (${capturedAt.slice(0, 10)})`,
    capturedAt,
    samples,
  };
}

/* built-in fallback — used only before the first my.aptel.ir HAR lands;
   values hand-checked against the 2026-11-15 portal capture */
const APTEL_FALLBACK_PERSONALIZED = {
  applies: true,
  note: 'قیمت‌های فهرست بالا عمومی است (بدون ورود). با ورود به «آپتل من»، بسته‌های ویژه‌ی ۳۰ روزه با تخفیف، هدیه‌ی نصب و حتی نسخه‌های ارزان‌تر بعضی بسته‌های معمولی (مثل ۲۰ گیگ ۸۰٬۰۰۰ به‌جای ۱۷۰٬۰۰۰) نمایش داده می‌شود.',
  source: 'ضمیمه‌ی پنل مشترکین my.aptel.ir — برداشت ۱۴۰۵/۰۸/۲۴ (2026-11-15)',
  capturedAt: '2026-11-15T19:23:21.934Z',
  samples: [
    { title: 'ویژه آپتل من (۱۰۰ گیگ ۳۰ روزه)', gb: 100, days: 30, price: 600000, oldPrice: 850000, discountPct: 29 },
    { title: 'ویژه آپتل من (۵۰ گیگ ۳۰ روزه)', gb: 50, days: 30, price: 325000, oldPrice: 450000, discountPct: 28 },
    { title: 'ویژه آپتل من (۳۰ گیگ ۳۰ روزه)', gb: 30, days: 30, price: 210000, oldPrice: 270000, discountPct: 22 },
    { title: '۱۰ گیگ ۳۰ روزه (۲۰ گیگ واقعی) · فقط پنل مشترکین', gb: 20, days: 30, price: 80000, oldPrice: null, discountPct: null },
    { title: 'هدیه نصب آپتل من (۵ گیگ ۷ روزه)', gb: 5, days: 7, price: 0, oldPrice: null, discountPct: null },
  ],
};

async function fetchAptel() {
  const argv = process.argv;
  const inputIdx = argv.indexOf('--input');
  const inputPath = inputIdx !== -1 && argv[inputIdx + 1] ? argv[inputIdx + 1] : null;
  let inputRaw = null;
  if (inputPath) inputRaw = JSON.parse(await readFile(path.resolve(ROOT, inputPath), 'utf-8'));

  /* previous capture — the «آپتل من» samples ride along on every public refresh */
  let prev = null;
  try { prev = JSON.parse(await readFile(path.join(DATA_DIR, 'aptel.json'), 'utf-8')); } catch { /* none */ }
  const prevPortalMeta = prev?.source?.parts?.portal ?? null;

  /* input triage: a www.aptel.ir HAR (public catalog), a my.aptel.ir HAR
     («آپتل من» portal) or one file carrying both */
  let publicFromInput = null; // { items, fetchedAt }
  let portalFromInput = null; // { catalog, promos, fetchedAt }
  if (inputRaw) {
    if (!inputRaw?.log?.entries) throw new Error('unrecognized aptel --input (expected a HAR file)');
    const errs = [];
    try {
      const items = [];
      let ts = null;
      for (const e of inputRaw.log.entries) {
        const url = String(e.request?.url || '');
        if (!url.includes('/api/ep/query')) continue;
        if ((e.response?.status || 0) !== 200) continue;
        let text = e.response.content?.text || '';
        if (!text) continue;
        if (e.response.content.encoding === 'base64') text = Buffer.from(text, 'base64').toString('utf8');
        const d = JSON.parse(text);
        if (!d?.ok || !Array.isArray(d?.result?.items)) continue;
        items.push(...d.result.items);
        const t = Date.parse(e.startedDateTime || '');
        if (Number.isFinite(t) && (ts === null || t > ts)) ts = t;
      }
      if (!items.length) throw new Error('no /api/ep/query responses');
      publicFromInput = { items, fetchedAt: ts ? new Date(ts).toISOString() : new Date().toISOString() };
    } catch (e) { errs.push(`public: ${e.message}`); }
    try { portalFromInput = aptelPortalFromHar(inputRaw); } catch (e) { errs.push(`portal: ${e.message}`); }
    if (!publicFromInput && !portalFromInput) {
      // an explicit --input must not silently degrade to another source
      throw new Error(`--input matched no Aptel source (${errs.join(' · ')})`);
    }
  }

  /* public part: input → live → stale-keep (≤APTEL_STALE_DAYS) */
  let publicPart = null; // { kind, fetchedAt, packages, excluded }
  if (publicFromInput) {
    publicPart = { kind: 'api', fetchedAt: publicFromInput.fetchedAt, ...aptelPublicPacks(publicFromInput.items) };
    console.log(`• aptel: public catalog from the HAR capture (${publicPart.fetchedAt.slice(0, 10)}) — ${publicPart.packages.length} packages`);
  } else {
    try {
      publicPart = { kind: 'api', fetchedAt: new Date().toISOString(), ...aptelPublicPacks(await aptelPublicItems()) };
    } catch (e) {
      const prevPublicAt = prev?.source?.parts?.public?.fetchedAt || prev?.source?.fetchedAt || null;
      const ageDays = prevPublicAt ? (Date.now() - Date.parse(prevPublicAt)) / 86400000 : Infinity;
      if ((prev?.packages || []).length && Number.isFinite(ageDays) && ageDays <= APTEL_STALE_DAYS) {
        console.log(`• aptel: public API unreachable from here (${e.message}) — kept the ${prevPublicAt.slice(0, 10)} capture (${ageDays.toFixed(1)}d old ≤ ${APTEL_STALE_DAYS}d)`);
        publicPart = {
          kind: prev?.source?.parts?.public?.kind || prev?.source?.kind || 'api',
          fetchedAt: prevPublicAt,
          packages: prev.packages,
          excluded: prev.excluded || [],
        };
      } else {
        throw new Error(`public API unreachable (${e.message}) and no fresh capture to keep`);
      }
    }
  }

  /* portal part: input → keep previous samples (the API needs a logged-in token) */
  let personalized = null;
  if (portalFromInput) {
    personalized = aptelPersonalizedFromPortal(portalFromInput, publicPart.packages);
    if (!personalized.samples.length) throw new Error('portal HAR parsed but yielded no «آپتل من» samples');
    console.log(`• aptel: «آپتل من» samples from the HAR capture (${personalized.capturedAt.slice(0, 10)}) — ${personalized.samples.length} packs`);
  } else if (prev?.personalized?.samples?.length) {
    personalized = prev.personalized;
    const at = prevPortalMeta?.fetchedAt || prev.personalized.capturedAt || null;
    console.log(`• aptel: kept «آپتل من» portal capture${at ? ` from ${at.slice(0, 10)}` : ''} (portal API needs login — refresh with --input <my.aptel.ir.har>)`);
  } else {
    personalized = APTEL_FALLBACK_PERSONALIZED;
  }

  const portalAt = portalFromInput ? portalFromInput.fetchedAt : (prevPortalMeta?.fetchedAt || personalized.capturedAt || null);
  const fetchedAtAll = [publicPart.fetchedAt, portalAt].filter(Boolean).sort().pop();

  await writeProvider('aptel', {
    schema: 2,
    provider: {
      id: 'aptel', nameFa: 'آپتل', nameEn: 'Aptel', category: 'mobile',
      tech: 'اپراتور مجازی · 4G/5G (بستر ایرانسل/همراه اول)', regions: ['سراسری'],
      accent: '#db3328', site: 'https://www.aptel.ir', buyUrl: 'https://www.aptel.ir/packages',
    },
    source: {
      kind: publicPart.kind,
      endpoint: 'GET www.aptel.ir/api/ep/query?scope=public',
      fetchedAt: fetchedAtAll,
      parts: {
        public: {
          kind: publicPart.kind,
          endpoint: 'GET www.aptel.ir/api/ep/query?scope=public (کاتالوگ عمومی، بدون ورود)',
          fetchedAt: publicPart.fetchedAt,
        },
        ...(portalAt ? {
          portal: {
            kind: 'har',
            endpoint: 'پنل مشترکین «آپتل من» my.aptel.ir (services.negintel.com): QueryPackagesVGroupInfoByPlanId + QueryPromotionProducts — بسته‌های اختصاصی مشترکین؛ API نیازمند ورود، بروزرسانی فقط با HAR',
            fetchedAt: portalAt,
          },
        } : {}),
      },
    },
    prices: { unit: 'toman', includesTax: false, apiUnit: 'rial' },
    personalized,
    packages: publicPart.packages,
    excluded: publicPart.excluded,
  });
}

/* ─────────── mci — A) official shop REST API (primary) ─────────── */
/* shop.mci.ir/products/19/internet-package is an Angular SPA backed by
   GET /api/search/v1/products?category=19&page=N&size=16 (public, no login).
   Product schema (verified across all 48 items of a 2026-11-06 capture):
   • productStatus — "ACTIVE" iff purchasable; anything else is dead stock.
   • price — RIAL, pre-tax (10% VAT added at checkout per /api/config/v1/features).
     The SPA cart charges `discountPrice ?? price` (verified in main-*.js).
     NOTE: the «قیمت» attribute is a stale CMS artifact (one product carries 0,
     others disagree with the printed mci.ir catalog) — never use it.
   • attributes[] — «حجم» (MB), «بازه زمانی بسته» («120 روزه»), mainTag
     (General/Anarestan/BACK_TO_SCHOOL), mainInfo + additionalTag (NewCustomer),
     additionalInfo (usage window / combo minutes), needToLogin, rules (HTML
     with the 12-digit CRA regulatory code).
   The dead «۲ بامداد تا ۷ صبح سی‌روزه نامحدود» night pack is simply absent
   from this API — the shop only returns what it sells. */
const MCI_SHOP_API = 'https://shop.mci.ir/api/search/v1/products';
const MCI_SHOP_PAGE = 'https://shop.mci.ir/products/19/internet-package';
const MCI_SHOP_STALE_DAYS = 14; // a shop capture up to this age rides along; older regresses to the HTML page

const shopAttr = (p, title) => {
  const a = (p.attributes || []).find((x) => x.title === title);
  return a && a.attributeValueVms && a.attributeValueVms.length
    ? String(a.attributeValueVms[0].value ?? '')
    : '';
};

/** «120 روزه» → 120 */
const shopDays = (v) => parseInt(enDigits(v).replace(/[^\d]/g, ''), 10) || 0;

/** Shared MCI title pipeline (shop + portal): digit↔Persian binding so the
 *  same pack from either source yields an IDENTICAL string — that equality
 *  is the merge dedup key. Also strips the «(ویژه مشترکین جدید …)» suffix
 *  (surfaced as a note instead). */
function mciCleanTitle(name) {
  return faDigits(
    enDigits(name)
      .replace(/\s+/g, ' ')
      .replace(/\s*\(\s*ویژه مشترکین جدید[^)]*\)\s*$/, '')
      .replace(/([\u0600-\u06FF])\s*(\d)/g, '$1 $2')
      .replace(/(\d)\s*([\u0600-\u06FF])/g, '$1 $2')
      .replace(/\s*\+\s*/g, ' + ')
      .replace(/\s*,\s*/g, '، ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/** Dedup key title: the cleaned title with Persian number words folded to
 *  digits («سی روزه» ≡ «۳۰ روزه») — the shop CMS names some packs with the
 *  word and the portal with the digit. Display titles stay untouched; this
 *  exists only for cross-source matching. */
function mciDedupTitle(title) {
  const NUM = 'یک|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده|یازده|دوازده|سی|چهل|پنجاه|شصت|هفتاد|هشتاد|نود|صد';
  return String(title).replace(
    new RegExp(`(${NUM}|\\d+(?:\\.\\d+)?)\\s*(روزه|ماهه|ساله)`, 'g'),
    (full, n, unit) => {
      const v = MCI_FA_NUMS[n] != null ? MCI_FA_NUMS[n] : parseFloat(n) || 0;
      return `${faDigits(String(v))} ${unit}`;
    },
  );
}

/** Accepts a raw HAR, an array of page objects, a single page object, or an
 *  already-merged products array — whatever was easiest to save. */
function mciShopItemsFromInput(raw) {
  if (raw && raw.log && Array.isArray(raw.log.entries)) {
    const items = [];
    const seen = new Set();
    for (const e of raw.log.entries) {
      if (!String(e.request?.url || '').includes('/api/search/v1/products')) continue;
      let text = e.response?.content?.text || '';
      if (!text) continue;
      if (e.response.content.encoding === 'base64') {
        text = Buffer.from(text, 'base64').toString('utf-8');
      }
      try {
        const d = JSON.parse(text);
        for (const p of d.products || []) {
          if (!seen.has(p.id)) { seen.add(p.id); items.push(p); }
        }
      } catch { /* skip unreadable body */ }
    }
    if (!items.length) throw new Error('no /api/search/v1/products responses found in HAR');
    return items;
  }
  if (Array.isArray(raw)) {
    if (raw.length && Array.isArray(raw[0]?.products)) return raw.flatMap((d) => d.products);
    return raw;
  }
  if (Array.isArray(raw?.products)) return raw.products;
  throw new Error('unrecognized --input shape (expected HAR, page objects or products array)');
}

async function mciShopItemsFromApi() {
  const items = [];
  const seen = new Set();
  for (let page = 0; page < 12; page++) {
    const res = await fetch(`${MCI_SHOP_API}?category=19&page=${page}&size=16`, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        Referer: `${MCI_SHOP_PAGE}?page=0`,
        platform: 'WEB',
        'Accept-Language': 'en-GB,fa;q=0.9',
        'User-Agent': UA,
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!Array.isArray(d.products)) throw new Error('unexpected payload');
    for (const p of d.products) {
      if (!seen.has(p.id)) { seen.add(p.id); items.push(p); }
    }
    if (d.isLast || !d.products.length) break;
  }
  return items;
}

function mciShopPacks(items) {
  const packages = [];
  const excluded = [];
  for (const p of items) {
    const name = String(p.dataLayer?.item_name || shopAttr(p, 'title') || p.id).replace(/\s+/g, ' ').trim();
    const status = String(p.productStatus || '');
    if (status !== 'ACTIVE') {
      excluded.push({
        title: faDigits(name),
        reason: `غیرقابل خرید — وضعیت بسته در فروشگاه همراه اول: ${faDigits(status || 'نامشخص')}`,
      });
      continue;
    }
    const volMB = parseFloat(enDigits(shopAttr(p, 'حجم'))) || 0;
    const days = shopDays(shopAttr(p, 'بازه زمانی بسته'));
    const rial = Number(p.discountPrice ?? p.price) || 0; // cart rule: discountPrice ?? price
    const oldRial = p.discountPrice != null ? Number(p.price) || 0 : 0;
    const price = Math.round(rial / 10);
    if (!(volMB > 0) || !(days > 0) || !(price > 0)) {
      excluded.push({ title: faDigits(name), reason: 'حجم، مدت یا قیمت نامشخص' });
      continue;
    }
    const gb = Math.round((volMB / 1024) * 10000) / 10000;
    const tag = shopAttr(p, 'mainTag');
    const mainInfo = shopAttr(p, 'mainInfo');
    const addInfo = shopAttr(p, 'additionalInfo');
    const needLogin = shopAttr(p, 'needToLogin') === 'true';
    const anar = tag === 'Anarestan' || shopAttr(p, 'ویژه سیم کارت خاص').includes('Anarestan');
    const isNew = tag === 'NewCustomer' || !!mainInfo || /ویژه مشترکین جدید/.test(name);
    const isCombo = /مکالمه/.test(name) || /مکالمه/.test(addInfo);
    const regCode = (shopAttr(p, 'rules').match(/\d{12}/) || [])[0] || null;

    const notes = [];
    if (/صبحانت/.test(name)) notes.push(`صبحانت — ${faDigits(enDigits(addInfo || 'قابل استفاده ۶ صبح تا ۱۲ ظهر').trim())}`);
    if (anar) notes.push('ویژه سیم‌کارت انارستان · فقط اینترنت داخلی');
    if (isNew) notes.push('فقط مشترکین جدید (ثبت‌نام تا ۳۰ روز گذشته)');
    if (isCombo) {
      for (const part of addInfo.split('|')) {
        const s = part.trim();
        let m = s.match(/^همراه با (.+)$/);
        if (m) notes.push(`ترکیبی: ${faDigits(enDigits(m[1]))}`);
        else if (/^ویژه /.test(s)) notes.push(faDigits(enDigits(s)));
      }
    }
    if (needLogin) notes.push('برای خرید باید وارد حساب همراه اول شوید');

    const title = mciCleanTitle(name); // shared pipeline — identical output to the old inline one, and the merge dedup key
    const oldPrice = oldRial ? Math.round(oldRial / 10) : null;
    packages.push({
      id: `mci-${p.id}`,
      title,
      kind: isCombo ? 'combo' : 'internet',
      ...(anar ? { domesticOnly: true } : {}),
      gb, days, price,
      oldPrice,
      discountPct: p.discountPercentage ?? (oldPrice ? pct(price, oldPrice) : null),
      group: null,
      regulatoryCode: regCode,
      ussd: null, // the shop API doesn't carry USSD codes (mci.ir page does)
      note: notes.join(' · ') || null,
    });
  }
  if (!packages.length) throw new Error('no ACTIVE products parsed from shop payload');
  packages.sort((a, b) => a.price / a.gb - b.price / b.gb);
  return { packages, excluded };
}

/* ─────────── mci — C) mci.ir public catalog page, server-rendered HTML (bootstrap fallback) ─────────── */
/* mci.ir/internet-plans renders the whole catalog as
   <li class="package-list-item" data-…> cards (no JSON API; verified from a
   2026-11-06 HAR + live fetch — page is public, logged-out, and reachable
   from outside Iran). data-price is TOMAN (printed "12,990 تومان"),
   data-volume is MB. Prices are pre-tax: MCI's own page states 10% VAT is
   added at activation ("مبلغ مالیات بر ارزش افزوده ۱۰٪ … به قیمت بسته‌ها
   افزوده می‌شود").
   PURCHASABILITY: a card is buyable iff its <button class="purchase-btn">
   has a data-package-code and is not disabled. MCI leaves withdrawn packs
   listed on the page with a disabled button and no code — e.g. «۲ بامداد
   تا ۷ صبح سی‌روزه نامحدود» (disabled on the live site, verified
   2026-11-06). Such cards go to `excluded`, never into the ranking. */
const MCI_URL = 'https://mci.ir/internet-plans';
const MCI_DAYS = {
  'one-day': 1, 'three-days': 3, 'seven-days': 7, 'fifteen-days': 15,
  'thirty-days': 30, 'three-months': 90, 'four-months': 120,
  'unlimited-monthly': 30,
};

/** GET text with a dual path: native fetch, then node:https forced to IPv4
 *  (mci.ir advertises an IPv6 address that is unreachable from some
 *  networks — undici then hangs; curl-style fallback keeps it robust). */
async function getText(url, headers, timeoutMs = 25000) {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch (e) {
    const https = await import('node:https');
    const zlib = await import('node:zlib');
    return new Promise((resolve, reject) => {
      const req = https.get(url, { family: 4, headers: { ...headers, 'Accept-Encoding': 'gzip, deflate' }, timeout: timeoutMs }, (res) => {
        if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const enc = String(res.headers['content-encoding'] || '').toLowerCase();
        let stream = res;
        if (enc.includes('gzip')) stream = res.pipe(zlib.createGunzip());
        else if (enc.includes('deflate')) stream = res.pipe(zlib.createInflate());
        else if (enc.includes('br')) stream = res.pipe(zlib.createBrotliDecompress());
        const chunks = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        stream.on('error', reject);
      });
      req.on('timeout', () => { req.destroy(new Error('timeout')); });
      req.on('error', reject);
    });
  }
}

async function mciCatalogHtmlPacks() {
  const html = await getText(MCI_URL, {
    Accept: 'text/html', 'Accept-Language': 'fa-IR,fa;q=0.9', 'User-Agent': UA,
  });

  const packages = [];
  const excluded = [];
  const attr = (block, name) => {
    const m = block.match(new RegExp(`${name}=["']([^"']*)["']`));
    return m ? m[1] : '';
  };
  // cards contain no nested <li>, so a lazy block scan is safe.
  // NOTE: the live server emits single-quoted attributes (Chrome DevTools
  // re-serializes HARs with double quotes) — every pattern accepts both.
  const cardRe = /<li class=["']package-list-item[^"']*["']([^>]*)>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const attrs = m[1];
    const body = m[2];
    const title = (body.match(/package-volume-info[\s\S]*?td-inner-wrapper["']>\s*([\s\S]*?)\s*<\/div>/) || [])[1] || '';
    const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const t = clean(title);
    const volMB = parseFloat(attr(attrs, 'data-volume'));
    const price = Math.round(parseFloat(attr(attrs, 'data-price')) || 0);
    const durKey = attr(attrs, 'data-duration');
    const pkgType = attr(attrs, 'data-package-type');
    const fairMB = parseFloat(attr(attrs, 'data-fair-volume'));
    const days = MCI_DAYS[durKey] || 0;
    const ussd = clean((body.match(/ussd-code-widget["'][^>]*>([\s\S]*?)<\/span>/) || [])[1] || '') || null;
    const regRaw = clean((body.match(/package-regulatory-confirm-code[\s\S]*?td-inner-wrapper["']>\s*<a[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '');
    const regCode = regRaw && regRaw !== '-' ? regRaw : null;
    const code = (body.match(/data-package-code=["']([^"']*)["']/) || [])[1] || null;
    // purchasability: live cards' خرید آنلاین button carries data-package-code;
    // withdrawn packs render <button class='purchase-btn' … disabled> with no code.
    const btnDisabled =
      /<button[^>]*class=["'][^"']*purchase-btn[^"']*["'][^>]*\bdisabled\b/i.test(body);
    if (!code || btnDisabled) {
      const exTitle = faDigits(
        clean(t.replace(/دارای سیاست مصرف منصفانه.*$/, '').trim()),
      );
      excluded.push({
        title: exTitle || code || '?',
        reason: btnDisabled
          ? 'غیرقابل خرید — دکمه «خرید آنلاین» در سایت همراه اول غیرفعال است'
          : 'غیرقابل خرید — کد بسته روی دکمه خرید درج نشده است',
      });
      continue;
    }

    if (pkgType === 'unlimited' || /نامحدود/.test(t)) {
      // unlimited night pack (e.g. 2am–7am): rank by the full-speed FUP volume
      const fupGB = Number((t.match(/بالای\s*([\d.]+)\s*گیگابایت/) || [])[1]) || (fairMB > 0 ? fairMB / 1024 : 0);
      if (fupGB > 0 && days > 0 && price > 0) {
        packages.push({
          id: `mci-${code || 'unlimited'}`,
          title: 'نامحدود شبانه (۲ تا ۷ بامداد) ۳۰ روزه',
          kind: 'internet',
          gb: Math.round(fupGB * 100) / 100,
          days, price,
          oldPrice: null, discountPct: null,
          group: 'نامحدود شبانه',
          regulatoryCode: regCode, ussd,
          note: `مصرف نامحدود هر شب ۲ تا ۷ بامداد؛ سیاست مصرف منصفانه برای مصارف بالای ${faDigits(Math.round(fupGB))} گیگابایت${fairMB > 0 ? ` (سقف ${faDigits(Math.round(fairMB / 1024))} گیگ)` : ''}`,
        });
        continue;
      }
    }
    const gb = volMB > 0 ? volMB / 1024 : 0;
    if (!(gb > 0) || !(days > 0) || !(price > 0)) {
      excluded.push({ title: t || code || '?', reason: 'حجم، مدت یا قیمت نامشخص' });
      continue;
    }
    const isNew = pkgType === 'new-sub' || /ویژه مشترکین جدید/.test(t);
    packages.push({
      id: `mci-${code || `${volMB}-${durKey}`}`,
      title: faDigits(t.replace(/\s*\(\s*ویژه مشترکین جدید\s*\)\s*$/, '')),
      kind: 'internet',
      gb: Math.round(gb * 10000) / 10000,
      days, price,
      oldPrice: null, discountPct: null,
      group: null,
      regulatoryCode: regCode, ussd,
      note: isNew ? 'فقط مشترکین جدید' : null,
    });
  }
  if (!packages.length) throw new Error('no package cards found in HTML');
  packages.sort((a, b) => (a.price / a.gb) - (b.price / b.gb));
  return { packages, excluded };
}

/* ─────────── mci — B) «همراه‌من» portal catalog (my.mci.ir, no login on the wire) ─────────── */
/* The customer portal personalizes its catalog solely through the
   ?phoneNumber= query parameter — the 2026-11-14 logged-in HAR proves no
   Authorization header or cookie is ever sent (see the file header). The
   phone number is the ONLY personal bit involved, so it is never a CLI
   argument, never logged, never written to the output JSON: it comes from
   the MCI_PHONE env var or the gitignored update/my.mci.txt. */
const MY_MCI_BASE = 'https://my.mci.ir/api/unit/v1/customer/units';
const MY_MCI_PAGE = 'https://my.mci.ir/panel/packages/list'; // Referer for the API calls
/* Buy destinations for portal-only packs — deep links verified from the
   2026-11-14 HAR referers. The portal gates its PAGES behind login (only the
   API is open), so these land on sign-in first, then the packages list. */
const MY_MCI_INTERNET_PAGE = 'https://my.mci.ir/panel/packages/list/internet';
const MY_MCI_MODEM_PAGE = 'https://my.mci.ir/panel/packages/list/modem_bundle';
const MCI_PORTAL_NOTE = 'کاتالوگ عمومی، بدون احراز هویت';

/** 09123456789 / +989123456789 / 98 912 345 6789 / 9123456789 → '9123456789'
 *  — the 10-digit form the portal itself puts in ?phoneNumber=. */
function mciNormalizePhone(s) {
  const m = String(s || '').replace(/[\s-]/g, '').match(/^(?:\+98|0098|98|0)?(9\d{9})$/);
  return m ? m[1] : null;
}

/** Phone number resolution: MCI_PHONE env → update/my.mci.txt (one number per
 *  line, # comments allowed). Returns the normalized number or null. */
async function mciPortalPhone() {
  const fromEnv = mciNormalizePhone(process.env.MCI_PHONE || '');
  if (fromEnv) return fromEnv;
  try {
    const txt = await readFile(path.join(ROOT, 'update', 'my.mci.txt'), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const s = line.replace(/#.*$/, '').trim();
      if (!s) continue;
      const direct = mciNormalizePhone(s);
      if (direct) return direct;
      const m = s.match(/(?:\+98|0098|98|0)?(9\d{9})\b/);
      if (m) return m[1];
    }
  } catch { /* no my.mci.txt — fall through */ }
  return null;
}

/** Accepts a raw HAR (pulls the internet + modem_bundle unit lists out of the
 *  captured responses — a HAR may log a response twice, dedup happens by
 *  viewId later) or a saved object {internet: […|{units}], modem_bundle: […]}.
 *  A bare array is treated as the internet list. */
function mciPortalUnitsFromInput(raw) {
  const out = { internet: [], modem_bundle: [] };
  if (raw?.log?.entries) {
    for (const e of raw.log.entries) {
      const url = String(e.request?.url || '');
      if (!url.includes('/api/unit/v1/customer/units/')) continue;
      if ((e.response?.status || 0) !== 200) continue;
      let text = e.response.content?.text || '';
      if (!text) continue;
      if (e.response.content.encoding === 'base64') text = Buffer.from(text, 'base64').toString('utf8');
      let d;
      try { d = JSON.parse(text); } catch { continue; }
      if (!Array.isArray(d?.units)) continue;
      if (url.includes('/normal/internet')) out.internet.push(...d.units);
      else if (url.includes('/normal/modem_bundle')) out.modem_bundle.push(...d.units);
    }
    if (out.internet.length || out.modem_bundle.length) return out;
    throw new Error('no /customer/units responses found in HAR');
  }
  const arr = (v) => (Array.isArray(v) ? v : Array.isArray(v?.units) ? v.units : null);
  if (raw && typeof raw === 'object' && (arr(raw.internet) || arr(raw.modem_bundle))) {
    return { internet: arr(raw.internet) || [], modem_bundle: arr(raw.modem_bundle) || [] };
  }
  if (Array.isArray(raw)) return { internet: raw, modem_bundle: [] };
  throw new Error('unrecognized my.mci.ir shape (expected HAR or {internet, modem_bundle})');
}

async function mciPortalFetch(unitPath, phone) {
  const qs = phone ? `?phoneNumber=${phone}` : '';
  let res;
  try {
    res = await fetch(`${MY_MCI_BASE}${unitPath}${qs}`, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        version: '1.33.4',
        platform: 'WEB',
        Referer: `${MY_MCI_PAGE}/`,
        'User-Agent': UA,
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    const err = new Error(`unreachable: ${e.message}`);
    err.network = true; // host-level failure (geo-block) — no point retrying with a phone
    throw err;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  if (!Array.isArray(d?.units)) throw new Error('unexpected payload (no units[])');
  return d.units;
}

/** Live portal fetch. First tries WITHOUT a phone number — if my.mci.ir serves
 *  the general catalog anonymously, no personal input is needed at all. Only
 *  if that is refused does it use the locally-configured number. The number is
 *  never logged. */
async function mciPortalUnitsFromApi() {
  try {
    const internet = await mciPortalFetch('/normal/internet', null);
    console.log('• mci: my.mci.ir served the catalog without a phone number — no personal input needed');
    const modem_bundle = await mciPortalFetch('/normal/modem_bundle', null).catch(() => []);
    return { internet, modem_bundle };
  } catch (e) {
    if (e.network) throw e; // geo-blocked from here — stale-keep instead
  }
  const phone = await mciPortalPhone();
  if (!phone) {
    throw new Error('my.mci.ir asks for a phone number — create update/my.mci.txt (one line, your MCI number, e.g. 09123456789) or set MCI_PHONE; the file is gitignored and never committed');
  }
  const internet = await mciPortalFetch('/normal/internet', phone);
  const modem_bundle = await mciPortalFetch('/normal/modem_bundle', phone).catch(() => []);
  console.log('• mci: my.mci.ir catalog fetched (personalized view via local phone config — never stored)');
  return { internet, modem_bundle };
}

const MCI_FA_NUMS = {
  یک: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, شیش: 6, هفت: 7, هشت: 8,
  نه: 9, ده: 10, یازده: 11, دوازده: 12, سی: 30, چهل: 40, پنجاه: 50,
  شصت: 60, هفتاد: 70, هشتاد: 80, نود: 90, صد: 100,
};

/** «بسته اینترنت سی روزه 5 گیگابایت» → {gb: 5, days: 30}. Persian word
 *  numbers included («سی روزه»=30d, «یکماهه»=30d, «دوازده ماهه»=360d);
 *  «ماهه» ×30 and «ساله» ×365 follow the rightel convention. */
function mciPortalNameParse(name) {
  const s = enDigits(String(name).replace(/\s+/g, ' '));
  const NUM = 'یک|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده|یازده|دوازده|سی|چهل|پنجاه|شصت|هفتاد|هشتاد|نود|صد';
  const val = (m) => (m ? (MCI_FA_NUMS[m[1]] != null ? MCI_FA_NUMS[m[1]] : parseFloat(m[1]) || 0) : 0);
  let days = val(s.match(new RegExp(`(${NUM}|\\d+(?:\\.\\d+)?)\\s*روزه`)));
  if (!days) days = val(s.match(new RegExp(`(${NUM}|\\d+(?:\\.\\d+)?)\\s*ماهه`))) * 30;
  if (!days) days = val(s.match(new RegExp(`(${NUM}|\\d+(?:\\.\\d+)?)\\s*ساله`))) * 365;
  let gb = 0;
  let m = s.match(/(\d+(?:\.\d+)?)\s*گیگابایت/);
  if (m) gb = +m[1];
  else if ((m = s.match(/(\d+(?:\.\d+)?)\s*مگابایت/))) gb = +m[1] / 1024;
  return { gb: Math.round(gb * 10000) / 10000, days: Math.round(days) };
}

/** Portal units → site packs. modem:true marks the data-SIM (modem_bundle)
 *  list. The unlimited packs rank by their fair-usage cap; Rubika packs are
 *  domestic-only; window/new-customer/combo facts become notes. */
function mciPortalPacks(units, { modem = false } = {}) {
  const packages = [];
  const excluded = [];
  const seen = new Set();
  for (const u of units) {
    const viewId = String(u.viewId || '');
    if (!viewId || seen.has(viewId)) continue; // a HAR may log one response twice
    seen.add(viewId);
    const rawName = String(u.offerName || '').replace(/\s+/g, ' ').trim();
    const price = Math.round((Number(u.price) || 0) / 10); // rial → toman, pre-tax
    const { gb, days } = mciPortalNameParse(rawName);
    if (!(gb > 0) || !(days > 0) || !(price > 0)) {
      excluded.push({ title: mciCleanTitle(rawName), reason: 'حجم، مدت یا قیمت نامشخص (پنل همراه‌من)' });
      continue;
    }
    const s = enDigits(rawName);
    const notes = [];
    let kind = 'internet';
    let domesticOnly = false;
    if (modem) notes.push('ویژه سیم‌کارت دیتا/مودم همراه اول');
    if (/روبیکا/.test(s)) {
      domesticOnly = true; // Rubika traffic never leaves Iran's network
      notes.push('ویژه اپلیکیشن روبیکا — فقط ترافیک داخلی');
    }
    if (/نامحدود/.test(s)) notes.push(`مصرف نامحدود (سقف مصرف منصفانه ${faDigits(String(gb))} گیگابایت)`);
    const win = s.match(/(\d+)\s*(?:بامداد|صبح)\s*تا\s*(\d+)\s*(?:بامداد|صبح|ظهر)/) // «2بامداد تا 9صبح»
      || s.match(/(\d+)\s*تا\s*(\d+)\s*(?:بامداد|صبح|ظهر)/); // «2 تا 7 صبح» / «6 تا 12ظهر»
    if (win) notes.push(`قابل استفاده از ${faDigits(win[1])} تا ${faDigits(win[2])} ${/ظهر/.test(win[0]) ? 'ظهر' : 'صبح'}`);
    if (/مشترکین جدید/.test(s)) notes.push('فقط مشترکین جدید (ثبت‌نام تا ۳۰ روز گذشته)');
    if (/همه چیز تمام|همه‌چیز تمام/.test(s)) {
      kind = 'combo';
      notes.push('ترکیبی: اینترنت + مکالمه و پیامک نامحدود (با حد مصرف روزانه و سیاست مصرف منصفانه)');
    } else if (/مکالمه/.test(s)) {
      kind = 'combo';
    }
    packages.push({
      id: `${modem ? 'mci-modem' : 'mci-my'}-${viewId.replace(/-/g, '').slice(0, 8)}`,
      title: mciCleanTitle(rawName),
      kind,
      ...(domesticOnly ? { domesticOnly: true } : {}),
      gb, days, price,
      oldPrice: null, discountPct: null,
      group: null,
      regulatoryCode: null, ussd: null,
      note: notes.join(' · ') || null,
    });
  }
  packages.sort((a, b) => a.price / a.gb - b.price / b.gb);
  return { packages, excluded };
}

/* ─────────── mci — orchestrator: shop + portal, merged into one doc ─────────── */
async function fetchMci() {
  const argv = process.argv;
  const inputIdx = argv.indexOf('--input');
  const atIdx = argv.indexOf('--fetched-at');
  const fetchedAt = atIdx !== -1 && argv[atIdx + 1] ? argv[atIdx + 1] : new Date().toISOString();
  const inputPath = inputIdx !== -1 && argv[inputIdx + 1] ? argv[inputIdx + 1] : null;
  let inputRaw = null;
  if (inputPath) inputRaw = JSON.parse(await readFile(path.resolve(ROOT, inputPath), 'utf-8'));

  /* previous captures — for stale-keep and ride-along carry-over */
  let prev = null;
  let prevModem = null;
  try { prev = JSON.parse(await readFile(path.join(DATA_DIR, 'mci.json'), 'utf8')); } catch { /* none */ }
  try { prevModem = JSON.parse(await readFile(path.join(DATA_DIR, 'mci-modem.json'), 'utf8')); } catch { /* none */ }
  const prevShopPacks = (prev?.packages || []).filter((p) => !/^mci-(my|modem)-/.test(p.id));
  const prevPortalPacks = (prev?.packages || []).filter((p) => /^mci-my-/.test(p.id));
  const prevShopMeta = prev?.source?.parts?.shop ?? (prev && prev.source?.kind ? prev.source : null);
  const prevPortalAt = prev?.source?.parts?.portal?.fetchedAt ?? null;

  /* ── A) shop part: --input → live API → stale-keep (≤14d) → HTML bootstrap ── */
  let shopFromInput = null;
  let portalFromInput = null;
  if (inputRaw) {
    const errs = [];
    try { shopFromInput = mciShopItemsFromInput(inputRaw); } catch (e) { errs.push(`shop: ${e.message}`); }
    try { portalFromInput = mciPortalUnitsFromInput(inputRaw); } catch (e) { errs.push(`portal: ${e.message}`); }
    if (!shopFromInput && !portalFromInput) {
      // an explicit --input must not silently degrade to another source
      throw new Error(`--input matched no MCI source (${errs.join(' · ')})`);
    }
  }

  let shop = null; // { kind, fetchedAt, packages, excluded, stale? }
  if (shopFromInput) {
    const packs = mciShopPacks(shopFromInput);
    shop = { kind: 'api', fetchedAt, ...packs };
  } else {
    try {
      const items = await mciShopItemsFromApi();
      if (!items.length) throw new Error('empty shop product list');
      const packs = mciShopPacks(items);
      shop = { kind: 'api', fetchedAt, ...packs };
    } catch (e) {
      const ageDays = prevShopMeta?.fetchedAt
        ? (Date.now() - Date.parse(prevShopMeta.fetchedAt)) / 86400000
        : Infinity;
      if (prevShopPacks.length && ageDays <= MCI_SHOP_STALE_DAYS) {
        console.log(
          `• mci: shop API unreachable from here (${e.message}) — kept the ${prevShopMeta.fetchedAt.slice(0, 10)} shop capture (${ageDays.toFixed(1)}d old ≤ ${MCI_SHOP_STALE_DAYS}d)`,
        );
        shop = {
          kind: prevShopMeta.kind, fetchedAt: prevShopMeta.fetchedAt,
          packages: prevShopPacks, excluded: prev?.excluded || [], stale: true,
        };
      } else {
        console.log(
          `• mci: shop API unreachable from here (${e.message})${prevShopPacks.length ? ` — shop capture ${Number.isFinite(ageDays) ? `${ageDays.toFixed(0)}d old (> ${MCI_SHOP_STALE_DAYS}d), regressing to the mci.ir page` : 'unusable, regressing to the mci.ir page'}` : ''}`,
        );
      }
    }
  }
  if (!shop) {
    // mci.ir marketing page — public, reachable outside Iran (bootstrap fallback)
    const html = await mciCatalogHtmlPacks();
    shop = { kind: 'html', fetchedAt: new Date().toISOString(), ...html };
  }

  /* ── B) portal part: --input → live (local phone config) → stale-keep ── */
  let portal = null; // { fetchedAt, mobile: {packages, excluded}, modem: {packages, excluded} }
  if (portalFromInput) {
    portal = {
      fetchedAt,
      mobile: mciPortalPacks(portalFromInput.internet),
      modem: mciPortalPacks(portalFromInput.modem_bundle, { modem: true }),
    };
  } else {
    try {
      const units = await mciPortalUnitsFromApi();
      portal = {
        fetchedAt: new Date().toISOString(),
        mobile: mciPortalPacks(units.internet),
        modem: mciPortalPacks(units.modem_bundle, { modem: true }),
      };
    } catch (e) {
      if (prevPortalPacks.length || prevModem) {
        console.log(`• mci: kept my.mci.ir portal capture${prevPortalAt ? ` from ${prevPortalAt.slice(0, 10)}` : ''} (${e.message})`);
      } else {
        console.log(`• mci: no my.mci.ir portal data (${e.message}) — shop-only doc`);
      }
    }
  }

  /* ── C) merge + write ── */
  if (shop.stale && !portal) {
    console.log('• mci: nothing fresher than the shipped capture — mci.json and mci-modem.json untouched');
    return;
  }

  // portal packs ride along even when the portal itself could not refresh
  const portalPacks = portal ? portal.mobile.packages : prevPortalPacks;
  const portalExcluded = portal ? portal.mobile.excluded : [];
  const portalAt = portal ? portal.fetchedAt : prevPortalAt;

  /* merge: shop first, then portal packs that the shop doesn't already sell.
   * Key = folded title + gb + days + price: the two sources price overlapping
   * packs IDENTICALLY (verified 2026-11-06 shop vs 2026-11-14 portal), and the
   * regular/new-customer twins share a title but differ in price — the price
   * keeps them apart. */
  const seen = new Set();
  const merged = [];
  const key = (p) => `${mciDedupTitle(p.title)}|${p.gb}|${p.days}|${p.price}`;
  for (const p of shop.packages) {
    const k = key(p);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(p);
  }
  let portalOnlyCount = 0;
  for (const p of portalPacks) {
    const k = key(p);
    if (seen.has(k)) continue; // already sold by the shop — the shop card wins
    seen.add(k);
    /* portal-only: the shop does not sell it → purchasable just via the
       همراه من app / my.mci.ir. Stamp for the UI badge + per-package buy
       link; re-stamping ride-along packs is idempotent (same key order). */
    merged.push({ ...p, portalOnly: true, buyUrl: MY_MCI_INTERNET_PAGE });
    portalOnlyCount += 1;
  }
  merged.sort((a, b) => a.price / a.gb - b.price / b.gb);
  if (portalOnlyCount) {
    console.log(`• mci: ${portalOnlyCount} portal-only pack(s) → «فروش فقط از اپ همراه من / my.mci.ir» (buyUrl → ${MY_MCI_INTERNET_PAGE})`);
  }
  const excluded = [...shop.excluded, ...portalExcluded];
  const fetchedAtAll = [shop.fetchedAt, portalAt].filter(Boolean).sort().pop();

  await writeProvider('mci', {
    schema: 2,
    provider: {
      id: 'mci', nameFa: 'همراه اول', nameEn: 'MCI', category: 'mobile',
      tech: '4G/5G', regions: ['سراسری'], accent: '#0095da',
      site: 'https://mci.ir', buyUrl: MCI_SHOP_PAGE,
    },
    source: {
      kind: shop.kind,
      endpoint: shop.kind === 'api'
        ? `ادغام دو منبع: فروشگاه رسمی shop.mci.ir/api/search/v1/products?category=19 + پنل همراه‌من my.mci.ir (${MCI_PORTAL_NOTE})`
        : `صفحه mci.ir/internet-plans + بسته‌های پنل همراه‌من my.mci.ir (${MCI_PORTAL_NOTE})`,
      fetchedAt: fetchedAtAll,
      parts: {
        shop: {
          kind: shop.kind,
          endpoint: shop.kind === 'api'
            ? 'GET shop.mci.ir/api/search/v1/products?category=19 (paginated) — فروشگاه رسمی همراه اول'
            : 'GET mci.ir/internet-plans (.package-list-item cards)',
          fetchedAt: shop.fetchedAt,
        },
        ...(portalPacks.length
          ? {
            portal: {
              kind: 'api',
              endpoint: `GET my.mci.ir/api/unit/v1/customer/units/normal/internet — پنل همراه‌من (${MCI_PORTAL_NOTE}؛ شماره خط فقط از تنظیمات محلی و در خروجی ثبت نمی‌شود)`,
              fetchedAt: portalAt,
            },
          }
          : {}),
      },
    },
    prices: { unit: 'toman', includesTax: false, apiUnit: shop.kind === 'html' ? 'toman' : 'rial' },
    packages: merged,
    excluded,
  });

  /* modem/data-SIM doc — written only from a fresh portal capture; otherwise
   * the shipped mci-modem.json keeps riding along untouched. */
  if (portal && portal.modem.packages.length) {
    await writeProvider('mci-modem', {
      schema: 2,
      provider: {
        id: 'mci-modem', nameFa: 'همراه اول (مودم)', nameEn: 'MCI Modem', category: 'home',
        tech: 'سیم‌کارت دیتا · 4G/5G', regions: ['سراسری'], accent: '#0095da',
        site: 'https://mci.ir', buyUrl: MY_MCI_MODEM_PAGE,
      },
      source: {
        kind: 'api',
        endpoint: `GET my.mci.ir/api/unit/v1/customer/units/normal/modem_bundle — پنل همراه‌من (${MCI_PORTAL_NOTE})`,
        fetchedAt: portal.fetchedAt,
      },
      prices: { unit: 'toman', includesTax: false, apiUnit: 'rial' },
      packages: portal.modem.packages.map((p) => ({ ...p, portalOnly: true, buyUrl: MY_MCI_MODEM_PAGE })),
      excluded: portal.modem.excluded,
    });
  }
}

/* ─────────── irancell — web catalog(s) + my.irancell.ir portal (HARs 2026-11-15) ─────────── */
/* irancell.ir runs TWO public /e/products catalogs (prices TOMAN pre-tax, the
   page modal adds vat_percentage=0.1 at checkout):
   • mobile: irancell.ir/o/1001/mobile-internet-packages
       ← GET /e/products/5e16bf95d11fd7209ba56b20
   • TD-LTE: irancell.ir/p/305229/td-lte-internet-packages
       ← GET /e/products/5e16bfacd11fd7209ba56b22
   Both are reachable from GitHub Actions runners (user-verified 2026-11-15:
   the manual "Refresh provider data" run fetched Irancell fine) → both docs
   auto-refresh daily; no Iran capture needed anymore.
   The subscriber portal my.irancell.ir (اپ ایرانسل من) sells EXTRA packs the
   web shop doesn't: heavily-discounted ۲–۷صبح / ۶صبح–۱۲ظهر windows, app-only
   sizes (2–5.5GB short packs, 30–50GB long packs), hourly (۶۰/۱۸۰ دقیقه)
   packs, فوتبالی پلاس and جونیور combos. Its catalog API
   (GET my.irancell.ir/api/catalog/v2/offers?type=data&category=normal
    + /api/catalog/v2/offers/promo) answers 401 without a logged-in
   Authorization header (Chrome strips that value from HAR exports), so the
   portal part refreshes ONLY from a HAR captured inside Iran:
     node update/fetch-providers.mjs --only irancell --input my.irancell.ir.har
   The offers payload itself is a plain package catalog (no personal data —
   account/subscription endpoints in the same HAR are never read); prices are
   RIAL (exactly ×10 the web's toman, verified pack-by-pack on 2026-11-15).
   Portal-only packs are stamped portalOnly:true + buyUrl → the portal's
   promotion-internet page (https://my.irancell.ir/dlp?id=proi — the /dlp
   handler was verified in the SPA bundle) and ride along on top of every
   automatic web refresh, so a daily Action never wipes the manual capture. */
const IRANCELL_URL = 'https://irancell.ir/e/products/5e16bf95d11fd7209ba56b20';
const IRANCELL_TDLTE_URL = 'https://irancell.ir/e/products/5e16bfacd11fd7209ba56b22';
const IRANCELL_TDLTE_PAGE = 'https://irancell.ir/p/305229/td-lte-internet-packages';
const MY_IRANCELL_PROMO_PAGE = 'https://my.irancell.ir/dlp?id=proi';
const IRANCELL_STALE_DAYS = 14; // a web capture up to this age rides along; older = adapter fails (file kept)

function irancellSpec(item, key) {
  const sc = (item.specification_contents || []).find((s) => s.key === key);
  if (!sc) return { value: '', desc: '' };
  return { value: sc.value || '', desc: (sc.desc && (sc.desc.fa || sc.desc.en)) || '' };
}

/** Sum every «N گیگ/مگ» token in a Persian title → MB (۱ گیگ = ۱۰۲۴ مگ).
 *  «مگابیت» (speed, e.g. ۸ مگابیت اقتصادی) is NOT a volume — excluded. */
function titleVolumeMB(title) {
  const s = enDigits(title);
  let mb = 0;
  const re = /(\d+(?:\.\d+)?)\s*(گیگابایت|گیگ|مگابایت|مگ(?!ابیت))/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const v = parseFloat(m[1]);
    if (isFinite(v) && v > 0) mb += m[2][0] === 'م' ? v : v * 1024;
  }
  return mb;
}

/** package_type value → days: daily→1, «30days»→30, …; 0 if unknown. */
const irancellDays = (v) =>
  v === 'daily' ? 1 : parseInt(enDigits(v).replace(/[^\d]/g, ''), 10) || 0;

async function irancellProductsFromUrl(url, referer) {
  const res = await fetch(url, {
    headers: { Accept: '*/*', Referer: referer, 'User-Agent': UA },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items = await res.json();
  if (!Array.isArray(items) || !items.length) throw new Error('unexpected payload');
  return items;
}

/* ── A) mobile web catalog → packages (same shape the site has shipped since 2026-11-06) ── */
function irancellWebPacks(items) {
  const packages = [];
  const excluded = [];
  for (const it of items) {
    const faRaw = String(it.name?.fa || '').replace(/\s+/g, ' ').trim();
    const en = String(it.name?.en || '').trim();
    const price = Math.round(Number(it.price) || 0); // toman, pre-tax
    const days = irancellDays(irancellSpec(it, 'package_type').value);
    const trafficMB = parseFloat(enDigits(irancellSpec(it, 'traffic').desc)) || 0;

    if (/تعرفه آزاد/.test(faRaw) || /\bOOB\b/i.test(en)) {
      excluded.push({
        title: faDigits(faRaw) || en,
        reason: 'تعرفه پرداخت به‌ازای هر گیگ (پنجره‌ی ساعتی خاص) — حجم ثابت ندارد',
      });
      continue;
    }

    // true volume: title tokens first (traffic misses split-night parts), never below traffic
    const titleMB = titleVolumeMB(faRaw);
    const mb = Math.max(titleMB, trafficMB);
    if (!(mb > 0) || !(days > 0) || !(price > 0)) {
      excluded.push({ title: faDigits(faRaw) || it.id || '?', reason: 'حجم، مدت یا قیمت نامشخص' });
      continue;
    }
    const gb = Math.round((mb / 1024) * 10000) / 10000;

    // web-only sale channel (spec buy_of_app="no" → not sold in the app)
    const buyOfApp = irancellSpec(it, 'buy_of_app').value;

    const isCombo = /دقیقه\s*مکالمه|ترکیب\s*برنده/.test(faRaw) || /Combo/i.test(en);
    // pretty title: «۶گیگابایت(۲تا۷صبح)» → «۶ گیگابایت (۲ تا ۷ صبح)»
    // (normalize digits first — raw titles mix Persian «۶گیگابایت» and ASCII «200گیگابایت»)
    const title = faDigits(
      enDigits(faRaw)
        .replace(/(\d)\s*(گیگابایت|مگابایت|گیگ|مگ)/g, '$1 $2')
        .replace(/(\d)\s*تا\s*(\d)\s*صبح/g, '$1 تا $2 صبح')
        .replace(/([^ (])\(/g, '$1 ('),
    );

    // notes: night window / split-night share / combo extras
    const notes = [];
    if (/(\d)\s*تا\s*(\d)\s*صبح/.test(enDigits(faRaw))) {
      const nightMB = mb - trafficMB; // split packs hide the night part from traffic
      notes.push(
        trafficMB > 0 && nightMB > 0
          ? `شامل ${faDigits(String(Math.round((nightMB / 1024) * 10) / 10))} گیگ شبانه (۲ تا ۷ صبح)`
          : 'شبانه (۲ تا ۷ صبح)',
      );
    }
    if (isCombo) {
      let extras = '';
      const plus = faRaw.indexOf('+');
      const and = faRaw.indexOf(' و ');
      if (plus !== -1) extras = faRaw.slice(plus + 1);
      else if (and !== -1) extras = faRaw.slice(and + 3);
      extras = extras.replace(/\s+/g, ' ').trim();
      if (extras) notes.push(`ترکیبی: ${faDigits(extras)}`);
    }
    if (buyOfApp === 'no') {
      notes.push('فقط از وب‌سایت قابل خرید است — در اپلیکیشن ایرانسل عرضه نمی‌شود');
    }

    packages.push({
      id: `irancell-${it.id}`,
      title,
      kind: isCombo ? 'combo' : 'internet',
      gb, days, price,
      oldPrice: null, discountPct: null,
      group: null,
      regulatoryCode: null,
      ussd: irancellSpec(it, 'ussd').desc || irancellSpec(it, 'ussd').value || null,
      note: notes.join(' · ') || null,
    });
  }
  if (!packages.length) throw new Error('no packages parsed');
  return { packages, excluded };
}

/* ── B) my.irancell.ir portal offers (from a HAR only — the API needs a
      logged-in Bearer token). Accepts the raw HAR object; returns
      { offers: [...], fetchedAt } with normal + promo data offers merged. ── */
function irancellPortalFromInput(raw) {
  if (!raw?.log?.entries) throw new Error('not a HAR');
  const offers = [];
  let fetchedAt = null;
  for (const e of raw.log.entries) {
    const url = String(e.request?.url || '');
    if (!url.includes('/api/catalog/v2/offers')) continue;
    if ((e.response?.status || 0) !== 200) continue;
    let text = e.response.content?.text || '';
    if (!text) continue;
    if (e.response.content.encoding === 'base64') text = Buffer.from(text, 'base64').toString('utf8');
    let d;
    try { d = JSON.parse(text); } catch { continue; }
    if (!Array.isArray(d)) continue;
    offers.push(...d.filter((o) => o && (o.offer_type === 'data' || o.category === 'promo' || o.category === 'normal')));
    const ts = Date.parse(e.startedDateTime || '');
    if (Number.isFinite(ts) && (!fetchedAt || ts > Date.parse(fetchedAt))) fetchedAt = e.startedDateTime;
  }
  if (!offers.length) throw new Error('no /api/catalog/v2/offers responses found in HAR');
  return { offers, fetchedAt };
}

/** RIAL → TOMAN (portal prices are exactly ×10 the web's toman, verified 2026-11-15). */
const irancellRialToToman = (r) => Math.round(Number(r || 0) / 10);

/* Portal offer → {packages, excluded}. Prices RIAL → toman; volume from the
   `volume` field (MB) or the title; days from duration/duration_unit or the
   title (ساعته packs → 1 day + a minutes note — the schema has no hours). */
function irancellPortalPacks(offers) {
  const packages = [];
  const excluded = [];
  const seen = new Set();
  for (const o of offers) {
    const rawTitle = String(o.title || '').replace(/\s+/g, ' ').trim();
    const upc = String(o.upc_code || o.offer_id || '').replace(/\s+/g, '');
    const toman = irancellRialToToman(o.price);

    // per-GB subscription plans («اشتراک اینترنت با قیمت … هرگیگ») — no fixed volume
    if (/اشتراک\s+اینترنت/.test(rawTitle) || /هرگیگ/.test(rawTitle)) {
      excluded.push({ title: faDigits(rawTitle), reason: 'اشتراک پرداخت به‌ازای هر گیگ — حجم ثابت ندارد' });
      continue;
    }
    // voice/SMS-only offers are out of scope for a data-package comparison
    if (o.offer_type === 'voice' || o.offer_type === 'sms' || /مکالمه ایرانسلی(?!.+گیگ)/.test(rawTitle)) {
      continue;
    }

    const s = enDigits(rawTitle);
    let mb = parseFloat(o.volume) || 0;
    if (!mb) mb = titleVolumeMB(rawTitle);

    // duration: structured field first, then title tokens (Nروز/روزه/ماهه)
    let days = 0;
    const dur = parseInt(enDigits(o.duration || ''), 10) || 0;
    if (o.duration_unit === 'day' && dur > 0) days = dur;
    if (!days) {
      const mDay = s.match(/(\d+)\s*روز/);
      if (mDay) days = parseInt(mDay[1], 10);
    }
    if (!days) {
      const mMon = s.match(/(\d+)\s*ماه/);
      if (mMon) days = parseInt(mMon[1], 10) * 30;
    }
    const hourly = /ساعته/.test(s);
    const mMin = s.match(/\(?(\d+)\s*دقیقه\)?/);
    if (hourly) days = 1; // ۶۰/۱۸۰ دقیقه validity — schema has no hours, note carries it

    if (!(mb > 0) || !(days > 0) || !(toman > 0)) {
      excluded.push({ title: faDigits(rawTitle) || upc || '?', reason: 'حجم، مدت یا قیمت نامشخص' });
      continue;
    }

    // windows → note (and keep the restriction regexes in providers.ts working)
    const notes = [];
    let windowLabel = null;
    if (/2\s*تا\s*7\s*صبح/.test(s)) windowLabel = '۲ تا ۷ صبح';
    else if (/6\s*صبح\s*-?\s*12\s*ظهر|6\s*تا\s*11\s*صبح/.test(s)) windowLabel = '۶ صبح تا ۱۲ ظهر';
    if (windowLabel === '۲ تا ۷ صبح') notes.push('شبانه (۲ تا ۷ صبح)');
    if (windowLabel === '۶ صبح تا ۱۲ ظهر') notes.push('صبحانه (۶ صبح تا ۱۲ ظهر)');
    if (hourly && mMin) notes.push(`اعتبار مصرف: ${faDigits(mMin[1])} دقیقه از فعال‌سازی`);

    // pretty title: «N گیگ/مگ اینترنت …» → «N گیگابایت (پنجره) [ساعتی]»
    const vol = mb >= 1024 && Math.abs(mb / 1024 - Math.round(mb / 1024)) < 0.01
      ? `${faDigits(String(Math.round(mb / 1024)))} گیگابایت`
      : mb >= 1024
        ? `${faDigits(String(Math.round((mb / 1024) * 10) / 10))} گیگابایت`
        : `${faDigits(String(Math.round(mb)))} مگابایت`;
    let title = vol;
    if (windowLabel) title += ` (${windowLabel})`;
    if (hourly) title += ' ساعتی';
    let kind = 'internet';

    // combo extras kept from the raw title
    if (/فوتبالی/.test(rawTitle)) {
      kind = 'combo';
      title = `${vol} فوتبالی پلاس`;
      notes.push('ترکیبی: ۲۰۲۶ دقیقه مکالمه درون‌شبکه · قابل استفاده در سرویس‌های ورزشی (آپارات‌اسپرت، آنتن، آی‌اسپورت، ورزش۳، فوتبال۳۶۰)');
    }
    if (/جونیور/.test(rawTitle)) {
      title = `بسته جونیور ${vol}`;
      notes.push('به‌همراه اشتراک پلتفرم‌های دیجیتال (فرادرس، فیلیمومدرسه، تاملند، لینگانو، طاقچه و…)');
    }

    const key = `${Math.round(mb)}|${days}|${toman}`;
    if (seen.has(key)) continue; // the promo list repeats a few offers verbatim
    seen.add(key);

    packages.push({
      id: `irancell-my-${upc || packages.length}`,
      title,
      kind,
      gb: Math.round((mb / 1024) * 10000) / 10000,
      days, price: toman,
      oldPrice: null, discountPct: null,
      group: null,
      regulatoryCode: o.cra_info?.code ? String(o.cra_info.code) : null,
      ussd: null,
      note: notes.join(' · ') || null,
    });
  }
  return { packages, excluded };
}

/* ── C) mobile orchestrator: web (input→live→stale-keep) + portal (input→ride-along) ── */
async function fetchIrancell() {
  const argv = process.argv;
  const inputIdx = argv.indexOf('--input');
  const atIdx = argv.indexOf('--fetched-at');
  const fetchedAt = atIdx !== -1 && argv[atIdx + 1] ? argv[atIdx + 1] : new Date().toISOString();
  const inputPath = inputIdx !== -1 && argv[inputIdx + 1] ? argv[inputIdx + 1] : null;
  let inputRaw = null;
  if (inputPath) inputRaw = JSON.parse(await readFile(path.resolve(ROOT, inputPath), 'utf-8'));

  /* previous capture — portal packs ride along on every auto web refresh */
  let prev = null;
  try { prev = JSON.parse(await readFile(path.join(DATA_DIR, 'irancell.json'), 'utf-8')); } catch { /* none */ }
  const prevPortalPacks = (prev?.packages || []).filter((p) => /^irancell-my-/.test(p.id));
  const prevWebMeta = prev?.source?.parts?.web ?? (prev && prev.source?.kind ? prev.source : null);
  const prevPortalAt = prev?.source?.parts?.portal?.fetchedAt ?? null;

  /* input triage: HAR → portal offers (+ mobile products if captured too);
     bare array → mobile products JSON (legacy manual flow) */
  let webFromInput = null;
  let portalFromInput = null;
  if (inputRaw) {
    if (Array.isArray(inputRaw) && inputRaw[0]?.specification_contents) {
      webFromInput = inputRaw;
    } else if (inputRaw?.log?.entries) {
      const errs = [];
      try {
        for (const e of inputRaw.log.entries) {
          const url = String(e.request?.url || '');
          if (!url.includes('/e/products/5e16bf95d11fd7209ba56b20')) continue;
          if ((e.response?.status || 0) !== 200) continue;
          let text = e.response.content?.text || '';
          if (!text) continue;
          if (e.response.content.encoding === 'base64') text = Buffer.from(text, 'base64').toString('utf8');
          const d = JSON.parse(text);
          if (Array.isArray(d) && d.length) { webFromInput = d; break; }
        }
        if (!webFromInput) throw new Error('no mobile /e/products response');
      } catch (e) { errs.push(`web: ${e.message}`); }
      try { portalFromInput = irancellPortalFromInput(inputRaw); } catch (e) { errs.push(`portal: ${e.message}`); }
      if (!webFromInput && !portalFromInput) {
        // an explicit --input must not silently degrade to another source
        throw new Error(`--input matched no Irancell source (${errs.join(' · ')})`);
      }
    } else {
      throw new Error('unrecognized irancell --input (expected HAR or products array)');
    }
  }

  /* web part: input → live → stale-keep (≤14d) */
  let web = null; // { kind, fetchedAt, packages, excluded, stale? }
  if (webFromInput) {
    web = { kind: 'api', fetchedAt, ...irancellWebPacks(webFromInput) };
  } else {
    try {
      web = { kind: 'api', fetchedAt, ...irancellWebPacks(await irancellProductsFromUrl(IRANCELL_URL, 'https://irancell.ir/o/1001/mobile-internet-packages')) };
    } catch (e) {
      const ageDays = prevWebMeta?.fetchedAt ? (Date.now() - Date.parse(prevWebMeta.fetchedAt)) / 86400000 : Infinity;
      if ((prev?.packages || []).some((p) => !/^irancell-my-/.test(p.id)) && ageDays <= IRANCELL_STALE_DAYS) {
        console.log(`• irancell: web catalog unreachable from here (${e.message}) — kept the ${prevWebMeta.fetchedAt.slice(0, 10)} web capture (${ageDays.toFixed(1)}d old ≤ ${IRANCELL_STALE_DAYS}d)`);
        web = {
          kind: prevWebMeta.kind || 'api',
          fetchedAt: prevWebMeta.fetchedAt,
          packages: (prev?.packages || []).filter((p) => !/^irancell-my-/.test(p.id)),
          excluded: prev?.excluded || [],
          stale: true,
        };
      } else {
        throw new Error(`web catalog unreachable (${e.message}) and no fresh capture to keep`);
      }
    }
  }

  /* portal part: input → keep previous (live needs a logged-in Bearer token) */
  let portal = null; // { fetchedAt, packages, excluded }
  if (portalFromInput) {
    portal = { fetchedAt: portalFromInput.fetchedAt || fetchedAt, ...irancellPortalPacks(portalFromInput.offers) };
    if (!portal.packages.length) throw new Error('portal HAR parsed but yielded no data packages');
  } else if (prevPortalPacks.length) {
    console.log(`• irancell: kept my.irancell.ir portal capture${prevPortalAt ? ` from ${prevPortalAt.slice(0, 10)}` : ''} (portal API needs login — refresh with --input <my.irancell.ir.har> from inside Iran)`);
  }

  /* merge: web first, then portal packs the web doesn't already sell
     (same size+duration+price ⇒ same pack; the portal prices overlap in RIAL
     but convert to the identical toman figure — verified 2026-11-15). */
  const seen = new Set();
  const key = (p) => `${p.gb}|${p.days}|${p.price}`;
  const merged = [];
  for (const p of web.packages) {
    const k = key(p);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(p);
  }
  let portalOnlyCount = 0;
  let discountedTwins = 0;
  const portalPacks = portal ? portal.packages : prevPortalPacks;
  const webKey = (p) => `${p.gb}|${p.days}`;
  for (const p of portalPacks) {
    const k = key(p);
    if (seen.has(k)) continue; // the web sells it at the same price — web card wins
    seen.add(k);
    /* portal-only: same size but cheaper than the web card ⇒ app-exclusive
       price; stamp for the UI badge + per-package buy deep link. The
       «قیمت ویژه» note only pairs PLAIN packs with their web twin — windowed
       (۲–۷صبح/۶–۱۲) / ساعتی / combo packs are different products, their own
       note already explains the price. */
    const plain = !/۲ تا ۷ صبح|۶ صبح تا ۱۲ ظهر|ساعتی|فوتبالی|جونیور/.test(p.title);
    const twin = plain ? web.packages.find((w) => webKey(w) === webKey(p) && w.price > p.price) : undefined;
    // strip a previously-stamped twin prefix so ride-along re-stamping stays idempotent
    const baseNote = (p.note || '').replace(/^قیمت ویژه اپلیکیشن ایرانسل من \(وب‌سایت: [^)]* تومان\)(?: · )?/, '');
    const note = twin
      ? `قیمت ویژه اپلیکیشن ایرانسل من (وب‌سایت: ${faDigits(String(twin.price))} تومان)${baseNote ? ` · ${baseNote}` : ''}`
      : (baseNote || null);
    merged.push({ ...p, note, portalOnly: true, buyUrl: MY_IRANCELL_PROMO_PAGE });
    if (twin) discountedTwins += 1;
    portalOnlyCount += 1;
  }
  merged.sort((a, b) => a.price / a.gb - b.price / b.gb);
  if (portalOnlyCount) {
    console.log(`• irancell: ${portalOnlyCount} portal-only pack(s)${discountedTwins ? ` (${discountedTwins} app-exclusive price)` : ''} → «فروش فقط از اپ ایرانسل من / my.irancell.ir» (buyUrl → ${MY_IRANCELL_PROMO_PAGE})`);
  }
  const excluded = [...web.excluded, ...(portal ? portal.excluded : (prev?.excluded || []).filter((x) => /اشتراک/.test(x.reason)))];
  const portalAt = portal ? portal.fetchedAt : prevPortalAt;
  const fetchedAtAll = [web.fetchedAt, portalAt].filter(Boolean).sort().pop();

  await writeProvider('irancell', {
    schema: 2,
    provider: {
      id: 'irancell', nameFa: 'ایرانسل', nameEn: 'Irancell', category: 'mobile',
      tech: '4G/5G', regions: ['سراسری'], accent: '#eab308',
      site: 'https://www.irancell.ir', buyUrl: 'https://irancell.ir/o/1001/mobile-internet-packages',
    },
    source: {
      kind: web.kind,
      endpoint: 'ادغام دو منبع: کاتالوگ عمومی irancell.ir/e/products (خودکار) + اپلیکیشن ایرانسل‌من my.irancell.ir (فقط HAR از داخل ایران)',
      fetchedAt: fetchedAtAll,
      parts: {
        web: {
          kind: web.kind,
          endpoint: 'GET irancell.ir/e/products/5e16bf95d11fd7209ba56b20 (public catalog JSON)',
          fetchedAt: web.fetchedAt,
        },
        ...(portalPacks.length
          ? {
            portal: {
              kind: 'har',
              endpoint: 'GET my.irancell.ir/api/catalog/v2/offers (normal + promo) — کاتالوگ اپ ایرانسل‌من؛ API نیازمند ورود، بروزرسانی فقط با HAR از داخل ایران',
              fetchedAt: portalAt,
            },
          }
          : {}),
      },
    },
    prices: { unit: 'toman', includesTax: false, apiUnit: 'toman (web) · rial (portal)' },
    packages: merged,
    excluded,
  });
}

/* ── D) TD-LTE catalog → irancell-tdlte.json (public, auto-refreshes) ── */
/* Same /e/products shape as the mobile catalog. Volume from the traffic spec
   (MB); the three «N مگابیت اقتصادی» speed plans report traffic="unlimited"
   but their desc HTML carries the true cap («… ۳۰ روزه ۶۰ گیگابایت») —
   parsed from there, with the speed ceiling kept in the note. */
async function fetchIrancellTdlte() {
  const argv = process.argv;
  const inputIdx = argv.indexOf('--input');
  const atIdx = argv.indexOf('--fetched-at');
  const fetchedAt = atIdx !== -1 && argv[atIdx + 1] ? argv[atIdx + 1] : new Date().toISOString();
  const inputPath = inputIdx !== -1 && argv[inputIdx + 1] ? argv[inputIdx + 1] : null;
  let inputRaw = null;
  if (inputPath) inputRaw = JSON.parse(await readFile(path.resolve(ROOT, inputPath), 'utf-8'));

  let items = null;
  if (inputRaw) {
    if (Array.isArray(inputRaw) && inputRaw[0]?.specification_contents) {
      items = inputRaw;
    } else if (inputRaw?.log?.entries) {
      for (const e of inputRaw.log.entries) {
        const url = String(e.request?.url || '');
        if (!url.includes('/e/products/5e16bfacd11fd7209ba56b22')) continue;
        if ((e.response?.status || 0) !== 200) continue;
        let text = e.response.content?.text || '';
        if (!text) continue;
        if (e.response.content.encoding === 'base64') text = Buffer.from(text, 'base64').toString('utf8');
        const d = JSON.parse(text);
        if (Array.isArray(d) && d.length) { items = d; break; }
      }
      if (!items) throw new Error('no TD-LTE /e/products response in HAR');
    } else {
      throw new Error('unrecognized irancell-tdlte --input (expected HAR or products array)');
    }
  }

  /* previous capture — stale-keep (≤14d) when the live fetch fails */
  let prev = null;
  try { prev = JSON.parse(await readFile(path.join(DATA_DIR, 'irancell-tdlte.json'), 'utf-8')); } catch { /* none */ }

  if (!items) {
    try {
      items = await irancellProductsFromUrl(IRANCELL_TDLTE_URL, IRANCELL_TDLTE_PAGE);
    } catch (e) {
      const prevAt = prev?.source?.fetchedAt;
      const ageDays = prevAt ? (Date.now() - Date.parse(prevAt)) / 86400000 : Infinity;
      if (prev?.packages?.length && ageDays <= IRANCELL_STALE_DAYS) {
        console.log(`• irancell-tdlte: catalog unreachable from here (${e.message}) — kept the ${prevAt.slice(0, 10)} capture (${ageDays.toFixed(1)}d old)`);
        await writeProvider('irancell-tdlte', prev);
        return;
      }
      throw new Error(`TD-LTE catalog unreachable (${e.message}) and no fresh capture to keep`);
    }
  }

  const packages = [];
  const excluded = [];
  for (const it of items) {
    const faRaw = String(it.name?.fa || '').replace(/\s+/g, ' ').trim();
    const price = Math.round(Number(it.price) || 0); // toman, pre-tax
    const days = irancellDays(irancellSpec(it, 'package_type').value);
    const trafficDesc = irancellSpec(it, 'traffic').desc;
    const isSpeedPlan = /مگابیت\s*اقتصادی/.test(faRaw);

    let mb = 0;
    if (/unlimited/i.test(trafficDesc)) {
      // speed plan: the desc HTML carries the true cap («تا ۲ مگابیت بر ثانیه ۳۰ روزه ۶۰ گیگابایت»)
      mb = titleVolumeMB(String(it.desc?.fa || ''));
    } else {
      mb = parseFloat(enDigits(trafficDesc)) || 0;
      if (!mb) mb = titleVolumeMB(faRaw);
    }

    if (!(mb > 0) || !(days > 0) || !(price > 0)) {
      excluded.push({ title: faDigits(faRaw) || it.id || '?', reason: 'حجم، مدت یا قیمت نامشخص' });
      continue;
    }
    const gb = Math.round((mb / 1024) * 10000) / 10000;

    const notes = ['ویژه سیم‌کارت TD-LTE ایرانسل (مودم / اینترنت ثابت)'];
    if (isSpeedPlan) {
      const m = faRaw.match(/(\d+)\s*مگابیت/);
      if (m) notes.unshift(`سقف سرعت ${faDigits(m[1])} مگابیت بر ثانیه`);
    }
    if (irancellSpec(it, 'buy_of_app').value === 'no') {
      notes.push('فقط از وب‌سایت قابل خرید است — در اپلیکیشن ایرانسل عرضه نمی‌شود');
    }

    const title = faDigits(
      enDigits(faRaw)
        .replace(/(\d)\s*(گیگابایت|مگابایت|گیگ|مگ|مگابیت)/g, '$1 $2')
        .replace(/([^ (])\(/g, '$1 ('),
    );

    packages.push({
      id: `irancell-tdlte-${it.id}`,
      title,
      kind: 'internet',
      gb, days, price,
      oldPrice: null, discountPct: null,
      group: null,
      regulatoryCode: null,
      ussd: irancellSpec(it, 'ussd').desc || irancellSpec(it, 'ussd').value
        || irancellSpec(it, 'dial_number').desc || irancellSpec(it, 'dial_number').value || null,
      note: notes.join(' · '),
    });
  }
  if (!packages.length) throw new Error('no packages parsed');
  packages.sort((a, b) => a.price / a.gb - b.price / b.gb);

  await writeProvider('irancell-tdlte', {
    schema: 2,
    provider: {
      id: 'irancell-tdlte', nameFa: 'ایرانسل (ثابت)', nameEn: 'Irancell TD-LTE', category: 'home',
      tech: 'TD-LTE', regions: ['سراسری'], accent: '#eab308',
      site: 'https://www.irancell.ir', buyUrl: IRANCELL_TDLTE_PAGE,
    },
    source: {
      kind: 'api',
      endpoint: 'GET irancell.ir/e/products/5e16bfacd11fd7209ba56b22 (public TD-LTE catalog JSON)',
      fetchedAt,
    },
    prices: { unit: 'toman', includesTax: false, apiUnit: 'toman' },
    packages, excluded,
  });
}

/* ─────────── rightel — portal "purchasable packages" API (HARs 2026-11-07 + 2026-11-14) ─────────── */
/* One API feeds two docs: mobile (internet + رایتا combos) and modem data-SIMs
   (listed on the site as the home/fixed alternative). See header for details.
   The SPA authenticates first: POST auth/authenticate {"username":"website"}
   → 24 h JWT, then GETs the catalog with `Authorization: Bearer …`. The
   browser GET's preflight explicitly requests the `authorization` header
   (2026-11-14 HAR); Chrome strips the header value in HAR exports, which is
   why the first adapter wrongly called the API unauthenticated. */
const RIGHTEL_API = 'https://portal-api.rightel.ir/extra-package/api/v1/extra-package-direct/web-site/purchasable-package';
const RIGHTEL_AUTH = 'https://portal-api.rightel.ir/user-management/api/v1/auth/authenticate';
const RIGHTEL_PAGE = 'https://package.rightel.ir/packagesList';
const RIGHTEL_STALE_DAYS = 7;

/** Accepts a raw HAR, the data[] array, or the {data:[…]} response object. */
function rightelItemsFromInput(raw) {
  if (raw?.log?.entries) {
    const items = [];
    for (const e of raw.log.entries) {
      if (!e.request?.url?.includes('/web-site/purchasable-package')) continue;
      if ((e.response?.status || 0) !== 200) continue;
      const txt = e.response.content?.text;
      if (!txt) continue;
      const d = JSON.parse(txt);
      if (Array.isArray(d?.data)) items.push(...d.data);
    }
    if (items.length) return items;
    throw new Error('no purchasable-package responses found in HAR');
  }
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  throw new Error('unrecognized --input shape (expected HAR or data array)');
}

/** Anonymous "website" login (same as the SPA): {"username":"website"} →
 *  {"data":{"token":"<JWT>"}}. No password; JWT is roles [Website], 24 h.
 *  Throws {network:true} errors when the host is unreachable (geo-block),
 *  plain errors when the endpoint answers but refuses. */
async function rightelWebsiteToken() {
  const res = await fetch(RIGHTEL_AUTH, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: RIGHTEL_PAGE,
      Referer: `${RIGHTEL_PAGE}/`,
      'User-Agent': UA,
    },
    body: JSON.stringify({ username: 'website' }),
    signal: AbortSignal.timeout(20000),
  }).catch((e) => {
    const err = new Error(`auth unreachable: ${e.message}`);
    err.network = true;
    throw err;
  });
  if (!res.ok) throw new Error(`auth HTTP ${res.status}`);
  const json = await res.json();
  const token = json?.data?.token;
  if (!token) throw new Error('auth response carried no data.token');
  return token;
}

async function rightelItemsFromApi() {
  const headers = {
    Accept: 'application/json',
    Origin: RIGHTEL_PAGE,
    Referer: `${RIGHTEL_PAGE}/`,
    'User-Agent': UA,
  };
  // Full browser flow (2026-11-14 HAR): anonymous website JWT → Bearer GET.
  // Same host serves auth and catalog, so a network-level auth failure means
  // the host is unreachable (geo-block) — no point trying the catalog. An
  // HTTP-level auth failure falls back to the bare GET (how the 2026-11-07
  // adapter worked) in case the catalog endpoint itself stays open.
  let authNote = '';
  try {
    headers.Authorization = `Bearer ${await rightelWebsiteToken()}`;
  } catch (e) {
    if (e.network) throw e;
    authNote = ` (auth failed: ${e.message} — trying without token)`;
  }
  let res = await fetch(`${RIGHTEL_API}?d=${Date.now()}`, {
    headers,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok && headers.Authorization) {
    // token rejected (expired/invalid) → one bare retry before failing
    const bare = { ...headers };
    delete bare.Authorization;
    const retry = await fetch(`${RIGHTEL_API}?d=${Date.now()}`, {
      headers: bare,
      signal: AbortSignal.timeout(20000),
    });
    if (retry.ok) {
      const j = await retry.json();
      if (Array.isArray(j?.data)) {
        console.log(`• rightel: catalog served without token (Bearer got HTTP ${res.status})`);
        return j.data;
      }
    }
    throw new Error(`HTTP ${res.status} with token, HTTP ${retry.status} without${authNote}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}${authNote}`);
  const json = await res.json();
  if (!Array.isArray(json?.data)) throw new Error(`unexpected response shape${authNote}`);
  return json.data;
}

/** «1 روزه 300 مگابایت» / «1 ماهه 15 گیگابایت» / «1ساله 300 گیگابایت» → {gb, days} */
function rightelNameParse(name) {
  const s = enDigits(String(name).replace(/\s+/g, ' '));
  let days = 0, gb = 0;
  let m = s.match(/(\d+(?:\.\d+)?)\s*روزه/);
  if (m) days = +m[1];
  m = s.match(/(\d+(?:\.\d+)?)\s*ماهه/);
  if (m) days = +m[1] * 30;
  m = s.match(/(\d+(?:\.\d+)?)\s*ساله/);
  if (m) days = +m[1] * 365;
  m = s.match(/(\d+(?:\.\d+)?)\s*گیگابایت/);
  if (m) gb = +m[1];
  else if ((m = s.match(/(\d+(?:\.\d+)?)\s*مگابایت/))) gb = +m[1] / 1024;
  return { gb: Math.round(gb * 10000) / 10000, days };
}

/** «ویژه ساعات 2 الی 7 صبح» → short window note for title/note. */
function rightelWindow(descFa) {
  const s = enDigits(String(descFa || ''));
  if (/2\s*الی\s*7\s*صبح/.test(s)) return { title: ' (۲ تا ۷ صبح)', note: 'قابل استفاده از ۲ تا ۷ صبح' };
  if (/6\s*صبح\s*الی\s*12\s*ظهر/.test(s)) return { title: ' (۶ صبح تا ۱۲ ظهر)', note: 'قابل استفاده از ۶ صبح تا ۱۲ ظهر' };
  return null;
}

function rightelDocs(items, fetchedAt) {
  const mobile = [], modem = [], excluded = [], modemExcluded = [];
  const seenMobile = new Set(), seenModem = new Set(), seenExcluded = new Set();
  for (const item of items) {
    const p = item.purchasablePackage || {};
    const cats = (item.channelCategories || []).map((c) => c.channelCategoryNameEn);
    const name = String(p.purchasablePackageNameFa || '').replace(/\s+/g, ' ').trim();
    const price = Math.round((Number(p.packagePrice) || 0) / 10); // rial → toman
    const win = rightelWindow(p.descriptionFa);

    if (cats.includes('Modem')) {
      const key = `modem|${name}|${price}`;
      if (seenModem.has(key)) continue;
      seenModem.add(key);
      const { gb, days } = rightelNameParse(name);
      if (!(gb > 0) || !(days > 0) || !(price > 0)) {
        modemExcluded.push({ title: faDigits(name), reason: 'بسته مودم — حجم، مدت یا قیمت نامشخص' });
        continue;
      }
      modem.push({
        id: `rightel-tdlte-${p.purchasablePackageId}`,
        title: faDigits(`بسته اینترنت مودم ${name}`),
        kind: 'internet',
        gb, days, price,
        oldPrice: null, discountPct: null,
        group: null,
        regulatoryCode: p.regulatoryLicense || null,
        ussd: p.purchaseUssdCode || null,
        note: 'ویژه سیم‌کارت دیتا/مودم رایتل',
      });
      continue;
    }

    if (cats.includes('Hybrid')) {
      // «رایتا 10» — volume from descriptionEn "1 month (10 GB + 100 min call + 100 SMS)"
      const key = `hybrid|${name}|${price}`;
      if (seenMobile.has(key)) continue;
      seenMobile.add(key);
      const en = String(p.descriptionEn || '');
      const gb = +(en.match(/(\d+(?:\.\d+)?)\s*GB/i) || [])[1] || 0;
      const days = /1\s*month/i.test(en) ? 30 : 0;
      if (!(gb > 0) || !(days > 0) || !(price > 0)) {
        excluded.push({ title: faDigits(name), reason: 'ترکیبی — حجم یا مدت نامشخص' });
        continue;
      }
      mobile.push({
        id: `rightel-${p.purchasablePackageId}`,
        title: faDigits(`بسته ترکیبی ${name} (${gb} گیگ + ${en.match(/(\d+)\s*min/i)?.[1] ?? '?'} دقیقه + ${en.match(/(\d+)\s*SMS/i)?.[1] ?? '?'} پیامک، ${days} روزه)`),
        kind: 'combo',
        gb, days, price,
        oldPrice: null, discountPct: null,
        group: null,
        regulatoryCode: p.regulatoryLicense || null,
        ussd: p.purchaseUssdCode || null,
        note: p.marketingNotes ? faDigits(enDigits(p.marketingNotes).replace(/\s+/g, ' ').trim()) : null,
      });
      continue;
    }

    if (!cats.includes('internet')) {
      // Call / SMS / International call / Roaming — no data volume to rank
      const key = `excl|${name}`;
      if (seenExcluded.has(key)) continue;
      seenExcluded.add(key);
      const reason = cats.includes('Roaming')
        ? `رومینگ${p.descriptionFa ? ' ' + String(p.descriptionFa).trim() : ''} — خارج از ایران، خارج از دامنه‌ی مقایسه`
        : cats.includes('International call')
          ? 'تماس بین‌الملل — مکالمه است، حجم داده ندارد'
          : cats.includes('Call')
            ? 'فقط مکالمه — حجم داده ندارد'
            : 'فقط پیامک — حجم داده ندارد';
      excluded.push({ title: faDigits(name), reason });
      continue;
    }

    // internet (mobile) — POSTPAID/PREPAID twins dedupe (identical name+price+window)
    const key = `net|${name}|${price}|${win ? win.note : ''}`;
    if (seenMobile.has(key)) continue;
    seenMobile.add(key);
    const { gb, days } = rightelNameParse(name);
    if (!(gb > 0) || !(days > 0) || !(price > 0)) {
      excluded.push({ title: faDigits(name), reason: 'حجم، مدت یا قیمت نامشخص' });
      continue;
    }
    mobile.push({
      id: `rightel-${p.purchasablePackageId}`,
      title: faDigits(`بسته اینترنت ${name}${win ? win.title : ''}`),
      kind: 'internet',
      gb, days, price,
      oldPrice: null, discountPct: null,
      group: null,
      regulatoryCode: p.regulatoryLicense || null,
      ussd: p.purchaseUssdCode || null,
      note: win ? win.note : null,
    });
  }
  if (!mobile.length) throw new Error('no internet packages parsed from Rightel payload');
  if (!modem.length) throw new Error('no modem packages parsed from Rightel payload');
  mobile.sort((a, b) => a.price / a.gb - b.price / b.gb);
  modem.sort((a, b) => a.price / a.gb - b.price / b.gb);

  const rightelDoc = {
    schema: 2,
    provider: {
      id: 'rightel', nameFa: 'رایتل', nameEn: 'Rightel', category: 'mobile',
      tech: '4G/5G', regions: ['سراسری'], accent: '#A72B77',
      site: 'https://www.rightel.ir', buyUrl: RIGHTEL_PAGE,
    },
    source: {
      kind: 'api',
      endpoint: 'GET portal-api.rightel.ir/…/web-site/purchasable-package — پنل رسمی رایتل (ابتدا توکن ناشناس website با POST auth/authenticate، سپس GET با Authorization: Bearer — طبق HAR ۲۰۲۶-۱۱-۱۴)',
      fetchedAt,
    },
    prices: { unit: 'toman', includesTax: false, apiUnit: 'rial' },
    packages: mobile,
    excluded,
  };
  const modemDoc = {
    schema: 2,
    provider: {
      id: 'rightel-tdlte', nameFa: 'رایتل (مودم)', nameEn: 'Rightel Modem', category: 'home',
      tech: 'سیم‌کارت دیتا · 4G/5G', regions: ['سراسری'], accent: '#A72B77',
      site: 'https://www.rightel.ir', buyUrl: RIGHTEL_PAGE,
    },
    source: {
      kind: 'api',
      endpoint: 'GET portal-api.rightel.ir/…/web-site/purchasable-package (با توکن ناشناس website) — دسته‌ی «بسته مودم» (سیم‌کارت دیتا)',
      fetchedAt,
    },
    prices: { unit: 'toman', includesTax: false, apiUnit: 'rial' },
    packages: modem,
    excluded: modemExcluded,
  };
  return { rightelDoc, modemDoc };
}

async function fetchRightel() {
  const argv = process.argv;
  const inputIdx = argv.indexOf('--input');
  const atIdx = argv.indexOf('--fetched-at');
  const fetchedAt = atIdx !== -1 && argv[atIdx + 1] ? argv[atIdx + 1] : new Date().toISOString();

  let items;
  if (inputIdx !== -1 && argv[inputIdx + 1]) {
    items = rightelItemsFromInput(JSON.parse(await readFile(path.resolve(ROOT, argv[inputIdx + 1]), 'utf-8')));
  } else {
    try {
      items = await rightelItemsFromApi();
    } catch (e) {
      // geo-blocked (timeout from outside Iran) → keep a recent capture
      try {
        const prev = JSON.parse(await readFile(path.join(DATA_DIR, 'rightel.json'), 'utf-8'));
        const ageDays = prev.source?.fetchedAt ? (Date.now() - Date.parse(prev.source.fetchedAt)) / 86400000 : Infinity;
        if (ageDays <= RIGHTEL_STALE_DAYS) {
          console.log(`• rightel: kept capture from ${prev.source.fetchedAt} (${ageDays.toFixed(1)}d old) — API unreachable from here (${e.message})`);
          return;
        }
        console.log(`• rightel: capture is ${Number.isFinite(ageDays) ? ageDays.toFixed(1) : '?'}d old — refresh with: node update/fetch-providers.mjs --only rightel --input <har|json>`);
      } catch { /* no previous file */ }
      throw e;
    }
  }
  const { rightelDoc, modemDoc } = rightelDocs(items, fetchedAt);
  await writeProvider('rightel', rightelDoc);
  await writeProvider('rightel-tdlte', modemDoc);
}

/* ─────────── awaiting-capture providers ─────────── */
async function waitingStep(id, why) {
  return keepExisting(id, why);
}

const ADAPTERS = {
  samantel: fetchSamantel,
  aptel: fetchAptel,
  mci: fetchMci,
  'mci-modem': fetchMci,
  irancell: fetchIrancell,
  'irancell-tdlte': fetchIrancellTdlte,
  rightel: fetchRightel,
  'rightel-tdlte': fetchRightel,
  tci: () => waitingStep('tci', 'geo-blocked outside Iran'),
  asiatech: () => waitingStep('asiatech', 'geo-blocked outside Iran'),
};

await mkdir(DATA_DIR, { recursive: true });
const results = [];
for (const [id, fn] of Object.entries(ADAPTERS)) {
  if (only && id !== only) continue;
  if (iranOnly && !IRAN_ONLY_IDS.has(id)) continue;
  try { await fn(); results.push([id, true, '']); }
  catch (e) { results.push([id, false, String(e && e.message || e)]); console.error(`✗ ${id}: ${e && e.message || e}`); }
}
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} adapters ok` + (failed.length ? ` — failed: ${failed.map(([id, , m]) => `${id} (${m})`).join('; ')}` : ''));
process.exit(0);
