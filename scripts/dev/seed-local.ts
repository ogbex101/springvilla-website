import { seed } from "../seed";
const url = "postgresql://postgres@localhost:54329/sv_test?host=/var/tmp/svpg";
seed(url).then(() => seed(url)).catch((e) => { console.error(e); process.exit(1); });
