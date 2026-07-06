import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
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
});

const prisma = new PrismaClient({ adapter });

const PLAG_DIR = 'E:/Project/工作空间/OS大赛/OS大赛资源/OS比赛proj18参赛队编号002查重结果/2026-查重结果';

async function main() {
  await prisma.$connect();

  // Get all project codes from filesystem (directories under PLAG_DIR)
  const dirEntries = fs.readdirSync(PLAG_DIR, { withFileTypes: true });
  const fileProjectCodes = new Set(
    dirEntries.filter(e => e.isDirectory() && e.name.startsWith('T2026')).map(e => e.name)
  );
  console.log(`文件系统中查重目录数: ${fileProjectCodes.size}`);

  // Get all projects in DB
  const allProjects = await prisma.project.findMany({
    select: { id: true, projectCode: true, teamName: true, type: true, school: true },
    orderBy: { projectCode: 'asc' },
  });
  console.log(`数据库中作品总数: ${allProjects.length}`);

  // Get all projects that HAVE plagiarism files
  const plagsInDb = await prisma.plagiarismFile.findMany({
    select: { projectId: true },
    distinct: ['projectId'],
  });
  const projectsWithPlag = await prisma.project.findMany({
    where: { id: { in: plagsInDb.map(p => p.projectId) } },
    select: { projectCode: true },
  });
  const hasPlagCodes = new Set(projectsWithPlag.map(p => p.projectCode));
  console.log(`数据库中已有查重数据的作品数: ${hasPlagCodes.size}`);

  // Projects in DB whose code matches a directory but no plagiarism data
  const missingInDb = [];
  for (const p of allProjects) {
    if (fileProjectCodes.has(p.projectCode) && !hasPlagCodes.has(p.projectCode)) {
      missingInDb.push(p);
    }
  }

  console.log(`\n=== 文件系统有查重目录但数据库无查重记录: ${missingInDb.length} 个 ===`);
  for (const p of missingInDb) {
    console.log(`  ${p.projectCode} | ${p.teamName} | ${p.school} | ${p.type}`);
  }

  // Projects in DB with no matching directory in filesystem at all (among existing plagiarism records)
  console.log(`\n=== 数据库有查重但文件系统无对应目录: ===`);
  const dbPlagCodes = new Set(projectsWithPlag.map(p => p.projectCode));
  for (const code of dbPlagCodes) {
    if (!fileProjectCodes.has(code)) {
      console.log(`  ${code}`);
    }
  }

  // Directories with no matching project in DB
  const allDbCodes = new Set(allProjects.map(p => p.projectCode));
  const noProjectMatch = [];
  for (const code of fileProjectCodes) {
    if (!allDbCodes.has(code)) {
      noProjectMatch.push(code);
    }
  }
  console.log(`\n=== 文件系统有但数据库无对应作品: ${noProjectMatch.length} 个 ===`);
  for (const code of noProjectMatch) {
    console.log(`  ${code}`);
  }

  // Summary
  const kernelProjects = allProjects.filter(p => p.type === '内核赛');
  const funcProjects = allProjects.filter(p => p.type === '功能赛' || !p.type);
  const kernelMissing = missingInDb.filter(p => p.type === '内核赛');
  const funcMissing = missingInDb.filter(p => p.type === '功能赛' || !p.type);

  console.log(`\n=== 汇总 ===`);
  console.log(`数据库作品: 内核赛 ${kernelProjects.length} / 功能赛 ${funcProjects.length}`);
  console.log(`文件系统查重目录: ${fileProjectCodes.size}`);
  console.log(`缺失查重: 内核赛 ${kernelMissing.length} / 功能赛 ${funcMissing.length}`);
  console.log(`已有查重: ${hasPlagCodes.size}`);

  // Files per directory for a sample
  console.log(`\n=== 目录内容样例 (前5个缺失的) ===`);
  for (const p of missingInDb.slice(0, 5)) {
    const dir = path.join(PLAG_DIR, p.projectCode);
    const files = fs.readdirSync(dir);
    console.log(`  ${p.projectCode}: ${files.join(', ')}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
