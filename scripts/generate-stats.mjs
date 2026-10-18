// scripts/generate-stats.mjs
import fs from 'fs';
import path from 'path';

const USERNAME = 'abushaidislam';
const TOKEN = process.env.GITHUB_TOKEN;

const LANGUAGE_COLORS = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  HTML: '#e34c26',
  CSS: '#563d7c',
  MDX: '#fcb32c',
  Liquid: '#67b8de',
  Python: '#3572A5',
  Shell: '#89e051',
  Vue: '#41b883',
  Go: '#00ADD8',
  Rust: '#dea584',
};

// Official / recognizable brand colors for tech keycaps
const TECH_BRAND_COLORS = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  HTML5: '#e34f26',
  CSS3: '#264de4',
  React: '#61dafb',
  'Next.js': '#ffffff',
  'Tailwind CSS': '#38bdf8',
  'Node.js': '#5fa04e',
  'REST APIs': '#00e5ff',
  PostgreSQL: '#4169e1',
  MongoDB: '#47a248',
  Redis: '#ff4438',
  AWS: '#ff9900',
  Vercel: '#ffffff',
  Docker: '#2496ed',
  Linux: '#fcc624',
};

// Tech stack grouped with high-contrast Neo-Brutalist accent colors
const TECH_STACK = [
  { id: '01', category: 'LANGUAGES', code: 'LNG_CORE', color: '#58a6ff', items: ['TypeScript', 'JavaScript', 'HTML5', 'CSS3'] },
  { id: '02', category: 'FRONTEND', code: 'UI_ENGINE', color: '#bc8cff', items: ['React', 'Next.js', 'Tailwind CSS'] },
  { id: '03', category: 'BACKEND', code: 'SRV_NODE', color: '#3fb950', items: ['Node.js', 'REST APIs'] },
  { id: '04', category: 'DATA & STORAGE', code: 'DB_LAYER', color: '#f0883e', items: ['PostgreSQL', 'MongoDB', 'Redis'] },
  { id: '05', category: 'CLOUD & INFRA', code: 'OPS_MESH', color: '#ff7b72', items: ['AWS', 'Vercel', 'Docker', 'Linux'] },
];

// XML Safe Escaping Helper (Prevents SVG parsing errors on &, <, >)
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatNumber(num) {
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return num.toString();
}

function calculateRank({ stars, commits, prs, issues }) {
  const score = commits * 1 + prs * 5 + issues * 2 + stars * 4;
  if (score > 1500) return { grade: 'A++', progress: 0.85 };
  if (score > 800) return { grade: 'A+', progress: 0.75 };
  if (score > 400) return { grade: 'A', progress: 0.65 };
  return { grade: 'B+', progress: 0.5 };
}

async function fetchStats() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}, isFork: false) {
          nodes {
            stargazerCount
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
        contributionsCollection {
          totalCommitContributions
          restrictedContributionsCount
        }
        pullRequests(first: 1) { totalCount }
        issues(first: 1) { totalCount }
        repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
          totalCount
        }
      }
    }
  `;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { login: USERNAME } }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL Error:', json.errors);
    process.exit(1);
  }

  const user = json.data.user;
  const stars = user.repositories.nodes.reduce((acc, repo) => acc + repo.stargazerCount, 0);
  const commits =
    user.contributionsCollection.totalCommitContributions +
    user.contributionsCollection.restrictedContributionsCount;
  const prs = user.pullRequests.totalCount;
  const issues = user.issues.totalCount;
  const contributed = user.repositoriesContributedTo.totalCount;

  const langMap = {};
  let totalLangSize = 0;
  for (const repo of user.repositories.nodes) {
    if (!repo.languages?.edges) continue;
    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      const color = edge.node.color || LANGUAGE_COLORS[name] || '#8b949e';
      if (!langMap[name]) langMap[name] = { size: 0, color };
      langMap[name].size += edge.size;
      totalLangSize += edge.size;
    }
  }

  const topLangs = Object.entries(langMap)
    .map(([name, data]) => ({
      name,
      color: data.color,
      percent: totalLangSize > 0 ? (data.size / totalLangSize) * 100 : 0,
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);

  return { stars, commits, prs, issues, contributed, topLangs };
}

function renderTechBentoCards() {
  // Asymmetric Neo-Brutalist Bento Coordinates
  // Row 1: 3 Cards | Row 2: 2 Wide Cards
  const cardLayouts = [
    { x: 26,  y: 486, w: 268, h: 102 },
    { x: 306, y: 486, w: 268, h: 102 },
    { x: 586, y: 486, w: 268, h: 102 },
    { x: 26,  y: 602, w: 408, h: 96 },
    { x: 446, y: 602, w: 408, h: 96 },
  ];

  return TECH_STACK.map((group, idx) => {
    const { x, y, w, h } = cardLayouts[idx];

    // Chip layout parameters
    let curX = x + 12;
    let curY = y + 40;
    const chipHeight = 22;
    const gapX = 8;
    const gapY = 8;

    const chipsSvg = group.items
      .map((item) => {
        const itemColor = TECH_BRAND_COLORS[item] || '#8b949e';
        const textWidth = Math.round(item.length * 6.8 + 24);
        const safeItem = escapeXml(item);

        if (curX + textWidth > x + w - 12) {
          curX = x + 12;
          curY += chipHeight + gapY;
        }

        const chip = `
        <g transform="translate(${curX}, ${curY})">
          <!-- Brutalist Hard Offset Shadow for Keycap -->
          <rect x="2.5" y="2.5" width="${textWidth}" height="${chipHeight}" rx="2" fill="#000000" />
          <!-- Main Keycap Body -->
          <rect width="${textWidth}" height="${chipHeight}" rx="2" fill="#13171f" stroke="#30363d" stroke-width="1.2" />
          <!-- Left Brand Color Hard Bar -->
          <rect x="0.6" y="0.6" width="4.5" height="${chipHeight - 1.2}" fill="${itemColor}" />
          <!-- Tech Label -->
          <text x="12" y="14.5" fill="#f0f6fc" font-size="10.5" font-weight="700" letter-spacing="0.2">${safeItem}</text>
        </g>`;

        curX += textWidth + gapX;
        return chip;
      })
      .join('');

    // Calculate width using raw string length before XML escaping
    const headerBadgeWidth = Math.round(group.category.length * 7.4 + 16);
    const safeCategory = escapeXml(group.category);

    return `
      <!-- Brutalist Bento Card: ${safeCategory} -->
      <g>
        <!-- Hard Offset Brutalist Shadow (Solid Color Accent + Black Base) -->
        <rect x="${x + 5}" y="${y + 5}" width="${w}" height="${h}" rx="3" fill="#020408" stroke="${group.color}" stroke-width="1" stroke-opacity="0.45" />
        
        <!-- Card Main Frame -->
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#0d1117" stroke="#30363d" stroke-width="1.5" />

        <!-- Top Accent Brutalist Bar -->
        <rect x="${x}" y="${y}" width="${w}" height="28" fill="#161b22" />
        <line x1="${x}" y1="${y + 28}" x2="${x + w}" y2="${y + 28}" stroke="#30363d" stroke-width="1.5" />

        <!-- Solid Inverted Category Tag -->
        <rect x="${x}" y="${y}" width="${headerBadgeWidth}" height="28" fill="${group.color}" />
        <text x="${x + 8}" y="${y + 18}" fill="#090b0f" font-size="10.5" font-weight="900" letter-spacing="0.8">${safeCategory}</text>

        <!-- Industrial Telemetry Metadata -->
        <text x="${x + w - 10}" y="${y + 18}" text-anchor="end" class="mono" fill="#8b949e" font-size="9.5" font-weight="700">[${group.id}//${group.items.length}]</text>

        <!-- Subtle Corner Crosshair -->
        <path d="M${x + w - 8} ${y + h - 5} H${x + w - 4} M${x + w - 6} ${y + h - 7} V${y + h - 3}" stroke="${group.color}" stroke-width="1" opacity="0.6"/>

        <!-- Mechanical Keycap Chips -->
        ${chipsSvg}
      </g>`;
  }).join('');
}

function generateSVG(data) {
  const { grade, progress } = calculateRank(data);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const targetDashOffset = circumference * (1 - progress);

  // Top Languages Bar
  const barWidth = 350;
  let currentX = 475;
  const langBarSegments = data.topLangs
    .map((lang) => {
      const w = Math.max((lang.percent / 100) * barWidth, 6);
      const rect = `<rect x="${currentX.toFixed(1)}" y="325" width="${w.toFixed(1)}" height="10" fill="${lang.color}" />`;
      currentX += w;
      return rect;
    })
    .join('\n      ');

  // Top Languages Legend
  const legendItems = data.topLangs
    .map((lang, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = col === 0 ? 475 : 660;
      const y = 365 + row * 24;
      return `
      <g transform="translate(${x}, ${y})">
        <rect x="0" y="-9" width="8" height="8" rx="1.5" fill="${lang.color}" />
        <text x="16" y="0" fill="#e6edf3" font-size="12" font-weight="600">${escapeXml(lang.name)}</text>
        <text x="105" y="0" class="mono" fill="#8b949e" font-size="11.5" font-weight="600">${lang.percent.toFixed(1)}%</text>
      </g>`;
    })
    .join('');

  // Bottom Neo-Brutalist Bento Tech Stack Grid
  const bentoTechCards = renderTechBentoCards();

  return `<svg width="880" height="724" viewBox="0 0 880 724" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Architectural Dot Matrix Pattern for Bento Section -->
    <pattern id="brutalist-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#21262d" />
    </pattern>
    <!-- Diagonal Hazard Stripe Pattern -->
    <pattern id="diagonal-stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#30363d" stroke-width="3" />
    </pattern>
  </defs>

  <style>
    .font { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .mono { font-family: 'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes drawRing {
      from { stroke-dashoffset: ${circumference}; }
      to { stroke-dashoffset: ${targetDashOffset}; }
    }
    @keyframes barGrow {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }

    .animate-fade { animation: fadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-ring {
      stroke-dasharray: ${circumference};
      stroke-dashoffset: ${targetDashOffset};
      animation: drawRing 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
      transform-origin: center;
    }
    .lang-bar {
      transform-origin: 475px center;
      animation: barGrow 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }
    .num { font-size: 38px; font-weight: 800; fill: #ffffff; letter-spacing: -0.5px; }
    .lbl { font-size: 11.5px; font-weight: 700; fill: #8b949e; letter-spacing: 1.5px; }
  </style>

  <!-- Main Outer Frame -->
  <rect x="1" y="1" width="878" height="722" rx="12" fill="#0b0d11" stroke="#30363d" stroke-width="2"/>

  <!-- Bento Lower Zone Background Matrix -->
  <rect x="2" y="436" width="876" height="286" rx="10" fill="url(#brutalist-dots)" opacity="0.75"/>

  <!-- Top Section Grid Lines -->
  <line x1="440" y1="1" x2="440" y2="435" stroke="#21262d" stroke-width="1.5"/>
  <line x1="1" y1="115" x2="440" y2="115" stroke="#21262d" stroke-width="1.5"/>
  <line x1="1" y1="220" x2="440" y2="220" stroke="#21262d" stroke-width="1.5"/>
  <line x1="1" y1="325" x2="440" y2="325" stroke="#21262d" stroke-width="1.5"/>
  <line x1="220" y1="115" x2="220" y2="325" stroke="#21262d" stroke-width="1.5"/>
  <line x1="440" y1="270" x2="879" y2="270" stroke="#21262d" stroke-width="1.5"/>
  
  <!-- Heavy Brutalist Divider Between Stats & Tech Stack -->
  <line x1="1" y1="435" x2="879" y2="435" stroke="#30363d" stroke-width="2"/>

  <g class="font animate-fade">
    <!-- Header -->
    <text x="35" y="58" fill="#ffffff" font-size="30" font-weight="800" letter-spacing="-0.5">abushaid_islam</text>
    <text x="35" y="90" fill="#8b949e" font-size="18" font-weight="500">’s GitHub Stats</text>
    <path transform="translate(175, 74) scale(1)" fill="#8b949e" fill-rule="evenodd" clip-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"/>

    <!-- Left Stats Cells -->
    <text x="110" y="170" text-anchor="middle" class="num">${formatNumber(data.stars)}</text>
    <text x="110" y="196" text-anchor="middle" class="lbl">STARS</text>

    <text x="330" y="170" text-anchor="middle" class="num">${formatNumber(data.commits)}</text>
    <text x="330" y="196" text-anchor="middle" class="lbl">COMMITS</text>

    <text x="110" y="275" text-anchor="middle" class="num">${formatNumber(data.prs)}</text>
    <text x="110" y="301" text-anchor="middle" class="lbl">PRs</text>

    <text x="330" y="275" text-anchor="middle" class="num">${formatNumber(data.issues)}</text>
    <text x="330" y="301" text-anchor="middle" class="lbl">ISSUES</text>

    <text x="220" y="380" text-anchor="middle" class="num">${formatNumber(data.contributed)}</text>
    <text x="220" y="406" text-anchor="middle" class="lbl">CONTRIBUTED TO</text>

    <!-- Rank Circular Ring -->
    <g transform="translate(660, 138)">
      <circle cx="0" cy="0" r="${radius}" stroke="#21262d" stroke-width="16" fill="none" />
      <circle class="animate-ring" cx="0" cy="0" r="${radius}" stroke="#ffffff" stroke-width="16" stroke-linecap="round" fill="none" transform="rotate(-90)" />
      <text x="0" y="15" text-anchor="middle" fill="#ffffff" font-size="44" font-weight="800" letter-spacing="1">${grade}</text>
    </g>

    <!-- Languages Header -->
    <text x="660" y="302" text-anchor="middle" class="lbl">MOST USED LANGUAGES</text>

    <!-- Animated Progress Bar -->
    <clipPath id="bar-clip">
      <rect x="475" y="325" width="350" height="10" rx="2" />
    </clipPath>
    <g class="lang-bar" clip-path="url(#bar-clip)">
      ${langBarSegments}
    </g>

    <!-- Language Legend -->
    ${legendItems}

    <!-- ========================================== -->
    <!-- NEO-BRUTALIST BENTO TECH STACK HEADER BAR  -->
    <!-- ========================================== -->
    <g transform="translate(26, 450)">
      <!-- Brutalist Hard Shadow Badge -->
      <rect x="3" y="3" width="172" height="22" fill="#000000" />
      <rect x="0" y="0" width="172" height="22" fill="#58a6ff" stroke="#0d1117" stroke-width="1.2" />
      <text x="10" y="15" fill="#090b0f" font-size="11" font-weight="900" letter-spacing="1.2">⚡ TECH_STACK.SYS</text>

      <!-- Industrial Stripe Bar & Telemetry -->
      <rect x="184" y="2" width="60" height="18" fill="url(#diagonal-stripes)" stroke="#30363d" stroke-width="1" />
      <text x="256" y="15" class="mono" fill="#8b949e" font-size="11" font-weight="600">// ARCHITECTURE &amp; PRODUCTION TOOLING</text>

      <!-- Right Status Pill -->
      <rect x="742" y="2" width="86" height="18" rx="2" fill="#161b22" stroke="#30363d" stroke-width="1" />
      <circle cx="753" cy="11" r="3" fill="#3fb950" />
      <text x="762" y="14.5" class="mono" fill="#e6edf3" font-size="9.5" font-weight="700">16 ACTIVE</text>
    </g>

    <!-- Neo-Brutalist Bento Cards -->
    ${bentoTechCards}
  </g>
</svg>`;
}

async function main() {
  const stats = await fetchStats();
  const svg = generateSVG(stats);
  const outDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'github-stats.svg'), svg);
  console.log('✅ Generated Neo-Brutalist Bento GitHub Stats SVG at ./assets/github-stats.svg');
}

main();
