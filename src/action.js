const argv = require("yargs").argv;

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  process.exit(-1);
});

const action = require(`${__dirname}/actions/${argv.action}`);
const action_args = (() => {
  let args = Object.assign({}, argv);
  delete args["_"];
  delete args["$0"];
  delete args["action"];
  return args;
})();

async function main() {
  console.log(`🏃 action ${argv.action}: ${Date.now()} unixtime`);
  const timeLabel = `🏁 action ${argv.action}`;
  const failedTimeLabel = `🏳️  action ${argv.action}`;
  console.time(timeLabel);
  console.time(failedTimeLabel);
  try {
    if (action.default) {
      await action.default(action_args);
    } else {
      await action(action_args);
    }
  } catch (e) {
    console.log(e);
    if (e.stack) {
      console.log(e.stack);
    }
    console.timeLog(failedTimeLabel);
    process.exit(-1);
  }
  console.timeLog(timeLabel);
  process.exit();
}

main();
