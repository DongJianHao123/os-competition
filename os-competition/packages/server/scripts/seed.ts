import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 创建管理员
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { phone: '13800000000' },
    update: {},
    create: {
      name: '管理员',
      phone: '13800000000',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });
  console.log('管理员账号: 13800000000 / admin123');

  // 创建默认评委
  const judgePassword = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { phone: '13900000001' },
    update: {},
    create: { name: '代俊勃', phone: '13900000001', passwordHash: judgePassword, role: 'judge' },
  });
  console.log('评委账号: 13900000001 / 123456');

  // 导入 Excel
  const excelPath = path.resolve(__dirname, '../../../../OS大赛proj57赛题初赛作品提交.xlsx');
  console.log('Excel 路径:', excelPath);
  try {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    let count = 0;
    for (const row of rows) {
      const keys = Object.keys(row);
      const projectCode = String(row[keys[2]] || '');
      const teamName = String(row[keys[3]] || '');
      const leaderName = String(row[keys[4]] || '');
      const school = String(row[keys[5]] || '');
      const repoUrl = String(row[keys[9]] || '');
      const remark = row[keys[10]] ? String(row[keys[10]]) : null;

      if (!projectCode || !projectCode.startsWith('T2026')) continue;

      await prisma.project.upsert({
        where: { projectCode },
        update: { teamName, leaderName, school, repoUrl, remark },
        create: {
          projectCode, teamName, leaderName, school, repoUrl,
          round: '初赛', status: '待评审', remark,
        },
      });
      count++;
    }
    console.log(`Excel 导入完成: ${count} 条记录`);
  } catch (e: any) {
    console.log('Excel 导入跳过:', e.message);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
