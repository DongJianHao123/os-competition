import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

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

  // phone -> { school, email }
  const infoMap = new Map();

  // 内核赛: 作品分组 sheet, col 3=name, 4=phone, 5=email, 6=school(单位)
  console.log('读取内核赛...');
  const wb1 = XLSX.readFile(path.join(BASE, '20260704-2026OS内核初赛作品评审分组表.xlsx'));
  const sh1 = wb1.Sheets['作品分组'];
  const kernelRows = XLSX.utils.sheet_to_json(sh1, { header: 1 });
  for (let i = 1; i < kernelRows.length; i++) {
    const r = kernelRows[i];
    const phone = String(r[4] || '').trim();
    const email = String(r[5] || '').trim();
    const school = String(r[6] || '').trim();
    if (phone && (email || school)) {
      infoMap.set(phone, { email, school });
    }
  }

  // 功能赛: 评委信息 sheet, col 0=name, 1=phone, 2=email, 3=school(单位)
  console.log('读取功能赛...');
  const wb2 = XLSX.readFile(path.join(BASE, '20260704-2026OS功能初赛作品评审分组表v3.xlsx'));
  const sh2 = wb2.Sheets['评委信息'];
  const funcRows = XLSX.utils.sheet_to_json(sh2, { header: 1 });
  for (let i = 1; i < funcRows.length; i++) {
    const r = funcRows[i];
    const phone = String(r[1] || '').trim();
    const email = String(r[2] || '').trim();
    const school = String(r[3] || '').trim();
    if (phone && (email || school)) {
      if (!infoMap.has(phone)) {
        infoMap.set(phone, { email, school });
      } else {
        // Supplement missing info from function sheet
        const existing = infoMap.get(phone);
        if (!existing.email && email) existing.email = email;
        if (!existing.school && school) existing.school = school;
      }
    }
  }

  console.log(`从Excel收集到 ${infoMap.size} 个评委的信息`);

  // Update DB
  let updated = 0;
  let skipped = 0;

  for (const [phone, info] of infoMap) {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      console.log(`  未找到: ${phone}`);
      skipped++;
      continue;
    }

    const needsSchool = info.school && user.school !== info.school;
    const needsEmail = info.email && user.email !== info.email;

    if (needsSchool || needsEmail) {
      const updateData = {};
      if (needsSchool) updateData.school = info.school;
      if (needsEmail) updateData.email = info.email;

      await prisma.user.update({ where: { phone }, data: updateData });
      console.log(`  更新: ${user.name} (${phone}) school=${info.school} email=${info.email}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n完成: 更新 ${updated}, 跳过 ${skipped}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
