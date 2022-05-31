const chalk = require("chalk");
const exec = require("child_process").execSync;
const fs = require("fs/promises");
const { format } = require("path");

// logging functions
const info = (log) => console.log(chalk.blue(log));
const success = (log) => console.log(chalk.green(log));
const fail = (log) => console.log(chalk.red(log));

const cwd = "/Users/figuacel/Development/repositories/mule/script";
const repos = [
  {
    ticket: "W-10730861",
    namespace: "mulesoft",
    name: "api-console-components",
  },
  {
    ticket: "W-10730883",
    namespace: "mulesoft",
    name: "exchange-auth-components",
  },
  { ticket: "W-10730867", namespace: "mulesoft", name: "api-notebook-react" },
  {
    ticket: "W-10730889",
    namespace: "mulesoft",
    name: "exchange-automation-cleanup-scripts",
  },
  {
    ticket: "W-10730918",
    namespace: "mulesoft",
    name: "exchange-automation-reporters",
  },
  {
    ticket: "W-10730921",
    namespace: "mulesoft",
    name: "client-applications-ui",
  },
  {
    ticket: "W-10730924",
    namespace: "mulesoft",
    name: "exchange-content-provider",
  },
  {
    ticket: "W-10730926",
    namespace: "mulesoft",
    name: "exchange-crowd-migration-service",
  },
  {
    ticket: "W-10730928",
    namespace: "mulesoft",
    name: "exchange-customization-client",
  },
  {
    ticket: "W-10730929",
    namespace: "mulesoft",
    name: "design-center-projects-client",
  },
  {
    ticket: "W-10730932",
    namespace: "mulesoft",
    name: "exchange-draft-to-markdown",
  },
  {
    ticket: "W-10730939",
    namespace: "mulesoft",
    name: "exchange-file-storage-node-lib",
  },
  {
    ticket: "W-10730942",
    namespace: "mulesoft",
    name: "exchange-file-upload-client",
  },
  {
    ticket: "W-10730946",
    namespace: "mulesoft",
    name: "exchange-logging-node-lib",
  },
  {
    ticket: "W-10730949",
    namespace: "mulesoft",
    name: "exchange-markdown-parser",
  },
  {
    ticket: "W-10730952",
    namespace: "mulesoft",
    name: "exchange-markdown-to-draft",
  },
  {
    ticket: "W-10730954",
    namespace: "mulesoft",
    name: "exchange-marketing-assets",
  },
  { ticket: "W-10730957", namespace: "mulesoft", name: "md-draft-js" },
  {
    ticket: "W-10730961",
    namespace: "mulesoft",
    name: "exchange-migration-tool",
  },
  {
    ticket: "W-10730964",
    namespace: "mulesoft",
    name: "exchange-node-commons",
  },
  {
    ticket: "W-10730970",
    namespace: "mulesoft",
    name: "exchange-node-db-commons",
  },
  { ticket: "W-10730973", namespace: "mulesoft", name: "exchange-node-errors" },
  {
    ticket: "W-10730976",
    namespace: "mulesoft",
    name: "exchange-node-messaging-client",
  },
  {
    ticket: "W-10730982",
    namespace: "mulesoft",
    name: "exchange-object-store-proxy",
  },
  { ticket: "W-10730983", namespace: "mulesoft", name: "perspective" },
  {
    ticket: "W-10730988",
    namespace: "mulesoft",
    name: "exchange-pipeline-status",
  },
  {
    ticket: "W-10730993",
    namespace: "mulesoft",
    name: "exchange-region-synchronizer-service",
  },
  { ticket: "W-10730996", namespace: "mulesoft", name: "exchange-rodo-bot" },
];

async function cloneRepo(repo) {
  const ssh = `git@github.com:${repo.namespace}/${repo.name}.git`;
  info(`Cloning repository: ${ssh}`);

  try {
    exec(`git clone ${ssh}`, { cwd });
    success("   repo has been cloned");
  } catch (error) {
    if (
      error.stderr.includes(" already exists and is not an empty directory")
    ) {
      info("   Repository was already cloned");
    } else {
      throw error;
    }
  }
}

async function checkoutMasterAndGitPull(repo) {
  const dir = `${cwd}/${repo.name}`;

  try {
    info(`   Syncing with master: ${repo.name}`);
    await exec(`git checkout master`, { cwd: dir, stdio: "ignore" });
    await exec(`git pull`, { cwd: dir, stdio: "ignore" });
    success(`   Repo is synchronizing with master`);
  } catch (error) {
    fail(error.message);
    throw error;
  }
}

async function gitAddAndPush(repo, { commitMessage, showDiff = false }) {
  const dir = `${cwd}/${repo.name}`;
  const branch = "integration/test-node-14";

  try {
    if (showDiff) {
      info("   Committing the following changes:");
      await exec(`git --no-pager diff`, { cwd: dir, stdio: "inherit" });
    }
    info(`   Commiting: ${repo.name}`);
    try {
      await exec(`git push origin --delete "${branch}"`, {
        cwd: dir,
        stdio: "ignore",
      });
    } catch (error) {
      // does not exist
    }
    await exec(`git checkout -b "${branch}"`, { cwd: dir, stdio: "ignore" });
    await exec(`git add --all`, { cwd: dir, stdio: "ignore" });
    await exec(`git commit -m "${commitMessage}"`, {
      cwd: dir,
      stdio: "ignore",
    });
    await exec(`git push --set-upstream origin ${branch}`, {
      cwd: dir,
      stdio: "ignore",
    });

    success(
      `   Create PR using: https://github.com/${repo.namespace}/${repo.name}/pull/new/${branch}`
    );
  } catch (error) {
    fail(error.message);
    throw error;
  }
}

async function executeChanges(repo) {
  const fileDir = format({
    dir: `${cwd}/${repo.name}`,
    base: "valkyr.yaml",
    ext: ".yaml",
    name: "valkyr",
  });
  const file = await fs.readFile(fileDir, "utf8");
  const changes = file.replace(/strategyVersion.*/g, "strategyVersion: 14");
  const data = new Uint8Array(Buffer.from(changes));
  return fs.writeFile(fileDir, data);
}

async function execute() {
  for (const repo of repos) {
    try {
      await cloneRepo(repo);
      await checkoutMasterAndGitPull(repo);
      await executeChanges(repo);
      await gitAddAndPush(repo, {
        commitMessage: `[${repo.ticket}] Updating to node 14`,
        showDiff: false,
      });
    } catch (error) {
      fail(error.message);
      throw error;
    }
  }
}

execute();
