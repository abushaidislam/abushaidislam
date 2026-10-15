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

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

function calculateRank( { stars, commits, prs, issues } ) {
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
        pullRequests(first: 1) {
          totalCount
        }
        issues(first: 1) {
          totalCount
        }
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

  // 1. Total Stars
  const stars = user.repositories.nodes.reduce((acc, repo) => acc + repo.stargazerCount, 0);

  // 2. Total Commits
  const commits =
    user.contributionsCollection.totalCommitContributions +
    user.contributionsCollection.restrictedContributionsCount;

  // 3. PRs, Issues, Contributed To
  const prs = user.pullRequests.totalCount;
  const issues = user.issues.totalCount;
  const contributed = user.repositoriesContributedTo.totalCount;

  // 4. Languages Calculation
  const langMap = {};
  let totalLangSize = 0;

  for (const repo of user.repositories.nodes) {
    if (!repo.languages?.edges) continue;
    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      const color = edge.node.color || LANGUAGE_COLORS[name] || '#8b949e';
      if (!langMap[name]) {
        langMap[name] = { size: 0, color };
      }
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

function generateSVG(data) {
  const { grade, progress } = calculateRank(data);
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  // Generate Segmented Language Progress Bar (Total Width = 350px)
  const barWidth = 350;
  let currentX = 480;
  const langBarSegments = data.topLangs
    .map((lang) => {
      const w = Math.max((lang.percent / 100) * barWidth, 6);
      const rect = `<rect x="${currentX.toFixed(1)}" y="348" width="${w.toFixed(1)}" height="12" fill="${lang.color}" />`;
      currentX += w;
      return rect;
    })
    .join('\n      ');

  // Generate 2-Column Legend
  const legendItems = data.topLangs
    .map((lang, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = col === 0 ? 480 : 665;
      const y = 392 + row * 28;
      return `
      <g transform="translate(${x}, ${y})">
        <circle cx="6" cy="-5" r="5.5" fill="${lang.color}" />
        <text x="20" y="0" fill="#e6edf3" font-size="13.5" font-weight="500">${lang.name}</text>
        <text x="108" y="0" fill="#8b949e" font-size="13.5" font-weight="500">${lang.percent.toFixed(2)}%</text>
      </g>`;
    })
    .join('');

  return `<svg width="880" height="475" viewBox="0 0 880 475" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .font { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .num { font-size: 44px; font-weight: 800; fill: #ffffff; letter-spacing: -1px; }
    .lbl { font-size: 13px; font-weight: 600; fill: #8b949e; letter-spacing: 1.5px; }
  </style>

  <!-- Outer Card Background -->
  <rect x="1" y="1" width="878" height="473" rx="14" fill="#0b0d11" stroke="#21262d" stroke-width="2"/>

  <!-- Bento Grid Divider Lines -->
  <line x1="440" y1="1" x2="440" y2="474" stroke="#21262d" stroke-width="1.5"/>
  <line x1="1" y1="130" x2="440" y2="130" stroke="#21262d" stroke-width="1.5"/>
  <line x1="1" y1="245" x2="440" y2="245" stroke="#21262d" stroke-width="1.5"/>
  <line x1="1" y1="360" x2="440" y2="360" stroke="#21262d" stroke-width="1.5"/>
  <line x1="220" y1="130" x2="220" y2="360" stroke="#21262d" stroke-width="1.5"/>
  <line x1="440" y1="290" x2="879" y2="290" stroke="#21262d" stroke-width="1.5"/>

  <g class="font">
    <!-- Header Cell -->
    <text x="42" y="65" fill="#ffffff" font-size="34" font-weight="800" letter-spacing="-0.5">abushaid_islam</text>
    <text x="42" y="102" fill="#8b949e" font-size="22" font-weight="500">’s GitHub Stats</text>
    
    <!-- GitHub Octocat Icon -->
    <path transform="translate(202, 81) scale(1.15)" fill="#8b949e" fill-rule="evenodd" clip-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"/>

    <!-- Stars -->
    <text x="110" y="192" text-anchor="middle" class="num">${formatNumber(data.stars)}</text>
    <text x="110" y="220" text-anchor="middle" class="lbl">STARS</text>

    <!-- Commits -->
    <text x="330" y="192" text-anchor="middle" class="num">${formatNumber(data.commits)}</text>
    <text x="330" y="220" text-anchor="middle" class="lbl">COMMITS</text>

    <!-- PRs -->
    <text x="110" y="307" text-anchor="middle" class="num">${formatNumber(data.prs)}</text>
    <text x="110" y="335" text-anchor="middle" class="lbl">PRs</text>

    <!-- Issues -->
    <text x="330" y="307" text-anchor="middle" class="num">${formatNumber(data.issues)}</text>
    <text x="330" y="335" text-anchor="middle" class="lbl">ISSUES</text>

    <!-- Contributed To -->
    <text x="220" y="418" text-anchor="middle" class="num">${formatNumber(data.contributed)}</text>
    <text x="220" y="446" text-anchor="middle" class="lbl">CONTRIBUTED TO</text>

    <!-- Right Top: Rank Ring -->
    <g transform="translate(660, 148)">
      <circle cx="0" cy="0" r="${radius}" stroke="#21262d" stroke-width="18" fill="none" />
      <circle cx="0" cy="0" r="${radius}" stroke="#ffffff" stroke-width="18" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" stroke-linecap="round" fill="none" transform="rotate(-90)" />
      <text x="0" y="16" text-anchor="middle" fill="#ffffff" font-size="48" font-weight="800" letter-spacing="1">${grade}</text>
    </g>

    <!-- Right Bottom: Most Used Languages -->
    <text x="660" y="328" text-anchor="middle" class="lbl">MOST USED LANGUAGES</text>

    <clipPath id="bar-clip">
      <rect x="480" y="348" width="350" height="12" rx="6" />
    </clipPath>
    <g clip-path="url(#bar-clip)">
      ${langBarSegments}
    </g>

    <!-- Language Legend -->
    ${legendItems}
  </g>
</svg>`;
}

async function main() {
  const stats = await fetchStats();
  const svg = generateSVG(stats);
  const outDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'github-stats.svg'), svg);
  console.log('✅ Successfully generated ./assets/github-stats.svg');
}

main();
