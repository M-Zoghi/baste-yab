#!/usr/bin/env node
/**
 * fetch-providers.mjs — refreshes src/data/providers/*.json
 *
 * Adapters:
 *  • samantel  — public API (verified 2026-11): POST /api/mediator/samantel/
 *    form-encoded `method=getpackagebyproduct&productId=1`; rial priceNoTax,
 *    verified price = priceNoTax × 1.1 (10% VAT added at the gateway).
 *  • aptel     — PUBLIC API (verified 2026-11, thanks to a HAR capture):
 *    GET https://www.aptel.ir/api/ep/query?scope=public — no login needed and
 *    reachable from outside Iran. Prices in RIAL (÷10 → toman, pre-tax).
 *    packageType: 1=internet, 2=combo (voice+sms), 12=roaming (ترکیه/عراق).
 *    Same package is listed twice under two channel families (Azartel_* /
 *    AptelPrime_*) → deduped. `internetDescription` is authoritative for the
 *    volume (packageVolumne has at least one data bug: 200 MB listed as
 *    200 000). Logged-in-only "ویژه آپتل من" deals are kept as
 *    `personalized.samples` (from a 2026-11-06 capture) — public prices are
 *    NOT personalized, so they rank separately with a UI notice.
 *  • mci       — TWO sources, best one wins (both verified 2026-11-06/07 from
 *    HAR captures):
 *    A) PRIMARY — official MCI shop REST API:
 *       GET https://shop.mci.ir/api/search/v1/products?category=19&page=N&size=16
 *       (paginated until isLast). JSON, no login. 48 products vs the marketing
 *       page's 30 — includes انارستان, combo and صبحانت packs the marketing
 *       page doesn't list. `price` is RIAL pre-tax (÷10 → toman; cross-checked
 *       identical to the mci.ir catalog); the SPA cart charges
 *       `discountPrice ?? price` (verified in main-*.js) and the app config
 *       states taxPercentage=10. Volume attribute «حجم» is MB. PURCHASABILITY:
 *       only productStatus === "ACTIVE" items are sold; anything else goes to
 *       `excluded`. needToLogin="true" packs stay ranked with a note.
 *       GEO-BLOCKED outside Iran → refresh manually: save the HAR (or the
 *       paginated JSON) and run
 *         node update/fetch-providers.mjs --only mci --input <file.har|products.json>
 *       A fresh shop capture (≤7 days) always beats the fallback below.
 *    B) FALLBACK — mci.ir/internet-plans marketing page (reachable outside
 *       Iran, auto-refreshes daily): server-side .package-list-item cards,
 *       prices in TOMAN pre-tax, purchasability = خرید آنلاین button carries a
 *       data-package-code (dead listings keep a disabled button → excluded).
 *  • irancell  — PUBLIC catalog JSON (verified 2026-11-06, thanks to a HAR
 *    capture): GET https://irancell.ir/e/products/5e16bf95d11fd7209ba56b20 —
 *    no login. Prices in TOMAN, pre-tax (the page's own modal computes
 *    total = price × 1.1 from vat_percentage=0.1). Spec buy_of_app="no"
 *    marks packs sold on the website only (not in the MyIrancell app) — kept
 *    in the ranking with a note. Geo-blocked outside Iran
 *    → refresh manually: --only irancell --input <saved products.json>
 *  • rightel   — PUBLIC portal API (verified 2026-11-07, thanks to a HAR
 *    capture): package.rightel.ir/packagesList is an Angular SPA backed by
 *      GET https://portal-api.rightel.ir/extra-package/api/v1/extra-package-direct/web-site/purchasable-package?d=<ms>
 *    No login (a {"username":"website"} JWT exists but the GET carries no
 *    Authorization) and CORS *. `data[]` = 126 items in 7 channel categories:
 *    internet (72) → rightel.json; Modem (13, DATA sims) → rightel-tdlte.json;
 *    Hybrid «رایتا» (4) → mobile combos; Call/SMS/International/Roaming (37)
 *    have no data volume → excluded. Prices in RIAL pre-tax (÷10 → toman).
 *    Structured amounts (internetAmount …) are all null — volume/duration
 *    parse from the Persian name «N روزه/ماهه/ساله X گیگابایت/مگابایت».
 *    PURCHASABILITY: the endpoint returns only purchasable packages (all 126
 *    pass). POSTPAID/PREPAID twins are identical (the lone extra
 *    creditAmount=49000 on id 99 is never rendered by the SPA) → deduped to
 *    one card; time-window packs (۲–۷ صبح / ۶–۱۲) stay ranked with a note.
 *    GEO-BLOCKED outside Iran → refresh manually:
 *      node update/fetch-providers.mjs --only rightel --input <file.har|data.json>
 *  • tci / asiatech — geo-blocked outside Iran or login-gated;
 *    waiting for captures (see DATA.md).
 *
 * Usage: node update/fetch-providers.mjs [--only samantel]
 *        node update/fetch-providers.mjs --only irancell --input products.json
 *          [--fetched-at 2026-11-06T21:05:22Z]   (manual refresh from Iran)
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
      tech: 'اپراتور مجازی · 4G/5G · TD-LTE', regions: ['سراسری'], accent: '#10b981', site: 'https://samantel.ir',
      buyUrl: 'https://payment.samantel.ir/package',
    },
    source: { kind: 'api', endpoint: 'POST /api/mediator/samantel/ (getpackagebyproduct, productId=1)', fetchedAt: new Date().toISOString() },
    prices: { unit: 'toman', includesTax: false },
    packages, excluded,
  });
}

/* ─────────── aptel — public packages API (from the 2026-11-06 HAR) ─────────── */
const APTEL_URL = 'https://www.aptel.ir/api/ep/query?scope=public';

/** "20 گیگابایت" / "500 مگابایت" (fa or en digits) → GB; null if unparseable. */
function aptelDescGB(desc) {
  const m = enDigits(desc).match(/([\d.]+)\s*(گیگابایت|گیگ|مگابایت|مگ)/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (!isFinite(v) || v <= 0) return null;
  return m[2].startsWith('گیگ') ? v : v / 1024;
}

async function fetchAptel() {
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

  const RIAL = 10;
  const packages = [];
  const excluded = [];
  const seen = new Set(); // dedupe Azartel_*/AptelPrime_* channel twins
  for (const it of items) {
    const title = String(it.packageName || '').replace(/\s+/g, ' ').trim();
    // volume: description is authoritative (packageVolumne has a 200MB→200000 bug)
    let gb = aptelDescGB(it.internetDescription || '');
    const fieldGB = Number(it.packageVolumne) > 0 ? Number(it.packageVolumne) / 1024 : null;
    if (gb == null) gb = fieldGB;
    else if (fieldGB != null && Math.abs(gb - fieldGB) / gb > 0.3) {
      // trust the description — big mismatch means the field is wrong
    }
    let days = parseInt(enDigits(it.packageInitialDeltaDays), 10);
    if (!Number.isFinite(days) || days <= 0) {
      const m = title.match(/(\d+)\s*روزه/);
      days = m ? parseInt(enDigits(m[1]), 10) : 0;
    }
    const price = round((Number(it.packagePrice) || 0) / RIAL); // rial → toman, pre-tax
    if (!(gb > 0) || !(days > 0)) {
      excluded.push({ title: title || it.packageCode || '?', reason: 'حجم یا مدت نامشخص' });
      continue;
    }
    const kind = it.packageType === 2 ? 'combo' : it.packageType === 12 ? 'roaming' : 'internet';
    const key = `${kind}|${gb.toFixed(4)}|${days}|${price}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let note = null;
    if (kind === 'combo') {
      const min = enDigits(it.voiceCallOutDoorDescription || '').trim();
      const sms = enDigits(String(it.smsCount ?? '')).trim() || enDigits((it.smsDescription || '').replace(/\s*عدد/, '')).trim();
      note = `ترکیبی: ${faDigits(min || '۰')} تماس + ${faDigits(sms || '۰')} پیامک`;
    } else if (kind === 'roaming') {
      const dest = /ترکیه/.test(title) ? 'ترکیه' : /عراق/.test(title) ? 'عراق' : 'بین‌الملل';
      note = `رومینگ ${dest}`;
    }

    packages.push({
      id: `aptel-${it.packageId}`,
      title: faDigits(title),
      kind,
      gb: Math.round(gb * 10000) / 10000,
      days,
      price,
      oldPrice: Number(it.showBeforePrice) > 0 ? round(Number(it.showBeforePrice) / RIAL) : null,
      discountPct: Number(it.showBeforePrice) > 0 ? pct(price, round(Number(it.showBeforePrice) / RIAL)) : null,
      group: null,
      regulatoryCode: it.craCode ? String(it.craCode) : null,
      ussd: it.ussd || null,
      note,
    });
  }
  packages.sort((a, b) => (a.price / a.gb) - (b.price / b.gb));

  /* Logged-in-only deals are NOT in the public API — captured inside the
     subscriber portal (2026-11-06). Two kinds:
     • «ویژه آپتل من» promo packs (strike-through original price + discount badge)
     • plain-looking packs that are simply cheaper than the public catalog
       (10GB/30d @50,000 with no regulatory code, vs 65,000 public).
     They are kept here as informational samples; the UI shows them next to
     the public list instead of mixing them into the ranking. */
  const personalized = {
    applies: true,
    note: 'قیمت‌های فهرست بالا عمومی است (بدون ورود). با ورود به «آپتل من»، بسته‌های ویژه‌ی ۳۰ روزه با تخفیف، هدیه‌ی نصب و حتی نسخه‌های ارزان‌تر بعضی بسته‌های معمولی (مثل ۱۰ گیگ ۵۰٬۰۰۰ به‌جای ۶۵٬۰۰۰) نمایش داده می‌شود.',
    source: 'ضمیمه‌ی پنل مشترکین my.aptel.ir — برداشت ۱۴۰۵/۰۸/۱۵ (2026-11-06)',
    samples: [
      { title: 'ویژه آپتل من (۱۰۰ گیگ ۳۰ روزه)', gb: 100, days: 30, price: 460000, oldPrice: 600000, discountPct: 23 },
      { title: 'ویژه آپتل من (۵۰ گیگ ۳۰ روزه)', gb: 50, days: 30, price: 260000, oldPrice: 300000, discountPct: 13 },
      { title: 'ویژه آپتل من (۳۰ گیگ ۳۰ روزه)', gb: 30, days: 30, price: 160000, oldPrice: 180000, discountPct: 11 },
      { title: '۱۰ گیگ ۳۰ روزه · فقط پنل مشترکین', gb: 10, days: 30, price: 50000, oldPrice: 65000, discountPct: 23 },
      { title: 'هدیه نصب آپتل من (۵ گیگ ۷ روزه)', gb: 5, days: 7, price: 0, oldPrice: null, discountPct: null },
    ],
  };

  await writeProvider('aptel', {
    schema: 2,
    provider: {
      id: 'aptel', nameFa: 'آپتل', nameEn: 'Aptel', category: 'mobile',
      tech: 'اپراتور مجازی · 4G/5G (بستر ایرانسل/همراه اول)', regions: ['سراسری'],
      accent: '#db3328', site: 'https://www.aptel.ir', buyUrl: 'https://www.aptel.ir/packages',
    },
    source: { kind: 'api', endpoint: 'GET www.aptel.ir/api/ep/query?scope=public', fetchedAt: new Date().toISOString() },
    prices: { unit: 'toman', includesTax: false, apiUnit: 'rial' },
    personalized,
    packages, excluded,
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
const MCI_SHOP_STALE_DAYS = 7; // a shop capture up to this age beats the HTML fallback

const shopAttr = (p, title) => {
  const a = (p.attributes || []).find((x) => x.title === title);
  return a && a.attributeValueVms && a.attributeValueVms.length
    ? String(a.attributeValueVms[0].value ?? '')
    : '';
};

/** «120 روزه» → 120 */
const shopDays = (v) => parseInt(enDigits(v).replace(/[^\d]/g, ''), 10) || 0;

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

function mciShopDoc(items, fetchedAt) {
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

    const title = faDigits(
      enDigits(name)
        .replace(/\s*\(\s*ویژه مشترکین جدید[^)]*\)\s*$/, '')
        // «انارستان۷ روزه» / «30روزه» / «6صبح» — bind digits to neighbors with spaces
        .replace(/([\u0600-\u06FF])\s*(\d)/g, '$1 $2')
        .replace(/(\d)\s*([\u0600-\u06FF])/g, '$1 $2')
        .replace(/\s*\+\s*/g, ' + ')
        .replace(/\s*,\s*/g, '، ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
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
  return {
    schema: 2,
    provider: {
      id: 'mci', nameFa: 'همراه اول', nameEn: 'MCI', category: 'mobile',
      tech: '4G/5G', regions: ['سراسری'], accent: '#0095da',
      site: 'https://mci.ir', buyUrl: MCI_SHOP_PAGE,
    },
    source: {
      kind: 'api',
      endpoint: 'GET shop.mci.ir/api/search/v1/products?category=19 (paginated) — فروشگاه رسمی همراه اول',
      fetchedAt,
    },
    prices: { unit: 'toman', includesTax: false, apiUnit: 'rial' },
    packages, excluded,
  };
}

/* ─────────── mci — B) mci.ir public catalog page, server-rendered HTML ─────────── */
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

async function fetchMciCatalogHtml() {
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

  await writeProvider('mci', {
    schema: 2,
    provider: {
      id: 'mci', nameFa: 'همراه اول', nameEn: 'MCI', category: 'mobile',
      tech: '4G/5G', regions: ['سراسری'], accent: '#0095da',
      site: 'https://mci.ir', buyUrl: MCI_SHOP_PAGE,
    },
    source: { kind: 'html', endpoint: 'GET mci.ir/internet-plans (.package-list-item cards)', fetchedAt: new Date().toISOString() },
    prices: { unit: 'toman', includesTax: false, apiUnit: 'toman' },
    packages, excluded,
  });
}

/* ─────────── mci — orchestrator: shop API → fresh-shop-keep → catalog HTML ─────────── */
async function fetchMci() {
  const argv = process.argv;
  const inputIdx = argv.indexOf('--input');
  const atIdx = argv.indexOf('--fetched-at');
  const fetchedAt = atIdx !== -1 && argv[atIdx + 1] ? argv[atIdx + 1] : new Date().toISOString();

  // A) official shop API — direct (works from inside Iran) or via --input
  //    (HAR / saved JSON; works from anywhere)
  try {
    const items = inputIdx !== -1 && argv[inputIdx + 1]
      ? mciShopItemsFromInput(JSON.parse(await readFile(path.resolve(ROOT, argv[inputIdx + 1]), 'utf-8')))
      : await mciShopItemsFromApi();
    if (!items.length) throw new Error('empty shop product list');
    const doc = mciShopDoc(items, fetchedAt);
    await writeProvider('mci', doc);
    return;
  } catch (e) {
    // an explicit --input must not silently degrade to another source
    if (inputIdx !== -1 && argv[inputIdx + 1]) throw e;
    console.log(`• mci: shop API unreachable from here (${e.message}) — trying fallbacks`);
  }

  // B) keep a recent shop capture rather than regressing to the 30-pack page
  try {
    const prev = JSON.parse(await readFile(path.join(DATA_DIR, 'mci.json'), 'utf-8'));
    const ageDays = prev.source?.fetchedAt
      ? (Date.now() - Date.parse(prev.source.fetchedAt)) / 86400000
      : Infinity;
    if (prev.source?.kind === 'api' && ageDays <= MCI_SHOP_STALE_DAYS) {
      console.log(
        `• mci: kept shop capture from ${prev.source.fetchedAt} ` +
        `(${ageDays.toFixed(1)}d old ≤ ${MCI_SHOP_STALE_DAYS}d) — fresher than the marketing page;` +
        ` refresh with: node update/fetch-providers.mjs --only mci --input <har|json>`,
      );
      return;
    }
  } catch { /* no previous file — fall through */ }

  // C) mci.ir marketing page — public and reachable outside Iran
  await fetchMciCatalogHtml();
}

/* ─────────── irancell — public products JSON (from the 2026-11-06 HAR) ─────────── */
/* irancell.ir/o/1001/mobile-internet-packages loads its whole catalog from
   GET /e/products/5e16bf95d11fd7209ba56b20 — a public JSON array, no login.
   Prices are TOMAN and PRE-TAX: the page's own checkout modal computes
   `total = price × vat_percentage + price` (vat_percentage = 0.1).
   Volume quirks (verified across all 42 items of the capture):
   • spec `traffic` is MB but counts ONLY the anytime part of split packs —
     «۵۰۰ مگابایت و ۱ گیگابایت(۲ تا ۷ صبح)» has traffic=500; the 1 GB night
     part is missing. → the Persian title is parsed for the true total.
   • «ترکیب برنده …» combos have traffic=0; volume only in the title.
   • «تعرفه آزاد …ت هرگیگ» items are OOB per-GB rate plans (time-windowed,
     e.g. 2–7 AM) with no fixed volume → excluded.
   Geo-blocked outside Iran → refresh manually from inside Iran:
     node update/fetch-providers.mjs --only irancell --input products.json */
const IRANCELL_URL = 'https://irancell.ir/e/products/5e16bf95d11fd7209ba56b20';

function irancellSpec(item, key) {
  const sc = (item.specification_contents || []).find((s) => s.key === key);
  if (!sc) return { value: '', desc: '' };
  return { value: sc.value || '', desc: (sc.desc && (sc.desc.fa || sc.desc.en)) || '' };
}

/** Sum every «N گیگ/مگ» token in a Persian title → MB (۱ گیگ = ۱۰۲۴ مگ). */
function titleVolumeMB(title) {
  const s = enDigits(title);
  let mb = 0;
  const re = /(\d+(?:\.\d+)?)\s*(گیگابایت|گیگ|مگابایت|مگ)/g;
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

async function fetchIrancell() {
  const argv = process.argv;
  const inputIdx = argv.indexOf('--input');
  const atIdx = argv.indexOf('--fetched-at');
  const fetchedAt = atIdx !== -1 && argv[atIdx + 1] ? argv[atIdx + 1] : new Date().toISOString();
  let items;
  if (inputIdx !== -1 && argv[inputIdx + 1]) {
    // manual refresh from inside Iran: save the endpoint's JSON and run with --input
    items = JSON.parse(await readFile(path.resolve(ROOT, argv[inputIdx + 1]), 'utf-8'));
  } else {
    const res = await fetch(IRANCELL_URL, {
      headers: {
        Accept: '*/*',
        Referer: 'https://irancell.ir/o/1001/mobile-internet-packages',
        'User-Agent': UA,
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    items = await res.json();
  }
  if (!Array.isArray(items) || !items.length) throw new Error('unexpected payload');

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
  packages.sort((a, b) => a.price / a.gb - b.price / b.gb);

  await writeProvider('irancell', {
    schema: 2,
    provider: {
      id: 'irancell', nameFa: 'ایرانسل', nameEn: 'Irancell', category: 'mobile',
      tech: '4G/5G', regions: ['سراسری'], accent: '#eab308',
      site: 'https://www.irancell.ir', buyUrl: 'https://irancell.ir/o/1001/mobile-internet-packages',
    },
    source: {
      kind: 'api',
      endpoint: 'GET irancell.ir/e/products/5e16bf95d11fd7209ba56b20 (public catalog JSON)',
      fetchedAt,
    },
    prices: { unit: 'toman', includesTax: false, apiUnit: 'toman' },
    packages, excluded,
  });
}

/* ─────────── rightel — portal "purchasable packages" API (from the 2026-11-07 HAR) ─────────── */
/* One API feeds two docs: mobile (internet + رایتا combos) and modem data-SIMs
   (listed on the site as the home/fixed alternative). See header for details. */
const RIGHTEL_API = 'https://portal-api.rightel.ir/extra-package/api/v1/extra-package-direct/web-site/purchasable-package';
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

async function rightelItemsFromApi() {
  const tokenIdx = process.argv.indexOf('--token');
  const rawToken =
    (tokenIdx !== -1 && process.argv[tokenIdx + 1]) || process.env.RIGHTEL_TOKEN || '';
  const authHeader = rawToken
    ? { Authorization: rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}` }
    : {};

  const res = await fetch(`${RIGHTEL_API}?d=${Date.now()}`, {
    headers: {
      Accept: 'application/json',
      Origin: 'https://package.rightel.ir',
      Referer: `${RIGHTEL_PAGE}/`,
      'User-Agent': UA,
      ...authHeader,
    },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 401) {
    throw new Error('HTTP 401 — رایتل اکنون توکن/نشست می‌خواهد؛ از HAR مرورگر با --only rightel --input <file.har> استفاده کنید');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json?.data)) throw new Error('unexpected response shape');
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
      tech: '4G/5G', regions: ['سراسری'], accent: '#8b5cf6',
      site: 'https://www.rightel.ir', buyUrl: RIGHTEL_PAGE,
    },
    source: {
      kind: 'api',
      endpoint: 'GET portal-api.rightel.ir/…/web-site/purchasable-package (بدون احراز هویت) — پنل رسمی رایتل',
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
      tech: 'سیم‌کارت دیتا · 4G/5G', regions: ['سراسری'], accent: '#8b5cf6',
      site: 'https://www.rightel.ir', buyUrl: RIGHTEL_PAGE,
    },
    source: {
      kind: 'api',
      endpoint: 'GET portal-api.rightel.ir/…/web-site/purchasable-package — دسته‌ی «بسته مودم» (سیم‌کارت دیتا)',
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
  irancell: fetchIrancell,
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
