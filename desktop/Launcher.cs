using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

[assembly: System.Reflection.AssemblyTitle("未竟 · 与先贤对话")]
[assembly: System.Reflection.AssemblyVersion("0.2.0.0")]

namespace UnfinishedDialogues {
  public sealed class Settings {
    public bool Demo = true;
    public string BaseUrl = "https://api.deepseek.com";
    public string Model = "deepseek-flash";
    public string ProtectedKey = "";
  }

  internal static class Program {
    internal const int Port = 3210;
    internal const string Address = "http://127.0.0.1:3210/";
    internal static readonly string DataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "UnfinishedDialogues");
    internal static readonly JavaScriptSerializer Json = new JavaScriptSerializer();

    [STAThread]
    private static int Main(string[] args) {
      // A repeatable non-UI acceptance path; never reads the user's saved settings.
      if (Array.IndexOf(args, "--self-test") >= 0) return SelfTest();
      bool owner;
      using (var mutex = new Mutex(true, "Local\\UnfinishedDialoguesLauncher", out owner)) {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        if (!owner) {
          MessageBox.Show("未竟已经打开。请回到已有的启动器窗口。", "未竟");
          return 0;
        }
        try { Application.Run(new Launcher()); }
        catch { MessageBox.Show("启动器未能完成启动。请重新解压完整的运行包后重试。", "未竟"); return 1; }
      }
      return 0;
    }

    private static int SelfTest() {
      var report = Environment.GetEnvironmentVariable("UNFINISHED_SELF_TEST_REPORT");
      var stage = "DPAPI roundtrip";
      try {
        if (String.IsNullOrEmpty(report)) return 2;
        var encrypted = Protect("self-test-value");
        if (Unprotect(encrypted) != "self-test-value") throw new Exception();
        stage = "bundled local server startup";
        int childId;
        using (var server = new LocalServer()) {
          server.StartAsync(new Settings(), "", false).GetAwaiter().GetResult();
          childId = server.ChildId;
        }
        stage = "loopback child cleanup";
        var stopped = false;
        for (var attempt = 0; attempt < 50; attempt++) {
          try { using (var child = Process.GetProcessById(childId)) { if (child.HasExited) { stopped = true; break; } } }
          catch (ArgumentException) { stopped = true; break; }
          Thread.Sleep(100);
        }
        if (!stopped) throw new Exception("Bundled server process is still running");
        File.WriteAllText(report, "DPAPI roundtrip, bundled runtime, health identity, loopback startup and child cleanup passed.");
        return 0;
      } catch (Exception error) {
        if (!String.IsNullOrEmpty(report)) File.WriteAllText(report, "Launcher self-test failed at " + stage + " (" + error.GetType().Name + ").");
        return 1;
      }
    }

    internal static string Protect(string value) {
      return Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(value), null, DataProtectionScope.CurrentUser));
    }
    internal static string Unprotect(string value) {
      return String.IsNullOrEmpty(value) ? "" : Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(value), null, DataProtectionScope.CurrentUser));
    }
    internal static void Browse() { Process.Start(new ProcessStartInfo(Address) { UseShellExecute = true }); }
  }

  internal sealed class Launcher : Form {
    private readonly TextBox key = new TextBox { UseSystemPasswordChar = true };
    private readonly TextBox baseUrl = new TextBox();
    private readonly TextBox model = new TextBox();
    private readonly CheckBox demo = new CheckBox { Text = "先体验演示模式（不需要密钥）", AutoSize = true };
    private readonly Label status = new Label { AutoSize = false, Height = 42 };
    private readonly Button start = new Button { Text = "打开未竟", Width = 140, Height = 38 };
    private readonly Button stop = new Button { Text = "停止服务", Width = 110, Height = 38, Enabled = false };
    private readonly LocalServer server = new LocalServer();
    private string protectedKey = "";
    private bool closing;

    internal Launcher() {
      Text = "未竟 · 与先贤对话";
      StartPosition = FormStartPosition.CenterScreen;
      ClientSize = new Size(570, 530);
      MinimumSize = new Size(586, 610);
      AutoScaleMode = AutoScaleMode.Dpi;
      Font = new Font("Microsoft YaHei UI", 10);
      BackColor = Color.FromArgb(24, 27, 21);
      ForeColor = Color.FromArgb(225, 216, 194);
      Icon = SystemIcons.Application;
      var layout = new TableLayoutPanel { Dock = DockStyle.Fill, AutoScroll = true, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, Padding = new Padding(30, 22, 30, 18), ColumnCount = 1, RowCount = 10 };
      layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
      layout.Controls.Add(new Label { Text = "未 竟", Font = new Font("Microsoft YaHei UI", 24), AutoSize = true, ForeColor = Color.FromArgb(211, 184, 125) });
      layout.Controls.Add(new Label { Text = "写下此刻的困惑，听见不同的回答。", AutoSize = true, Margin = new Padding(3, 6, 3, 18) });
      layout.Controls.Add(demo);
      AddField(layout, "模型 API 密钥（仅保存在当前 Windows 用户下）", key);
      AddField(layout, "模型接口地址", baseUrl);
      AddField(layout, "模型名称", model);
      layout.Controls.Add(new Label { Text = "真实对话会发送至你填写的模型服务商，并按服务商规则计费。\n未配置时只能体验预写示例。你的密钥不会分享给其他使用者。", AutoSize = true, Margin = new Padding(3, 10, 3, 10), ForeColor = Color.FromArgb(173, 173, 151) });
      var buttons = new FlowLayoutPanel { AutoSize = true, Dock = DockStyle.Fill };
      buttons.Controls.Add(start); buttons.Controls.Add(stop);
      layout.Controls.Add(buttons);
      layout.Controls.Add(status);
      layout.Controls.Add(new Label { Text = "只监听本机 127.0.0.1:3210 · 关闭此窗口会停止服务", AutoSize = true, ForeColor = Color.FromArgb(158, 159, 137) });
      Controls.Add(layout);
      foreach (var box in new[] { key, baseUrl, model }) {
        box.Height = 30;
        box.Dock = DockStyle.Top;
        box.BackColor = Color.FromArgb(43, 46, 35);
        box.ForeColor = ForeColor;
        box.BorderStyle = BorderStyle.FixedSingle;
      }
      var saved = LoadSettings();
      protectedKey = saved.ProtectedKey ?? "";
      demo.Checked = saved.Demo; baseUrl.Text = saved.BaseUrl; model.Text = saved.Model;
      try { key.Text = Program.Unprotect(saved.ProtectedKey); }
      catch { status.Text = "无法读取旧密钥，请重新填写。可能已更换 Windows 用户。"; }
      demo.CheckedChanged += delegate { UpdateFields(); };
      start.Click += async delegate { await OpenAsync(); };
      stop.Click += delegate { server.Stop(); SetRunning(false); status.Text = "服务已停止，记录仍保留在浏览器中。"; };
      FormClosing += delegate { closing = true; server.Dispose(); };
      UpdateFields();
    }

    private static void AddField(TableLayoutPanel panel, string text, Control field) {
      panel.Controls.Add(new Label { Text = text, AutoSize = true, Margin = new Padding(3, 12, 3, 5) });
      panel.Controls.Add(field);
    }

    private Settings LoadSettings() {
      try { return Program.Json.Deserialize<Settings>(File.ReadAllText(Path.Combine(Program.DataDir, "settings.json"))) ?? new Settings(); }
      catch { return new Settings(); }
    }
    private void UpdateFields() {
      key.Enabled = baseUrl.Enabled = model.Enabled = !server.Running && !demo.Checked;
      demo.Enabled = !server.Running;
    }
    private void SetRunning(bool running) {
      start.Enabled = true; start.Text = running ? "再次打开网页" : "打开未竟"; stop.Enabled = running; UpdateFields();
    }

    private async Task OpenAsync() {
      if (server.Running) { Program.Browse(); return; }
      Uri endpoint;
      var settings = new Settings { Demo = demo.Checked, BaseUrl = baseUrl.Text.Trim(), Model = model.Text.Trim() };
      if (!settings.Demo && (String.IsNullOrWhiteSpace(key.Text) || String.IsNullOrWhiteSpace(settings.Model) || !Uri.TryCreate(settings.BaseUrl, UriKind.Absolute, out endpoint) || (endpoint.Scheme != "https" && !(endpoint.Scheme == "http" && endpoint.IsLoopback)) || !String.IsNullOrEmpty(endpoint.UserInfo))) {
        status.Text = "请填写密钥、模型名称及有效的 HTTPS 接口地址（本机服务可用 HTTP）。"; return;
      }
      start.Enabled = false; status.Text = "正在启动本机服务，请稍候……";
      try {
        if (!settings.Demo) protectedKey = Program.Protect(key.Text.Trim());
        settings.ProtectedKey = protectedKey;
        Directory.CreateDirectory(Program.DataDir);
        var file = Path.Combine(Program.DataDir, "settings.json");
        var temp = file + ".tmp";
        File.WriteAllText(temp, Program.Json.Serialize(settings));
        if (File.Exists(file)) File.Replace(temp, file, null); else File.Move(temp, file);
        await server.StartAsync(settings, settings.Demo ? "" : key.Text.Trim(), true);
        if (closing) return;
        SetRunning(true);
        status.Text = settings.Demo ? "演示已打开。连接真实模型时，请先停止服务，再更改设置。" : "已打开真实模型模式；连接结果以网页实际回复为准。";
      } catch (Exception exception) {
        server.Stop();
        if (!closing) { SetRunning(false); status.Text = exception is UserError ? exception.Message : "启动失败，请确认运行包已完整解压，且目录可以读取。"; }
      }
    }
  }

  internal sealed class UserError : Exception { internal UserError(string message) : base(message) { } }

  internal sealed class LocalServer : IDisposable {
    private Process process;
    private IntPtr job;
    internal int ChildId { get { return process == null ? 0 : process.Id; } }
    internal bool Running { get { return process != null && !process.HasExited; } }

    internal async Task StartAsync(Settings settings, string key, bool browse) {
      if (Running) return;
      // Refuse a busy fixed port; changing origins silently would hide browser history.
      var probe = new TcpListener(IPAddress.Loopback, Program.Port);
      try { probe.Start(); }
      catch (SocketException) { throw new UserError("3210 端口已被占用。请关闭其他未竟副本或占用此端口的程序后重试。"); }
      finally { probe.Stop(); }
      var root = AppDomain.CurrentDomain.BaseDirectory;
      var node = Path.Combine(root, "runtime", "node.exe");
      var app = Path.Combine(root, "app");
      if (!File.Exists(node) || !File.Exists(Path.Combine(app, "server.js"))) throw new UserError("运行包不完整。请先解压整个文件夹，再打开未竟.exe。");
      var instance = Guid.NewGuid().ToString("N");
      var info = new ProcessStartInfo(node, "server.js") { WorkingDirectory = app, UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
      info.EnvironmentVariables.Remove("NODE_OPTIONS"); info.EnvironmentVariables.Remove("NODE_PATH");
      info.EnvironmentVariables["HOSTNAME"] = "127.0.0.1";
      info.EnvironmentVariables["PORT"] = Program.Port.ToString();
      info.EnvironmentVariables["NEXT_TELEMETRY_DISABLED"] = "1";
      info.EnvironmentVariables["NODE_ENV"] = "production";
      info.EnvironmentVariables["UNFINISHED_INSTANCE"] = instance;
      // Empty values deliberately override inherited developer/model credentials in demo mode.
      info.EnvironmentVariables["MODEL_API_KEY"] = settings.Demo ? "" : key;
      info.EnvironmentVariables["MODEL_BASE_URL"] = settings.Demo ? "" : settings.BaseUrl;
      info.EnvironmentVariables["MODEL_NAME"] = settings.Demo ? "" : settings.Model;
      process = new Process { StartInfo = info };
      process.OutputDataReceived += delegate { }; process.ErrorDataReceived += delegate { };
      if (!process.Start()) throw new UserError("无法启动内置运行环境。");
      try {
        job = Native.CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw new Exception();
        var limits = new Native.JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        limits.BasicLimitInformation.LimitFlags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if (!Native.SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(limits)) || !Native.AssignProcessToJobObject(job, process.Handle)) throw new Exception();
        process.BeginOutputReadLine(); process.BeginErrorReadLine();
        var watch = Stopwatch.StartNew();
        while (watch.Elapsed.TotalSeconds < 40) {
          if (!Running) throw new UserError("本机服务未能启动，请检查文件是否完整及端口是否可用。");
          var ready = await Task.Run(() => IsReady(instance));
          if (ready) { if (browse) Program.Browse(); return; }
          await Task.Delay(200);
        }
        throw new UserError("本机服务启动超时。请停止后重试。");
      } catch { Stop(); throw; }
    }

    private static bool IsReady(string instance) {
      try {
        var request = (HttpWebRequest)WebRequest.Create(Program.Address + "api/health");
        request.Proxy = null; request.Timeout = 800;
        using (var response = request.GetResponse())
        using (var reader = new StreamReader(response.GetResponseStream())) {
          var body = Program.Json.DeserializeObject(reader.ReadToEnd()) as System.Collections.Generic.Dictionary<string, object>;
          return body != null && (string)body["app"] == "unfinished-dialogues" && (string)body["instance"] == instance;
        }
      } catch { return false; }
    }

    internal void Stop() {
      if (job != IntPtr.Zero) { Native.CloseHandle(job); job = IntPtr.Zero; }
      if (process != null) {
        try { if (!process.HasExited) { process.Kill(); process.WaitForExit(5000); } }
        catch (InvalidOperationException) { }
        catch (System.ComponentModel.Win32Exception) { }
        process.Dispose(); process = null;
      }
    }
    public void Dispose() { Stop(); }
  }

  internal static class Native {
    [StructLayout(LayoutKind.Sequential)] internal struct JOBOBJECT_BASIC_LIMIT_INFORMATION { public long PerProcessUserTimeLimit, PerJobUserTimeLimit; public uint LimitFlags; public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint PriorityClass, SchedulingClass; }
    [StructLayout(LayoutKind.Sequential)] internal struct IO_COUNTERS { public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount, ReadTransferCount, WriteTransferCount, OtherTransferCount; }
    [StructLayout(LayoutKind.Sequential)] internal struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION { public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation; public IO_COUNTERS IoInfo; public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed; }
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] internal static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool SetInformationJobObject(IntPtr job, int informationClass, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION information, uint length);
    [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll")] internal static extern bool CloseHandle(IntPtr handle);
  }
}
