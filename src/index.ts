import { runCli } from "./cli.js";

export { runCli };

if (import.meta.url === `file://${process.argv[1]}`) {
  await runCli(process.argv);
}
