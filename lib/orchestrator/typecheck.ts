import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TsError {
  file: string;
  line?: number;
  message: string;
}

export async function typecheckSlug(slugDir: string, projectRoot: string): Promise<TsError[]> {
  const tscBin = path.join(projectRoot, 'node_modules', '.bin', 'tsc');
  try {
    await execAsync(`"${tscBin}" --noEmit`, { cwd: projectRoot, timeout: 30000 });
    return [];
  } catch (err) {
    const output = (err as { stdout?: string; stderr?: string }).stdout ?? '';
    return parseTscOutput(output, slugDir, projectRoot);
  }
}

function parseTscOutput(output: string, slugDir: string, projectRoot: string): TsError[] {
  const errors: TsError[] = [];
  const slugRel = path.relative(projectRoot, slugDir).replace(/\\/g, '/');

  for (const line of output.split('\n')) {
    const match = line.match(/^(.+?)\((\d+),\d+\): error TS\d+: (.+)$/);
    if (!match) continue;

    const filePath = match[1].replace(/\\/g, '/');
    if (!filePath.includes(slugRel)) continue;

    const absFile = path.resolve(projectRoot, filePath);
    const relFile = path.relative(slugDir, absFile);
    errors.push({ file: relFile, line: parseInt(match[2], 10), message: match[3] });
  }

  return errors;
}
