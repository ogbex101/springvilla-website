import { seed } from "../seed";
seed("postgresql://postgres@localhost:54329/sv_setup?host=/var/tmp/svpg").catch((e) => { console.error(e.message); process.exit(1); });
