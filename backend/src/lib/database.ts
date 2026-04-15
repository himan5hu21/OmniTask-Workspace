import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ 
  adapter,
  log: [
    {
      emit: 'stdout',
      level: 'query', // Badhi SQL queries terminal ma dekhase
    },
    {
      emit: 'stdout',
      level: 'error', // Database errors mate
    },
    {
      emit: 'stdout',
      level: 'info',  // Information message mate
    },
    {
      emit: 'stdout',
      level: 'warn',  // Warning mate
    },
  ], 
});

export { prisma };