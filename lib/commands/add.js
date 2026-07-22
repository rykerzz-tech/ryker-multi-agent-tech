/**
 * ryker-multi-agent-tech add skill <name> — Install a skill plugin from npm
 */

const chalk = require("chalk");
const ora = require("ora");
const fs = require("fs");
const path = require("path");

const config = require("../core/config");
const plugin = require("../core/plugin");

async function run(type, name, options = {}) {
  if (type !== "skill") {
    console.log(chalk.yellow(`\n  Only "skill" type is supported currently. Usage: ryker-multi-agent-tech add skill <name>\n`));
    return;
  }

  const projectDir = process.cwd();

  if (!config.configExists(projectDir)) {
    console.log(chalk.red("ไม่พบโฟลเดอร์สำหรับตั้งค่าระบบ (No config directory found). กรุณารัน `ryker-multi-agent-tech init` ก่อนนะคะ\n"));
    return;
  }

  // Phase 1: Download + validate
  const spinner = ora(`กำลังติดตั้งทักษะ (Skill): ${name}...`).start();

  try {
    const skillName = plugin.install(projectDir, name);
    spinner.succeed(chalk.green(`ติดตั้งทักษะ (Skill) "${skillName}" สำเร็จ!`));

    const skillDir = plugin.getSkillDir(projectDir, skillName);

    // Phase 2: Permission check
    const permResult = await plugin.checkPermissions(skillDir, { autoApprove: options.autoApprove });
    if (!permResult.granted) {
      // Rollback — remove the skill
      plugin.remove(projectDir, skillName);
      console.log(chalk.yellow("\n  ไม่ได้รับอนุญาตสิทธิ์การใช้งาน (Permission denied). ยกเลิกการติดตั้งทักษะ\n"));
      return;
    }

    // Show skill info
    console.log(`\n  ${chalk.cyan("ติดตั้งไปยัง (Installed to):")} ${skillDir}`);

    const skillMd = path.join(skillDir, "SKILL.md");
    if (fs.existsSync(skillMd)) {
      const content = fs.readFileSync(skillMd, "utf-8");
      const descMatch = content.match(/description:\s*(.+)/);
      if (descMatch) {
        console.log(`  ${chalk.cyan("คำอธิบาย (Description):")} ${descMatch[1].trim()}`);
      }
    }

    // Show granted permissions
    const grantedPerms = Object.keys(permResult.permissions);
    if (grantedPerms.length > 0) {
      console.log(`  ${chalk.cyan("การอนุญาตสิทธิ์ (Permissions):")} ${grantedPerms.join(", ")}`);
    }

    console.log(`\n  ${chalk.gray("ทักษะ (Skill) นี้พร้อมใช้งานสำหรับ Agent ของคุณแล้ว")}`);
    console.log(`  ${chalk.gray("คุณสามารถอ้างอิงได้ที่ frontmatter ของ Agent: skills: ..., " + skillName)}\n`);
  } catch (err) {
    spinner.fail(chalk.red(`ไม่สามารถติดตั้งทักษะ (Skill): ${name}`));
    console.error(chalk.red(`  ${err.message}\n`));
  }
}

module.exports = { run };
