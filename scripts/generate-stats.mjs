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

// Official / recognizable brand colors for tech dots
const TECH_BRAND_COLORS = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  HTML5: '#e34f26',
  CSS3: '#1572b6',
  React: '#61dafb',
  'Next.js': '#ffffff',
  'Tailwind CSS': '#38bdf8',
  'Node.js': '#5fa04e',
  'REST APIs': '#00bcd4',
  PostgreSQL: '#4169e1',
  MongoDB: '#47a248',
  Redis: '#dc382d',
  AWS: '#ff9900',
  Vercel: '#ffffff',
  Docker: '#2496ed',
  Linux: '#fcc624',
};

// Tech stack grouped with category accent colors
const TECH_STACK = [
  { category: "Languages", color: "#58a6ff", items: ["TypeScript", "JavaScript", "HTML5", "CSS3"] },
  { category: "Frontend", color: "#bc8cff", items: ["React", "Next.js", "Tailwind CSS"] },
  { category: "Backend", color: "#3fb950", items: ["Node.js", "REST APIs"] },
  { category: "Data & Storage", color: "#f0883e", items: ["PostgreSQL", "MongoDB", "Redis"] },
  { category: "Cloud & Infra", color: "#79c0ff", items: ["AWS", "Vercel", "Docker", "Linux"] }
];

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
  const commits = user.contributionsCollection.totalCommitContributions +
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
  // Grid coordinates layout:
  // Row 1: 3 cards (x: 30, 308, 586, width: 264, y: 474, height: 94)
  // Row 2: 2 cards (x: 30, 447, width: 403, y: 578, height: 94)
  const cardLayouts = [
    { x: 30,  y: 474, w: 264, h: 94 },
    { x: 308, y: 474, w: 264, h: 94 },
    { x: 586, y: 474, w: 264, h: 94 },
    { x: 30,  y: 578, w: 403, h: 94 },
    { x: 447, y: 578, w: 403, h: 94 }
  ];

  return TECH_STACK.map((group, idx) => {
    const layout = cardLayouts[idx];
    const { x, y, w, h } = layout;

    // Render chips with auto line-wrap
    let curX = x + 12;
    let curY = y + 36;
    const chipHeight = 22;
    const gapX = 6;
    const gapY = 6;

    const chipsSvg = group.items.map(item => {
      const itemColor = TECH_BRAND_COLORS[item] || '#8b949e';
      const textWidth = Math.round(item.length * 6.6 + 28);
      
      // Auto wrap if chip exceeds card boundary
      if (curX + textWidth > x + w - 12) {
        curX = x + 12;
        curY += chipHeight + gapY;
      }

      const chip = `
        <g transform="translate(${curX}, ${curY})">
          <rect width="${textWidth}" height="${chipHeight}" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1"/>
          <circle cx="10" cy="11" r="3" fill="${itemColor}"/>
          <text x="18" y="15" fill="#e6edf3" font-size="10.5" font-weight="500">${item}</text>
        </g>`;
      curX += textWidth + gapX;
      return chip;
    }).join('');

    return `
      <!-- Card ${group.category} -->
      <g>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#0d1117" stroke="#21262d" stroke-width="1.2"/>
        
        <!-- Header -->
        <circle cx="${x + 16}" cy="${y + 18}" r="4" fill="${group.color}"/>
        <text x="${x + 28}" y="${y + 22}" fill="#e6edf3" font-size="11" font-weight="700" letter-spacing="0.8">${group.category.toUpperCase()}</text>
        <text x="${x + w - 14}" y="${y + 22}" text-anchor="end" fill="#6e7681" font-size="10" font-weight="600">${group.items.length} tools</text>
        
        <!-- Divider inside card -->
        <line x1="${x + 12}" y1="${y + 28}" x2="${x + w - 12}" y2="${y + 28}" stroke="#1f242c" stroke-width="1"/>

        <!-- Chips -->
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
  const langBarSegments = data.topLangs.map((lang) => {
    const w = Math.max((lang.percent / 100) * barWidth, 6);
    const rect = `<rect x="${currentX.toFixed(1)}" y="325" width="${w.toFixed(1)}" height="10" fill="${lang.color}" />`;
    currentX += w;
    return rect;
  }).join('\n      ');

  // Top Languages Legend
  const legendItems = data.topLangs.map((lang, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = col === 0 ? 475 : 660;
    const y = 365 + row * 24;
    return `
      <g transform="translate(${x}, ${y})">
        <circle cx="5" cy="-4" r="4.5" fill="${lang.color}" />
        <text x="18" y="0" fill="#e6edf3" font-size="12" font-weight="500">${lang.name}</text>
        <text x="100" y="0" fill="#8b949e" font-size="12" font-weight="500">${lang.percent.toFixed(1)}%</text>
      </g>`;
  }).join('');

  // Bottom Bento Tech Stack Grid
  const bentoTechCards = renderTechBentoCards();

  return `<svg width="880" height="690" viewBox="0 0 880 690" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .font { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
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

    .animate-fade { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
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
    .lbl { font-size: 11.5px; font-weight: 600; fill: #8b949e; letter-spacing: 1.5px; }
  </style>

  <!-- Main Container -->
  <rect x="1" y="1" width="878" height="688" rx="14" fill="#0b0d11" stroke="#21262d" stroke-width="1.8"/>

  <!-- Bento Divider Lines -->
  <line x1="440" y1="1" x2="440" y2="435" stroke="#21262d" stroke-width="1.5"/>
  <line x1="1" y1="115" x2="440" y2="115" stroke="#21262d" stroke-width="1.5"/>
  <line x1="1" y1="220" x2="440" y2="220" stroke="#21262d" stroke-width="1.5"/>
  <line x1="1" y1="325" x2="440" y2="325" stroke="#21262d" stroke-width="1.5"/>
  <line x1="220" y1="115" x2="220" y2="325" stroke="#21262d" stroke-width="1.5"/>
  <line x1="440" y1="270" x2="879" y2="270" stroke="#21262d" stroke-width="1.5"/>
  
  <!-- Stack Section Divider -->
  <line x1="1" y1="435" x2="879" y2="435" stroke="#21262d" stroke-width="1.5"/>

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
      <rect x="475" y="325" width="350" height="10" rx="5" />
    </clipPath>
    <g class="lang-bar" clip-path="url(#bar-clip)">
      ${langBarSegments}
    </g>

    <!-- Language Legend -->
    ${legendItems}

    <!-- Bottom Bento Section: Tech Stack & Tools -->
    <g transform="translate(30, 458)">
      <!-- Section Tag Icon -->
      <rect x="0" y="-12" width="16" height="16" rx="4" fill="#1f6feb22" stroke="#1f6feb" stroke-width="1"/>
      <path d="M4 -5 L7 -3 L4 -1 M8 -1 L12 -1" stroke="#58a6ff" stroke-width="1.2" stroke-linecap="round"/>
      <text x="24" y="0" fill="#58a6ff" font-size="12" font-weight="700" letter-spacing="1.2">TECH STACK &amp; TOOLS</text>
      <text x="180" y="0" fill="#6e7681" font-size="11" font-weight="500">Core technologies &amp; ecosystem</text>
    </g>

    <!-- Mini Bento Grid Cards -->
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
  console.log('✅ Generated unified animated GitHub Stats & Stack SVG at ./assets/github-stats.svg');
}

main();
