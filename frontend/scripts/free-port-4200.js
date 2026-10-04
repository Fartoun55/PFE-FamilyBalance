const { execSync } = require('child_process');

const port = 4200;

const getListeningPids = () => {
  try {
    const output = execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen | Select-Object -ExpandProperty OwningProcess -Unique"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );

    return output
      .split(/\r?\n/)
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
  } catch {
    return [];
  }
};

const killPid = (pid) => {
  execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
};

const pids = getListeningPids();

for (const pid of pids) {
  try {
    killPid(pid);
    // eslint-disable-next-line no-console
    console.log(`Stopped process ${pid} on port ${port}`);
  } catch {
    // Ignore processes that already exited between detection and kill.
  }
}