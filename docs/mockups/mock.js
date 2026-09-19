// Shared bits for the mockups: theme from ?theme=light, and the inline SVG figure library.
(function () {
  const q = new URLSearchParams(location.search);
  if (q.get('theme') === 'light') document.documentElement.dataset.theme = 'light';
})();

// Thin-line figures. 1.25px strokes, currentColor, viewBox 0 0 200 120 unless noted. Own drawings.
const S = 'fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"';
const FIG = {
  // Ghosted lines: dots, a ghosting motion above the first line, then committed strokes.
  ghosted: `<svg viewBox="0 0 200 120" ${S}>
    <g fill="currentColor" stroke="none"><circle cx="24" cy="34" r="2.2"/><circle cx="176" cy="34" r="2.2"/><circle cx="34" cy="66" r="2.2"/><circle cx="150" cy="66" r="2.2"/><circle cx="46" cy="98" r="2.2"/><circle cx="184" cy="98" r="2.2"/></g>
    <path d="M30 24c40-8 100-8 140 0" stroke-dasharray="2 4" opacity=".6"/><path d="M164 20l6 4-6 4" opacity=".6"/>
    <path d="M24 34H176"/><path d="M34 66H150"/><path d="M46 98H184"/>
  </svg>`,
  // Superimposed lines: one start point, several passes fraying at the end.
  superimposed: `<svg viewBox="0 0 200 120" ${S}>
    <path d="M22 40H178"/><path d="M22 40C80 40 130 38 178 36" opacity=".7"/><path d="M22 40C80 40 130 42 178 44" opacity=".7"/><path d="M22 40C90 40 140 41 178 42" opacity=".5"/><path d="M22 40C90 40 140 39 178 37" opacity=".5"/>
    <path d="M22 86H120"/><path d="M22 86C60 86 90 84 120 83" opacity=".7"/><path d="M22 86C60 86 90 88 120 89" opacity=".6"/>
    <circle cx="22" cy="40" r="2.2" fill="currentColor" stroke="none"/><circle cx="22" cy="86" r="2.2" fill="currentColor" stroke="none"/>
  </svg>`,
  // Tables of ellipses: a grid, ellipses packed and drawn through twice.
  ellipses: `<svg viewBox="0 0 200 120" ${S}>
    <rect x="16" y="18" width="168" height="84" rx="2"/><path d="M16 60H184M72 18v84M128 18v84"/>
    <g opacity=".95"><ellipse cx="30" cy="39" rx="12" ry="16"/><ellipse cx="54" cy="39" rx="12" ry="16"/><ellipse cx="30" cy="39" rx="11.2" ry="15.2" opacity=".5"/><ellipse cx="54" cy="39" rx="11.2" ry="15.2" opacity=".5"/></g>
    <g><ellipse cx="86" cy="39" rx="13" ry="17"/><ellipse cx="113" cy="39" rx="13" ry="17"/><ellipse cx="86" cy="39" rx="12.2" ry="16.2" opacity=".5"/><ellipse cx="113" cy="39" rx="12.2" ry="16.2" opacity=".5"/></g>
    <g><ellipse cx="143" cy="39" rx="9" ry="17"/><ellipse cx="156" cy="39" rx="4" ry="17"/><ellipse cx="170" cy="39" rx="9" ry="17"/></g>
    <g><ellipse cx="44" cy="81" rx="26" ry="16"/><ellipse cx="44" cy="81" rx="25" ry="15" opacity=".5"/></g>
    <g><ellipse cx="86" cy="81" rx="13" ry="9"/><ellipse cx="113" cy="81" rx="13" ry="9"/><ellipse cx="86" cy="81" rx="12" ry="8" opacity=".5"/><ellipse cx="113" cy="81" rx="12" ry="8" opacity=".5"/></g>
    <g><ellipse cx="141" cy="81" rx="6" ry="16"/><ellipse cx="156" cy="81" rx="8" ry="16"/><ellipse cx="172" cy="81" rx="8" ry="16"/></g>
  </svg>`,
  // Funnels: a minor axis with ellipses that widen outward.
  funnels: `<svg viewBox="0 0 200 120" ${S}>
    <path d="M14 60H186" opacity=".5"/><path d="M40 20C80 44 120 44 160 20M40 100C80 76 120 76 160 100" opacity=".5"/>
    <ellipse cx="100" cy="60" rx="3" ry="16"/><ellipse cx="88" cy="60" rx="5" ry="18"/><ellipse cx="112" cy="60" rx="5" ry="18"/><ellipse cx="72" cy="60" rx="8" ry="22"/><ellipse cx="128" cy="60" rx="8" ry="22"/><ellipse cx="52" cy="60" rx="11" ry="28"/><ellipse cx="148" cy="60" rx="11" ry="28"/><ellipse cx="30" cy="60" rx="13" ry="35"/><ellipse cx="170" cy="60" rx="13" ry="35"/>
  </svg>`,
  // Boxes with line extensions: a box built from a Y, drawn through, with its extensions checked.
  boxes: `<svg viewBox="0 0 200 120" ${S}>
    <g opacity=".35" stroke-dasharray="3 4"><path d="M58 40L14 18M64 84L18 70M150 44L194 32M152 88L196 78M110 22L124 2M104 104L114 118"/></g>
    <g opacity=".45" stroke-dasharray="2 3"><path d="M110 22L118 58M64 84L118 58M152 88L118 58"/></g>
    <path d="M100 60L58 40M100 60L150 44M100 60L104 104"/>
    <path d="M58 40L110 22L150 44M58 40L64 84L104 104L152 88L150 44"/>
    <circle cx="100" cy="60" r="2.4" fill="currentColor" stroke="none"/>
  </svg>`,
  // Organic arrows: a ribbon that twists and comes closer.
  arrows: `<svg viewBox="0 0 200 120" ${S}>
    <path d="M18 92C60 92 60 30 100 30S140 88 172 60"/><path d="M18 100C64 100 66 44 100 44S142 100 178 70"/>
    <path d="M100 30V44M60 62l4 6M140 62l4 4" opacity=".5"/><path d="M172 60l12 2-6 12" /><path d="M178 70l6-8"/>
    <path d="M40 92q6-14 14-16M62 60q4-8 10-10" opacity=".5"/>
  </svg>`,
  // Cylinder around a minor axis.
  cylinder: `<svg viewBox="0 0 200 120" ${S}>
    <path d="M22 96L178 24" opacity=".45" stroke-dasharray="3 4"/>
    <ellipse cx="60" cy="78" rx="12" ry="26" transform="rotate(-25 60 78)"/><ellipse cx="140" cy="42" rx="14" ry="30" transform="rotate(-25 140 42)"/>
    <path d="M62 52L142 12M58 104L138 72"/>
  </svg>`,
  // A leaf with its flow line.
  leaf: `<svg viewBox="0 0 200 120" ${S}>
    <path d="M24 96C60 40 120 20 178 22" opacity=".45" stroke-dasharray="3 4"/>
    <path d="M30 94C70 96 130 72 176 24C130 10 70 40 30 94Z"/><path d="M30 94C80 70 120 46 170 26" opacity=".6"/>
    <path d="M70 76l8-14M100 62l6-16M130 48l4-14" opacity=".4"/>
  </svg>`,
};

// Small glyphs for the path row, 24x24.
const G = 'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';
const GLYPH = {
  l0: `<svg viewBox="0 0 24 24" ${G}><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>`,
  l1: `<svg viewBox="0 0 24 24" ${G}><path d="M3 6h18"/><ellipse cx="8" cy="15" rx="4" ry="3"/><path d="M15 12l5 1v5l-5 1-3-2v-4z"/></svg>`,
  boxes: `<svg viewBox="0 0 24 24" ${G}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>`,
  l2: `<svg viewBox="0 0 24 24" ${G}><path d="M4 16c4 0 4-8 8-8s4 8 8 8"/><path d="M6 20c3 0 4-3 6-3s3 3 6 3"/></svg>`,
  l3: `<svg viewBox="0 0 24 24" ${G}><path d="M4 20C8 8 14 4 20 4c0 8-6 14-16 16z"/><path d="M4 20l12-12"/></svg>`,
  l4: `<svg viewBox="0 0 24 24" ${G}><ellipse cx="12" cy="14" rx="5" ry="6"/><circle cx="12" cy="6" r="2.5"/><path d="M7 12l-4-2M7 16l-4 1M17 12l4-2M17 16l4 1"/></svg>`,
  l5: `<svg viewBox="0 0 24 24" ${G}><ellipse cx="13" cy="12" rx="7" ry="4.5"/><circle cx="4.5" cy="9" r="2.5"/><path d="M8 16v4M11 16v4M15 16v4M18 15v5"/></svg>`,
  cyl: `<svg viewBox="0 0 24 24" ${G}><ellipse cx="12" cy="6" rx="6" ry="2.5"/><path d="M6 6v12a6 2.5 0 0 0 12 0V6"/></svg>`,
  l6: `<svg viewBox="0 0 24 24" ${G}><path d="M5 7h11v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M16 9h2a2 2 0 0 1 0 4h-2"/></svg>`,
  wheels: `<svg viewBox="0 0 24 24" ${G}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v5M12 15v5M4 12h5M15 12h5"/></svg>`,
  l7: `<svg viewBox="0 0 24 24" ${G}><path d="M3 15l2-5h11l4 5v3H3z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
  textures: `<svg viewBox="0 0 24 24" ${G}><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M6 9l3 3-3 3M11 8l4 4-4 4M17 10l1 2-1 2" opacity=".7"/></svg>`,
};
const ICON = {
  today: `<svg viewBox="0 0 24 24" ${G}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>`,
  path: `<svg viewBox="0 0 24 24" ${G}><path d="M4 18c4 0 4-12 8-12s4 12 8 12"/><circle cx="4" cy="18" r="1.6"/><circle cx="12" cy="6" r="1.6"/><circle cx="20" cy="18" r="1.6"/></svg>`,
  journal: `<svg viewBox="0 0 24 24" ${G}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 15l4-4 4 4 3-3 5 5"/><circle cx="15.5" cy="8.5" r="1.5"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" ${G}><circle cx="12" cy="12" r="2.5"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/></svg>`,
  back: `<svg viewBox="0 0 24 24" ${G}><path d="M15 5l-7 7 7 7"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" ${G}><path d="M12 5v14M5 12h14"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" ${G}><path d="M5 12h14"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" ${G}><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>`,
  next: `<svg viewBox="0 0 24 24" ${G}><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  paper: `<svg viewBox="0 0 24 24" ${G}><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/></svg>`,
  tablet: `<svg viewBox="0 0 24 24" ${G}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M11 18h2"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" ${G}><path d="M9 6l6 6-6 6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" ${G}><path d="M5 12l4 4 10-10"/></svg>`,
  logo: `<svg viewBox="0 0 24 24" ${G}><path d="M12 2.5l8.5 5v9L12 21.5l-8.5-5v-9z"/><path d="M12 12l8.5-4.5M12 12v9.5M12 12L3.5 7.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>`,
};

// <x-fig name="boxes"> and <x-glyph name="l1"> and <x-icon name="today"> expand to the SVG.
for (const [tag, lib] of [['x-fig', FIG], ['x-glyph', GLYPH], ['x-icon', ICON]]) {
  for (const el of document.querySelectorAll(tag)) {
    const svg = lib[el.getAttribute('name')] || '';
    el.outerHTML = svg;
  }
}

// <x-nav on="today"> expands to the sidebar (wide) and the tab bar (narrow).
for (const el of document.querySelectorAll('x-nav')) {
  const on = el.getAttribute('on');
  const items = [['today', 'Today'], ['path', 'Path'], ['journal', 'Journal']];
  const link = (id, label, cls) => `<a class="${cls}${id === on ? ' on' : ''}" href="${id}.html">${ICON[id]}${label}</a>`;
  el.outerHTML = `<nav class="sidebar"><div class="brand">${ICON.logo}Kata</div>${items.map(([id, l]) => link(id, l, '')).join('')}<div class="spacer"></div><a href="#">${ICON.gear}Settings</a></nav>` +
    `<nav class="tabbar">${items.map(([id, l]) => link(id, l, '')).join('')}</nav>`;
}
