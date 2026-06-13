const puppeteer = require('puppeteer');
const fs = require('fs');

const THEME = {
  bg: '#181818',
  cyan: '#00D9FF',
  white: '#FFFFFF',
  slate: '#252526'
};

const LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  <!-- O Symbol -->
  <circle cx="380" cy="500" r="280" fill="none" stroke="${THEME.white}" stroke-width="48" stroke-linecap="round" />
  <path d="M 280 660 Q 560 700 680 180" fill="none" stroke="${THEME.bg}" stroke-width="88" stroke-linecap="round" />
  <path d="M 280 660 Q 560 700 680 180" fill="none" stroke="${THEME.white}" stroke-width="32" stroke-linecap="round" />
  
  <!-- AST Lines -->
  <g stroke="${THEME.cyan}" stroke-width="16" stroke-linecap="round">
    <line x1="750" y1="360" x2="650" y2="460" />
    <line x1="750" y1="360" x2="850" y2="560" />
    <line x1="650" y1="460" x2="530" y2="560" />
    <line x1="650" y1="460" x2="650" y2="660" />
    <line x1="530" y1="560" x2="470" y2="740" />
    <line x1="530" y1="560" x2="530" y2="740" />
    <line x1="850" y1="560" x2="750" y2="660" />
    <line x1="850" y1="560" x2="850" y2="740" />
    <line x1="750" y1="660" x2="690" y2="740" />
    <line x1="750" y1="660" x2="750" y2="740" />
  </g>
  
  <!-- AST Nodes -->
  <g fill="${THEME.white}" stroke="${THEME.cyan}" stroke-width="16">
    <circle cx="750" cy="360" r="28" />
    <circle cx="650" cy="460" r="28" />
    <circle cx="850" cy="560" r="28" />
    <circle cx="530" cy="560" r="28" />
    <circle cx="650" cy="660" r="24" />
    <circle cx="470" cy="740" r="24" />
    <circle cx="530" cy="740" r="24" />
    <circle cx="750" cy="660" r="28" />
    <circle cx="850" cy="740" r="24" />
    <circle cx="690" cy="740" r="24" />
    <circle cx="750" cy="740" r="24" />
  </g>
</svg>
`;

// Save production icon.svg
fs.writeFileSync('../assets/icon.svg', LOGO_SVG);

// HTML Templates
const ICON_HTML = `
<html><body style="margin:0; padding:0; background: ${THEME.bg}; width: 1024px; height: 1024px; display: flex; justify-content: center; align-items: center;">
  <div style="width: 800px; height: 800px;">
    ${LOGO_SVG}
  </div>
</body></html>
`;

const BANNER_HTML = `
<html><head><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');</style></head><body style="margin:0; padding:0; background: ${THEME.bg}; width: 1280px; height: 300px; display: flex; align-items: center; font-family: Inter, sans-serif;">
  <div style="width: 300px; height: 300px; margin-left: 50px; display: flex; justify-content: center; align-items: center;">
    ${LOGO_SVG}
  </div>
  <div style="margin-left: 20px;">
    <h1 style="color: ${THEME.white}; font-size: 56px; margin: 0; font-weight: 600;">LiveComplexityIDE</h1>
    <h2 style="color: ${THEME.cyan}; font-size: 32px; margin: 10px 0 0 0; font-weight: 400;">Deterministic AST-Based Big-O Analysis for C++</h2>
  </div>
</body></html>
`;

const HERO_HTML = `
<html><head><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');</style></head><body style="margin:0; padding:0; background: ${THEME.bg}; width: 1200px; height: 600px; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: Inter, sans-serif;">
  <div style="display: flex; align-items: center; width: 1000px;">
    <div style="flex: 1;">
      <h1 style="color: ${THEME.white}; font-size: 64px; margin: 0; font-weight: 700;">LiveComplexityIDE</h1>
      <h2 style="color: ${THEME.cyan}; font-size: 32px; margin: 20px 0; font-weight: 400;">Correctness Before Guessing</h2>
      <ul style="color: ${THEME.white}; font-size: 24px; line-height: 2; list-style-type: none; padding: 0; margin-top: 40px;">
        <li style="display:flex; align-items:center;"><span style="color:${THEME.cyan}; margin-right:16px;">✓</span> Zero Heuristics</li>
        <li style="display:flex; align-items:center;"><span style="color:${THEME.cyan}; margin-right:16px;">✓</span> Unknown &gt; False Positives</li>
        <li style="display:flex; align-items:center;"><span style="color:${THEME.cyan}; margin-right:16px;">✓</span> Deterministic Structural Analysis</li>
      </ul>
    </div>
    <div style="width: 450px; height: 450px;">
      ${LOGO_SVG}
    </div>
  </div>
</body></html>
`;

const SOCIAL_HTML = `
<html><head><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');</style></head><body style="margin:0; padding:0; background: ${THEME.bg}; width: 1200px; height: 630px; display: flex; align-items: center; justify-content: space-between; font-family: Inter, sans-serif; padding: 0 100px; box-sizing: border-box;">
  <div style="flex: 1;">
    <h1 style="color: ${THEME.white}; font-size: 72px; margin: 0; font-weight: 800;">LiveComplexityIDE</h1>
    <h2 style="color: ${THEME.cyan}; font-size: 36px; margin: 20px 0 0 0; font-weight: 500;">Static Analysis for C++</h2>
    <div style="margin-top: 60px; font-size: 28px; line-height: 1.8;">
      <div style="color: ${THEME.white};">Correctness Before Guessing</div>
      <div style="color: ${THEME.white};">Unknown &gt; False Positives</div>
    </div>
  </div>
  <div style="width: 480px; height: 480px;">
    ${LOGO_SVG}
  </div>
</body></html>
`;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  
  async function render(html, filename, width, height) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: '../assets/' + filename });
    await page.close();
    console.log('Rendered ' + filename);
  }

  await render(ICON_HTML, 'icon.png', 1024, 1024);
  await render(BANNER_HTML, 'marketplace-banner.png', 1280, 300);
  await render(HERO_HTML, 'readme-hero.png', 1200, 600);
  await render(SOCIAL_HTML, 'social-preview.png', 1200, 630);
  
  await browser.close();
})();
