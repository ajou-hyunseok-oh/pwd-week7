import { existsSync, readFileSync, realpathSync, mkdirSync, mkdtempSync, copyFileSync, unlinkSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 이 명령은 학생이 지정한 5주차 클라이언트의 원본 파일을 백업한 다음 복사합니다.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(projectRoot, 'integration', 'client');
const files = [
  'src/services/api.ts',
  'src/pages/AdminPage.tsx',
  'src/pages/SubmissionsPage.tsx',
  'src/components/SubmitRestaurant.tsx',
  'src/components/AdminGate.tsx',
];
const required = [...files.slice(0, 4), 'src/types/index.ts', 'package.json'];

try {
  if (process.argv.length !== 3) throw new Error('사용법: node scripts/install-client.mjs "./client"');
  const target = realpathSync(path.resolve(process.argv[2]));
  if (target === projectRoot || target === sourceRoot || sourceRoot.startsWith(target + path.sep)) {
    throw new Error('5주차 React 클라이언트 폴더를 지정하세요. 7주차 폴더는 대상이 아닙니다.');
  }
  for (const name of required) {
    if (!existsSync(path.join(target, name))) throw new Error(`클라이언트에 ${name} 파일이 없습니다. 올바른 5주차 폴더를 확인하세요.`);
  }
  const pkg = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8'));
  if (!pkg.dependencies?.react || !pkg.dependencies?.['@tanstack/react-query']) {
    throw new Error('React와 @tanstack/react-query가 있는 5주차 클라이언트 폴더가 아닙니다.');
  }
  for (const name of files) {
    const source = path.join(sourceRoot, name);
    const destination = path.join(target, name);
    if (!existsSync(source)) throw new Error(`연동 파일 ${name}을 찾을 수 없습니다.`);
    if (existsSync(destination) && !lstatSync(destination).isFile()) {
      throw new Error(`대상 ${name}은 일반 파일이 아닙니다. 심볼릭 링크와 폴더는 덮어쓰지 않습니다.`);
    }
  }
  const changed = files.filter((name) => {
    const destination = path.join(target, name);
    return !existsSync(destination) || !readFileSync(destination).equals(readFileSync(path.join(sourceRoot, name)));
  });
  if (!changed.length) {
    console.log('이미 최신 7주차 연동 파일이 적용되어 있습니다. 변경한 파일이 없습니다.');
  } else {
    // 7주차 안의 client는 Git에서 제외된 백업 폴더를 사용합니다.
    const localClient = path.join(projectRoot, 'client');
    const isLocalClient = existsSync(localClient) && realpathSync(localClient) === target;
    let backupPrefix = path.join(path.dirname(target), `.${path.basename(target)}-week7-backup-`);
    if (isLocalClient) {
      const backupRoot = path.join(projectRoot, '.week7-backups');
      mkdirSync(backupRoot, { recursive: true });
      backupPrefix = path.join(backupRoot, 'client-');
    }
    const backup = mkdtempSync(backupPrefix);
    const original = new Set(changed.filter((name) => existsSync(path.join(target, name))));
    for (const name of original) {
      mkdirSync(path.dirname(path.join(backup, name)), { recursive: true });
      copyFileSync(path.join(target, name), path.join(backup, name));
    }
    const installed = [];
    try {
      for (const name of changed) {
        mkdirSync(path.dirname(path.join(target, name)), { recursive: true });
        installed.push(name);
        copyFileSync(path.join(sourceRoot, name), path.join(target, name));
      }
    } catch (error) {
      for (const name of installed.reverse()) {
        if (original.has(name)) copyFileSync(path.join(backup, name), path.join(target, name));
        else if (existsSync(path.join(target, name))) unlinkSync(path.join(target, name));
      }
      throw error;
    }
    console.log(`기존 파일 백업: ${backup}`);
    console.log(`5주차 클라이언트에 연동 파일 ${changed.length}개 적용 완료: ${target}`);
    console.log('React 프로젝트의 .env.local과 서버 실행은 README 15단계를 따라 설정하세요.');
  }
} catch (error) {
  console.error('클라이언트 연동 실패:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
