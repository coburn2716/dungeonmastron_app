import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputDir = join(__dirname, '..', 'public', 'web_assets')

async function makeOgImage(filename, title, subtitle) {
  const svg = `
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0D0D18;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1a1228;stop-opacity:1" />
      </linearGradient>
    </defs>
    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)" />
    <!-- Decorative corner accent top-left -->
    <line x1="0" y1="0" x2="240" y2="0" stroke="#C8973A" stroke-width="4" />
    <line x1="0" y1="0" x2="0" y2="120" stroke="#C8973A" stroke-width="4" />
    <!-- Decorative corner accent bottom-right -->
    <line x1="1200" y1="630" x2="960" y2="630" stroke="#C8973A" stroke-width="4" />
    <line x1="1200" y1="630" x2="1200" y2="510" stroke="#C8973A" stroke-width="4" />
    <!-- DM wordmark -->
    <text x="80" y="120" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#C8973A" letter-spacing="6">DUNGEON MASTRON</text>
    <!-- Separator -->
    <line x1="80" y1="145" x2="300" y2="145" stroke="#C8973A" stroke-width="2" opacity="0.6" />
    <!-- Main title -->
    <text x="80" y="340" font-family="Georgia, serif" font-size="72" font-weight="bold" fill="#F5F0E8">${title}</text>
    <!-- Subtitle -->
    <text x="80" y="420" font-family="Georgia, serif" font-size="28" fill="#C8973A" opacity="0.9">${subtitle}</text>
    <!-- Bottom URL -->
    <text x="80" y="570" font-family="Georgia, serif" font-size="22" fill="rgba(245,240,232,0.4)">dungeonmastron.com</text>
  </svg>`

  const outPath = join(outputDir, filename)
  await sharp(Buffer.from(svg)).png().toFile(outPath)
  console.log(`Created ${filename}`)
}

const images = [
  { filename: 'og-play.png',    title: 'Web Player',     subtitle: 'Play story games free in your browser' },
  { filename: 'og-ai.png',      title: 'AI Companion',   subtitle: 'AI-powered characters and narrative tools' },
  { filename: 'og-library.png', title: 'Game Library',   subtitle: 'Browse and play community stories' },
  { filename: 'og-console.png', title: 'Pi Console',     subtitle: 'Build your own handheld game console' },
  { filename: 'og-guides.png',  title: 'Guides',         subtitle: 'Learn to design branching stories' },
  { filename: 'og-builder.png', title: 'Visual Builder', subtitle: 'Design worlds. Shape stories.' },
]

for (const img of images) {
  await makeOgImage(img.filename, img.title, img.subtitle)
}

console.log('All OG images generated.')
