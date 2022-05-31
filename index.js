const chalk = require("chalk");
const exec = require("child_process").execSync;
const fs = require("fs/promises");
const { format } = require("path");

// logging functions
const info = (log) => console.log(chalk.blue(log));
const success = (log) => console.log(chalk.green(log));
const fail = (log) => console.log(chalk.red(log));

const cwd = "SET_HERE_WHERE_TO_STORE_THE_REPOS";
const repos = [
  {
    ticket: "W-1234567",
    namespace: "mulesoft",
    name: "yourRepoName",
  },
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
