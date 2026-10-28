#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="DJ VFX Launcher"
APP_BUNDLE="${ROOT_DIR}/${APP_NAME}.app"
CONTENTS_DIR="${APP_BUNDLE}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"

echo "⚡ Building macOS Native App: ${APP_BUNDLE}..."

mkdir -p "${MACOS_DIR}" "${RESOURCES_DIR}"

# 1. Create Info.plist
cat > "${CONTENTS_DIR}/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>DJ VFX Launcher</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.jkmclaren.djvfxlauncher</string>
    <key>CFBundleName</key>
    <string>DJ VFX Launcher</string>
    <key>CFBundleDisplayName</key>
    <string>DJ VFX Launcher</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>2.3.0</string>
    <key>CFBundleVersion</key>
    <string>230</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>
EOF

# 2. Generate macOS AppIcon.icns using Swift CoreGraphics + iconutil
ICONSET_DIR="$(mktemp -d)/AppIcon.iconset"
mkdir -p "${ICONSET_DIR}"

swift - "${ICONSET_DIR}" << 'SWIFT_ICON'
import Cocoa

let iconsetPath = CommandLine.arguments[1]
let sizes = [16, 32, 64, 128, 256, 512, 1024]

func renderIcon(size: Int) -> NSBitmapImageRep {
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let ctx = NSGraphicsContext.current!.cgContext
    let s = CGFloat(size)

    // Rounded squircle background
    let inset = s * 0.06
    let rect = CGRect(x: inset, y: inset, width: s - inset * 2, height: s - inset * 2)
    let path = CGPath(roundedRect: rect, cornerWidth: s * 0.22, cornerHeight: s * 0.22, transform: nil)
    ctx.addPath(path)
    ctx.clip()

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bgColors = [
        CGColor(red: 0.04, green: 0.06, blue: 0.14, alpha: 1.0),
        CGColor(red: 0.10, green: 0.05, blue: 0.22, alpha: 1.0)
    ] as CFArray
    let grad = CGGradient(colorsSpace: colorSpace, colors: bgColors, locations: [0.0, 1.0])!
    ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: s), end: CGPoint(x: s, y: 0), options: [])

    // Neon border
    ctx.setStrokeColor(CGColor(red: 0.0, green: 0.95, blue: 1.0, alpha: 0.85))
    ctx.setLineWidth(s * 0.03)
    ctx.addPath(path)
    ctx.strokePath()

    // Draw 4 glowing equalizer bars
    let barColors: [(CGFloat, CGFloat, CGFloat, CGFloat)] = [
        (0.0, 0.95, 1.0, 0.55),
        (0.66, 0.33, 0.97, 0.78),
        (1.0, 0.0, 0.50, 0.65),
        (0.13, 0.77, 0.37, 0.48)
    ]
    let barWidth = s * 0.11
    let gap = s * 0.055
    let totalW = barWidth * 4 + gap * 3
    let startX = (s - totalW) / 2.0
    let baseY = s * 0.20

    for (i, bar) in barColors.enumerated() {
        let bx = startX + CGFloat(i) * (barWidth + gap)
        let bh = s * bar.3
        let bRect = CGRect(x: bx, y: baseY, width: barWidth, height: bh)
        let bPath = CGPath(roundedRect: bRect, cornerWidth: barWidth * 0.4, cornerHeight: barWidth * 0.4, transform: nil)
        ctx.setFillColor(CGColor(red: bar.0, green: bar.1, blue: bar.2, alpha: 1.0))
        ctx.addPath(bPath)
        ctx.fillPath()
    }

    NSGraphicsContext.restoreGraphicsState()
    return rep
}

let pairs: [(String, Int)] = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024)
]

for (name, px) in pairs {
    let rep = renderIcon(size: px)
    if let png = rep.representation(using: .png, properties: [:]) {
        try? png.write(to: URL(fileURLWithPath: "\(iconsetPath)/\(name)"))
    }
}
SWIFT_ICON

iconutil -c icns "${ICONSET_DIR}" -o "${RESOURCES_DIR}/AppIcon.icns" || true
rm -rf "$(dirname "${ICONSET_DIR}")"

# 3. Compile Swift Native Binary
swiftc -O \
    -framework Cocoa \
    -framework SwiftUI \
    -framework Network \
    "${ROOT_DIR}/mac-launcher/LauncherApp.swift" \
    -o "${MACOS_DIR}/DJ VFX Launcher"

# 4. Ad-hoc sign bundle so macOS launches it without Gatekeeper complaints
codesign --force --deep --sign - "${APP_BUNDLE}" 2>/dev/null || true

echo "✅ Successfully built ${APP_BUNDLE}"

