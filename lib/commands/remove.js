/**
 * ryker-multi-agent-tech remove skill <name> — Uninstall a skill plugin
 */

const chalk = require("chalk");
const ora = require("ora");

const config = require("../core/config");
const plugin = require("../core/plugin");

async function run(type, name, options = {}) {
  if (type !== "skill") {
    console.log(chalk.yellow(`\n  Only "skill" type is supported currently. Usage: ryker-multi-agent-tech remove skill <name>\n`));
    return;
  }

  const projectDir = process.cwd();

  if (!config.configExists(projectDir)) {
    console.log(chalk.red("ไม่พบโฟลเดอร์สำหรับตั้งค่าระบบ (No config directory found).\n"));
    return;
  }

  if (!plugin.isInstalled(projectDir, name)) {
    console.log(chalk.yellow(`ทักษะ (Skill) "${name}" ยังไม่ได้ถูกติดตั้ง\n`));
    console.log("ทักษะ (Skills) ที่ติดตั้งอยู่:");
    const installed = plugin.listInstalled(projectDir);
    if (installed.length === 0) {
      console.log("  (ไม่มี)");
    } else {
      installed.forEach(s => console.log(`  ${s}`));
    }
    console.log("");
    return;
  }

  const spinner = ora(`กำลังลบทักษะ (Skill): ${name}...`).start();

  try {
    const skillName = plugin.remove(projectDir, name);
    spinner.succeed(chalk.green(`ลบทักษะ (Skill) "${skillName}" เรียบร้อยแล้ว!`));
    console.log(`\n  ${chalk.gray("อย่าลืมอัปเดตไฟล์กำหนดค่า frontmatter ของ Agent ที่อ้างอิงทักษะนี้ด้วยนะคะ")}\n`);
  } catch (err) {
    spinner.fail(chalk.red(`ไม่สามารถลบทักษะ (Skill): ${name}`));
    console.error(chalk.red(`  ${err.message}\n`));
  }
}

module.exports = { run };
