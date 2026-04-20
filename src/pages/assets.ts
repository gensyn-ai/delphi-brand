import { overlayPadding, isMobile } from '../responsive';

interface AssetStar {
  id: string;
  name: string;
  category: string;
}

const ASSET_STARS: AssetStar[] = [
  { id: 'logos',   name: 'Logos',   category: 'Brand Assets' },
  { id: 'type',    name: 'Type',    category: 'Brand Assets' },
  { id: 'palette', name: 'Palette', category: 'Brand Assets' },
];

let detailOverlay: HTMLDivElement | null = null;
let assetsHashChangeHandler: (() => void) | null = null;

interface PaletteEntry {
  hex: string;
  rgb: string;
  cmyk: string;
}

const PALETTE_COLORS: PaletteEntry[] = [
  { hex: '#EFEFEB', rgb: '239, 239, 235', cmyk: '0, 0, 2, 6' },
  { hex: '#367CD6', rgb: '54, 124, 214', cmyk: '75, 42, 0, 16' },
  { hex: '#F3B295', rgb: '243, 178, 149', cmyk: '0, 27, 39, 5' },
  { hex: '#513238', rgb: '81, 50, 56', cmyk: '0, 38, 31, 68' },
];

const UI_PALETTE: { name: string; hex: string }[] = [
  { name: 'Page Background', hex: '#F5F5F5' },
  { name: 'Primary Card Background', hex: '#FFFFFF' },
  { name: 'Primary Dark BG', hex: '#343434' },
  { name: 'Secondary Dark BG', hex: '#3D3D3D' },
  { name: 'Disabled Accent', hex: '#AFAFAD' },
  { name: 'Active Green BG', hex: '#E4FFE9' },
  { name: 'Error Red BG', hex: '#F0D7D7' },
  { name: 'Disabled Fill', hex: '#E1E1E1' },
  { name: 'Light Fill', hex: '#FBFBFB' },
  { name: 'Input Field on Light', hex: '#797777' },
  { name: 'Upcoming Blue', hex: '#D0DCF2' },
  { name: 'Upcoming Blue Muted', hex: '#F3F7FD' },
  { name: 'Dark Active Green', hex: '#00632D' },
  { name: 'Muted Red', hex: '#FDF3F1' },
  { name: 'Upcoming on Dark', hex: '#727575' },
  { name: 'Card Stroke', hex: '#CCCCCC' },
  { name: 'Divider Stroke', hex: '#999999' },
];

function createAssetDetailOverlay(container: HTMLElement, starId: string): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    padding: ${overlayPadding()};
    opacity: 0;
    transition: opacity 0.4s ease;
    overflow-y: auto;
    background-color: var(--bg);
    background-image: radial-gradient(circle, rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.10) 1px, transparent 1px);
    background-size: 28px 28px;
  `;

  const inner = document.createElement('div');
  inner.style.cssText = `
    max-width: 680px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  const backBtn = document.createElement('button');
  backBtn.textContent = '\u2190 back';
  backBtn.style.cssText = `
    background: none;
    border: none;
    font-family: 'Instrument Serif', serif;
    font-size: 13pt;
    color: var(--fg);
    opacity: 0.5;
    cursor: pointer;
    padding: 0;
    margin-bottom: 32px;
    align-self: flex-start;
    transition: opacity 0.2s ease;
  `;
  backBtn.addEventListener('mouseenter', () => { backBtn.style.opacity = '0.9'; });
  backBtn.addEventListener('mouseleave', () => { backBtn.style.opacity = '0.5'; });
  backBtn.addEventListener('click', () => {
    window.location.hash = '#/assets';
  });

  const star = ASSET_STARS.find((s) => s.id === starId);
  const title = document.createElement('h2');
  title.textContent = star?.name || starId;
  title.style.cssText = `
    font-family: 'Instrument Serif', serif;
    font-size: 22pt;
    font-weight: 400;
    color: var(--fg);
    opacity: 0.85;
    margin: 0 0 40px 0;
    letter-spacing: 0.01em;
  `;
  inner.appendChild(backBtn);
  inner.appendChild(title);

  if (starId === 'palette') {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    `;

    const labelStyle = `
      font-family: 'Fragment Mono', monospace;
      font-size: 8pt;
      color: var(--fg);
      opacity: 0.4;
      line-height: 1.5;
    `;

    for (const entry of PALETTE_COLORS) {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      `;

      const swatch = document.createElement('div');
      swatch.style.cssText = `
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background-color: ${entry.hex};
        border: 1px solid rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.15);
        transition: border-color 0.6s ease;
      `;
      item.appendChild(swatch);

      const labels = document.createElement('div');
      labels.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      `;
      labels.innerHTML = `
        <span style="${labelStyle} opacity: 0.55;">${entry.hex.toUpperCase()}</span>
        <span style="${labelStyle}">RGB ${entry.rgb}</span>
        <span style="${labelStyle}">CMYK ${entry.cmyk}</span>
      `;
      item.appendChild(labels);

      row.appendChild(item);
    }

    inner.appendChild(row);
  } else if (starId === 'type') {
    const charset = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';
    const numerals = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';

    const section = document.createElement('div');
    section.style.cssText = `display: flex; flex-direction: column; gap: 40px;`;

    const labelStyle = `
      font-family: 'Fragment Mono', monospace;
      font-size: 8pt;
      color: var(--fg);
      opacity: 0.35;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    `;

    const linkStyle = `${labelStyle} color: var(--fg); opacity: 0.6; text-decoration: none; transition: opacity 0.2s ease;`;
    // Instrument Serif
    const instrumentBlock = document.createElement('div');
    const instrumentLabel = document.createElement('p');
    const instrumentLink = document.createElement('a');
    instrumentLink.href = 'https://fonts.google.com/specimen/Instrument+Serif';
    instrumentLink.target = '_blank';
    instrumentLink.rel = 'noopener noreferrer';
    instrumentLink.textContent = 'Instrument Serif — Headers & Subheaders';
    instrumentLink.style.cssText = linkStyle;
    instrumentLink.addEventListener('mouseenter', () => { instrumentLink.style.opacity = '1'; });
    instrumentLink.addEventListener('mouseleave', () => { instrumentLink.style.opacity = '0.6'; });
    instrumentLabel.appendChild(instrumentLink);
    instrumentLabel.style.cssText = labelStyle;
    instrumentBlock.appendChild(instrumentLabel);

    const instrumentChars = document.createElement('p');
    instrumentChars.textContent = charset;
    instrumentChars.style.cssText = `
      font-family: 'Instrument Serif', serif;
      font-size: 22pt;
      color: var(--fg);
      opacity: 0.7;
      line-height: 1.4;
      word-break: break-all;
      margin: 0 0 8px 0;
    `;
    instrumentBlock.appendChild(instrumentChars);

    const instrumentNums = document.createElement('p');
    instrumentNums.textContent = numerals + '  ' + special;
    instrumentNums.style.cssText = `
      font-family: 'Instrument Serif', serif;
      font-size: 18pt;
      color: var(--fg);
      opacity: 0.5;
      line-height: 1.4;
      word-break: break-all;
      margin: 0;
    `;
    instrumentBlock.appendChild(instrumentNums);
    section.appendChild(instrumentBlock);

    // Fragment Mono
    const fragmentBlock = document.createElement('div');
    const fragmentLabel = document.createElement('p');
    const fragmentLink = document.createElement('a');
    fragmentLink.href = 'https://fonts.google.com/specimen/Fragment+Mono';
    fragmentLink.target = '_blank';
    fragmentLink.rel = 'noopener noreferrer';
    fragmentLink.textContent = 'Fragment Mono — Body Copy';
    fragmentLink.style.cssText = linkStyle;
    fragmentLink.addEventListener('mouseenter', () => { fragmentLink.style.opacity = '1'; });
    fragmentLink.addEventListener('mouseleave', () => { fragmentLink.style.opacity = '0.6'; });
    fragmentLabel.appendChild(fragmentLink);
    fragmentLabel.style.cssText = labelStyle;
    fragmentBlock.appendChild(fragmentLabel);

    const fragmentChars = document.createElement('p');
    fragmentChars.textContent = charset;
    fragmentChars.style.cssText = `
      font-family: 'Fragment Mono', monospace;
      font-size: 13pt;
      color: var(--fg);
      opacity: 0.7;
      line-height: 1.5;
      word-break: break-all;
      margin: 0 0 8px 0;
    `;
    fragmentBlock.appendChild(fragmentChars);

    const fragmentNums = document.createElement('p');
    fragmentNums.textContent = numerals + '  ' + special;
    fragmentNums.style.cssText = `
      font-family: 'Fragment Mono', monospace;
      font-size: 11pt;
      color: var(--fg);
      opacity: 0.5;
      line-height: 1.5;
      word-break: break-all;
      margin: 0;
    `;
    fragmentBlock.appendChild(fragmentNums);
    section.appendChild(fragmentBlock);

    inner.appendChild(section);
  } else if (starId === 'ui-styling') {
    const tabBorder = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.12)';
    const tabBar = document.createElement('div');
    tabBar.style.cssText = `
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid ${tabBorder};
    `;
    const tabLabels = ['Colour palette', 'Typography', 'Components', 'Spacing'];
    const panels: HTMLDivElement[] = [];

    const tabStyle = (active: boolean) => `
      padding: 6px 12px;
      font-family: 'Fragment Mono', monospace;
      font-size: 8pt;
      color: var(--fg);
      opacity: ${active ? 0.85 : 0.45};
      background: ${active ? 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.04)' : 'none'};
      border: none;
      border-bottom: 2px solid ${active ? 'var(--fg)' : 'transparent'};
      margin-bottom: -1px;
      cursor: pointer;
      border-radius: 4px 4px 0 0;
      transition: opacity 0.2s ease, background 0.2s ease;
    `;

    for (let i = 0; i < tabLabels.length; i++) {
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.textContent = tabLabels[i];
      tabBtn.style.cssText = tabStyle(i === 0);
      const panel = document.createElement('div');
      panel.style.cssText = 'display: none;';
      panels.push(panel);

      const setActive = (idx: number) => {
        tabBar.querySelectorAll('button').forEach((b, j) => {
          (b as HTMLElement).style.cssText = tabStyle(j === idx);
        });
        panels.forEach((p, j) => { p.style.display = j === idx ? 'block' : 'none'; });
      };

      tabBtn.addEventListener('click', () => setActive(i));

      tabBtn.addEventListener('mouseenter', () => {
        if (panels[i].style.display !== 'none') return;
        tabBtn.style.opacity = '0.65';
      });
      tabBtn.addEventListener('mouseleave', () => {
        if (panels[i].style.display !== 'none') return;
        tabBtn.style.opacity = '0.45';
      });

      tabBar.appendChild(tabBtn);

      if (i === 0) {
        const tableWrap = document.createElement('div');
        tableWrap.style.cssText = `
          border: 1px solid ${tabBorder};
          border-radius: 6px;
          overflow: hidden;
          background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
        `;
        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse; font-family: \'Fragment Mono\', monospace; font-size: 8pt;';
        const thead = document.createElement('thead');
        thead.innerHTML = `<tr>
          <th style="text-align: left; padding: 6px 10px; border-bottom: 1px solid ${tabBorder}; color: var(--fg); opacity: 0.5; font-weight: 400; width: 36px;">Swatch</th>
          <th style="text-align: left; padding: 6px 10px; border-bottom: 1px solid ${tabBorder}; color: var(--fg); opacity: 0.5; font-weight: 400;">Name</th>
          <th style="text-align: left; padding: 6px 10px; border-bottom: 1px solid ${tabBorder}; color: var(--fg); opacity: 0.5; font-weight: 400;">Hex</th>
        </tr>`;
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        const rowBorder = `1px solid rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.08)`;
        for (const entry of UI_PALETTE) {
          const tr = document.createElement('tr');
          tr.style.cssText = `border-bottom: ${rowBorder};`;
          const swatchTd = document.createElement('td');
          swatchTd.style.cssText = 'padding: 4px 10px; vertical-align: middle;';
          const swatch = document.createElement('span');
          swatch.style.cssText = `display: inline-block; width: 18px; height: 18px; border-radius: 4px; background-color: ${entry.hex}; border: 1px solid rgba(0,0,0,0.08);`;
          swatchTd.appendChild(swatch);
          const nameTd = document.createElement('td');
          nameTd.style.cssText = 'padding: 4px 10px; color: var(--fg); opacity: 0.8;';
          nameTd.textContent = entry.name;
          const hexTd = document.createElement('td');
          hexTd.style.cssText = 'padding: 4px 10px; color: var(--fg); opacity: 0.65;';
          hexTd.textContent = entry.hex;
          tr.appendChild(swatchTd);
          tr.appendChild(nameTd);
          tr.appendChild(hexTd);
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        tableWrap.appendChild(table);
        panel.appendChild(tableWrap);
        panel.style.display = 'block';
      } else if (i === 1) {
        const charset = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';
        const numerals = '0123456789';
        const special = '!@#$%^&*()_+-=[]{}|;\':",.<>?/~`';
        const labelStyle = `font-family: 'Fragment Mono', monospace; font-size: 8pt; color: var(--fg); opacity: 0.5; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.06em;`;
        const sectionStyle = `margin-bottom: 20px;`;

        const primaryBlock = document.createElement('div');
        primaryBlock.style.cssText = sectionStyle;
        const primaryLabel = document.createElement('div');
        primaryLabel.textContent = 'Primary';
        primaryLabel.style.cssText = labelStyle;
        primaryBlock.appendChild(primaryLabel);
        const primaryChars = document.createElement('div');
        primaryChars.textContent = charset;
        primaryChars.style.cssText = `font-family: 'Figtree', sans-serif; font-size: 14pt; color: var(--fg); opacity: 0.85; line-height: 1.35; word-break: break-all; margin: 0 0 4px 0;`;
        primaryBlock.appendChild(primaryChars);
        const primaryNums = document.createElement('div');
        primaryNums.textContent = numerals + '  ' + special;
        primaryNums.style.cssText = `font-family: 'Figtree', sans-serif; font-size: 11pt; color: var(--fg); opacity: 0.6; line-height: 1.35; word-break: break-all; margin: 0;`;
        primaryBlock.appendChild(primaryNums);
        const primarySub = document.createElement('div');
        primarySub.textContent = 'Figtree';
        primarySub.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 7pt; color: var(--fg); opacity: 0.4; margin-top: 4px;`;
        primaryBlock.appendChild(primarySub);
        panel.appendChild(primaryBlock);

        const accentBlock = document.createElement('div');
        accentBlock.style.cssText = sectionStyle;
        const accentLabel = document.createElement('div');
        accentLabel.textContent = 'Accent';
        accentLabel.style.cssText = labelStyle;
        accentBlock.appendChild(accentLabel);
        const accentChars = document.createElement('div');
        accentChars.textContent = charset;
        accentChars.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 12pt; color: var(--fg); opacity: 0.85; line-height: 1.35; word-break: break-all; margin: 0 0 4px 0;`;
        accentBlock.appendChild(accentChars);
        const accentNums = document.createElement('div');
        accentNums.textContent = numerals + '  ' + special;
        accentNums.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 10pt; color: var(--fg); opacity: 0.6; line-height: 1.35; word-break: break-all; margin: 0;`;
        accentBlock.appendChild(accentNums);
        const accentSub = document.createElement('div');
        accentSub.textContent = 'Fragment Mono';
        accentSub.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 7pt; color: var(--fg); opacity: 0.4; margin-top: 4px;`;
        accentBlock.appendChild(accentSub);
        panel.appendChild(accentBlock);
      } else {
        const placeholder = document.createElement('p');
        placeholder.textContent = 'Coming soon…';
        placeholder.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.4; padding: 12px 0;';
        panel.appendChild(placeholder);
      }
    }

    inner.appendChild(tabBar);
    panels.forEach((p) => inner.appendChild(p));
  } else if (starId === 'logos') {
    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
    const logo = (subdir: string, file: string) => `${base}/images/logos/${subdir}/${file}`;

    const PNG_SIZE = 1024;
    function downloadSvgAsPng(svgUrl: string, pngFilename: string): void {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const nw = img.naturalWidth || PNG_SIZE;
        const nh = img.naturalHeight || PNG_SIZE;
        const scale = nw > 0 && nh > 0 ? Math.min(PNG_SIZE / Math.max(nw, nh), 4) : 1;
        const w = Math.max(1, Math.round(nw * scale));
        const h = Math.max(1, Math.round(nh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = pngFilename;
          a.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.onerror = () => {};
      img.src = svgUrl;
    }

    const labelStyle = `
      font-family: 'Fragment Mono', monospace;
      font-size: 8pt;
      color: var(--fg);
      opacity: 0.5;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
    `;
    const imgWrapStyle = `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.03);
      border: 1px solid rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.12);
      border-radius: 8px;
      height: 128px;
      box-sizing: border-box;
    `;

    const logosSection = document.createElement('div');
    logosSection.style.cssText = 'display: flex; flex-direction: column; gap: 32px;';

    const variants = [
      { name: 'Delphi Logos (Black)', dir: 'Delphi-Logos-Blk', files: [{ name: 'Logo symbol', file: 'Delphi-Symbol-Blk.svg' }, { name: 'Type', file: 'Delphi-logo-set_delphi-logotype-blk.svg' }, { name: 'Lockup', file: 'Delphi-logo-set_delphi-logo-lockup-blk.svg' }, { name: 'Strapline', file: 'Delphi-Strapline-Blk.svg' }] },
      { name: 'Delphi Logos (White)', dir: 'Delphi-Logos-Wht', files: [{ name: 'Logo symbol', file: 'Delphi-Symbol-Wht.svg' }, { name: 'Type', file: 'Delphi-logo-set_delphi-logotype-wht.svg' }, { name: 'Lockup', file: 'Delphi-logo-set_delphi-logo-lockup-wht.svg' }, { name: 'Strapline', file: 'Delphi-Strapline-Wht.svg' }], darkBg: true },
    ] as const;

    for (const variant of variants) {
      const variantTitle = document.createElement('h3');
      variantTitle.textContent = variant.name;
      variantTitle.style.cssText = `
        font-family: 'Instrument Serif', serif;
        font-size: 14pt;
        font-weight: 400;
        color: var(--fg);
        opacity: 0.85;
        margin: 0 0 12px 0;
      `;
      logosSection.appendChild(variantTitle);

      const row = document.createElement('div');
      row.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;';

      for (const { name: label, file } of variant.files) {
        const block = document.createElement('div');
        block.style.cssText = 'display: flex; flex-direction: column;';
        const cap = document.createElement('div');
        cap.textContent = label;
        cap.style.cssText = labelStyle;
        block.appendChild(cap);
        const link = document.createElement('a');
        link.href = logo(variant.dir, file);
        link.download = file;
        link.title = `Download ${file}`;
        link.style.cssText = 'cursor: pointer; text-decoration: none; color: inherit;';
        const wrap = document.createElement('div');
        wrap.className = 'darkBg' in variant && variant.darkBg ? 'logo-wrap logo-wrap-wht' : 'logo-wrap logo-wrap-blk';
        wrap.style.cssText = imgWrapStyle + ('darkBg' in variant && variant.darkBg ? ' background: rgba(0,0,0,0.75);' : '');
        const img = document.createElement('img');
        img.src = logo(variant.dir, file);
        img.alt = `${variant.name} – ${label}`;
        img.style.cssText = 'max-width: 100%; height: auto; max-height: 80px; object-fit: contain;';
        wrap.appendChild(img);
        link.appendChild(wrap);
        block.appendChild(link);
        const formatRow = document.createElement('div');
        formatRow.style.cssText = 'display: flex; gap: 8px; margin-top: 8px; font-family: \'Fragment Mono\', monospace; font-size: 8pt; opacity: 0.85;';
        const pillStyle = 'display: inline-block; padding: 2px 10px; border-radius: 999px; background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.1); color: var(--fg); text-decoration: none;';
        const svgLink = document.createElement('a');
        svgLink.href = logo(variant.dir, file);
        svgLink.download = file;
        svgLink.textContent = 'SVG';
        svgLink.style.cssText = pillStyle;
        formatRow.appendChild(svgLink);
        const pngLink = document.createElement('a');
        pngLink.href = '#';
        pngLink.textContent = 'PNG';
        pngLink.style.cssText = pillStyle + ' cursor: pointer;';
        pngLink.addEventListener('click', (e) => {
          e.preventDefault();
          downloadSvgAsPng(logo(variant.dir, file), file.replace(/\.svg$/i, '.png'));
        });
        formatRow.appendChild(pngLink);
        block.appendChild(formatRow);
        row.appendChild(block);
      }
      logosSection.appendChild(row);
    }

    inner.appendChild(logosSection);
  } else {
    const placeholder = document.createElement('p');
    placeholder.textContent = 'Content coming soon...';
    placeholder.style.cssText = `
      font-family: 'Fragment Mono', monospace;
      font-size: 9pt;
      color: var(--fg);
      opacity: 0.4;
    `;
    inner.appendChild(placeholder);
  }

  // Nav buttons for other assets
  const others = ASSET_STARS.filter((s) => s.id !== starId);
  const navRow = document.createElement('div');
  navRow.style.cssText = `
    display: flex;
    gap: 16px;
    margin-top: 48px;
    flex-wrap: wrap;
  `;

  for (const other of others) {
    const btn = document.createElement('button');
    btn.textContent = other.name;
    btn.style.cssText = `
      background: none;
      border: 1px solid rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.2);
      border-radius: 6px;
      padding: 8px 16px;
      font-family: 'Instrument Serif', serif;
      font-size: 10pt;
      color: var(--fg);
      opacity: 0.55;
      cursor: pointer;
      transition: opacity 0.2s ease, border-color 0.2s ease;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.9'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.55'; });
    btn.addEventListener('click', () => {
      window.location.hash = `#/assets/${other.id}`;
    });
    navRow.appendChild(btn);
  }

  inner.appendChild(navRow);
  overlay.appendChild(inner);
  container.appendChild(overlay);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  });

  return overlay;
}

const boxBorder = '1px solid rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.12)';

export function mount(container: HTMLElement, initialAssetId?: string | null): void {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${isMobile() ? '24px 16px' : '56px 64px'};
    box-sizing: border-box;
  `;

  const grid = document.createElement('div');
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(2, minmax(160px, 1fr));
    gap: 28px;
    max-width: 640px;
    width: 100%;
  `;

  for (const star of ASSET_STARS) {
    const box = document.createElement('button');
    box.type = 'button';
    box.style.cssText = `
      background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
      border: ${boxBorder};
      border-radius: 12px;
      padding: 28px 24px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.2s ease, background 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    box.addEventListener('mouseenter', () => {
      box.style.borderColor = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.25)';
      box.style.background = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.04)';
    });
    box.addEventListener('mouseleave', () => {
      box.style.borderColor = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.12)';
      box.style.background = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02)';
    });
    box.addEventListener('click', () => {
      window.location.hash = `#/assets/${star.id}`;
    });

    const nameEl = document.createElement('span');
    nameEl.textContent = star.name;
    nameEl.style.cssText = `
      font-family: 'Instrument Serif', serif;
      font-size: 14pt;
      color: var(--fg);
      opacity: 0.9;
    `;
    const catEl = document.createElement('span');
    catEl.textContent = star.category;
    catEl.style.cssText = `
      font-family: 'Fragment Mono', monospace;
      font-size: 8pt;
      color: var(--fg);
      opacity: 0.5;
    `;
    box.appendChild(nameEl);
    box.appendChild(catEl);
    grid.appendChild(box);
  }

  wrap.appendChild(grid);
  container.appendChild(wrap);

  assetsHashChangeHandler = () => {
    const hash = window.location.hash;
    if (hash === '#/assets') {
      if (detailOverlay) {
        detailOverlay.remove();
        detailOverlay = null;
      }
    } else if (hash.startsWith('#/assets/')) {
      const subId = hash.slice('#/assets/'.length);
      if (ASSET_STARS.some((s) => s.id === subId)) {
        if (detailOverlay) {
          detailOverlay.remove();
          detailOverlay = null;
        }
        detailOverlay = createAssetDetailOverlay(container, subId);
      }
    }
  };
  window.addEventListener('hashchange', assetsHashChangeHandler);

  if (initialAssetId && ASSET_STARS.some((s) => s.id === initialAssetId)) {
    detailOverlay = createAssetDetailOverlay(container, initialAssetId);
  }
}

export function unmount(container: HTMLElement): void {
  if (assetsHashChangeHandler) {
    window.removeEventListener('hashchange', assetsHashChangeHandler);
    assetsHashChangeHandler = null;
  }
  if (detailOverlay) {
    detailOverlay.remove();
    detailOverlay = null;
  }
  container.innerHTML = '';
}
