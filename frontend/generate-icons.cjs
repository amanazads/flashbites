/**
 * FlashBites Icon Generator
 * Generates all required icon sizes for Web, Android, and iOS from a source 1024x1024 PNG.
 * 
 * Usage: node generate-icons.js <path-to-source-icon.png>
 * Example: node generate-icons.js src/resources/icon.png
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceIcon = process.argv[2];
const sourceLogo = process.argv[3]; // optional: logo image (also 1:1)

if (!sourceIcon || !fs.existsSync(sourceIcon)) {
  console.error('Usage: node generate-icons.js <icon.png> [logo-with-text.png]');
  process.exit(1);
}

const ANDROID_BASE = 'android/app/src/main/res';
const IOS_BASE = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
const WEB_PUBLIC = 'public';
const WEB_ASSETS = 'src/assets';

// Android mipmap icon sizes
const ANDROID_ICONS = [
  { dir: 'mipmap-mdpi',    size: 48 },
  { dir: 'mipmap-hdpi',    size: 72 },
  { dir: 'mipmap-xhdpi',   size: 96 },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// iOS icon sizes
const IOS_ICONS = [
  { name: 'AppIcon-20@2x.png',   size: 40 },
  { name: 'AppIcon-20@3x.png',   size: 60 },
  { name: 'AppIcon-29@2x.png',   size: 58 },
  { name: 'AppIcon-29@3x.png',   size: 87 },
  { name: 'AppIcon-40@2x.png',   size: 80 },
  { name: 'AppIcon-40@3x.png',   size: 120 },
  { name: 'AppIcon-60@2x.png',   size: 120 },
  { name: 'AppIcon-60@3x.png',   size: 180 },
  { name: 'AppIcon-76.png',      size: 76 },
  { name: 'AppIcon-76@2x.png',   size: 152 },
  { name: 'AppIcon-83.5@2x.png', size: 167 },
  { name: 'AppIcon-512@2x.png',  size: 1024 },
];

async function generateIcon(src, outputPath, size) {
  await sharp(src)
    .resize(size, size, {
      fit: 'contain',
      position: 'centre',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(outputPath);
  console.log(`✅ ${outputPath} (${size}x${size})`);
}

async function run() {
  console.log('\n🎨 FlashBites Icon Generator\n');

  // Android icons
  console.log('📱 Generating Android icons...');
  for (const { dir, size } of ANDROID_ICONS) {
    const dirPath = path.join(ANDROID_BASE, dir);
    fs.mkdirSync(dirPath, { recursive: true });
    await generateIcon(sourceIcon, path.join(dirPath, 'ic_launcher.png'), size);
    await generateIcon(sourceIcon, path.join(dirPath, 'ic_launcher_round.png'), size);
    await generateIcon(sourceIcon, path.join(dirPath, 'ic_launcher_foreground.png'), size);
  }

  // iOS icons
  console.log('\n🍎 Generating iOS icons...');
  fs.mkdirSync(IOS_BASE, { recursive: true });
  for (const { name, size } of IOS_ICONS) {
    await generateIcon(sourceIcon, path.join(IOS_BASE, name), size);
  }

  // Web assets
  console.log('\n🌐 Generating web assets...');
  const logoSource = (sourceLogo && fs.existsSync(sourceLogo)) ? sourceLogo : sourceIcon;
  fs.copyFileSync(logoSource, path.join(WEB_PUBLIC, 'logo.png'));
  fs.copyFileSync(logoSource, path.join(WEB_ASSETS, 'logo.png'));
  console.log('✅ logo.png copied as-is');

  // Favicon ICO (using the 48x48 version)
  await sharp(sourceIcon)
    .resize(48, 48)
    .png()
    .toFile(path.join(WEB_PUBLIC, 'favicon.png'));
  console.log('✅ favicon.png (48x48) — rename to favicon.ico if needed');

  console.log('\n🎉 All icons generated successfully!\n');
  console.log('Next steps:');
  console.log('  1. npm run build');
  console.log('  2. npx cap sync android');
  console.log('  3. npx cap sync ios');
  console.log('  4. npx cap open android  (or ios)');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
