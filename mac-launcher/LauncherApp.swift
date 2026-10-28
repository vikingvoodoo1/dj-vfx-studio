import Cocoa
import SwiftUI
import Network

// MARK: - Data Models & Shared Configuration (~/.dj-vfx-launcher.json)

struct LaunchMode: Identifiable {
    let id: String
    let number: String
    let title: String
    let shortTitle: String
    let subtitle: String
    let badge: String
    let accentHex: String
    let needsVite: Bool
    let needsBridge: Bool
    let isElectron: Bool
    let urlQuery: String?
}

let ALL_MODES: [LaunchMode] = [
    LaunchMode(
        id: "studio",
        number: "1",
        title: "Full Studio Mode",
        shortTitle: "1. Full Studio Mode",
        subtitle: "Starts Vite 3D WebGL (:5173) + Universal Hardware Bridge (:8080) & opens Main Studio UI",
        badge: "FULL STUDIO RIG",
        accentHex: "#00F2FE",
        needsVite: true,
        needsBridge: true,
        isElectron: false,
        urlQuery: ""
    ),
    LaunchMode(
        id: "stage",
        number: "2",
        title: "Clean Stage / Projector Mode",
        shortTitle: "2. Clean Stage / Projector Mode",
        subtitle: "Zero-HUD, cursor-hidden 3D visual feed (?mode=stage&clean=true) for external screens & projectors",
        badge: "CLEAN STAGE OUTPUT",
        accentHex: "#A855F7",
        needsVite: true,
        needsBridge: true,
        isElectron: false,
        urlQuery: "?mode=stage&clean=true"
    ),
    LaunchMode(
        id: "dual-rig",
        number: "3",
        title: "Detached Controller + Stage Rig",
        shortTitle: "3. Detached Controller + Stage Rig",
        subtitle: "Dual-window live performance setup: Master Control Console (?mode=controller) + Clean Stage Output",
        badge: "DUAL-WINDOW LIVE RIG",
        accentHex: "#FF007F",
        needsVite: true,
        needsBridge: true,
        isElectron: false,
        urlQuery: "?mode=controller"
    ),
    LaunchMode(
        id: "obs",
        number: "4A",
        title: "OBS Stream Mode (Clean Feed)",
        shortTitle: "4a. OBS Stream Mode (?mode=obs)",
        subtitle: "Zero-FOUC broadcast stream output (?mode=obs) + auto-copies OBS Browser Source URL to clipboard",
        badge: "BROADCAST STREAM",
        accentHex: "#22C55E",
        needsVite: true,
        needsBridge: true,
        isElectron: false,
        urlQuery: "?mode=obs"
    ),
    LaunchMode(
        id: "obs-overlay",
        number: "4B",
        title: "OBS Transparent Alpha Overlay",
        shortTitle: "4b. OBS Transparent Overlay (?overlay=true)",
        subtitle: "Transparent alpha-channel background (?mode=obs&overlay=true) for live DJ camera compositing",
        badge: "ALPHA OVERLAY",
        accentHex: "#10B981",
        needsVite: true,
        needsBridge: true,
        isElectron: false,
        urlQuery: "?mode=obs&overlay=true"
    ),
    LaunchMode(
        id: "electron",
        number: "5",
        title: "Native Electron Desktop App Mode",
        shortTitle: "5. Native Electron Desktop App",
        subtitle: "Launches GPU-accelerated native Electron app with background Hardware Bridge & 2nd-screen Projector",
        badge: "NATIVE GPU APP",
        accentHex: "#3B82F6",
        needsVite: true,
        needsBridge: true,
        isElectron: true,
        urlQuery: ""
    ),
    LaunchMode(
        id: "bridge-only",
        number: "6A",
        title: "Service Only: Hardware Bridge (:8080)",
        shortTitle: "6a. Hardware Bridge Only (:8080)",
        subtitle: "Headless telemetry daemon only (StageLinQ, Pioneer Pro DJ Link, Traktor, Philips Hue, OBS, BUTT)",
        badge: "HEADLESS BRIDGE",
        accentHex: "#F59E0B",
        needsVite: false,
        needsBridge: true,
        isElectron: false,
        urlQuery: nil
    ),
    LaunchMode(
        id: "vite-only",
        number: "6B",
        title: "Service Only: Visualizer Only (:5173)",
        shortTitle: "6b. Visualizer Only (No Bridge)",
        subtitle: "Standalone 3D WebGL visualizer without Hardware Bridge (Pure Microphone / Line-In audio reactive mode)",
        badge: "STANDALONE WEBGL",
        accentHex: "#EAB308",
        needsVite: true,
        needsBridge: false,
        isElectron: false,
        urlQuery: ""
    )
]

struct LauncherConfig: Codable {
    var defaultMode: String = "studio"
    var showInMenuBar: Bool = true
    var keepInMenuBarOnClose: Bool = true
    var autoLaunchDefaultOnOpen: Bool = false
    var projectPath: String = "/Users/jarikuhanen/agy/dj-vfx-studio"
    var updatedAt: String? = nil
}

// MARK: - Main Controller & Process Manager

@MainActor
final class VFXLauncherController: ObservableObject {
    static let shared = VFXLauncherController()

    @Published var config: LauncherConfig = LauncherConfig()
    @Published var viteOnline: Bool = false
    @Published var bridgeOnline: Bool = false
    @Published var activeModeId: String = "studio"
    @Published var isLaunching: Bool = false
    @Published var statusBanner: String = "Ready — Select a startup mode or launch your Default Mode."
    @Published var logLines: [String] = []
    @Published var showLogs: Bool = false

    private var viteProcess: Process?
    private var bridgeProcess: Process?
    private var electronProcess: Process?
    private var pollTimer: Timer?

    var onMenuBarPreferenceChanged: (() -> Void)?

    private var configFileURL: URL {
        FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".dj-vfx-launcher.json")
    }

    init() {
        loadConfig()
        detectProjectDirectory()
        startPortPolling()
    }

    func detectProjectDirectory() {
        let fm = FileManager.default
        if fm.fileExists(atPath: config.projectPath + "/package.json") {
            return
        }
        // Check relative to .app bundle location
        let bundleParent = Bundle.main.bundleURL.deletingLastPathComponent().path
        if fm.fileExists(atPath: bundleParent + "/package.json") {
            config.projectPath = bundleParent
            saveConfig()
            return
        }
        let fallback = "/Users/jarikuhanen/agy/dj-vfx-studio"
        if fm.fileExists(atPath: fallback + "/package.json") {
            config.projectPath = fallback
            saveConfig()
        }
    }

    func loadConfig() {
        let url = configFileURL
        guard FileManager.default.fileExists(atPath: url.path) else {
            saveConfig()
            return
        }
        do {
            let data = try Data(contentsOf: url)
            var decoded = try JSONDecoder().decode(LauncherConfig.self, from: data)
            if !ALL_MODES.contains(where: { $0.id == decoded.defaultMode }) {
                decoded.defaultMode = "studio"
            }
            self.config = decoded
        } catch {
            appendLog("[Config] Using default configuration (Mode 1: Full Studio Mode).")
            saveConfig()
        }
    }

    func saveConfig() {
        config.updatedAt = ISO8601DateFormatter().string(from: Date())
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let data = try encoder.encode(config)
            try data.write(to: configFileURL, options: .atomic)
        } catch {
            appendLog("[Config] Failed to save config: \(error.localizedDescription)")
        }
    }

    func mode(for id: String) -> LaunchMode {
        ALL_MODES.first(where: { $0.id == id }) ?? ALL_MODES[0]
    }

    var defaultModeObj: LaunchMode {
        mode(for: config.defaultMode)
    }

    func setDefaultMode(_ id: String) {
        guard ALL_MODES.contains(where: { $0.id == id }) else { return }
        config.defaultMode = id
        saveConfig()
        let m = mode(for: id)
        statusBanner = "★ Default startup mode set to: \(m.shortTitle)"
        appendLog("[Config] Default mode updated to \(m.shortTitle)")
        onMenuBarPreferenceChanged?()
    }

    func setShowInMenuBar(_ enabled: Bool) {
        config.showInMenuBar = enabled
        saveConfig()
        statusBanner = enabled
            ? "Added DJ VFX Launcher icon to macOS Menu Bar."
            : "Removed DJ VFX Launcher icon from macOS Menu Bar."
        onMenuBarPreferenceChanged?()
    }

    func toggleAutoLaunch(_ enabled: Bool) {
        config.autoLaunchDefaultOnOpen = enabled
        saveConfig()
        onMenuBarPreferenceChanged?()
    }

    func appendLog(_ line: String) {
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        let formatted = "[\(timestamp)] \(line)"
        logLines.append(formatted)
        if logLines.count > 250 {
            logLines.removeFirst(logLines.count - 250)
        }
    }

    // MARK: - Port Probing (:5173 Vite & :8080 Bridge)

    func startPortPolling() {
        checkPorts()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.checkPorts()
            }
        }
    }

    func checkPorts() {
        let projectDir = config.projectPath
        Task.detached {
            let vOnline = Self.isPortOpen(port: 5173)
            let bOnline = Self.isPortOpen(port: 8080)
            await MainActor.run {
                let changed = (self.viteOnline != vOnline) || (self.bridgeOnline != bOnline)
                self.viteOnline = vOnline
                self.bridgeOnline = bOnline
                if changed {
                    self.onMenuBarPreferenceChanged?()
                }
            }
            _ = projectDir
        }
    }

    nonisolated static func isPortOpen(port: UInt16) -> Bool {
        var addr = sockaddr_in()
        addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = port.bigEndian
        addr.sin_addr.s_addr = inet_addr("127.0.0.1")

        let sock = socket(AF_INET, SOCK_STREAM, 0)
        guard sock >= 0 else { return false }
        defer { close(sock) }

        let flags = fcntl(sock, F_GETFL, 0)
        _ = fcntl(sock, F_SETFL, flags | O_NONBLOCK)

        let res = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                connect(sock, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        if res == 0 { return true }
        if errno != EINPROGRESS { return false }

        var fdset = fd_set()
        // Zero and set bit for sock
        _ = withUnsafeMutableBytes(of: &fdset) { ptr in
            ptr.initializeMemory(as: UInt8.self, repeating: 0)
        }
        let intOffset = Int(sock) / 32
        let bitOffset = Int(sock) % 32
        withUnsafeMutablePointer(to: &fdset.fds_bits) { bitsPtr in
            let raw = UnsafeMutableRawPointer(bitsPtr).assumingMemoryBound(to: Int32.self)
            raw[intOffset] |= Int32(1 << bitOffset)
        }

        var tv = timeval(tv_sec: 0, tv_usec: 120_000) // 120ms timeout
        let sel = select(sock + 1, nil, &fdset, nil, &tv)
        if sel > 0 {
            var soError: Int32 = 0
            var len = socklen_t(MemoryLayout<Int32>.size)
            getsockopt(sock, SOL_SOCKET, SO_ERROR, &soError, &len)
            return soError == 0
        }
        return false
    }

    // MARK: - Process Spawning & Mode Launching

    private func buildEnvironment() -> [String: String] {
        var env = ProcessInfo.processInfo.environment
        let extraPaths = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        if let existing = env["PATH"], !existing.isEmpty {
            env["PATH"] = "\(extraPaths):\(existing)"
        } else {
            env["PATH"] = extraPaths
        }
        return env
    }

    private func findNodeBinary() -> String {
        let candidates = [
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
            "/usr/bin/node"
        ]
        for path in candidates where FileManager.default.isExecutableFile(atPath: path) {
            return path
        }
        return "/usr/bin/env"
    }

    func ensureBridgeStarted() {
        if Self.isPortOpen(port: 8080) {
            bridgeOnline = true
            appendLog("[Bridge] Hardware Bridge already active on :8080")
            return
        }
        let nodePath = findNodeBinary()
        let proc = Process()
        proc.currentDirectoryURL = URL(fileURLWithPath: config.projectPath)
        proc.environment = buildEnvironment()
        if nodePath.hasSuffix("env") {
            proc.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            proc.arguments = ["node", "server/stagelinq-bridge.js"]
        } else {
            proc.executableURL = URL(fileURLWithPath: nodePath)
            proc.arguments = ["server/stagelinq-bridge.js"]
        }

        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = pipe
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let str = String(data: data, encoding: .utf8) else { return }
            let lines = str.split(separator: "\n").map(String.init)
            Task { @MainActor in
                for l in lines {
                    self?.appendLog("[Bridge] \(l)")
                }
            }
        }

        do {
            try proc.run()
            self.bridgeProcess = proc
            appendLog("[Bridge] Started Universal Hardware Bridge (PID \(proc.processIdentifier))")
        } catch {
            appendLog("[Bridge Error] Failed to start: \(error.localizedDescription)")
        }
    }

    func ensureViteStarted() {
        if Self.isPortOpen(port: 5173) {
            viteOnline = true
            appendLog("[Vite] Visualizer server already active on :5173")
            return
        }
        let viteBin = config.projectPath + "/node_modules/.bin/vite"
        let proc = Process()
        proc.currentDirectoryURL = URL(fileURLWithPath: config.projectPath)
        proc.environment = buildEnvironment()
        proc.executableURL = URL(fileURLWithPath: viteBin)
        proc.arguments = ["--port", "5173"]

        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = pipe
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let str = String(data: data, encoding: .utf8) else { return }
            let lines = str.split(separator: "\n").map(String.init)
            Task { @MainActor in
                for l in lines {
                    self?.appendLog("[Vite] \(l)")
                }
            }
        }

        do {
            try proc.run()
            self.viteProcess = proc
            appendLog("[Vite] Started Vite 3D WebGL Server on :5173 (PID \(proc.processIdentifier))")
        } catch {
            appendLog("[Vite Error] Failed to start: \(error.localizedDescription)")
        }
    }

    private func findPackagedStudioApp() -> String? {
        let fm = FileManager.default
        let bundleParent = Bundle.main.bundleURL.deletingLastPathComponent().path
        let candidates = [
            bundleParent + "/DJ VFX Studio.app/Contents/MacOS/DJ VFX Studio",
            "/Applications/DJ VFX Studio.app/Contents/MacOS/DJ VFX Studio",
            config.projectPath + "/release/mac-arm64/DJ VFX Studio.app/Contents/MacOS/DJ VFX Studio",
            config.projectPath + "/release/mac/DJ VFX Studio.app/Contents/MacOS/DJ VFX Studio"
        ]
        for path in candidates where fm.isExecutableFile(atPath: path) {
            return path
        }
        return nil
    }

    private var hasSourceCheckout: Bool {
        FileManager.default.fileExists(atPath: config.projectPath + "/node_modules/.bin/vite")
    }

    func launchMode(_ modeId: String) {
        let target = mode(for: modeId)
        activeModeId = target.id
        isLaunching = true
        statusBanner = "🚀 Launching \(target.shortTitle)..."
        appendLog("Launching mode: \(target.shortTitle)")

        // If running from a downloaded release without node_modules, delegate to packaged DJ VFX Studio.app
        if !hasSourceCheckout, let studioBin = findPackagedStudioApp() {
            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: studioBin)
            proc.arguments = ["--mode=\(target.id)"]
            try? proc.run()
            self.electronProcess = proc
            isLaunching = false
            statusBanner = "✅ Launched packaged DJ VFX Studio in \(target.shortTitle)"
            appendLog("[Packaged] Started \(studioBin) --mode=\(target.id)")
            return
        }

        // 1. Start or stop services as required by mode
        if target.needsBridge {
            ensureBridgeStarted()
        } else {
            stopBridgeOnly()
        }

        if target.needsVite {
            ensureViteStarted()
        } else {
            stopViteOnly()
        }

        // 2. Wait briefly for Vite (:5173) if needed, then open target window/app
        Task {
            if target.needsVite {
                for _ in 0..<25 {
                    if Self.isPortOpen(port: 5173) { break }
                    try? await Task.sleep(nanoseconds: 200_000_000)
                }
            }
            await MainActor.run {
                self.checkPorts()
                self.openDisplayForMode(target)
                self.isLaunching = false
                self.onMenuBarPreferenceChanged?()
            }
        }
    }

    private func openDisplayForMode(_ target: LaunchMode) {
        if target.isElectron {
            let electronBin = config.projectPath + "/node_modules/.bin/electron"
            let proc = Process()
            proc.currentDirectoryURL = URL(fileURLWithPath: config.projectPath)
            proc.environment = buildEnvironment()
            proc.executableURL = URL(fileURLWithPath: electronBin)
            proc.arguments = ["electron/main.cjs", "--dev", "--mode=electron"]
            do {
                try proc.run()
                self.electronProcess = proc
                statusBanner = "🖥️ Launched Native Electron Desktop App + Stage Projector"
                appendLog("[Electron] Started Native Electron App (PID \(proc.processIdentifier))")
            } catch {
                statusBanner = "⚠️ Failed to launch Electron binary: \(error.localizedDescription)"
            }
            return
        }

        guard let query = target.urlQuery else {
            // Headless service-only mode (e.g. bridge-only)
            statusBanner = "🔌 Hardware Bridge (:8080) is running in headless daemon mode."
            return
        }

        if target.id == "dual-rig" {
            if let u1 = URL(string: "http://localhost:5173/?mode=controller"),
               let u2 = URL(string: "http://localhost:5173/?mode=stage&clean=true") {
                NSWorkspace.shared.open(u1)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                    NSWorkspace.shared.open(u2)
                }
                statusBanner = "🎚️ Opened Detached Master Controller + Clean Stage Rig"
            }
            return
        }

        let fullUrlString = "http://localhost:5173/\(query)"
        if target.id == "obs" || target.id == "obs-overlay" {
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(fullUrlString, forType: .string)
            appendLog("[OBS] Copied Browser Source URL to clipboard: \(fullUrlString)")
        }

        if let url = URL(string: fullUrlString) {
            NSWorkspace.shared.open(url)
            if target.id == "obs" || target.id == "obs-overlay" {
                statusBanner = "📡 Opened \(target.title) & copied URL to clipboard!"
            } else {
                statusBanner = "✅ Active: \(target.shortTitle) (\(fullUrlString))"
            }
        }
    }

    func stopViteOnly() {
        if let proc = viteProcess, proc.isRunning {
            proc.terminate()
        }
        viteProcess = nil
        killPort(5173)
    }

    func stopBridgeOnly() {
        if let proc = bridgeProcess, proc.isRunning {
            proc.terminate()
        }
        bridgeProcess = nil
        killPort(8080)
    }

    func stopAllServices() {
        appendLog("Stopping all DJ VFX Studio services...")
        stopViteOnly()
        stopBridgeOnly()
        if let eProc = electronProcess, eProc.isRunning {
            eProc.terminate()
        }
        electronProcess = nil
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            self.checkPorts()
            self.statusBanner = "⏹️ All VFX services (:5173 & :8080) stopped."
        }
    }

    private func killPort(_ port: Int) {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/sh")
        task.arguments = ["-c", "lsof -ti tcp:\(port) | xargs kill -15 2>/dev/null || true"]
        try? task.run()
    }
}

// MARK: - SwiftUI Views

extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255.0
        let g = Double((int >> 8) & 0xFF) / 255.0
        let b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

struct LauncherRootView: View {
    @ObservedObject var controller = VFXLauncherController.shared

    private let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14)
    ]

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#060811"), Color(hex: "#0C1022"), Color(hex: "#070913")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 14) {
                headerBar
                defaultHeroCard
                telemetryBar

                ScrollView {
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(ALL_MODES) { mode in
                            modeCard(mode)
                        }
                    }
                    .padding(.vertical, 2)
                }

                if controller.showLogs {
                    logDrawer
                }

                footerBar
            }
            .padding(20)
        }
        .frame(minWidth: 880, minHeight: 680)
    }

    private var headerBar: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#00F2FE"), Color(hex: "#A855F7"), Color(hex: "#FF007F")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 44, height: 44)
                Text("⚡")
                    .font(.system(size: 22))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("DJ VFX STUDIO — MAC STARTUP LAUNCHER")
                    .font(.system(size: 18, weight: .heavy, design: .rounded))
                    .foregroundColor(.white)
                Text("Start in any display or service mode • Set any mode as Default • Manage macOS Menu Bar")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.65))
            }

            Spacer()

            // Add / Remove from macOS Menu Bar Toggle Button
            Button(action: {
                controller.setShowInMenuBar(!controller.config.showInMenuBar)
            }) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(controller.config.showInMenuBar ? Color(hex: "#22C55E") : Color.gray)
                        .frame(width: 8, height: 8)
                    Text(controller.config.showInMenuBar ? "In macOS Menu Bar (Remove)" : "Add to macOS Menu Bar")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 99)
                        .fill(controller.config.showInMenuBar ? Color(hex: "#22C55E").opacity(0.18) : Color.white.opacity(0.08))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 99)
                        .stroke(controller.config.showInMenuBar ? Color(hex: "#22C55E") : Color.white.opacity(0.2), lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
        }
    }

    private var defaultHeroCard: some View {
        let def = controller.defaultModeObj
        return HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text("★ CURRENT DEFAULT STARTUP MODE")
                        .font(.system(size: 10, weight: .heavy))
                        .tracking(0.8)
                        .foregroundColor(Color(hex: "#00F2FE"))
                    Text("•")
                        .foregroundColor(.gray)
                    Toggle(isOn: Binding(
                        get: { controller.config.autoLaunchDefaultOnOpen },
                        set: { controller.toggleAutoLaunch($0) }
                    )) {
                        Text("Auto-launch Default when app opens")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color.white.opacity(0.8))
                    }
                    .toggleStyle(.checkbox)
                }

                Text("\(def.shortTitle) — \(def.badge)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)

                Text(def.subtitle)
                    .font(.system(size: 11.5))
                    .foregroundColor(Color.white.opacity(0.7))
                    .lineLimit(1)
            }

            Spacer()

            Button(action: {
                controller.launchMode(controller.config.defaultMode)
            }) {
                HStack(spacing: 6) {
                    Text("🚀 Launch Default Mode")
                        .font(.system(size: 13, weight: .heavy))
                }
                .foregroundColor(Color(hex: "#040814"))
                .padding(.horizontal, 18)
                .padding(.vertical, 11)
                .background(
                    LinearGradient(
                        colors: [Color(hex: "#00F2FE"), Color(hex: "#38BDF8")],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .buttonStyle(.plain)
            .keyboardShortcut(.return, modifiers: [.command])
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 13)
                .fill(Color(hex: "#13192E"))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 13)
                .stroke(Color(hex: "#00F2FE").opacity(0.45), lineWidth: 1)
        )
    }

    private var telemetryBar: some View {
        HStack(spacing: 16) {
            HStack(spacing: 6) {
                Circle()
                    .fill(controller.viteOnline ? Color(hex: "#22C55E") : Color.gray.opacity(0.5))
                    .frame(width: 8, height: 8)
                Text("Vite Visualizer (:5173):")
                    .foregroundColor(Color.white.opacity(0.65))
                Text(controller.viteOnline ? "ONLINE" : "STOPPED")
                    .fontWeight(.bold)
                    .foregroundColor(controller.viteOnline ? Color(hex: "#4ADE80") : Color.white.opacity(0.5))
            }

            HStack(spacing: 6) {
                Circle()
                    .fill(controller.bridgeOnline ? Color(hex: "#22C55E") : Color.gray.opacity(0.5))
                    .frame(width: 8, height: 8)
                Text("Hardware Bridge (:8080):")
                    .foregroundColor(Color.white.opacity(0.65))
                Text(controller.bridgeOnline ? "ONLINE" : "STOPPED")
                    .fontWeight(.bold)
                    .foregroundColor(controller.bridgeOnline ? Color(hex: "#4ADE80") : Color.white.opacity(0.5))
            }

            Divider()
                .frame(height: 14)

            Text(controller.statusBanner)
                .font(.system(size: 11.5, weight: .medium))
                .foregroundColor(Color(hex: "#00F2FE"))
                .lineLimit(1)

            Spacer()

            Button(action: {
                controller.showLogs.toggle()
            }) {
                Text(controller.showLogs ? "Hide Logs" : "Console Logs (\(controller.logLines.count))")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }
            .buttonStyle(.plain)

            Button(action: {
                controller.stopAllServices()
            }) {
                Text("⏹ Stop All Services")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color(hex: "#FCA5A5"))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color(hex: "#EF4444").opacity(0.18))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }
            .buttonStyle(.plain)
        }
        .font(.system(size: 12))
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.black.opacity(0.35))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    private func modeCard(_ mode: LaunchMode) -> some View {
        let isDefault = controller.config.defaultMode == mode.id
        let accent = Color(hex: mode.accentHex)

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(mode.badge)
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(0.6)
                    .foregroundColor(accent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(accent.opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 5))

                Spacer()

                Button(action: {
                    controller.setDefaultMode(mode.id)
                }) {
                    Text(isDefault ? "★ DEFAULT MODE" : "☆ Set as Default")
                        .font(.system(size: 10.5, weight: .bold))
                        .foregroundColor(isDefault ? Color(hex: "#00F2FE") : Color.white.opacity(0.65))
                        .padding(.horizontal, 9)
                        .padding(.vertical, 3.5)
                        .background(isDefault ? Color(hex: "#00F2FE").opacity(0.18) : Color.white.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(isDefault ? Color(hex: "#00F2FE") : Color.white.opacity(0.12), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(mode.shortTitle)
                    .font(.system(size: 14.5, weight: .bold))
                    .foregroundColor(.white)
                Text(mode.subtitle)
                    .font(.system(size: 11.5))
                    .foregroundColor(Color.white.opacity(0.65))
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)

            HStack(spacing: 8) {
                Button(action: {
                    controller.launchMode(mode.id)
                }) {
                    HStack {
                        Spacer()
                        Text("⚡ Launch \(mode.title)")
                            .font(.system(size: 12, weight: .bold))
                        Spacer()
                    }
                    .padding(.vertical, 7)
                    .foregroundColor(.white)
                    .background(accent.opacity(0.28))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(accent.opacity(0.65), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(13)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(hex: "#111526").opacity(0.92))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isDefault ? Color(hex: "#00F2FE") : Color.white.opacity(0.1), lineWidth: isDefault ? 1.5 : 1)
        )
    }

    private var logDrawer: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 3) {
                ForEach(Array(controller.logLines.enumerated()), id: \.offset) { _, line in
                    Text(line)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(Color(hex: "#A5F3FC"))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(10)
        }
        .frame(height: 110)
        .background(Color.black.opacity(0.65))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
    }

    private var footerBar: some View {
        HStack {
            Toggle(isOn: Binding(
                get: { controller.config.keepInMenuBarOnClose },
                set: { val in
                    controller.config.keepInMenuBarOnClose = val
                    controller.saveConfig()
                }
            )) {
                Text("Keep running in macOS Menu Bar when launcher window is closed")
                    .font(.system(size: 11.5))
                    .foregroundColor(Color.white.opacity(0.65))
            }
            .toggleStyle(.checkbox)

            Spacer()

            Text("Project: \(controller.config.projectPath)")
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(Color.white.opacity(0.45))
        }
    }
}

// MARK: - AppDelegate & Native macOS Menu Bar (NSStatusItem)

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow?
    var statusItem: NSStatusItem?
    let controller = VFXLauncherController.shared

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)

        controller.onMenuBarPreferenceChanged = { [weak self] in
            self?.syncMenuBarAndMenus()
        }

        buildMainMenu()
        syncMenuBarAndMenus()
        openOrFocusMainWindow()

        // Support CLI "--launch-default" or user's auto-launch setting
        let args = ProcessInfo.processInfo.arguments
        if let modeArg = args.first(where: { $0.hasPrefix("--mode=") }) {
            let modeId = String(modeArg.dropFirst("--mode=".count))
            controller.launchMode(modeId)
        } else if args.contains("--launch-default") || controller.config.autoLaunchDefaultOnOpen {
            controller.launchMode(controller.config.defaultMode)
        }
    }

    func openOrFocusMainWindow() {
        NSApp.setActivationPolicy(.regular)
        if let win = window {
            win.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }

        let contentView = LauncherRootView(controller: controller)
        let win = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 920, height: 720),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        win.center()
        win.title = "DJ VFX Studio — Mac Startup & Mode Launcher"
        win.appearance = NSAppearance(named: .darkAqua)
        win.backgroundColor = NSColor(calibratedRed: 0.03, green: 0.04, blue: 0.08, alpha: 1.0)
        win.contentView = NSHostingView(rootView: contentView)
        win.delegate = self
        win.isReleasedWhenClosed = false
        win.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        self.window = win
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if controller.config.showInMenuBar && controller.config.keepInMenuBarOnClose {
            sender.orderOut(nil)
            return false
        }
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return !(controller.config.showInMenuBar && controller.config.keepInMenuBarOnClose)
    }

    func syncMenuBarAndMenus() {
        if controller.config.showInMenuBar {
            if statusItem == nil {
                statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
            }
            if let button = statusItem?.button {
                let running = controller.viteOnline || controller.bridgeOnline
                button.title = running ? "⚡ VFX ●" : "⚡ VFX"
            }
            statusItem?.menu = buildStatusBarMenu()
        } else {
            if let item = statusItem {
                NSStatusBar.system.removeStatusItem(item)
                statusItem = nil
            }
        }
        buildMainMenu()
    }

    func buildStatusBarMenu() -> NSMenu {
        let menu = NSMenu()
        let def = controller.defaultModeObj

        let statusTitle = "DJ VFX — Vite: \(controller.viteOnline ? "ONLINE" : "OFF") | Bridge: \(controller.bridgeOnline ? "ONLINE" : "OFF")"
        let statusHeader = NSMenuItem(title: statusTitle, action: nil, keyEquivalent: "")
        statusHeader.isEnabled = false
        menu.addItem(statusHeader)
        menu.addItem(NSMenuItem.separator())

        let launchDefItem = NSMenuItem(
            title: "🚀 Launch Default (\(def.shortTitle))",
            action: #selector(handleLaunchDefault),
            keyEquivalent: "\r"
        )
        launchDefItem.target = self
        menu.addItem(launchDefItem)

        let openWinItem = NSMenuItem(
            title: "🪟 Open VFX Launcher Window...",
            action: #selector(handleOpenLauncherWindow),
            keyEquivalent: "m"
        )
        openWinItem.target = self
        menu.addItem(openWinItem)

        menu.addItem(NSMenuItem.separator())

        // Submenu: Launch in Any Mode
        let launchMenu = NSMenu()
        for mode in ALL_MODES {
            let item = NSMenuItem(
                title: "\(mode.shortTitle)\(controller.config.defaultMode == mode.id ? "  ★ Default" : "")",
                action: #selector(handleLaunchModeFromMenu(_:)),
                keyEquivalent: ""
            )
            item.target = self
            item.representedObject = mode.id
            launchMenu.addItem(item)
        }
        let launchSubItem = NSMenuItem(title: "⚡ Start VFX in Mode", action: nil, keyEquivalent: "")
        launchSubItem.submenu = launchMenu
        menu.addItem(launchSubItem)

        // Submenu: Change Default Mode
        let defaultMenu = NSMenu()
        for mode in ALL_MODES {
            let item = NSMenuItem(
                title: mode.shortTitle,
                action: #selector(handleSetDefaultFromMenu(_:)),
                keyEquivalent: ""
            )
            item.target = self
            item.representedObject = mode.id
            item.state = (controller.config.defaultMode == mode.id) ? .on : .off
            defaultMenu.addItem(item)
        }
        let defaultSubItem = NSMenuItem(title: "★ Set Default Startup Mode", action: nil, keyEquivalent: "")
        defaultSubItem.submenu = defaultMenu
        menu.addItem(defaultSubItem)

        menu.addItem(NSMenuItem.separator())

        let stopItem = NSMenuItem(
            title: "⏹ Stop All VFX Services (:5173 & :8080)",
            action: #selector(handleStopServices),
            keyEquivalent: ""
        )
        stopItem.target = self
        menu.addItem(stopItem)

        let removeTrayItem = NSMenuItem(
            title: "Remove from macOS Menu Bar",
            action: #selector(handleToggleMenuBar),
            keyEquivalent: ""
        )
        removeTrayItem.target = self
        menu.addItem(removeTrayItem)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(
            title: "Quit DJ VFX Launcher",
            action: #selector(handleQuit),
            keyEquivalent: "q"
        )
        quitItem.target = self
        menu.addItem(quitItem)

        return menu
    }

    func buildMainMenu() {
        let mainMenu = NSMenu()

        // App menu
        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu()
        let toggleTrayItem = NSMenuItem(
            title: "Show in macOS Menu Bar",
            action: #selector(handleToggleMenuBar),
            keyEquivalent: "b"
        )
        toggleTrayItem.target = self
        toggleTrayItem.state = controller.config.showInMenuBar ? .on : .off
        appMenu.addItem(toggleTrayItem)
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Quit DJ VFX Launcher", action: #selector(handleQuit), keyEquivalent: "q").target = self
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        // Modes menu
        let modesMenuItem = NSMenuItem()
        let modesMenu = NSMenu(title: "Modes")
        let def = controller.defaultModeObj
        let launchDef = NSMenuItem(
            title: "Launch Default (\(def.shortTitle))",
            action: #selector(handleLaunchDefault),
            keyEquivalent: "\r"
        )
        launchDef.target = self
        modesMenu.addItem(launchDef)
        modesMenu.addItem(NSMenuItem.separator())

        for mode in ALL_MODES {
            let item = NSMenuItem(
                title: "\(mode.shortTitle)\(controller.config.defaultMode == mode.id ? "  ★ Default" : "")",
                action: #selector(handleLaunchModeFromMenu(_:)),
                keyEquivalent: ""
            )
            item.target = self
            item.representedObject = mode.id
            modesMenu.addItem(item)
        }
        modesMenuItem.submenu = modesMenu
        mainMenu.addItem(modesMenuItem)

        NSApp.mainMenu = mainMenu
    }

    @objc func handleLaunchDefault() {
        controller.launchMode(controller.config.defaultMode)
    }

    @objc func handleOpenLauncherWindow() {
        openOrFocusMainWindow()
    }

    @objc func handleLaunchModeFromMenu(_ sender: NSMenuItem) {
        if let modeId = sender.representedObject as? String {
            controller.launchMode(modeId)
        }
    }

    @objc func handleSetDefaultFromMenu(_ sender: NSMenuItem) {
        if let modeId = sender.representedObject as? String {
            controller.setDefaultMode(modeId)
        }
    }

    @objc func handleStopServices() {
        controller.stopAllServices()
    }

    @objc func handleToggleMenuBar() {
        controller.setShowInMenuBar(!controller.config.showInMenuBar)
        if !controller.config.showInMenuBar {
            openOrFocusMainWindow()
        }
    }

    @objc func handleQuit() {
        NSApp.terminate(nil)
    }
}

MainActor.assumeIsolated {
    let app = NSApplication.shared
    let delegate = AppDelegate()
    app.delegate = delegate
    app.run()
}
