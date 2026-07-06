import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Parse DB URL from .env
const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
if (!dbUrl) { console.error('DATABASE_URL not found'); process.exit(1); }

const u = new URL(dbUrl);
const adapter = new PrismaMariaDb({
  host: u.hostname,
  port: Number(u.port) || 3306,
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace('/', ''),
  connectionLimit: 5,
  connectTimeout: 5000,
});

const prisma = new PrismaClient({ adapter });

const BASE = 'E:/Project/工作空间/OS大赛/OS大赛资源';

async function main() {
  await prisma.$connect();

  // ========== 解析 Excel ==========

  // 内核赛
  console.log('=== 解析内核赛 ===');
  const wb1 = XLSX.readFile(path.join(BASE, '20260704-2026OS内核初赛作品评审分组表.xlsx'));
  const sh1 = wb1.Sheets['作品分组'];
  const kernelRows = XLSX.utils.sheet_to_json(sh1, { header: 1 });

  // 功能赛
  console.log('=== 解析功能赛 ===');
  const wb2 = XLSX.readFile(path.join(BASE, '20260704-2026OS功能初赛作品评审分组表v3.xlsx'));
  const shJudge = wb2.Sheets['评委信息'];
  const judgeInfoRows = XLSX.utils.sheet_to_json(shJudge, { header: 1 });
  const shAssign = wb2.Sheets['评审任务分配'];
  const assignRows = XLSX.utils.sheet_to_json(shAssign, { header: 1 });

  // ========== 收集评委 (只保留: 姓名, 手机号, 邮箱, 学校) ==========
  const judgeMap = new Map(); // phone -> { name, phone, email, school, type }

  // 内核赛评委 (from 作品分组 sheet)
  for (let i = 1; i < kernelRows.length; i++) {
    const r = kernelRows[i];
    const name = String(r[3] || '').trim();
    const phone = String(r[4] || '').trim();
    const email = String(r[5] || '').trim();
    const school = String(r[6] || '').trim();
    if (name && phone) {
      const existing = judgeMap.get(phone);
      if (!existing) {
        judgeMap.set(phone, { name, phone, email, school, type: '内核赛' });
      }
    }
  }

  // 功能赛评委 (from 评委信息 sheet)
  for (let i = 1; i < judgeInfoRows.length; i++) {
    const r = judgeInfoRows[i];
    const name = String(r[0] || '').trim();
    const phone = String(r[1] || '').trim();
    const email = String(r[2] || '').trim();
    const school = String(r[3] || '').trim();
    if (name && phone) {
      const existing = judgeMap.get(phone);
      if (!existing) {
        judgeMap.set(phone, { name, phone, email, school, type: '功能赛' });
      } else {
        // Cross-type judge - keep first type
        console.log(`  跨赛道: ${name} (${phone}) 保留类型=${existing.type}`);
      }
    }
  }

  console.log(`评委总数: ${judgeMap.size}`);

  // ========== 创建/更新评委用户 ==========
  let judgeCreated = 0;
  const phoneToUserId = new Map();

  for (const [phone, j] of judgeMap) {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      phoneToUserId.set(phone, existing.id);
    } else {
      const user = await prisma.user.create({
        data: {
          name: j.name,
          phone: j.phone,
          passwordHash: '$2a$10$placeholder',
          role: 'judge',
          judgeType: j.type,
          isActive: true,
        },
      });
      phoneToUserId.set(phone, user.id);
      judgeCreated++;
    }
  }
  console.log(`评委创建: ${judgeCreated}`);

  // Build name -> userId lookup
  const nameToUserId = new Map();
  for (const [phone, j] of judgeMap) {
    const uid = phoneToUserId.get(phone);
    if (uid) nameToUserId.set(j.name, uid);
  }
  // Also lookup existing users by name
  const allUsers = await prisma.user.findMany({ where: { role: 'judge' }, select: { id: true, name: true } });
  for (const u of allUsers) {
    if (!nameToUserId.has(u.name)) {
      nameToUserId.set(u.name, u.id);
    }
  }

  // ========== 收集作品分配 ==========
  // { projectCode, teamName, school, type, judges: [judgeName] }
  const projectMap = new Map();

  function addProject(projectCode, teamName, school, type, judgeName) {
    if (!projectCode.startsWith('T2026')) return;
    let proj = projectMap.get(projectCode);
    if (!proj) {
      proj = { projectCode, teamName, school, type, judges: new Set() };
      projectMap.set(projectCode, proj);
    }
    if (judgeName) proj.judges.add(judgeName);
  }

  // 内核赛作品
  for (let i = 1; i < kernelRows.length; i++) {
    const r = kernelRows[i];
    const projectCode = String(r[0] || '').trim();
    const teamName = String(r[1] || '').trim();
    const school = String(r[2] || '').trim();
    const judgeName = String(r[3] || '').trim();
    addProject(projectCode, teamName, school, '内核赛', judgeName);
  }

  // 功能赛作品
  for (let i = 1; i < assignRows.length; i++) {
    const r = assignRows[i];
    const projectCode = String(r[0] || '').trim();
    const teamName = String(r[1] || '').trim();
    const school = String(r[2] || '').trim();
    const projType = String(r[4] || '').trim();
    for (let j = 5; j < r.length; j++) {
      const judgeName = String(r[j] || '').trim();
      if (judgeName) {
        addProject(projectCode, teamName, school, `功能赛-${projType}`, judgeName);
      }
    }
  }

  console.log(`作品总数: ${projectMap.size}`);

  // ========== 导入作品 ==========
  let projectCreated = 0;
  let projectExists = 0;

  for (const [code, proj] of projectMap) {
    const existing = await prisma.project.findUnique({ where: { projectCode: code } });
    if (existing) {
      projectExists++;
      proj.dbId = existing.id;
      continue;
    }
    const created = await prisma.project.create({
      data: {
        projectCode: proj.projectCode,
        teamName: proj.teamName || '未知团队',
        leaderName: '',
        school: proj.school || '未知学校',
        repoUrl: '',
        round: '初赛',
        type: proj.type,
        status: '待评审',
      },
    });
    proj.dbId = created.id;
    projectCreated++;
  }

  console.log(`作品创建: ${projectCreated}, 已存在: ${projectExists}`);

  // ========== 创建评审记录 ==========
  let reviewCreated = 0;
  let reviewSkipped = 0;
  let judgeNotFound = 0;

  for (const [code, proj] of projectMap) {
    if (!proj.dbId) {
      console.log(`  作品无ID: ${code}`);
      continue;
    }
    for (const judgeName of proj.judges) {
      const judgeId = nameToUserId.get(judgeName);
      if (!judgeId) {
        if (judgeNotFound < 5) console.log(`  评委未找到: ${judgeName}`);
        judgeNotFound++;
        continue;
      }

      const existingReview = await prisma.review.findUnique({
        where: { judgeId_projectId: { judgeId, projectId: proj.dbId } },
      });
      if (existingReview) {
        reviewSkipped++;
        continue;
      }

      await prisma.review.create({
        data: { judgeId, projectId: proj.dbId },
      });
      reviewCreated++;
    }
  }

  console.log(`评审创建: ${reviewCreated}, 跳过: ${reviewSkipped}, 评委未找到: ${judgeNotFound}`);

  await prisma.$disconnect();
  console.log('=== 导入完成 ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
