using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace DJVFXLauncher
{
    public class LaunchMode
    {
        public string Id;
        public string ShortTitle;
        public string Title;
        public string Subtitle;
        public string Badge;
        public Color Accent;
        public bool NeedsVite;
        public bool NeedsBridge;
        public bool IsElectron;
        public string UrlQuery;
    }

    public class LauncherConfig
    {
        public string DefaultMode = "studio";
        public bool ShowInMenuBar = true;
        public bool KeepInMenuBarOnClose = true;
        public bool AutoLaunchDefaultOnOpen = false;
        public string ProjectPath = "";
    }

    public class MainLauncherForm : Form
    {
        private readonly List<LaunchMode> modes = new List<LaunchMode>();
        private LauncherConfig config = new LauncherConfig();
        private string configPath;

        private NotifyIcon trayIcon;
        private ContextMenuStrip trayMenu;
        private Timer pollTimer;

        private Process viteProc;
        private Process bridgeProc;
        private Process electronProc;

        private bool viteOnline = false;
        private bool bridgeOnline = false;

        // UI Controls
        private Button btnToggleTray;
        private Label lblDefaultHeroTitle;
        private Label lblDefaultHeroSub;
        private CheckBox chkAutoLaunch;
        private Label lblStatusVite;
        private Label lblStatusBridge;
        private Label lblStatusBanner;
        private TextBox txtLogs;
        private CheckBox chkKeepInTray;
        private readonly Dictionary<string, Button> defaultButtons = new Dictionary<string, Button>();
        private readonly Dictionary<string, Panel> modeCards = new Dictionary<string, Panel>();

        public MainLauncherForm(string[] args)
        {
            configPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".dj-vfx-launcher.json");
            InitModes();
            LoadConfig();
            DetectProjectPath();

            BuildUI();
            InitTray();
            RefreshUIState();

            pollTimer = new Timer { Interval = 1500 };
            pollTimer.Tick += (s, e) => CheckPorts();
            pollTimer.Start();
            CheckPorts();

            // Handle CLI args or auto-launch
            foreach (string arg in args)
            {
                if (arg.StartsWith("--mode="))
                {
                    string modeId = arg.Substring("--mode=".Length).Trim();
                    LaunchModeById(modeId);
                    return;
                }
            }
            if (config.AutoLaunchDefaultOnOpen)
            {
                LaunchModeById(config.DefaultMode);
            }
        }

        private void InitModes()
        {
            modes.Add(new LaunchMode {
                Id = "studio", ShortTitle = "1. Full Studio Mode", Title = "Full Studio Mode",
                Subtitle = "Starts Vite 3D WebGL (:5173) + Hardware Bridge (:8080) & opens Main Studio UI",
                Badge = "FULL STUDIO RIG", Accent = Color.FromArgb(0, 242, 254),
                NeedsVite = true, NeedsBridge = true, IsElectron = false, UrlQuery = ""
            });
            modes.Add(new LaunchMode {
                Id = "stage", ShortTitle = "2. Clean Stage / Projector Mode", Title = "Clean Stage Mode",
                Subtitle = "Zero-HUD, cursor-hidden 3D visual feed (?mode=stage&clean=true) for external projectors",
                Badge = "CLEAN STAGE OUTPUT", Accent = Color.FromArgb(168, 85, 247),
                NeedsVite = true, NeedsBridge = true, IsElectron = false, UrlQuery = "?mode=stage&clean=true"
            });
            modes.Add(new LaunchMode {
                Id = "dual-rig", ShortTitle = "3. Detached Controller + Stage Rig", Title = "Dual-Window Rig",
                Subtitle = "Opens both Master Control Console (?mode=controller) & Clean Stage Output",
                Badge = "DUAL-WINDOW LIVE RIG", Accent = Color.FromArgb(255, 0, 127),
                NeedsVite = true, NeedsBridge = true, IsElectron = false, UrlQuery = "?mode=controller"
            });
            modes.Add(new LaunchMode {
                Id = "obs", ShortTitle = "4a. OBS Stream Mode (?mode=obs)", Title = "OBS Stream Mode",
                Subtitle = "Zero-FOUC broadcast stream output (?mode=obs) + copies Browser Source URL to clipboard",
                Badge = "BROADCAST STREAM", Accent = Color.FromArgb(34, 197, 94),
                NeedsVite = true, NeedsBridge = true, IsElectron = false, UrlQuery = "?mode=obs"
            });
            modes.Add(new LaunchMode {
                Id = "obs-overlay", ShortTitle = "4b. OBS Transparent Overlay (?overlay=true)", Title = "OBS Alpha Overlay",
                Subtitle = "Transparent alpha-channel background (?mode=obs&overlay=true) for camera compositing",
                Badge = "ALPHA OVERLAY", Accent = Color.FromArgb(16, 185, 129),
                NeedsVite = true, NeedsBridge = true, IsElectron = false, UrlQuery = "?mode=obs&overlay=true"
            });
            modes.Add(new LaunchMode {
                Id = "electron", ShortTitle = "5. Native Electron Desktop App", Title = "Electron Desktop App",
                Subtitle = "Launches GPU-accelerated desktop app with background Bridge & 2nd-screen Stage Projector",
                Badge = "NATIVE GPU APP", Accent = Color.FromArgb(59, 130, 246),
                NeedsVite = true, NeedsBridge = true, IsElectron = true, UrlQuery = ""
            });
            modes.Add(new LaunchMode {
                Id = "bridge-only", ShortTitle = "6a. Hardware Bridge Only (:8080)", Title = "Hardware Bridge Only",
                Subtitle = "Headless telemetry server only (StageLinQ, Pioneer Pro DJ Link, Traktor, Hue, OBS, BUTT)",
                Badge = "HEADLESS BRIDGE", Accent = Color.FromArgb(245, 158, 11),
                NeedsVite = false, NeedsBridge = true, IsElectron = false, UrlQuery = null
            });
            modes.Add(new LaunchMode {
                Id = "vite-only", ShortTitle = "6b. Visualizer Only (No Bridge)", Title = "Visualizer Only",
                Subtitle = "Standalone 3D WebGL visualizer without Hardware Bridge (Pure Mic / Line-In mode)",
                Badge = "STANDALONE WEBGL", Accent = Color.FromArgb(234, 179, 8),
                NeedsVite = true, NeedsBridge = false, IsElectron = false, UrlQuery = ""
            });
        }

        private LaunchMode GetMode(string id)
        {
            foreach (var m in modes)
                if (m.Id == id) return m;
            return modes[0];
        }

        private void DetectProjectPath()
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            if (!string.IsNullOrEmpty(config.ProjectPath) && Directory.Exists(config.ProjectPath))
                return;

            string[] candidates = new string[] {
                exeDir,
                Path.GetFullPath(Path.Combine(exeDir, "..")),
                Environment.CurrentDirectory
            };
            foreach (string c in candidates)
            {
                if (File.Exists(Path.Combine(c, "package.json")) || File.Exists(Path.Combine(c, "DJ VFX Studio.exe")))
                {
                    config.ProjectPath = c;
                    SaveConfig();
                    return;
                }
            }
            config.ProjectPath = exeDir;
        }

        // Minimal regex JSON reader/writer so zero external JSON libraries are needed
        private void LoadConfig()
        {
            try
            {
                if (File.Exists(configPath))
                {
                    string raw = File.ReadAllText(configPath, Encoding.UTF8);
                    var defMatch = Regex.Match(raw, "\"defaultMode\"\\s*:\\s*\"([^\"]+)\"");
                    if (defMatch.Success) config.DefaultMode = defMatch.Groups[1].Value;

                    var trayMatch = Regex.Match(raw, "\"showInMenuBar\"\\s*:\\s*(true|false)");
                    if (trayMatch.Success) config.ShowInMenuBar = trayMatch.Groups[1].Value == "true";

                    var keepMatch = Regex.Match(raw, "\"keepInMenuBarOnClose\"\\s*:\\s*(true|false)");
                    if (keepMatch.Success) config.KeepInMenuBarOnClose = keepMatch.Groups[1].Value == "true";

                    var autoMatch = Regex.Match(raw, "\"autoLaunchDefaultOnOpen\"\\s*:\\s*(true|false)");
                    if (autoMatch.Success) config.AutoLaunchDefaultOnOpen = autoMatch.Groups[1].Value == "true";
                }
            }
            catch { }
        }

        private void SaveConfig()
        {
            try
            {
                string escapedPath = (config.ProjectPath ?? "").Replace("\\", "\\\\");
                string json = "{\n" +
                    "  \"autoLaunchDefaultOnOpen\": " + (config.AutoLaunchDefaultOnOpen ? "true" : "false") + ",\n" +
                    "  \"defaultMode\": \"" + config.DefaultMode + "\",\n" +
                    "  \"keepInMenuBarOnClose\": " + (config.KeepInMenuBarOnClose ? "true" : "false") + ",\n" +
                    "  \"projectPath\": \"" + escapedPath + "\",\n" +
                    "  \"showInMenuBar\": " + (config.ShowInMenuBar ? "true" : "false") + ",\n" +
                    "  \"updatedAt\": \"" + DateTime.UtcNow.ToString("o") + "\"\n" +
                    "}";
                File.WriteAllText(configPath, json, Encoding.UTF8);
            }
            catch { }
        }

        private Icon CreateNeonTrayIcon()
        {
            Bitmap bmp = new Bitmap(16, 16);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
                using (Brush b1 = new SolidBrush(Color.FromArgb(0, 242, 254)))
                using (Brush b2 = new SolidBrush(Color.FromArgb(168, 85, 247)))
                using (Brush b3 = new SolidBrush(Color.FromArgb(255, 0, 127)))
                using (Brush b4 = new SolidBrush(Color.FromArgb(34, 197, 94)))
                {
                    g.FillRectangle(b1, 1, 6, 2, 8);
                    g.FillRectangle(b2, 5, 2, 2, 12);
                    g.FillRectangle(b3, 9, 5, 2, 9);
                    g.FillRectangle(b4, 13, 8, 2, 6);
                }
            }
            return Icon.FromHandle(bmp.GetHicon());
        }

        private void BuildUI()
        {
            Text = "DJ VFX Studio — Windows Startup & Mode Launcher";
            Size = new Size(940, 760);
            MinimumSize = new Size(880, 700);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(7, 9, 18);
            ForeColor = Color.White;
            Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            Icon = CreateNeonTrayIcon();

            // Header
            Label lblTitle = new Label {
                Text = "⚡ DJ VFX STUDIO — WINDOWS STARTUP LAUNCHER",
                Font = new Font("Segoe UI", 14f, FontStyle.Bold),
                ForeColor = Color.White,
                Location = new Point(22, 16),
                AutoSize = true
            };
            Label lblSub = new Label {
                Text = "Start in any display or service mode • Set any mode as Default • Manage Windows System Tray",
                Font = new Font("Segoe UI", 9f, FontStyle.Regular),
                ForeColor = Color.FromArgb(160, 174, 192),
                Location = new Point(24, 42),
                AutoSize = true
            };

            btnToggleTray = new Button {
                Size = new Size(250, 34),
                Location = new Point(650, 18),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                Cursor = Cursors.Hand,
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };
            btnToggleTray.Click += (s, e) => SetShowInTray(!config.ShowInMenuBar);

            Controls.Add(lblTitle);
            Controls.Add(lblSub);
            Controls.Add(btnToggleTray);

            // Default Mode Hero Panel
            Panel heroPanel = new Panel {
                Location = new Point(22, 72),
                Size = new Size(880, 74),
                BackColor = Color.FromArgb(18, 24, 44),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };

            Label lblHeroBadge = new Label {
                Text = "★ CURRENT DEFAULT STARTUP MODE",
                Font = new Font("Segoe UI", 8f, FontStyle.Bold),
                ForeColor = Color.FromArgb(0, 242, 254),
                Location = new Point(14, 10),
                AutoSize = true
            };

            chkAutoLaunch = new CheckBox {
                Text = "Auto-launch Default when app opens",
                Font = new Font("Segoe UI", 8.5f),
                ForeColor = Color.FromArgb(200, 210, 225),
                Location = new Point(250, 8),
                AutoSize = true,
                Checked = config.AutoLaunchDefaultOnOpen
            };
            chkAutoLaunch.CheckedChanged += (s, e) => {
                config.AutoLaunchDefaultOnOpen = chkAutoLaunch.Checked;
                SaveConfig();
            };

            lblDefaultHeroTitle = new Label {
                Font = new Font("Segoe UI", 12f, FontStyle.Bold),
                ForeColor = Color.White,
                Location = new Point(14, 28),
                AutoSize = true
            };

            lblDefaultHeroSub = new Label {
                Font = new Font("Segoe UI", 8.5f),
                ForeColor = Color.FromArgb(160, 174, 192),
                Location = new Point(14, 50),
                AutoSize = true
            };

            Button btnLaunchDefault = new Button {
                Text = "🚀 Launch Default Mode",
                Size = new Size(195, 42),
                Location = new Point(670, 16),
                BackColor = Color.FromArgb(0, 242, 254),
                ForeColor = Color.FromArgb(5, 8, 18),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 10f, FontStyle.Bold),
                Cursor = Cursors.Hand,
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };
            btnLaunchDefault.FlatAppearance.BorderSize = 0;
            btnLaunchDefault.Click += (s, e) => LaunchModeById(config.DefaultMode);

            heroPanel.Controls.Add(lblHeroBadge);
            heroPanel.Controls.Add(chkAutoLaunch);
            heroPanel.Controls.Add(lblDefaultHeroTitle);
            heroPanel.Controls.Add(lblDefaultHeroSub);
            heroPanel.Controls.Add(btnLaunchDefault);
            Controls.Add(heroPanel);

            // Telemetry Strip
            Panel statusStrip = new Panel {
                Location = new Point(22, 154),
                Size = new Size(880, 36),
                BackColor = Color.FromArgb(12, 15, 28),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };

            lblStatusVite = new Label {
                Text = "● Vite Visualizer (:5173): STOPPED",
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                Location = new Point(12, 9),
                AutoSize = true
            };
            lblStatusBridge = new Label {
                Text = "● Hardware Bridge (:8080): STOPPED",
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                Location = new Point(240, 9),
                AutoSize = true
            };
            lblStatusBanner = new Label {
                Text = "Ready — Select a mode below",
                Font = new Font("Segoe UI", 9f),
                ForeColor = Color.FromArgb(0, 242, 254),
                Location = new Point(475, 9),
                Size = new Size(265, 20)
            };

            Button btnStopAll = new Button {
                Text = "⏹ Stop All Services",
                Size = new Size(125, 26),
                Location = new Point(745, 5),
                BackColor = Color.FromArgb(70, 20, 28),
                ForeColor = Color.FromArgb(252, 165, 165),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                Cursor = Cursors.Hand,
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };
            btnStopAll.FlatAppearance.BorderSize = 0;
            btnStopAll.Click += (s, e) => StopAllServices();

            statusStrip.Controls.Add(lblStatusVite);
            statusStrip.Controls.Add(lblStatusBridge);
            statusStrip.Controls.Add(lblStatusBanner);
            statusStrip.Controls.Add(btnStopAll);
            Controls.Add(statusStrip);

            // 2-Column Grid of Mode Cards (8 cards: 4 rows x 2 cols)
            int startY = 198;
            int cardW = 432;
            int cardH = 102;
            int gapX = 16;
            int gapY = 10;

            for (int i = 0; i < modes.Count; i++)
            {
                var mode = modes[i];
                int col = i % 2;
                int row = i / 2;
                int x = 22 + col * (cardW + gapX);
                int y = startY + row * (cardH + gapY);

                Panel card = new Panel {
                    Location = new Point(x, y),
                    Size = new Size(cardW, cardH),
                    BackColor = Color.FromArgb(17, 21, 38)
                };

                Label badge = new Label {
                    Text = mode.Badge,
                    Font = new Font("Segoe UI", 7.5f, FontStyle.Bold),
                    ForeColor = mode.Accent,
                    Location = new Point(12, 8),
                    AutoSize = true
                };

                Button btnSetDef = new Button {
                    Size = new Size(118, 22),
                    Location = new Point(cardW - 130, 6),
                    FlatStyle = FlatStyle.Flat,
                    Font = new Font("Segoe UI", 7.5f, FontStyle.Bold),
                    Cursor = Cursors.Hand
                };
                string capturedId = mode.Id;
                btnSetDef.Click += (s, e) => SetDefaultMode(capturedId);
                defaultButtons[mode.Id] = btnSetDef;

                Label title = new Label {
                    Text = mode.ShortTitle,
                    Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
                    ForeColor = Color.White,
                    Location = new Point(12, 28),
                    AutoSize = true
                };

                Label sub = new Label {
                    Text = mode.Subtitle,
                    Font = new Font("Segoe UI", 8f),
                    ForeColor = Color.FromArgb(165, 178, 198),
                    Location = new Point(12, 48),
                    Size = new Size(cardW - 24, 22)
                };

                Button btnLaunch = new Button {
                    Text = "⚡ Launch " + mode.Title,
                    Size = new Size(cardW - 24, 26),
                    Location = new Point(12, 70),
                    BackColor = Color.FromArgb(30, 38, 66),
                    ForeColor = Color.White,
                    FlatStyle = FlatStyle.Flat,
                    Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                    Cursor = Cursors.Hand
                };
                btnLaunch.FlatAppearance.BorderColor = mode.Accent;
                btnLaunch.Click += (s, e) => LaunchModeById(capturedId);

                card.Controls.Add(badge);
                card.Controls.Add(btnSetDef);
                card.Controls.Add(title);
                card.Controls.Add(sub);
                card.Controls.Add(btnLaunch);

                modeCards[mode.Id] = card;
                Controls.Add(card);
            }

            // Console Log Output & Footer
            txtLogs = new TextBox {
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(5, 7, 14),
                ForeColor = Color.FromArgb(165, 243, 252),
                Font = new Font("Consolas", 8.5f),
                BorderStyle = BorderStyle.FixedSingle,
                Location = new Point(22, 646),
                Size = new Size(880, 42),
                Anchor = AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right
            };
            Controls.Add(txtLogs);

            chkKeepInTray = new CheckBox {
                Text = "Keep running in Windows System Tray when launcher window is closed",
                Font = new Font("Segoe UI", 8.5f),
                ForeColor = Color.FromArgb(165, 178, 198),
                Location = new Point(22, 694),
                AutoSize = true,
                Checked = config.KeepInMenuBarOnClose,
                Anchor = AnchorStyles.Bottom | AnchorStyles.Left
            };
            chkKeepInTray.CheckedChanged += (s, e) => {
                config.KeepInMenuBarOnClose = chkKeepInTray.Checked;
                SaveConfig();
            };
            Controls.Add(chkKeepInTray);
        }

        private void InitTray()
        {
            trayMenu = new ContextMenuStrip();
            trayIcon = new NotifyIcon {
                Icon = this.Icon,
                Text = "DJ VFX Studio — Windows Mode Launcher",
                ContextMenuStrip = trayMenu,
                Visible = config.ShowInMenuBar
            };
            trayIcon.DoubleClick += (s, e) => {
                Show();
                WindowState = FormWindowState.Normal;
                Activate();
            };
            RebuildTrayMenu();
        }

        private void RebuildTrayMenu()
        {
            if (trayMenu == null) return;
            trayMenu.Items.Clear();

            var def = GetMode(config.DefaultMode);
            var statusItem = new ToolStripMenuItem(
                string.Format("DJ VFX — Vite: {0} | Bridge: {1}", viteOnline ? "ONLINE" : "OFF", bridgeOnline ? "ONLINE" : "OFF")
            ) { Enabled = false };
            trayMenu.Items.Add(statusItem);
            trayMenu.Items.Add(new ToolStripSeparator());

            var launchDef = new ToolStripMenuItem("🚀 Launch Default (" + def.ShortTitle + ")");
            launchDef.Click += (s, e) => LaunchModeById(config.DefaultMode);
            trayMenu.Items.Add(launchDef);

            var openWin = new ToolStripMenuItem("🪟 Open VFX Launcher Window...");
            openWin.Click += (s, e) => { Show(); WindowState = FormWindowState.Normal; Activate(); };
            trayMenu.Items.Add(openWin);

            trayMenu.Items.Add(new ToolStripSeparator());

            var startSub = new ToolStripMenuItem("⚡ Start VFX in Mode");
            foreach (var m in modes)
            {
                string capturedId = m.Id;
                var item = new ToolStripMenuItem(m.ShortTitle + (config.DefaultMode == m.Id ? "  ★ Default" : ""));
                item.Click += (s, e) => LaunchModeById(capturedId);
                startSub.DropDownItems.Add(item);
            }
            trayMenu.Items.Add(startSub);

            var defSub = new ToolStripMenuItem("★ Set Default Startup Mode");
            foreach (var m in modes)
            {
                string capturedId = m.Id;
                var item = new ToolStripMenuItem(m.ShortTitle) { Checked = (config.DefaultMode == m.Id) };
                item.Click += (s, e) => SetDefaultMode(capturedId);
                defSub.DropDownItems.Add(item);
            }
            trayMenu.Items.Add(defSub);

            trayMenu.Items.Add(new ToolStripSeparator());

            var stopItem = new ToolStripMenuItem("⏹ Stop All VFX Services (:5173 & :8080)");
            stopItem.Click += (s, e) => StopAllServices();
            trayMenu.Items.Add(stopItem);

            var removeTray = new ToolStripMenuItem("Remove from Windows System Tray");
            removeTray.Click += (s, e) => SetShowInTray(false);
            trayMenu.Items.Add(removeTray);

            trayMenu.Items.Add(new ToolStripSeparator());

            var quitItem = new ToolStripMenuItem("Quit DJ VFX Launcher");
            quitItem.Click += (s, e) => {
                trayIcon.Visible = false;
                Application.Exit();
            };
            trayMenu.Items.Add(quitItem);
        }

        private void RefreshUIState()
        {
            var def = GetMode(config.DefaultMode);
            lblDefaultHeroTitle.Text = def.ShortTitle + " — " + def.Badge;
            lblDefaultHeroSub.Text = def.Subtitle;

            if (config.ShowInMenuBar)
            {
                btnToggleTray.Text = "● In Windows System Tray (Remove)";
                btnToggleTray.BackColor = Color.FromArgb(20, 65, 40);
                btnToggleTray.ForeColor = Color.FromArgb(134, 239, 172);
            }
            else
            {
                btnToggleTray.Text = "○ Add to Windows System Tray";
                btnToggleTray.BackColor = Color.FromArgb(28, 34, 54);
                btnToggleTray.ForeColor = Color.White;
            }

            foreach (var m in modes)
            {
                bool isDef = (config.DefaultMode == m.Id);
                if (defaultButtons.ContainsKey(m.Id))
                {
                    var btn = defaultButtons[m.Id];
                    btn.Text = isDef ? "★ DEFAULT MODE" : "☆ Set Default";
                    btn.BackColor = isDef ? Color.FromArgb(18, 60, 78) : Color.FromArgb(25, 30, 50);
                    btn.ForeColor = isDef ? Color.FromArgb(0, 242, 254) : Color.FromArgb(180, 190, 210);
                }
            }

            if (trayIcon != null)
            {
                trayIcon.Visible = config.ShowInMenuBar;
                RebuildTrayMenu();
            }
        }

        private void SetDefaultMode(string modeId)
        {
            config.DefaultMode = modeId;
            SaveConfig();
            var m = GetMode(modeId);
            lblStatusBanner.Text = "★ Default set to: " + m.ShortTitle;
            AppendLog("[Config] Default startup mode updated to " + m.ShortTitle);
            RefreshUIState();
        }

        private void SetShowInTray(bool enabled)
        {
            config.ShowInMenuBar = enabled;
            SaveConfig();
            lblStatusBanner.Text = enabled
                ? "Added icon to Windows System Tray."
                : "Removed icon from Windows System Tray.";
            RefreshUIState();
            if (!enabled)
            {
                Show();
                WindowState = FormWindowState.Normal;
            }
        }

        private void AppendLog(string msg)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action<string>(AppendLog), msg);
                return;
            }
            string line = "[" + DateTime.Now.ToString("HH:mm:ss") + "] " + msg + Environment.NewLine;
            txtLogs.AppendText(line);
        }

        private static bool IsPortOpen(int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var res = client.BeginConnect("127.0.0.1", port, null, null);
                    bool ok = res.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(120));
                    if (ok && client.Connected)
                    {
                        client.EndConnect(res);
                        return true;
                    }
                }
            }
            catch { }
            return false;
        }

        private void CheckPorts()
        {
            bool v = IsPortOpen(5173);
            bool b = IsPortOpen(8080);
            bool changed = (v != viteOnline) || (b != bridgeOnline);
            viteOnline = v;
            bridgeOnline = b;

            lblStatusVite.Text = "● Vite Visualizer (:5173): " + (v ? "ONLINE" : "STOPPED");
            lblStatusVite.ForeColor = v ? Color.FromArgb(74, 222, 128) : Color.FromArgb(148, 163, 184);

            lblStatusBridge.Text = "● Hardware Bridge (:8080): " + (b ? "ONLINE" : "STOPPED");
            lblStatusBridge.ForeColor = b ? Color.FromArgb(74, 222, 128) : Color.FromArgb(148, 163, 184);

            if (changed) RebuildTrayMenu();
        }

        private string FindPackagedStudioExe()
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string[] candidates = new string[] {
                Path.Combine(exeDir, "DJ VFX Studio.exe"),
                Path.Combine(config.ProjectPath, "DJ VFX Studio.exe"),
                Path.Combine(config.ProjectPath, "release", "win-unpacked", "DJ VFX Studio.exe"),
                Path.Combine(localAppData, "Programs", "dj-vfx-studio", "DJ VFX Studio.exe")
            };
            foreach (string c in candidates)
            {
                if (File.Exists(c)) return c;
            }
            return null;
        }

        private void LaunchModeById(string modeId)
        {
            var target = GetMode(modeId);
            lblStatusBanner.Text = "🚀 Launching " + target.ShortTitle + "...";
            AppendLog("Launching mode: " + target.ShortTitle);

            bool hasNodeRepo = File.Exists(Path.Combine(config.ProjectPath, "server", "stagelinq-bridge.js"))
                            && Directory.Exists(Path.Combine(config.ProjectPath, "node_modules"));

            string packagedExe = FindPackagedStudioExe();
            if (!hasNodeRepo && packagedExe != null)
            {
                Process.Start(new ProcessStartInfo {
                    FileName = packagedExe,
                    Arguments = "--mode=" + target.Id,
                    UseShellExecute = false
                });
                lblStatusBanner.Text = "✅ Launched DJ VFX Studio (" + target.ShortTitle + ")";
                return;
            }

            if (target.NeedsBridge) EnsureBridgeStarted(); else StopBridgeOnly();
            if (target.NeedsVite) EnsureViteStarted(); else StopViteOnly();

            Timer delayTimer = new Timer { Interval = target.NeedsVite ? 900 : 200 };
            delayTimer.Tick += (s, e) => {
                delayTimer.Stop();
                delayTimer.Dispose();
                CheckPorts();
                OpenDisplayForMode(target);
            };
            delayTimer.Start();
        }

        private void EnsureBridgeStarted()
        {
            if (IsPortOpen(8080)) return;
            try
            {
                bridgeProc = new Process();
                bridgeProc.StartInfo.FileName = "node";
                bridgeProc.StartInfo.Arguments = "server/stagelinq-bridge.js";
                bridgeProc.StartInfo.WorkingDirectory = config.ProjectPath;
                bridgeProc.StartInfo.CreateNoWindow = true;
                bridgeProc.StartInfo.UseShellExecute = false;
                bridgeProc.Start();
                AppendLog("[Bridge] Started Universal Hardware Bridge on :8080");
            }
            catch (Exception ex)
            {
                AppendLog("[Bridge Error] " + ex.Message);
            }
        }

        private void EnsureViteStarted()
        {
            if (IsPortOpen(5173)) return;
            try
            {
                viteProc = new Process();
                viteProc.StartInfo.FileName = "cmd.exe";
                viteProc.StartInfo.Arguments = "/c npx vite --port 5173";
                viteProc.StartInfo.WorkingDirectory = config.ProjectPath;
                viteProc.StartInfo.CreateNoWindow = true;
                viteProc.StartInfo.UseShellExecute = false;
                viteProc.Start();
                AppendLog("[Vite] Started Vite 3D WebGL Server on :5173");
            }
            catch (Exception ex)
            {
                AppendLog("[Vite Error] " + ex.Message);
            }
        }

        private void OpenDisplayForMode(LaunchMode target)
        {
            if (target.IsElectron)
            {
                string packagedExe = FindPackagedStudioExe();
                if (packagedExe != null)
                {
                    Process.Start(packagedExe, "--mode=electron");
                }
                else
                {
                    electronProc = Process.Start(new ProcessStartInfo {
                        FileName = "cmd.exe",
                        Arguments = "/c npx electron electron/main.cjs --dev --mode=electron",
                        WorkingDirectory = config.ProjectPath,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    });
                }
                lblStatusBanner.Text = "🖥️ Launched Native Electron Desktop App";
                return;
            }

            if (target.UrlQuery == null)
            {
                lblStatusBanner.Text = "🔌 Hardware Bridge (:8080) active in headless mode.";
                return;
            }

            if (target.Id == "dual-rig")
            {
                Process.Start(new ProcessStartInfo("http://localhost:5173/?mode=controller") { UseShellExecute = true });
                Process.Start(new ProcessStartInfo("http://localhost:5173/?mode=stage&clean=true") { UseShellExecute = true });
                lblStatusBanner.Text = "🎚️ Opened Detached Controller + Clean Stage Rig";
                return;
            }

            string url = "http://localhost:5173/" + target.UrlQuery;
            if (target.Id == "obs" || target.Id == "obs-overlay")
            {
                try { Clipboard.SetText(url); } catch { }
                AppendLog("[OBS] Copied Browser Source URL to clipboard: " + url);
            }
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            lblStatusBanner.Text = "✅ Active: " + target.ShortTitle;
        }

        private void StopViteOnly()
        {
            try { if (viteProc != null && !viteProc.HasExited) viteProc.Kill(); } catch { }
            viteProc = null;
        }

        private void StopBridgeOnly()
        {
            try { if (bridgeProc != null && !bridgeProc.HasExited) bridgeProc.Kill(); } catch { }
            bridgeProc = null;
        }

        private void StopAllServices()
        {
            StopViteOnly();
            StopBridgeOnly();
            try { if (electronProc != null && !electronProc.HasExited) electronProc.Kill(); } catch { }
            CheckPorts();
            lblStatusBanner.Text = "⏹ All VFX services stopped.";
            AppendLog("Stopped all VFX services.");
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing && config.ShowInMenuBar && config.KeepInMenuBarOnClose)
            {
                e.Cancel = true;
                Hide();
                return;
            }
            if (trayIcon != null) trayIcon.Visible = false;
            base.OnFormClosing(e);
        }

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainLauncherForm(args));
        }
    }
}

