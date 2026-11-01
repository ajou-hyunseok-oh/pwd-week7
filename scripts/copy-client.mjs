import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const destination = path.join(projectRoot, 'client');
const required = [
  'package.json', 'src/types/index.ts', 'src/services/api.ts', 'src/pages/AdminPage.tsx',
  'src/pages/SubmissionsPage.tsx', 'src/components/SubmitRestaurant.tsx',
];
const excluded = new Set(['.git', 'node_modules', 'dist', 'coverage']);
let temporary;
let createdDestination = false;

try {
  if (process.argv.length !== 3) throw new Error('사용법: node scripts/copy-client.mjs "../pwd-week5"');
  let source;
  try {
    source = realpathSync(path.resolve(process.argv[2]));
    if (!lstatSync(source).isDirectory()) throw new Error();
  } catch {
    throw new Error('지정한 폴더를 찾을 수 없습니다. 5주차 React 폴더 경로를 확인하세요.');
  }
  if (source === projectRoot || projectRoot.startsWith(source + path.sep)) {
    throw new Error('7주차 폴더나 그 상위 폴더가 아닌 5주차 React 폴더를 지정하세요.');
  }
  for (const name of required) {
    try {
      if (!lstatSync(path.join(source, name)).isFile()) throw new Error();
    } catch {
      throw new Error(`5주차 폴더에서 ${name} 일반 파일을 찾을 수 없습니다. 폴더 경로를 확인하세요.`);
    }
  }
  let pkg;
  try { pkg = JSON.parse(readFileSync(path.join(source, 'package.json'), 'utf8')); }
  catch { throw new Error('5주차 package.json을 읽을 수 없습니다.'); }
  if (!pkg.dependencies?.react || !pkg.dependencies?.['@tanstack/react-query']) {
    throw new Error('React와 @tanstack/react-query가 있는 5주차 클라이언트 폴더가 아닙니다.');
  }
  try {
    lstatSync(destination);
    throw new Error('7주차 client 폴더가 이미 있습니다. 기존 폴더는 덮어쓰지 않습니다.');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  temporary = mkdtempSync(path.join(projectRoot, '.week7-client-copy-'));
  cpSync(source, temporary, {
    recursive: true,
    filter: (entry) => {
      const name = path.basename(entry);
      if (entry !== source && (excluded.has(name) || name.startsWith('.env'))) return false;
      if (lstatSync(entry).isSymbolicLink()) throw new Error(`심볼릭 링크는 복사할 수 없습니다: ${path.relative(source, entry)}`);
      return true;
    },
  });
  try { mkdirSync(destination); }
  catch (error) {
    if (error?.code === 'EEXIST') throw new Error('7주차 client 폴더가 이미 있습니다. 기존 폴더는 덮어쓰지 않습니다.');
    throw error;
  }
  createdDestination = true;
  for (const name of readdirSync(temporary)) {
    cpSync(path.join(temporary, name), path.join(destination, name), { recursive: true, force: false, errorOnExist: true });
  }
  console.log(`5주차 클라이언트 복사 완료: ${destination}`);
  console.log('원본은 변경하지 않았습니다. 다음으로 node scripts/install-client.mjs "./client"를 실행하세요.');
} catch (error) {
  if (createdDestination) rmSync(destination, { recursive: true, force: true });
  console.error('클라이언트 복사 실패:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
