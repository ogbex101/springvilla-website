import { migrate } from "../migrate";
migrate("postgresql://postgres@localhost:54329/sv_test?host=/var/tmp/svpg").catch((e) => { console.error(e.message); process.exit(1); });
