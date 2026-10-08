import { PrismaClient } from "@prisma/client";
import { resetFiveRoleDemo } from "./fiveRoleDemo.js";
const db = new PrismaClient();
resetFiveRoleDemo(db)
  .then((x) =>
    console.log(x ? "Five-role demo removed." : "No demo organization found."),
  )
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
