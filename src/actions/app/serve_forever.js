const forever = require("forever-monitor");

export default async function () {
  const child = forever.start(["./bin/run_action", "app/serve"], {
    silent: false,
    killTree: true,
  });
  await {
    then(r, f) {
      child.on("exit", r);
    },
  };
}
