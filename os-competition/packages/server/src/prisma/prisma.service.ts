import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace('/', ''),
    connectionLimit: 5,
    connectTimeout: 5000,
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const config = parseDbUrl(process.env.DATABASE_URL!);
    const adapter = new PrismaMariaDb(config);
    super({ adapter });
  }
  async onModuleInit() {
    await this.$connect();
  }
}
