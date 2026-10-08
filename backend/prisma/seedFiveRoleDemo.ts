import { PrismaClient } from "@prisma/client";
import { seedFiveRoleDemo } from "./fiveRoleDemo.js";
const db = new PrismaClient();
seedFiveRoleDemo(db)
  .then((x) => console.log(JSON.stringify(x, null, 2)))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
