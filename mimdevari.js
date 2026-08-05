/* მიმდევარი — სკანერი, რომელიც პოულობს ცალმხრივ მიდევნებებს Instagram-ზე.
 *
 * ავტორი: 19rl96 — https://www.instagram.com/19rl96/
 * ლიცენზია: MIT
 *
 * მხოლოდ წაკითხვის რეჟიმი: არაფერს ცვლის თქვენს ანგარიშზე.
 * გამოყენება: გახსენით instagram.com, F12 -> Console, ჩასვით ეს კოდი, Enter.
 */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- guards */

  // დემო რეჟიმი — preview.html-ისთვის, ინსტაგრამის გარეშე დიზაინის სანახავად
  const DEMO = window.__MM_DEMO__ === true;

  if (!DEMO && location.hostname !== 'www.instagram.com') {
    alert('ეს სკრიპტი მუშაობს მხოლოდ instagram.com-ზე.');
    return;
  }
  if (document.getElementById('mm-app')) {
    return; // უკვე გაშვებულია
  }

  /* ------------------------------------------------------------- constants */

  const QUERY_HASH = '3dec7e2c57367ef3da3d987d89f9dbc8';
  const PER_PAGE = 48;
  const STORAGE_KEY = 'mm_protected';
  const BLANK_AVATAR_IDS = [
    '44884218_345707102882519_2446069589734326272_n',
    '464760996_1254146839119862_3605321457742435801_n',
  ];

  const T = {
    name: 'მიმდევარი',
    tagline: 'სკანერი',
    readonly: 'მხოლოდ წაკითხვის რეჟიმი',

    eyebrow: 'ანგარიშის ლოკალური შემოწმება',
    heroTitle: 'ვინ არ არის თქვენი მიმდევარი',
    heroBody:
      'სკანერი ამოწმებს, ვის მიჰყვებით ინსტაგრამზე, და აჩვენებს, ვინ არ არის თქვენი მიმდევარი. ყველაფერი მუშაობს თქვენს ბრაუზერში — მონაცემები არსად იგზავნება.',
    heroSafety:
      'ეს ხელსაწყო მხოლოდ წაკითხვის რეჟიმში მუშაობს — ის ვერაფერს შეცვლის თქვენს ანგარიშზე.',
    riskTitle: 'გამოიყენეთ საკუთარი რისკით',
    riskBody:
      'სკრიპტი იყენებს ინსტაგრამის შიდა API-ს, რაც ეწინააღმდეგება მისი მოხმარების წესებს. ანგარიშის დროებითი შეზღუდვის რისკი მცირეა, მაგრამ არსებობს.',
    scan: 'სკანირების დაწყება',
    rescan: 'ხელახლა სკანირება',
    scanNote: 'მუშაობს მხოლოდ ამ ბრაუზერის სესიაში',

    search: 'მოძებნეთ ანგარიში',
    copy: 'კოპირება',

    filters: 'ფილტრი',
    oneWay: 'ცალმხრივი',
    mutual: 'ორმხრივი',
    verified: 'ვერიფიცირებული',
    private: 'დახურული',
    noPhoto: 'ფოტოს გარეშე',

    stats: 'შეჯამება',
    shown: 'ნაჩვენები',
    checked: 'შემოწმებული',
    protectedCount: 'დაცული',

    tabList: 'სია',
    tabProtected: 'დაცული',

    pause: 'პაუზა',
    resume: 'გაგრძელება',
    page: 'გვერდი',

    protect: 'დაცულებში დამატება',
    unprotect: 'დაცულებიდან ამოღება',
    privateLabel: 'დახურული',
    verifiedLabel: 'ვერიფიცირებული',

    empty: 'ამ ფილტრით არაფერი მოიძებნა',
    waiting: 'მიმდინარეობს სკანირება…',

    done: 'სკანირება დასრულდა',
    copied: 'სია დაკოპირდა',
    nothingToCopy: 'კოპირებისთვის სია ცარიელია',
    paused: 'პაუზა',
    cooldown: (s) => `პაუზა ${s} წამი — ბლოკირების თავიდან ასაცილებლად`,
    failed: 'სკანირება ვერ მოხერხდა',
    failedDetail: 'შესაძლოა ინსტაგრამს შეუცვლია ეს მისამართი.',
    noSession: 'თქვენი სესია ვერ მოიძებნა — გთხოვთ, თავიდან შეხვიდეთ ინსტაგრამზე.',
  };

  /* ----------------------------------------------------------------- state */

  const state = {
    status: 'initial', // initial | scanning | error
    percent: 0,
    results: [],
    protectedUsers: loadProtected(),
    tab: 'list', // list | protected
    page: 1,
    search: '',
    paused: false,
    error: null,
    filter: {
      oneWay: true,
      mutual: false,
      verified: true,
      private: true,
      noPhoto: true,
    },
  };

  /* --------------------------------------------------------------- helpers */

  function cookie(name) {
    const parts = `; ${document.cookie}`.split(`; ${name}=`);
    if (parts.length !== 2) return null;
    return parts.pop().split(';').shift();
  }

  function loadProtected() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveProtected(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* quota — არ არის კრიტიკული */
    }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (min, max) => Math.floor(Math.random() * (max - min)) + min;
  const isProtected = (u) => state.protectedUsers.some((p) => p.id === u.id);
  const hasNoPhoto = (u) =>
    BLANK_AVATAR_IDS.some((id) => (u.profile_pic_url || '').includes(id));

  function visibleUsers() {
    const q = state.search.trim().toLowerCase();
    return state.results.filter((u) => {
      const prot = isProtected(u);
      if (state.tab === 'list' && prot) return false;
      if (state.tab === 'protected' && !prot) return false;

      if (!state.filter.mutual && u.follows_viewer) return false;
      if (!state.filter.oneWay && !u.follows_viewer) return false;
      if (!state.filter.verified && u.is_verified) return false;
      if (!state.filter.private && u.is_private) return false;
      if (!state.filter.noPhoto && hasNoPhoto(u)) return false;

      if (q) {
        const hay = `${u.username} ${u.full_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  const sortByName = (list) =>
    [...list].sort((a, b) => a.username.localeCompare(b.username));

  const maxPage = (list) => Math.max(1, Math.ceil(list.length / PER_PAGE));

  const pageSlice = (list, page) =>
    sortByName(list).slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* --------------------------------------------------------------- styling */

  const CSS = `
#mm-app {
  --paper: #faf9f7;
  --panel: #ffffff;
  --ink: #171614;
  /* კონტრასტი გაზომილია --paper-ზე: muted 6.34:1, faint 4.57:1 (WCAG AA ≥ 4.5) */
  --muted: #5f5c55;
  --faint: #757269;
  --line: rgba(23, 22, 20, 0.11);
  --line-soft: rgba(23, 22, 20, 0.06);
  --amber: #a1580b;
  --green: #15803d;
  --blue: #1d4ed8;
  --red: #b42318;
  --red-bg: rgba(180, 35, 24, 0.06);
  --red-line: rgba(180, 35, 24, 0.24);
  /* --muted წითელ ფონზე 3.78:1-მდე ეცემა — ცალკე, უფრო მუქი ტონი გვჭირდება */
  --red-body: #6e5a56;
  --ease: cubic-bezier(0.23, 1, 0.32, 1);
  --radius: 10px;

  position: fixed;
  inset: 0;
  z-index: 2147483000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--paper);
  color: var(--ink);
  font-family: "Noto Sans Georgian", "BPG Arial", system-ui, -apple-system,
    "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-color-scheme: dark) {
  #mm-app {
    --paper: #131311;
    --panel: #1b1a18;
    --ink: #f2efe9;
    --muted: #98948b;
    --faint: #8d8a82;
    --line: rgba(242, 239, 233, 0.13);
    --line-soft: rgba(242, 239, 233, 0.07);
    --amber: #e0a33a;
    --green: #6fc27f;
    --blue: #7aa2f7;
    --red: #ff8a80;
    --red-bg: rgba(255, 138, 128, 0.09);
    --red-line: rgba(255, 138, 128, 0.28);
    --red-body: #a8a29a;
  }
}

#mm-app *,
#mm-app *::before,
#mm-app *::after { box-sizing: border-box; }

/* ყურადღება: აქ "color: inherit" არ უნდა დაიწეროს — #mm-app-იანი სელექტორი
   სპეციფიკურობით სჯობნის კლასებს და ყველა ღილაკის ფერს გადაფარავს. */
#mm-app button,
#mm-app input {
  font: inherit;
  margin: 0;
}

#mm-app input { color: var(--ink); }
#mm-app button { cursor: pointer; }

/* ---------- header ---------- */

.mm-top {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 60px;
  padding: 0 18px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}

.mm-brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 0 0 auto;
}

.mm-brand b {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.mm-brand span {
  font-size: 11px;
  color: var(--faint);
}

.mm-readonly {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

.mm-readonly::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
}

.mm-search {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 320px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--paper);
  outline: none;
  transition: border-color 150ms var(--ease);
}

.mm-search::placeholder { color: var(--faint); }
.mm-search:focus { border-color: var(--ink); }
.mm-search:disabled { opacity: 0.4; }

.mm-top-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
  flex: 0 0 auto;
}

/* ---------- buttons ---------- */

.mm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: transform 160ms var(--ease), border-color 150ms var(--ease),
    background-color 150ms var(--ease), opacity 150ms var(--ease);
}

.mm-btn:active { transform: scale(0.97); }
.mm-btn:disabled { opacity: 0.38; cursor: not-allowed; transform: none; }

.mm-btn-primary {
  border-color: transparent;
  background: var(--ink);
  color: var(--paper);
  height: 40px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 600;
}

@media (hover: hover) and (pointer: fine) {
  .mm-btn:not(:disabled):hover { border-color: var(--faint); }
  .mm-btn-primary:not(:disabled):hover { border-color: transparent; opacity: 0.88; }
}

/* ---------- progress ---------- */

.mm-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  overflow: hidden;
  pointer-events: none;
}

.mm-progress i {
  display: block;
  height: 100%;
  background: var(--ink);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 400ms linear;
}

/* ---------- launch screen ---------- */

.mm-launch {
  flex: 1 1 auto;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow-y: auto;
}

.mm-launch-inner {
  width: 100%;
  max-width: 560px;
  text-align: left;
}

.mm-eyebrow {
  display: inline-block;
  margin-bottom: 18px;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 11px;
  color: var(--muted);
}

.mm-launch h1 {
  margin: 0;
  font-size: clamp(28px, 5vw, 42px);
  line-height: 1.15;
  font-weight: 640;
  letter-spacing: -0.02em;
}

.mm-launch p {
  margin: 16px 0 0;
  max-width: 46ch;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.65;
}

.mm-safety {
  display: flex;
  gap: 10px;
  margin: 22px 0 0;
  padding: 12px 14px;
  border: 1px solid var(--line-soft);
  border-left: 2px solid var(--green);
  border-radius: 0 var(--radius) var(--radius) 0;
  background: var(--panel);
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}

.mm-risk {
  margin: 10px 0 0;
  padding: 12px 14px;
  border: 1px solid var(--red-line);
  border-left: 2px solid var(--red);
  border-radius: 0 var(--radius) var(--radius) 0;
  background: var(--red-bg);
  font-size: 13px;
  line-height: 1.55;
}

.mm-risk b {
  display: block;
  margin-bottom: 3px;
  color: var(--red);
  font-weight: 650;
  letter-spacing: -0.005em;
}

.mm-risk span { color: var(--red-body); }

.mm-launch-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 26px;
  flex-wrap: wrap;
}

.mm-launch-note { color: var(--faint); font-size: 12px; }

/* ---------- workspace ---------- */

.mm-body {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  min-height: 0;
}

.mm-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 18px 16px;
  border-right: 1px solid var(--line);
  background: var(--panel);
  overflow-y: auto;
}

.mm-side h3 {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--faint);
}

.mm-check {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 0;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.mm-check input {
  width: 15px;
  height: 15px;
  accent-color: var(--ink);
  cursor: pointer;
}

.mm-stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--line-soft);
  font-size: 13px;
}

.mm-stat:last-child { border-bottom: 0; }
.mm-stat span { color: var(--muted); }
.mm-stat b { font-weight: 600; font-variant-numeric: tabular-nums; }

.mm-side-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mm-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.mm-pager b {
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}

.mm-pager button {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  line-height: 1;
  transition: transform 160ms var(--ease), color 150ms var(--ease);
}

.mm-pager button:active { transform: scale(0.9); }
.mm-pager button:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

@media (hover: hover) and (pointer: fine) {
  .mm-pager button:not(:disabled):hover { color: var(--ink); }
}

/* ---------- results ---------- */

.mm-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.mm-tabs {
  flex: 0 0 auto;
  display: flex;
  gap: 2px;
  padding: 10px 16px 0;
  border-bottom: 1px solid var(--line);
}

.mm-tab {
  position: relative;
  padding: 8px 12px 12px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  transition: color 150ms var(--ease);
}

.mm-tab::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -1px;
  height: 2px;
  background: var(--ink);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 200ms var(--ease);
}

.mm-tab[aria-selected="true"] { color: var(--ink); }
.mm-tab[aria-selected="true"]::after { transform: scaleX(1); }

@media (hover: hover) and (pointer: fine) {
  .mm-tab:hover { color: var(--ink); }
}

.mm-list {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px 16px 24px;
}

.mm-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: var(--radius);
  border-bottom: 1px solid var(--line-soft);
}

.mm-row:last-child { border-bottom: 0; }

.mm-row.mm-in {
  opacity: 0;
  transform: translateY(6px);
  animation: mm-rise 260ms var(--ease) forwards;
  animation-delay: calc(var(--i, 0) * 32ms);
}

@keyframes mm-rise {
  to { opacity: 1; transform: translateY(0); }
}

.mm-avatar {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--line-soft);
  object-fit: cover;
  background: var(--paper);
}

.mm-id { min-width: 0; flex: 1 1 auto; }

.mm-id a {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  vertical-align: middle;
}

@media (hover: hover) and (pointer: fine) {
  .mm-id a:hover { text-decoration: underline; }
}

.mm-id p {
  margin: 1px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  font-size: 12.5px;
}

.mm-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.mm-tag {
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.mm-tag-private { color: var(--amber); }
.mm-tag-mutual { color: var(--green); }

.mm-verified {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--blue);
  color: #fff;
  font-size: 10px;
  line-height: 1;
  vertical-align: middle;
  margin-left: 5px;
}

.mm-star {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--faint);
  font-size: 15px;
  line-height: 1;
  transition: transform 160ms var(--ease), color 150ms var(--ease);
}

.mm-star:active { transform: scale(0.88); }
.mm-star[data-on="1"] { color: var(--amber); }

@media (hover: hover) and (pointer: fine) {
  .mm-star:hover { color: var(--ink); }
  .mm-star[data-on="1"]:hover { color: var(--amber); }
}

.mm-empty {
  padding: 48px 8px;
  text-align: center;
  color: var(--faint);
  font-size: 13px;
}

.mm-error {
  margin: 16px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-left: 2px solid var(--amber);
  border-radius: 0 var(--radius) var(--radius) 0;
  background: var(--panel);
  font-size: 13px;
  line-height: 1.6;
}

.mm-error b { display: block; margin-bottom: 3px; }
.mm-error span { color: var(--muted); }

/* ---------- toast ---------- */

.mm-toast {
  position: fixed;
  left: 50%;
  bottom: 22px;
  z-index: 2147483001;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 11px 15px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--ink);
  font-size: 13px;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.14);
  opacity: 1;
  transform: translate(-50%, 0);
  transition: opacity 220ms var(--ease), transform 220ms var(--ease);
}

.mm-toast[data-hidden="1"] {
  opacity: 0;
  transform: translate(-50%, 12px);
  pointer-events: none;
}

/* ---------- close ---------- */

.mm-close {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--muted);
  font-size: 16px;
  line-height: 1;
  transition: transform 160ms var(--ease), color 150ms var(--ease);
}

.mm-close:active { transform: scale(0.94); }

@media (hover: hover) and (pointer: fine) {
  .mm-close:hover { color: var(--ink); }
}

/* ---------- responsive ---------- */

@media (max-width: 760px) {
  .mm-body { grid-template-columns: 1fr; }
  .mm-side {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 14px 22px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    overflow: visible;
  }
  .mm-side-foot { margin-top: 0; width: 100%; flex-direction: row; }
  .mm-side-foot .mm-btn { flex: 1; }
  .mm-side-foot .mm-pager { flex: 1; }
  .mm-top { flex-wrap: wrap; height: auto; padding: 10px 12px; gap: 8px; }
  .mm-search { max-width: none; order: 3; flex-basis: 100%; }
  .mm-readonly { display: none; }
}

/* ---------- reduced motion ---------- */

@media (prefers-reduced-motion: reduce) {
  #mm-app *,
  .mm-toast {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
  }
  .mm-row.mm-in { opacity: 1; transform: none; }
}
`;

  /* ------------------------------------------------------------------- dom */

  const el = (tag, props = {}, kids = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== false && v !== undefined)
        node.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of [].concat(kids)) if (kid) node.appendChild(kid);
    return node;
  };

  const style = el('style', { text: CSS });
  document.head.appendChild(style);

  const app = el('div', { id: 'mm-app', role: 'application' });
  document.body.appendChild(app);
  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  /* ----------------------------------------------------------------- toast */

  let toastNode = null;
  let toastTimer = null;

  function toast(text, ms = 2600) {
    clearTimeout(toastTimer);
    if (!toastNode) {
      toastNode = el('div', { class: 'mm-toast', role: 'status' });
      app.appendChild(toastNode);
    }
    toastNode.textContent = text;
    toastNode.removeAttribute('data-hidden');
    if (ms > 0) {
      toastTimer = setTimeout(() => toastNode?.setAttribute('data-hidden', '1'), ms);
    }
  }

  const hideToast = () => {
    clearTimeout(toastTimer);
    toastNode?.setAttribute('data-hidden', '1');
  };

  /* ------------------------------------------------------------ teardown */

  function destroy() {
    document.documentElement.style.overflow = prevOverflow;
    app.remove();
    style.remove();
  }

  /* ------------------------------------------------------------- rendering */

  const refs = {};

  function buildShell() {
    refs.search = el('input', {
      class: 'mm-search',
      type: 'search',
      placeholder: T.search,
      disabled: true,
      oninput: (e) => {
        state.search = e.currentTarget.value;
        state.page = 1;
        renderList();
        renderSidebar();
      },
    });

    refs.copy = el('button', {
      class: 'mm-btn',
      text: T.copy,
      disabled: true,
      onclick: () => copyList(),
    });
    refs.json = el('button', {
      class: 'mm-btn',
      text: 'JSON',
      disabled: true,
      onclick: () => download('json'),
    });
    refs.csv = el('button', {
      class: 'mm-btn',
      text: 'CSV',
      disabled: true,
      onclick: () => download('csv'),
    });

    refs.bar = el('i');

    const top = el('header', { class: 'mm-top' }, [
      el('div', { class: 'mm-brand' }, [
        el('b', { text: T.name }),
        el('span', { text: T.tagline }),
      ]),
      el('span', { class: 'mm-readonly', text: T.readonly }),
      refs.search,
      el('div', { class: 'mm-top-actions' }, [
        refs.copy,
        refs.json,
        refs.csv,
        el('button', {
          class: 'mm-close',
          text: '✕',
          title: 'დახურვა',
          onclick: destroy,
        }),
      ]),
      el('div', { class: 'mm-progress' }, [refs.bar]),
    ]);

    refs.stage = el('div', { class: 'mm-launch' });

    app.appendChild(top);
    app.appendChild(refs.stage);
  }

  function renderLaunch() {
    refs.stage.className = 'mm-launch';
    refs.stage.replaceChildren(
      el('div', { class: 'mm-launch-inner' }, [
        el('span', { class: 'mm-eyebrow', text: T.eyebrow }),
        el('h1', { text: T.heroTitle }),
        el('p', { text: T.heroBody }),
        el('div', { class: 'mm-safety' }, [el('span', { text: T.heroSafety })]),
        el('div', { class: 'mm-risk', role: 'note' }, [
          el('b', { text: `⚠ ${T.riskTitle}` }),
          el('span', { text: T.riskBody }),
        ]),
        el('div', { class: 'mm-launch-actions' }, [
          el('button', {
            class: 'mm-btn mm-btn-primary',
            text: state.results.length ? T.rescan : T.scan,
            onclick: startScan,
          }),
          el('span', { class: 'mm-launch-note', text: T.scanNote }),
        ]),
      ])
    );
  }

  function checkbox(key, label) {
    return el('label', { class: 'mm-check' }, [
      el('input', {
        type: 'checkbox',
        checked: state.filter[key],
        onchange: (e) => {
          state.filter[key] = e.currentTarget.checked;
          state.page = 1;
          renderList();
          renderSidebar();
        },
      }),
      el('span', { text: label }),
    ]);
  }

  function renderSidebar() {
    if (!refs.side) return;
    const visible = visibleUsers();
    const pages = maxPage(visible);
    if (state.page > pages) state.page = pages;

    refs.side.replaceChildren(
      el('section', {}, [
        el('h3', { text: T.filters }),
        checkbox('oneWay', T.oneWay),
        checkbox('mutual', T.mutual),
        checkbox('verified', T.verified),
        checkbox('private', T.private),
        checkbox('noPhoto', T.noPhoto),
      ]),
      el('section', {}, [
        el('h3', { text: T.stats }),
        stat(T.shown, visible.length),
        stat(T.checked, state.results.length),
        stat(T.protectedCount, state.protectedUsers.length),
      ]),
      el('div', { class: 'mm-side-foot' }, [
        state.percent < 100
          ? el('button', {
              class: 'mm-btn',
              text: state.paused ? T.resume : T.pause,
              onclick: () => {
                state.paused = !state.paused;
                if (state.paused) toast(T.paused, 0);
                else hideToast();
                renderSidebar();
              },
            })
          : null,
        el('div', { class: 'mm-pager' }, [
          el('button', {
            text: '‹',
            disabled: state.page <= 1,
            'aria-label': 'უკან',
            onclick: () => {
              state.page = Math.max(1, state.page - 1);
              renderList();
              renderSidebar();
            },
          }),
          el('b', { text: `${T.page} ${state.page}/${pages}` }),
          el('button', {
            text: '›',
            disabled: state.page >= pages,
            'aria-label': 'წინ',
            onclick: () => {
              state.page = Math.min(pages, state.page + 1);
              renderList();
              renderSidebar();
            },
          }),
        ]),
      ])
    );
  }

  const stat = (label, value) =>
    el('div', { class: 'mm-stat' }, [
      el('span', { text: label }),
      el('b', { text: String(value) }),
    ]);

  function renderWorkspace() {
    refs.stage.className = 'mm-body';
    refs.side = el('aside', { class: 'mm-side' });
    refs.list = el('div', { class: 'mm-list' });

    const tab = (id, label) =>
      el('button', {
        class: 'mm-tab',
        role: 'tab',
        text: label,
        'aria-selected': state.tab === id ? 'true' : 'false',
        onclick: () => {
          if (state.tab === id) return;
          state.tab = id;
          state.page = 1;
          renderWorkspaceTabs();
          renderList();
          renderSidebar();
        },
      });

    refs.tabs = el('nav', { class: 'mm-tabs', role: 'tablist' }, [
      tab('list', T.tabList),
      tab('protected', `${T.tabProtected} ★`),
    ]);

    refs.stage.replaceChildren(
      refs.side,
      el('section', { class: 'mm-main' }, [refs.tabs, refs.list])
    );

    renderSidebar();
    renderList();
  }

  function renderWorkspaceTabs() {
    [...refs.tabs.children].forEach((btn, i) => {
      btn.setAttribute(
        'aria-selected',
        (i === 0 ? 'list' : 'protected') === state.tab ? 'true' : 'false'
      );
    });
  }

  function toggleProtected(user) {
    state.protectedUsers = isProtected(user)
      ? state.protectedUsers.filter((p) => p.id !== user.id)
      : [...state.protectedUsers, user];
    saveProtected(state.protectedUsers);
    renderList();
    renderSidebar();
  }

  function row(user, index) {
    const prot = isProtected(user);

    const avatar = el('img', {
      class: 'mm-avatar',
      alt: '',
      loading: 'lazy',
      src: user.profile_pic_url || '',
    });
    avatar.addEventListener('error', () => {
      avatar.replaceWith(
        el('div', {
          class: 'mm-avatar',
          style:
            'display:grid;place-items:center;font-size:15px;font-weight:600;color:var(--faint)',
          text: (user.username[0] || '?').toUpperCase(),
        })
      );
    });

    const link = el('a', {
      href: `/${user.username}/`,
      target: '_blank',
      rel: 'noreferrer',
      text: user.username,
    });
    if (user.is_verified) {
      link.appendChild(
        el('span', { class: 'mm-verified', title: T.verifiedLabel, text: '✓' })
      );
    }

    const tags = el('div', { class: 'mm-tags' });
    if (user.is_private)
      tags.appendChild(el('span', { class: 'mm-tag mm-tag-private', text: T.privateLabel }));
    if (user.follows_viewer)
      tags.appendChild(el('span', { class: 'mm-tag mm-tag-mutual', text: T.mutual }));

    const node = el('div', { class: 'mm-row' }, [
      avatar,
      el('div', { class: 'mm-id' }, [
        link,
        el('p', { text: user.full_name || ' ' }),
      ]),
      tags,
      el('button', {
        class: 'mm-star',
        text: prot ? '★' : '☆',
        'data-on': prot ? '1' : '0',
        title: prot ? T.unprotect : T.protect,
        'aria-label': prot ? T.unprotect : T.protect,
        onclick: () => toggleProtected(user),
      }),
    ]);

    // სტაგერი მხოლოდ პირველი ათი ჩანაწერისთვის — თორემ სიის ჩვენება გაიწელება
    if (index < 10) {
      node.classList.add('mm-in');
      node.style.setProperty('--i', String(index));
    }
    return node;
  }

  function renderList() {
    if (!refs.list) return;

    if (state.error) {
      refs.list.replaceChildren(
        el('div', { class: 'mm-error' }, [
          el('b', { text: T.failed }),
          el('span', { text: `${T.failedDetail} (${state.error})` }),
        ])
      );
      return;
    }

    const visible = visibleUsers();
    const slice = pageSlice(visible, state.page);

    if (!slice.length) {
      refs.list.replaceChildren(
        el('div', {
          class: 'mm-empty',
          text: state.percent < 100 && !state.results.length ? T.waiting : T.empty,
        })
      );
      return;
    }

    refs.list.replaceChildren(...slice.map(row));
  }

  function setProgress(pct) {
    state.percent = pct;
    refs.bar.style.transform = `scaleX(${Math.min(1, pct / 100)})`;
    const ready = pct >= 100;
    refs.search.disabled = false;
    refs.copy.disabled = !state.results.length;
    refs.json.disabled = !state.results.length;
    refs.csv.disabled = !state.results.length;
    if (ready) refs.bar.style.transform = 'scaleX(1)';
  }

  /* ------------------------------------------------------------------ data */

  function buildUrl(cursor) {
    const uid = cookie('ds_user_id');
    const vars = {
      id: uid,
      include_reel: 'true',
      fetch_mutual: 'false',
      first: '24',
    };
    if (cursor) vars.after = cursor;
    return (
      `https://www.instagram.com/graphql/query/?query_hash=${QUERY_HASH}` +
      `&variables=${encodeURIComponent(JSON.stringify(vars))}`
    );
  }

  async function fetchPage(cursor) {
    const res = await fetch(buildUrl(cursor), { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const edge = json?.data?.user?.edge_follow;
    if (!edge) throw new Error('edge_follow');
    return edge;
  }

  async function startScan() {
    if (!DEMO && !cookie('ds_user_id')) {
      toast(T.noSession, 5000);
      return;
    }

    state.status = 'scanning';
    state.results = [];
    state.error = null;
    state.page = 1;
    state.percent = 0;
    state.paused = false;

    renderWorkspace();
    setProgress(0);

    if (DEMO) {
      await demoScan();
      return;
    }

    let cursor;
    let total = -1;
    let loaded = 0;
    let cycles = 0;
    let misses = 0;

    while (true) {
      if (state.paused) {
        await sleep(400);
        continue;
      }

      let edge;
      try {
        edge = await fetchPage(cursor);
        misses = 0;
      } catch (err) {
        misses += 1;
        if (misses >= 3) {
          state.error = err.message;
          state.status = 'error';
          hideToast();
          renderList();
          return;
        }
        await sleep(1500 * misses);
        continue;
      }

      if (total === -1) total = edge.count || 0;
      loaded += edge.edges.length;
      state.results.push(...edge.edges.map((e) => e.node));

      setProgress(total ? Math.min(99, Math.round((loaded / total) * 100)) : 0);
      renderList();
      renderSidebar();

      if (!edge.page_info.has_next_page) break;
      cursor = edge.page_info.end_cursor;

      await sleep(rand(600, 1400));

      if (++cycles % 6 === 0) {
        const wait = rand(8000, 14000);
        toast(T.cooldown(Math.round(wait / 1000)), wait);
        await sleep(wait);
        hideToast();
      }
    }

    setProgress(100);
    renderList();
    renderSidebar();
    toast(`${T.done} — ${state.results.length}`);
  }

  /* ------------------------------------------------------------------ demo */

  function demoAvatar(seed) {
    const hue = [14, 42, 96, 158, 202, 258, 318][seed % 7];
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84">` +
      `<rect width="84" height="84" fill="hsl(${hue} 38% 64%)"/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function demoUsers() {
    const names = [
      ['alina.frames', 'ალინა მორენო'],
      ['brass.and.bone', 'თეო უოლში'],
      ['citrus.archive', 'მარა კიმი'],
      ['dawn.ledger', 'ჯონ ბელი'],
      ['elias.market', 'ელიას ნური'],
      ['fieldnotes.studio', 'ნადია რეიესი'],
      ['glint.supply', 'რემი პარკი'],
      ['harbor.sequence', 'აივი ჩენი'],
      ['inkline.daily', 'სოფია გრანტი'],
      ['juniper.signal', 'კალ რიდი'],
      ['keystone.labs', 'მინა ტორესი'],
      ['lowlight.club', 'ოუენ ვოსი'],
      ['maple.dispatch', 'ნინო აბაშიძე'],
      ['northfield.co', 'ლუკა გელაშვილი'],
      ['orchard.tape', 'ანა კვარაცხელია'],
      ['paper.transit', 'გიორგი ლომიძე'],
      ['quiet.harvest', 'თამარ ჩხეიძე'],
      ['river.notation', 'დათო ბერიძე'],
      ['saltflat.press', 'ელენე მაისურაძე'],
      ['tinder.box.co', 'ზურა კაპანაძე'],
      ['umber.field', 'მარიამ ჯავახიშვილი'],
      ['vellum.works', 'სანდრო ხუციშვილი'],
      ['wander.ledger', 'ქეთი ღოღობერიძე'],
      ['xenon.daily', 'ირაკლი წერეთელი'],
      ['yellow.margin', 'სოფო დოლიძე'],
      ['zephyr.stock', 'ბექა ნადირაძე'],
    ];

    return names.map(([username, full_name], i) => ({
      id: `demo-${i}`,
      username,
      full_name,
      profile_pic_url: i % 9 === 4 ? '' : demoAvatar(i),
      is_verified: i % 7 === 2,
      is_private: i % 5 === 1,
      follows_viewer: i % 4 === 0,
    }));
  }

  async function demoScan() {
    const all = demoUsers();
    let loaded = 0;

    while (loaded < all.length) {
      if (state.paused) {
        await sleep(300);
        continue;
      }
      state.results.push(...all.slice(loaded, loaded + 6));
      loaded += 6;
      setProgress(Math.min(99, Math.round((loaded / all.length) * 100)));
      renderList();
      renderSidebar();
      await sleep(320);
    }

    setProgress(100);
    renderList();
    renderSidebar();
    toast(`${T.done} — ${state.results.length}`);
  }

  /* ---------------------------------------------------------------- export */

  async function copyList() {
    const list = sortByName(visibleUsers());
    if (!list.length) {
      toast(T.nothingToCopy);
      return;
    }
    try {
      await navigator.clipboard.writeText(list.map((u) => u.username).join('\n'));
      toast(`${T.copied} — ${list.length}`);
    } catch {
      toast('კოპირება ვერ მოხერხდა');
    }
  }

  function saveFile(name, mime, content) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function download(kind) {
    const list = sortByName(visibleUsers());
    if (!list.length) {
      toast(T.nothingToCopy);
      return;
    }

    if (kind === 'json') {
      const data = list.map((u) => ({
        username: u.username,
        full_name: u.full_name,
        follows_you: !!u.follows_viewer,
        is_verified: !!u.is_verified,
        is_private: !!u.is_private,
        url: `https://www.instagram.com/${u.username}/`,
      }));
      saveFile(
        'mimdevari.json',
        'application/json',
        JSON.stringify(data, null, 2)
      );
      return;
    }

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['username', 'full_name', 'follows_you', 'is_verified', 'is_private', 'url'],
      ...list.map((u) => [
        u.username,
        u.full_name,
        !!u.follows_viewer,
        !!u.is_verified,
        !!u.is_private,
        `https://www.instagram.com/${u.username}/`,
      ]),
    ];
    saveFile(
      'mimdevari.csv',
      'text/csv;charset=utf-8',
      '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')
    );
  }

  /* ------------------------------------------------------------------ boot */

  document.title = `${T.name} — ${T.tagline}`;
  buildShell();
  renderLaunch();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('mm-app')) destroy();
  });
})();
