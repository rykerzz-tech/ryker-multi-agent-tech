/**
 * CLI inline commands — extracted from bin/cli.js for maintainability
 */

const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const http = require("http");
const https = require("https");

const utils = require("../utils");
const config = require("../core/config");
const logger = require("../core/logger");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const WINDSURF_DIR = path.join(PROJECT_ROOT, ".windsurf");
const PKG = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf-8"));
const CURRENT_VERSION = PKG.version;

// Module-level workflow cache (replaces global._wfCache)
let _wfCache = null;

// ── Helpers ──────────────────────────────────────────────────────────

function fetchJSON(url, redirects = 0) {
  const MAX_RESPONSE_SIZE = 1024 * 1024;
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("too many redirects"));
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location;
        try {
          const u = new URL(redirectUrl);
          if (!["http:", "https:"].includes(u.protocol)) {
            return reject(new Error(`Redirect to non-HTTP protocol blocked: ${u.protocol}`));
          }
        } catch {
          return reject(new Error(`Invalid redirect URL: ${redirectUrl}`));
        }
        return fetchJSON(redirectUrl, redirects + 1).then(resolve, reject);
      }
      let data = "";
      res.on("data", chunk => {
        data += chunk;
        if (data.length > MAX_RESPONSE_SIZE) {
          req.destroy();
          reject(new Error("Response too large"));
        }
      });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

async function getLatestVersion() {
  try {
    const data = await fetchJSON("https://registry.npmjs.org/ryker-multi-agent-tech/latest");
    return data.version || null;
  } catch { return null; }
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return ["http:", "https:"].includes(u.protocol);
  } catch { return false; }
}

// ── Command Implementations ──────────────────────────────────────────

async function cmdInit(options) {
  const initCmd = require("./init");
  await initCmd.run(process.cwd(), {
    dryRun: options.dryRun,
    interactive: options.interactive,
    windsurfOnly: options.windsurfOnly,
    agentOnly: options.agentOnly,
    cursorOnly: options.cursorOnly,
    cursor: options.cursor,
    rooOnly: options.rooOnly,
    noRoo: options.noRoo,
    force: options.force,
  });
  const usage = require("../core/usage");
  usage.trackCommand(process.cwd(), "init");
}

async function cmdUpdate(options) {
  const targetDir = process.cwd();
  const targetAgent = config.getAgentDir(targetDir);
  const targetWindsurf = config.getWindsurfDir(targetDir);

  if (!fs.existsSync(targetAgent) && !fs.existsSync(targetWindsurf)) {
    console.log(chalk.yellow("ไม่พบโฟลเดอร์ .agent/ หรือ .windsurf/ กรุณารันคำสั่ง `ryker-multi-agent-tech init` ก่อนทำการติดตั้ง (Run init first).\n"));
    return;
  }

  const installed = config.getVersion(targetDir);
  console.log(`Installed version (เวอร์ชันที่ติดตั้ง): ${installed || "unknown"}`);
  console.log(`Package version (เวอร์ชันแพ็กเกจ):   ${CURRENT_VERSION}`);

  if (installed === CURRENT_VERSION) {
    console.log(chalk.green(`\nระบบของคุณได้รับการอัปเดตเป็นเวอร์ชันล่าสุดเรียบร้อยแล้ว (Already up to date)! v${CURRENT_VERSION}\n`));
    return;
  }

  console.log("\nกำลังตรวจสอบข้อมูลเวอร์ชันล่าสุดจาก npm registry...");
  const latest = await getLatestVersion();
  if (latest && latest !== CURRENT_VERSION) {
    console.log(chalk.yellow(`พบเวอร์ชันใหม่บน npm registry: v${latest}`));
    console.log("โปรดรันคำสั่ง: npx ryker-multi-agent-tech@latest update\n");
    return;
  }

  const targetConfig = config.getConfigDir(targetDir);
  console.log(`\nกำลังอัปเดตระบบจากเวอร์ชัน v${installed || "?"} ไปยังเวอร์ชัน v${CURRENT_VERSION}...`);
  const preserved = utils.copyRecursive(WINDSURF_DIR, targetConfig, { merge: true, dryRun: options.dryRun });
  if (preserved.length > 0) {
    console.log("\n  ไฟล์ของเครื่องผู้ใช้งานที่มีการแก้ไขจะได้รับการสงวนไว้ (Preserved files):");
    preserved.forEach(f => console.log(`    ${f}`));
  }
  if (!options.dryRun) {
    config.saveVersion(targetDir, CURRENT_VERSION);
    utils.updateGitignore(targetDir);
  }
  console.log(options.dryRun ? "\n[DRY RUN] โหมดทดสอบการทำงาน: ไม่มีการบันทึกไฟล์ลงดิสก์จริง\n" : chalk.green(`\nอัปเดตระบบ Elite-Nexus สำเร็จแล้วเป็นเวอร์ชัน v${CURRENT_VERSION}!\n`));
}

async function cmdVersion() {
  console.log(`ryker-multi-agent-tech v${CURRENT_VERSION}`);
  const installed = config.getVersion(process.cwd());
  if (installed) console.log(`Project config version (เวอร์ชันโครงสร้างของโปรเจกต์): v${installed}`);
  console.log("\nกำลังเชื่อมต่อกับ npm registry เพื่อตรวจสอบอัปเดต...");
  const latest = await getLatestVersion();
  if (latest) {
    console.log(latest === CURRENT_VERSION ? chalk.green(`คุณกำลังใช้งานเวอร์ชันล่าสุดที่เสถียรที่สุดแล้ว: v${latest}`) : `พบเวอร์ชันที่ใหม่กว่าบน npm: v${latest}\nแนะนำให้อัปเดตโดยใช้คำสั่ง: npx ryker-multi-agent-tech@latest update`);
  } else {
    console.log("ไม่สามารถเชื่อมต่อกับบริการ npm registry ได้ในขณะนี้");
  }
  console.log("");
}

function cmdStatus() {
  const cfgDir = config.getConfigDir(process.cwd()) || WINDSURF_DIR;
  const scriptsDir = path.join(cfgDir, "scripts");
  console.log("📊 Elite-Nexus OS System Status (สถานะของระบบ):\n");
  console.log(`  Active Agents (จำนวนเอเจนต์ที่มีอยู่):    ${utils.countFiles(path.join(cfgDir, "agents"), ".md")}`);
  console.log(`  Active Skills (จำนวนความสามารถทั้งหมด):    ${utils.countDirs(path.join(cfgDir, "skills"))}`);
  console.log(`  Active Workflows (กระบวนการเวิร์กโฟลว์): ${utils.countFiles(path.join(cfgDir, "workflows"), ".md")}`);
  console.log(`  Active Scripts (สคริปต์เสริม):   ${fs.existsSync(scriptsDir) ? fs.readdirSync(scriptsDir).filter(f => f.endsWith(".py")).length : 0}`);
  console.log(`  Active Rules (ข้อกำหนดการพัฒนา):     ${utils.countFiles(path.join(cfgDir, "rules"), ".md")}`);
  console.log(`  Configuration Folder (โฟลเดอร์ตั้งค่าปัจจุบัน):    ${cfgDir}`);
  console.log("");
}

function cmdList() {
  console.log("📋 Available Commands:\n");
  const cfgDir = config.getConfigDir(process.cwd()) || WINDSURF_DIR;
  const workflowsDir = path.join(cfgDir, "workflows");
  if (!fs.existsSync(workflowsDir)) {
    console.log("  No workflows found.");
    return;
  }

  if (!_wfCache || Date.now() - _wfCache.ts > 30000) {
    const entries = [];
    fs.readdirSync(workflowsDir).filter(f => f.endsWith(".md")).sort().forEach(f => {
      const content = fs.readFileSync(path.join(workflowsDir, f), "utf-8");
      const descMatch = content.match(/description:\s*(.+)/);
      entries.push({ name: f.replace(".md", ""), desc: descMatch ? descMatch[1].trim() : "No description" });
    });
    _wfCache = { entries, ts: Date.now() };
  }

  _wfCache.entries.forEach(e => {
    console.log(`  /${e.name.padEnd(25)} ${e.desc}`);
  });
  console.log("");
}

function cmdInfo(agentName) {
  const cfgDir = config.getConfigDir(process.cwd()) || WINDSURF_DIR;
  const agentsDir = path.join(cfgDir, "agents");
  const filePath = path.join(agentsDir, `${agentName}.md`);
  if (!fs.existsSync(filePath)) {
    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith(".md"));
    const match = files.find(f => f.replace(".md", "").includes(agentName));
    if (match) return cmdInfo(match.replace(".md", ""));
    console.log(`Agent not found: ${agentName}\n`);
    console.log("Available agents:");
    files.sort().forEach(f => console.log(`  ${f.replace(".md", "")}`));
    return;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const fm = utils.parseFrontmatter(content);
  const skills = Array.isArray(fm.skills) ? fm.skills : (fm.skills ? fm.skills.split(",").map(s => s.trim()) : []);
  const tools = Array.isArray(fm.tools) ? fm.tools : (fm.tools ? fm.tools.split(",").map(t => t.trim()) : []);
  console.log(`Agent: ${fm.name || agentName}\n`);
  console.log(`  Description: ${fm.description || "N/A"}\n`);
  console.log(`  Tools:       ${tools.join(", ")}`);
  console.log(`  Skills:      ${skills.join(", ")}`);
  console.log(`  Sub-agents:  ${tools.includes("Agent") ? "Yes" : "No"}`);
  if (skills.length > 0) {
    console.log("\n  Skill Details:");
    skills.forEach(skill => {
      const projectCfgDir = config.getConfigDir(process.cwd()) || WINDSURF_DIR;
      const skillPath = path.join(projectCfgDir, "skills", skill, "SKILL.md");
      if (fs.existsSync(skillPath)) {
        const sfm = utils.parseFrontmatter(fs.readFileSync(skillPath, "utf-8"));
        console.log(`     ${skill.padEnd(25)} ${sfm.description || "Loaded"}`);
      } else {
        console.log(`     ${skill.padEnd(25)} (built-in)`);
      }
    });
  }
  console.log("");
}

function cmdChecklist(url) {
  if (url && !isValidUrl(url)) {
    console.error(chalk.red("Invalid URL. Only http:// and https:// allowed.\n"));
    return;
  }
  const cfgDir = config.getConfigDir(process.cwd()) || WINDSURF_DIR;
  const checklistScript = path.join(cfgDir, "scripts", "checklist.py");
  if (!fs.existsSync(checklistScript)) {
    console.error(chalk.red("checklist.py not found. Run `ryker-multi-agent-tech init` first.\n"));
    return;
  }
  const args = url
    ? [checklistScript, ".", "--url", url]
    : [checklistScript, "."];
  console.log("Running Master Checklist...\n");
  try {
    const pythonExe = utils.getPythonExecutable();
    execFileSync(pythonExe, args, { cwd: process.cwd(), encoding: "utf-8", stdio: "inherit" });
  } catch {
    console.error(chalk.red("Checklist failed. See errors above.\n"));
  }
}

function cmdUninstall() {
  const targetDir = process.cwd();
  const agentDir = config.getAgentDir(targetDir);
  const windsurfDir = config.getWindsurfDir(targetDir);
  const rooDir = config.getRooDir(targetDir);
  const roomodesPath = path.join(targetDir, ".roomodes");
  const roorulesPath = path.join(targetDir, ".roorules");

  const hasAgent = fs.existsSync(agentDir);
  const hasWindsurf = fs.existsSync(windsurfDir);
  const hasRoo = fs.existsSync(rooDir) || fs.existsSync(roomodesPath) || fs.existsSync(roorulesPath);

  if (!hasAgent && !hasWindsurf && !hasRoo) {
    console.log(chalk.yellow("No config directory found. Nothing to uninstall.\n"));
    return;
  }

  console.log("Removing config directories...\n");
  [agentDir, windsurfDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      const stat = fs.lstatSync(dir);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(dir);
      } else {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  // Remove Roo files
  if (fs.existsSync(rooDir)) fs.rmSync(rooDir, { recursive: true, force: true });
  if (fs.existsSync(roomodesPath)) fs.unlinkSync(roomodesPath);
  if (fs.existsSync(roorulesPath)) fs.unlinkSync(roorulesPath);

  console.log(chalk.green("Done! Config directories removed.\n"));
  console.log("Note: .gitignore entries and .windsurfrules were left intact. Remove '# Ryker MultiAgent Tech' and '.windsurf' from .gitignore, and delete .windsurfrules manually if desired.\n");
}

module.exports = {
  cmdInit,
  cmdUpdate,
  cmdVersion,
  cmdStatus,
  cmdList,
  cmdInfo,
  cmdChecklist,
  cmdUninstall,
  getLatestVersion,
  CURRENT_VERSION,
  getComponentCounts: () => ({
    agents: utils.countFiles(path.join(WINDSURF_DIR, "agents"), ".md"),
    skills: utils.countDirs(path.join(WINDSURF_DIR, "skills")),
    workflows: utils.countFiles(path.join(WINDSURF_DIR, "workflows"), ".md"),
  }),
};
