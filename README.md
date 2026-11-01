# 7주차 실습 — TypeScript Express 서버와 Supabase PostgreSQL 연결

지난주 만든 Foodmap API의 저장 공간을 **메모리 배열에서 Supabase PostgreSQL로 변경**합니다. React → Express → Supabase Data API → PostgreSQL 순서로 요청을 처리하며, 서버를 재시작한 뒤에도 등록 데이터가 유지되는 것을 확인합니다.

이 저장소는 `pwd-week6`의 TypeScript·Express·MVCS 구조를 바탕으로 작성한 **별도의 7주차 실습 서버**입니다. 6주차 저장소는 수정할 필요가 없습니다. 예전 MongoDB/Mongoose 코드는 Supabase 코드로 교체했습니다.

**화면·문서 확인 기준: 2026년 11월 1일.** Supabase 클라우드 대시보드는 자동 업데이트됩니다. 가입 화면은 직접 확인했고, 로그인 이후 항목은 공식 문서와 공개 대시보드 소스를 대조했습니다. 일부 계정의 메뉴 배치가 다르면 아래에 적은 영문 메뉴 이름과 공식 링크를 기준으로 찾습니다. SDK는 확인 시점의 안정 버전 `@supabase/supabase-js 2.118.0`으로 고정했습니다. PostgreSQL의 실제 서버 버전은 SQL Editor에서 `select version();`으로 확인할 수 있습니다.

## 실습 결과와 진행 순서

- Supabase 가입 → Organization과 프로젝트 생성
- 테이블·권한·승인 함수 생성 → 지난주 맛집 3건 입력
- 프로젝트 URL·Secret key 확인 → Express 환경변수 설정
- DB 연결 확인 → 맛집 조회·등록·수정·삭제
- 서버 재시작 후 데이터 유지 확인 → 제보 등록·승인
- 기존 5주차 React를 서버에 연결하고 관리자·제보 승인 확인
- 필요하면 Render에 배포

**0~13단계와 15단계가 필수 실습**입니다. 14단계는 API 참고표, 16단계는 Render 선택 실습입니다. 처음에는 순서대로 진행하고, 오류가 나오면 다음 명령으로 넘어가기 전에 17단계에서 원인을 확인합니다.

```text
React / HTTP 요청 도구
        ↓ HTTP
Express: Route → Controller → Service
        ↓ supabase-js / HTTPS
Supabase Data API → PostgreSQL
```

Service가 SDK로 DB 요청을 보내고, 조회한 행을 Model이 API 응답 형태로 바꿉니다.

맛집 조회와 제보 등록은 공개 API입니다. 맛집 관리, 제보 개인정보 조회·승인·삭제는 별도의 Express 관리자 토큰으로 보호합니다. **Supabase Secret key를 HTTP 요청 도구나 React에 전달하지 않습니다.**

## 6주차를 바탕으로 7주차에서 할 일

6주차의 `pwd-week6` 서버 폴더는 그대로 둡니다. 이 저장소에는 6주차의 TypeScript·Express 구조를 바탕으로 수정한 7주차 서버가 이미 들어 있습니다. 학생은 아래 순서로 **7주차 폴더에서 바뀐 내용을 확인하고 실행**합니다. 6주차 파일을 열어 비교해도 되지만, 6주차에 코드를 추가하거나 덮어쓸 필요는 없습니다.

| 순서 | 7주차에서 할 일 | 확인할 파일·장소 |
|---|---|---|
| 1 | 관리형 PostgreSQL 프로젝트와 테이블 만들기 | Supabase 대시보드, [schema.sql](supabase/schema.sql) |
| 2 | 지난주 맛집 3건을 새 DB에 입력하기 | [seed.sql](supabase/seed.sql) |
| 3 | 서버가 사용할 URL·키 설정하기 | 7주차 `.env`, [연결 설정](src/config/supabase.ts) |
| 4 | 메모리 조회·등록을 DB 요청으로 바꾼 구조 이해하기 | [맛집 서비스](src/services/restaurants.service.ts), [모델](src/models/restaurant.model.ts) |
| 5 | 제보와 승인, 관리자 요청 확인하기 | [제보 서비스](src/services/submissions.service.ts), [라우트](src/routes/submissions.routes.ts) |
| 6 | 기존 React를 7주차 안으로 복사해 서버에 연결하기 | `client/`, [클라이언트 연동 자료](integration/client/src) |
| 7 | 저장·재시작·조회 결과 확인하기 | 10~13단계와 15단계 |

아래 0~13단계는 DB와 서버를 실제로 설정하고, 14단계 뒤의 **7주차 코드 읽기**에서 변경된 코드의 역할을 짚습니다. 이어서 15단계에서 5주차 React를 7주차의 `client/`로 복사해 연동합니다. 제공된 서버 코드를 한 줄씩 다시 입력하는 대신 파일을 열어 설명과 비교합니다.

## 0. 실습 폴더와 프로그램 준비

필요한 것은 GitHub 계정, Node.js 24.x LTS, npm, VS Code입니다. 7주차 서버는 Node.js 22 이상을 지원하지만 기존 5주차 React의 package.json은 24.x를 지정하므로, 두 프로젝트를 함께 실행할 때는 24.x를 사용합니다. Supabase 계정은 1단계에서 만듭니다. Node.js가 없다면 [공식 다운로드](https://nodejs.org/en/download)에서 24.x LTS 버전을 설치하고 VS Code를 다시 엽니다. npm은 Node.js와 함께 설치됩니다. 로컬 PostgreSQL 설치나 Supabase CLI, Docker는 필수가 아닙니다. SDK의 Node.js 요구사항은 [공식 패키지 정보](https://registry.npmjs.org/@supabase/supabase-js/latest)에서 확인할 수 있습니다.

### 실습 폴더 열기

이미 강사의 7주차 수정본을 받았다면 그 폴더를 사용합니다. [강의 저장소](https://github.com/ajou-hyunseok-oh/pwd-week7)는 비공개이므로 GitHub 접근 권한이 있는 학생만 `Code → Download ZIP`이나 아래 clone을 사용할 수 있습니다. 접근 권한이 없다면 강사가 별도로 제공한 7주차 실습 ZIP을 내려받아 압축을 풉니다. Git을 사용하는 학생은 작업할 상위 폴더의 터미널에서 다음 명령으로 복제할 수 있습니다. 기존 pwd-week7 폴더가 있다면 같은 위치에 다시 복제하지 않습니다.

```sh
git clone https://github.com/ajou-hyunseok-oh/pwd-week7.git
```

1. VS Code의 `File → Open Folder`(파일 → 폴더 열기)로 내려받은 폴더를 엽니다. ZIP이면 이름이 `pwd-week7-main`일 수도 있습니다.
2. 탐색기 맨 위에 README.md와 package.json, server.ts가 있는지 확인합니다. 폴더 안에 같은 이름의 폴더가 한 번 더 들어 있다면 안쪽 폴더를 엽니다.
3. `Terminal → New Terminal`(터미널 → 새 터미널)을 누릅니다. [VS Code 터미널 안내](https://code.visualstudio.com/docs/terminal/getting-started)
4. 다음 명령을 **한 줄씩** 실행합니다. 아래 명령 앞에 `$`, `>` 같은 프롬프트 문자를 추가하지 않습니다.

```sh
node --version
npm --version
node -p "require('./package.json').name"
```

세 번째 결과가 `pwd-week7`이고 `src/config/supabase.ts`가 있어야 이번 실습용 코드입니다. `pwd-week5`가 나오거나 server.js와 Mongoose 코드만 있으면 예전 자료입니다. 강사가 배포한 Supabase 수정본을 다시 받습니다. `Cannot find module './package.json'`은 현재 터미널 위치가 잘못된 경우이므로 위 폴더 열기 절차를 확인합니다.

### 패키지 설치

```sh
npm ci --include=dev
```

성공하면 node_modules 폴더가 생기고 터미널의 입력 프롬프트가 다시 나타납니다. 이 명령은 lockfile의 버전으로 TypeScript와 테스트 도구까지 설치합니다. VS Code에서 폴더를 연 뒤에는 `cd pwd-week7`을 다시 입력하지 않아도 됩니다. [npm ci와 개발 의존성 설치](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

macOS·Linux에서는 아래의 `curl` 명령을 그대로 실행합니다. **Windows PowerShell에서는 `curl`을 `curl.exe`로 바꿉니다.** 요청 JSON은 제공된 파일로 보내므로 셸마다 달라지는 JSON 따옴표 처리가 필요 없습니다.

PowerShell에서 `npm.ps1을 실행할 수 없습니다`가 나오면 이 문서의 `npm` 대신 `npm.cmd`를 사용합니다. 예: `npm.cmd ci --include=dev`, `npm.cmd run dev`. 실행 정책을 바꾸지 않고 진행할 수 있습니다.

## 1. Supabase 개발자 계정 가입

1. [Supabase 가입 화면](https://supabase.com/dashboard/sign-up)을 엽니다.
2. GitHub 계정을 사용한다면 `Continue with GitHub`를 누릅니다.
3. GitHub 로그인이 필요하면 로그인하고 Supabase 연동 권한을 확인합니다.
4. Supabase 대시보드로 돌아오는지 확인합니다.

이메일로 가입하려면 같은 화면의 `Email`, `Password`를 입력하고 `Sign up`을 누릅니다. 확인 메일이 도착하면 인증 링크를 열고 로그인합니다. 현재 가입 화면에는 `Continue with ChatGPT`도 있으나, 이번 실습은 GitHub 또는 이메일 가입으로 진행하면 됩니다.

이미 가입했다면 `Sign in`으로 로그인합니다. 이메일 확인이 필요한 상태라면 받은편지함과 스팸함의 가입 확인 메일을 먼저 확인합니다.

여기서 만드는 것은 Supabase를 관리하는 **개발자 계정**입니다. 프로젝트 안의 `Authentication` 메뉴는 나중에 Foodmap 서비스 사용자 로그인을 만들 때 쓰는 기능입니다.

**확인:** 프로젝트 목록 또는 Organization 생성 화면에 도착했습니다.

## 2. Organization 생성 또는 선택

Organization은 프로젝트와 요금제를 묶어 관리하는 공간입니다. 개인 실습도 Organization 안에 프로젝트를 만듭니다.

1. 처음 가입해 생성 화면이 나오면 다음 값을 입력합니다.
2. `Create organization`을 누릅니다.
3. 이미 개인 Organization이 있다면 해당 항목을 선택합니다.

| 항목 | 실습 입력값 |
|---|---|
| Name | `ajou-pwd` 등 본인이 구분할 이름 |
| Type | `Personal` |
| Plan | `Free` |

[Organization 항목의 공식 화면 소스](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/Organization/NewOrg/OrganizationDetailsFields.tsx)

현재 Free 안내는 DB 용량 500MB, 활성 무료 프로젝트 2개 제한, 1주일 비활성 후 일시 중지입니다. 이 수업은 Free 범위에서 진행합니다. 이미 무료 프로젝트 한도를 사용했다면 기존 프로젝트 상태를 먼저 확인합니다. [현재 요금제](https://supabase.com/pricing)

## 3. Supabase 프로젝트 생성

1. 프로젝트 목록에서 `New project`를 누릅니다.
2. 다음 항목을 설정합니다.

| 항목 | 설정 |
|---|---|
| Organization | 앞에서 선택한 개인 Organization |
| Project name | `ajou-foodmap-week7` |
| Database password | 직접 생성한 충분히 긴 비밀번호를 안전하게 보관 |
| Region | 가능하면 `Northeast Asia (Seoul)` |
| 요금/컴퓨트 선택 항목 | Free 실습 범위 유지 |

서울 리전 코드명은 `ap-northeast-2`입니다. 선택할 수 없다면 도쿄 등 가까운 제공 리전을 선택합니다. General region만 보이면 Specific region 선택 항목도 확인합니다. [지원 리전](https://supabase.com/docs/guides/platform/regions)

현재 생성 화면의 `Security` 옵션은 다음처럼 설정합니다.

| 옵션 | 실습 설정 | 이유 |
|---|---|---|
| Enable Data API | 켜기 | supabase-js의 테이블 요청에 필요 |
| Automatically expose new tables | 끄기 | 필요한 역할의 접근 권한을 SQL에서 명시 |
| Enable automatic RLS | 켜기 | 새 테이블의 행 수준 보안 자동 적용 |

일부 화면에서 옵션이 보이지 않아도 이후 schema.sql이 RLS와 권한을 명시적으로 설정합니다. **Data API는 활성화되어 있어야 합니다.** [현재 Security 옵션](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/ProjectCreation/SecurityOptions.tsx)

3. `Create new project`를 누릅니다.
4. 프로젝트 준비가 끝날 때까지 기다립니다. 생성 중에는 쿼리를 실행하지 않습니다.

Supabase 프로젝트에는 PostgreSQL 데이터베이스가 함께 생성됩니다. 아래에서는 그 DB 안에 테이블을 만듭니다. 프로젝트 이름을 DB_NAME으로 다시 설정하거나 `CREATE DATABASE`를 실행하는 단계는 필요 없습니다. [프로젝트 구성](https://supabase.com/docs/guides/platform)

**확인:** 새 프로젝트의 관리 화면이 열리고 SQL Editor를 사용할 수 있습니다.

## 4. SQL Editor에서 테이블과 접근 권한 생성

이번 단계는 **새 실습 프로젝트**를 기준으로 합니다. 이론 예제나 다른 앱에서 이미 `restaurants`/`submissions`를 만든 프로젝트와 섞지 않습니다.

1. 상단 프로젝트 이름이 방금 만든 `ajou-foodmap-week7`인지 확인하고 왼쪽의 `SQL Editor`를 엽니다.
2. 새 쿼리를 만듭니다. 실행 역할 선택 항목이 보이면 기본 관리자 역할인 `postgres`를 사용합니다. 테이블을 만드는 단계에서 `anon`이나 `authenticated`로 바꾸지 않습니다.
3. VS Code에서 [supabase/schema.sql](supabase/schema.sql)을 엽니다.
4. 파일의 **전체 내용**을 복사해 SQL Editor에 붙입니다.
5. `Run`을 누릅니다. 일부 SQL만 선택해 실행하지 않도록 선택 영역을 해제합니다.
6. 오류 없이 완료되었는지 확인합니다. 테이블 생성 SQL은 조회 결과 행이 없어도 정상입니다. 빨간 오류 문구가 없어야 합니다.

schema.sql은 다음 항목을 하나의 트랜잭션으로 생성합니다.

| 항목 | 역할 |
|---|---|
| public.restaurants | 맛집 정보와 자동 생성 id |
| public.submissions | 제보 정보와 pending/approved/rejected 상태 |
| NOT NULL / CHECK | 필수 값, 평점 범위, 제보 상태 제한 |
| restaurants.submission_id | 승인된 제보와 맛집 연결. UNIQUE로 제보당 최대 1개 연결 |
| updated_at 트리거 | 수정 시각을 DB에서 갱신 |
| approve_submission 함수 | 제보 승인과 맛집 생성을 한 번에 처리 |
| RLS와 GRANT | 서버 역할의 접근을 허용하고 공개 역할의 직접 접근 제한 |

ID는 PostgreSQL의 identity가 자동 생성합니다. 서버에서 최대 ID에 1을 더하는 방식은 사용하지 않습니다. 추천 메뉴는 `text[]`, 시각은 `timestamptz`로 저장합니다.

SQL로 만든 테이블에도 RLS를 명시적으로 켭니다. 이번 구조는 Express 서버에서 Secret key를 사용하므로 `anon`/`authenticated`의 직접 테이블 권한과 함수 실행 권한을 회수합니다. 공개 읽기 정책이나 공개 쓰기 정책을 별도로 추가하지 않습니다. [테이블과 RLS](https://supabase.com/docs/guides/database/tables), [GRANT와 RLS의 차이](https://supabase.com/docs/guides/api/securing-your-api)

테이블 생성 여부는 새 쿼리에서 확인합니다.

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('restaurants', 'submissions')
order by table_name;
```

**확인:** `restaurants`, `submissions` 두 행이 나옵니다. Table Editor에서도 `public` 스키마의 두 테이블이 보입니다. 아직 데이터가 없는 것은 정상입니다.

승인 함수도 설치되었는지 새 쿼리에서 확인합니다.

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'approve_submission';
```

`approve_submission` 한 행이 나오면 됩니다. Table Editor에 RLS 정책이 없다는 안내가 보여도 이번 구조에서는 정상입니다. 테이블은 RLS를 켠 상태로 두고, Express 서버가 Secret key로 접근합니다.

schema.sql은 최초 구축용입니다. `relation already exists`는 전체 설치 성공을 뜻하지 않습니다. 예전 이론 예제의 테이블과 충돌했다면 새 실습 프로젝트에서 진행하고, 이미 이번 SQL을 성공시킨 프로젝트라면 테이블과 승인 함수를 확인한 뒤 넘어갑니다. 기존 데이터를 지우기 위해 테이블을 임의로 삭제하지 않습니다.

## 5. 지난주 맛집 3건을 DB에 입력

1. SQL Editor에서 새 쿼리를 만듭니다.
2. [supabase/seed.sql](supabase/seed.sql)의 전체 내용을 복사합니다.
3. 붙여 넣고 `Run`을 누릅니다.
4. 다음 SELECT를 별도로 실행합니다.

```sql
select id, name, category, rating, recommended_menu
from public.restaurants
order by id;
```

새 테이블에서는 `송림식당`, `별미떡볶이`, `SOGO` 3건이 조회됩니다. `submissions`는 비어 있습니다. Table Editor에서 restaurants를 선택해 같은 내용을 확인합니다. 목록이 갱신되지 않았다면 새로 고칩니다.

seed.sql은 restaurants가 **비어 있을 때만** 입력합니다. 재실행해도 기존 행을 삭제하거나 덮어쓰지 않습니다. 서버 시작 때 자동 시딩하지 않으므로 실습 중 삭제한 데이터를 서버가 임의로 되살리지 않습니다.

원본 초기 데이터는 [src/data/restaurants.json](src/data/restaurants.json)입니다. 원본을 수정해 SQL을 재생성할 때만 다음 명령을 실행합니다.

```sh
npm run seed:generate
```

이 명령은 로컬 seed.sql 파일을 생성합니다. 원격 DB에 접속하지 않습니다. 원본 JSON의 id를 제외해 기존 ID와 identity 시퀀스가 충돌하지 않게 합니다.

## 6. 프로젝트 URL과 Secret key 확인

연결값 3종류를 구분합니다.

| 값 | 확인 위치 | 사용처 |
|---|---|---|
| Database password | 프로젝트 생성 시 직접 설정 | pg/psql 등 PostgreSQL 직접 연결 도구 |
| 프로젝트 기본 URL | 프로젝트 상단 Connect → 앱 연결 예제의 Project URL | Express의 SUPABASE_URL |
| Secret key | Settings → API Keys → Secret keys | Express의 SUPABASE_SECRET_KEY |

### 프로젝트 URL

프로젝트 상단의 **Connect**를 열고 앱 연결 예제에 표시되는 **Project URL**을 복사합니다. 다음과 같이 경로가 없는 기본 URL입니다. [Connect에서 URL 확인](https://supabase.com/docs/guides/getting-started/api-keys#find-your-keys)

```text
https://프로젝트식별자.supabase.co
```

`.env`에는 이 기본 URL을 넣습니다. **Integrations → Data API**에 표시되는 Data API URL에는 `/rest/v1/`이 포함될 수 있습니다. 그 주소를 복사했다면 끝의 `/rest/v1/`을 제거하고 `https://프로젝트식별자.supabase.co`까지만 사용합니다. `postgresql://`로 시작하는 PostgreSQL 직접 연결 문자열이나 테이블 이름, DB 비밀번호도 넣지 않습니다. [REST API 주소와 프로젝트 URL](https://supabase.com/docs/guides/api/creating-routes)

**Integrations → Data API**에서는 Data API가 활성화되어 있고 `public` 스키마를 사용할 수 있는지도 확인합니다. [Data API 설정](https://supabase.com/docs/guides/api)

### 서버용 Secret key

**Settings → API Keys**를 엽니다. 예전 자료의 `Settings → API` 대신 현재는 API Keys 메뉴를 사용합니다.

1. 탭이 나뉘어 있다면 `Publishable and secret API keys`를 선택합니다.
2. `Create new API keys`만 보이는 기존 프로젝트라면 해당 버튼으로 새 방식의 키를 먼저 만듭니다. `default`라는 이름의 키가 생길 수 있습니다. [기존 프로젝트의 키 생성 경로](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
3. `Secret keys`에서 사용할 키를 확인합니다. 기존 Secret key가 있으면 그대로 사용할 수 있습니다.
4. 별도로 만들려면 `New secret key`를 누릅니다.
5. 이름은 `week7_server`처럼 소문자·숫자·밑줄로 입력하고 `Create API key`를 누릅니다.
6. 키 값이 가려져 있으면 표시·복사 버튼으로 **실제 값**을 복사합니다. 이름인 `default`/`week7_server`나 가려진 점 문자를 복사하지 않습니다.
7. 복사한 값의 시작이 `sb_secret_`인지 확인합니다.

[Secret key 생성 화면](https://github.com/supabase/supabase/blob/master/apps/studio/components/interfaces/APIKeys/CreateSecretAPIKeyDialog.tsx)

`sb_publishable_` 키는 공개 클라이언트용이고, `sb_secret_` 키는 서버용입니다. 이전 `anon`/`service_role` JWT 키를 새 실습 설정에 혼용하지 않습니다. Secret key는 RLS를 우회하므로 서버 밖으로 전달하지 않습니다. [공식 API 키 설명](https://supabase.com/docs/guides/getting-started/api-keys)

## 7. 서버 환경변수 설정

VS Code에서 `.env.example`을 복사해 **서버 루트의 `.env`**로 저장합니다. 위치는 다음과 같습니다.

```text
pwd-week7/
  .env             ← 실제 값. Git에 올리지 않음
  .env.example     ← 항목 예시. Git에 포함
  package.json
  server.ts
  src/
```

처음 설정할 때는 서버 폴더의 터미널에서 파일을 복사합니다. 이미 .env에 실제 값을 입력했다면 다시 덮어쓰지 않습니다.

macOS/Linux:

```sh
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

VS Code 탐색기에서 새 .env를 열고 수정합니다. 이름은 정확히 `.env`여야 합니다. `.env.txt`나 `.env.local`로 저장하면 이 서버가 자동으로 읽지 않습니다.

먼저 별도 관리자 키를 생성합니다.

```sh
npm run key:generate
```

출력 중 **64자리 영문·숫자로 된 난수 한 줄만** 복사합니다. npm 명령 안내나 `>` 문자는 제외합니다. 이 값은 **Express 관리 API용 ADMIN_API_KEY**입니다. Supabase 키와 다른 값으로 설정합니다.

`.env`의 값을 채웁니다.

```env
PORT=3000
HOST=127.0.0.1
NODE_ENV=development
SUPABASE_URL=https://본인프로젝트식별자.supabase.co
SUPABASE_SECRET_KEY=sb_secret_본인의실제서버키
ADMIN_API_KEY=앞에서생성한난수문자열
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

- 예시 문자열을 그대로 두지 말고 실제 값으로 바꿉니다.
- 저장 단축키 Ctrl+S(macOS는 Cmd+S)를 누릅니다. 키를 복사했다는 것만으로 .env 파일이 저장되지는 않습니다.
- ADMIN_API_KEY는 32자 이상이며 Supabase Secret key를 재사용할 수 없습니다.
- CORS_ORIGINS는 React 개발 서버의 출처입니다. 여러 주소는 쉼표로 구분합니다. 끝에 경로나 `/`를 붙이지 않습니다.
- `.env`를 수정하면 개발 서버를 다시 시작합니다.
- Supabase Secret key와 관리자 키 모두 React의 `VITE_` 변수나 GitHub에 넣지 않습니다.

Git으로 복제한 폴더라면 `.gitignore`가 `.env`를 제외하는지 확인할 수 있습니다.

```sh
git check-ignore .env
```

**확인:** `.env` 경로가 출력됩니다. 출력되지 않으면 Git에 추가하기 전에 제외 규칙을 확인합니다.

ZIP으로 받아 Git 저장소를 아직 만들지 않았다면 이 명령은 생략합니다. 이후 GitHub에 올릴 때도 제공된 .gitignore의 `.env`, `.env.*` 제외 규칙을 유지합니다.

## 8. Express를 실행하기 전에 DB 연결 확인

```sh
npm run db:check
```

성공 메시지는 다음과 같습니다.

```text
[Supabase] restaurants / submissions 연결 확인 성공
```

이 명령은 URL과 키만 읽는 것이 아니라 **두 테이블의 실제 열을 조회**합니다. 테이블이 비어 있어도 연결 확인은 성공할 수 있습니다. 승인 함수는 schema.sql을 전체 실행할 때 함께 설치됩니다.

실패하면 서버를 실행하기 전에 아래 순서로 확인합니다.

1. .env의 두 연결값이 같은 Supabase 프로젝트에 속하는가?
2. Secret key가 `sb_secret_`로 시작하는가?
3. Data API가 켜져 있는가?
4. schema.sql 전체가 성공했는가?
5. public 스키마에 두 테이블과 필요한 열이 있는가?

## 9. 빌드와 개발 서버 실행

```sh
npm run typecheck
npm test
npm run build
npm run dev
```

각 명령의 목적은 다음과 같습니다.

| 명령 | 목적 |
|---|---|
| npm run typecheck | 서버·스크립트·테스트의 TypeScript 검사 |
| npm test | 실제 클라우드 DB 없이 HTTP·SDK·SQL 동작 검사 |
| npm run build | 서버를 dist 폴더의 JavaScript로 컴파일 |
| npm run dev | TypeScript 개발 서버 실행 |
| npm start | 빌드 결과로 서버 실행. 사전에 build 필요 |

서버는 환경변수와 관리자 키를 검증하고 실제 DB 조회가 성공한 뒤 요청을 받기 시작합니다.

```text
[Supabase] restaurants / submissions 연결 확인 성공
Server listening at http://127.0.0.1:3000
```

이 터미널을 **터미널 A(서버 실행용)**로 둡니다. 실행 중에 입력 프롬프트가 돌아오지 않는 것은 정상입니다. 종료는 터미널 A에서 Ctrl+C입니다.

VS Code의 `Terminal → New Terminal` 또는 터미널의 `+`로 **터미널 B(요청 확인용)**를 엽니다. 터미널 B에서도 다음 명령의 결과가 pwd-week7인지 확인합니다.

```sh
node -p "require('./package.json').name"
```

10~13단계의 curl 명령은 터미널 B에서 실행합니다. 터미널 A는 HTTP 요청에 응답할 수 있도록 켜 둡니다. 포트를 변경했다면 아래 URL의 `3000`도 본인 포트로 바꿉니다.

## 10. 서버와 DB 상태 확인

브라우저에서 [서버 상태](http://127.0.0.1:3000/health)를 엽니다.

```json
{ "status": "ok" }
```

/health는 Express 상태만 확인합니다. 실제 DB 상태를 확인하는 /health/db는 관리자 토큰이 필요합니다. 다음 명령의 `YOUR_ADMIN_API_KEY` 부분을 **본인의 ADMIN_API_KEY**로 바꿉니다. SUPABASE_SECRET_KEY를 넣지 않습니다.

이후 직접 바꿀 표기는 세 가지입니다. 표시 이름을 그대로 서버에 보내지 않습니다.

| 표기 | 바꿀 값 |
|---|---|
| YOUR_ADMIN_API_KEY | 7단계에서 만든 .env의 ADMIN_API_KEY 값. 변수명이나 `=`는 제외 |
| RESTAURANT_ID | 11단계 맛집 등록 응답의 data.id 숫자 |
| SUBMISSION_ID | 13단계 제보 등록 응답의 data.id 숫자 |

모든 curl 명령은 한 줄 전체를 실행합니다. 헤더의 `Bearer ` 뒤 공백 한 칸은 유지합니다. Windows PowerShell은 `curl.exe`를 사용합니다.

```sh
curl -i "http://127.0.0.1:3000/health/db" -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

정상 결과는 HTTP 200과 다음 JSON입니다.

```json
{ "status": "ok", "db": "supabase" }
```

브라우저 주소창에서 /health/db만 열면 Bearer 헤더가 없어 401이 나오는 것이 정상입니다. 일반 조회는 [맛집 목록](http://127.0.0.1:3000/api/restaurants)에서 확인합니다.

## 11. 맛집 조회·등록·수정

### 목록과 인기 맛집 조회

```sh
curl -i "http://127.0.0.1:3000/api/restaurants"
curl -i "http://127.0.0.1:3000/api/restaurants/popular?limit=2"
```

목록은 `{ "data": [...] }` 형태입니다. DB 열은 price_range/recommended_menu지만 API 응답은 지난주와 같은 priceRange/recommendedMenu를 사용합니다. 인기 목록은 rating 내림차순이며 동점이면 id 오름차순입니다. limit은 1~100 정수입니다.

### 새 맛집 등록

제공된 [등록 본문](examples/restaurant.create.json)을 확인한 뒤 실행합니다.

```sh
curl -i -X POST "http://127.0.0.1:3000/api/restaurants" -H "Authorization: Bearer YOUR_ADMIN_API_KEY" -H "Content-Type: application/json" --data-binary "@examples/restaurant.create.json"
```

정상 결과는 **HTTP 201 Created**입니다. 응답의 `data.id`를 적어 둡니다. 예를 들어 id가 4일 수 있지만, 삭제·실패·기존 데이터에 따라 달라지므로 **반드시 응답에 나온 번호를 사용**합니다. 아래 `RESTAURANT_ID`를 그 번호로 바꿉니다.

예를 들어 응답에 `"id": 4`가 있으면 상세 URL은 `http://127.0.0.1:3000/api/restaurants/4`입니다. 등록 명령을 다시 실행하면 새 맛집이 한 건 더 생성되므로, 응답을 확인하려고 POST를 반복하지 않습니다.

```sh
curl -i "http://127.0.0.1:3000/api/restaurants/RESTAURANT_ID"
```

Supabase **Table Editor → public → restaurants**에서도 새 맛집 행이 보이는지 확인합니다. id는 요청 본문에 넣지 않습니다.

### 일부 필드 수정

```sh
curl -i -X PUT "http://127.0.0.1:3000/api/restaurants/RESTAURANT_ID" -H "Authorization: Bearer YOUR_ADMIN_API_KEY" -H "Content-Type: application/json" --data-binary "@examples/restaurant.update.json"
```

HTTP 200과 수정된 데이터가 반환됩니다. 이 API의 PUT은 전달한 필드만 변경하는 방식입니다. 예제는 rating/description만 수정하므로 기존 메뉴는 유지됩니다.

상세 GET 명령을 다시 실행해 rating이 4.9이고 recommendedMenu가 그대로인지 확인합니다. 이 맛집은 다음 재시작 실습에 필요하므로 유지합니다.

## 12. 서버 재시작 후 데이터 유지 확인과 삭제

1. 11단계에서 등록한 맛집이 목록과 Table Editor에 있는지 확인합니다.
2. 터미널 A에서 Ctrl+C를 누릅니다. tsx watch 프로세스도 끝나 입력 프롬프트가 돌아오는지 확인합니다. 새로 고침한 브라우저에서 연결이 끊기는 것도 정상입니다.
3. 같은 터미널 A에서 `npm run dev`로 다시 실행하고 DB 연결 성공·서버 시작 메시지를 기다립니다.
4. 터미널 B에서 앞의 상세 GET을 다시 실행하거나 브라우저에서 목록을 엽니다.
5. 등록한 맛집이 남아 있고 수정한 rating 4.9도 유지되는지 확인합니다.

6주차 메모리 배열은 새 프로세스에서 초기 데이터로 돌아갔습니다. 7주차 서버는 매 요청마다 Supabase에 접근하므로 새 프로세스에서도 저장된 데이터를 읽습니다. 서버 시작 시 JSON을 다시 넣거나 DB를 초기화하지 않습니다.

**확인:** 서버 재시작 이후에도 등록·수정 결과가 유지됩니다. 이 단계가 DB 연결 실습의 핵심 완료 기준입니다.

### 영구 저장을 확인한 뒤 실습 맛집 삭제

**11단계에서 본인이 만든 맛집의 ID**로 실행합니다. 초기 맛집이나 다른 학생의 데이터를 대상으로 실행하지 않습니다.

```sh
curl -i -X DELETE "http://127.0.0.1:3000/api/restaurants/RESTAURANT_ID" -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

HTTP 204 No Content가 정상입니다. 응답 본문이 없는 것도 정상입니다. 이어서 같은 ID를 조회합니다.

```sh
curl -i "http://127.0.0.1:3000/api/restaurants/RESTAURANT_ID"
```

HTTP 404와 `Restaurant not found`가 반환되고 Table Editor에서도 해당 행이 사라지면 삭제 실습까지 완료입니다.

## 13. 제보 등록과 승인 흐름 확인

### 제보 등록 — 관리자 토큰 없이 실행

```sh
curl -i -X POST "http://127.0.0.1:3000/api/submissions" -H "Content-Type: application/json" --data-binary "@examples/submission.create.json"
```

HTTP 201과 새 제보가 반환됩니다. status는 항상 pending으로 시작합니다. 요청에 id나 status를 넣어도 서버가 등록 필드로 사용하지 않습니다. 응답의 **data.id**를 기록하고 아래 `SUBMISSION_ID`에 사용합니다.

### 대기 중 제보 조회 — 관리자 요청

```sh
curl -i "http://127.0.0.1:3000/api/submissions?status=pending" -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

제보에는 이름·이메일이 포함될 수 있어 목록과 상세 조회도 관리자 요청으로 제한합니다.

### 승인 — status만 전달

```sh
curl -i -X PUT "http://127.0.0.1:3000/api/submissions/SUBMISSION_ID" -H "Authorization: Bearer YOUR_ADMIN_API_KEY" -H "Content-Type: application/json" --data-binary "@examples/submission.approve.json"
```

정상 결과는 HTTP 200이고 제보 status가 approved로 바뀝니다. 이어서 맛집 목록을 조회합니다.

```sh
curl -i "http://127.0.0.1:3000/api/restaurants"
```

새 맛집의 name이 `제보 실습 식당`이며 submissionId가 승인한 제보 ID와 같은지 확인합니다. Table Editor에서는 restaurants.submission_id와 submissions.status를 확인합니다.

그다음 **같은 승인 PUT 명령을 한 번 더** 실행합니다. 다시 200과 approved가 나오되, 목록이나 Table Editor에서 해당 submissionId에 연결된 맛집이 한 건만 있어야 합니다. 제보 POST를 다시 실행하는 것과 구분합니다.

승인은 PostgreSQL의 `approve_submission` 함수를 호출합니다. 함수가 제보 행을 잠그고 **맛집 생성과 제보 상태 변경을 같은 트랜잭션**으로 처리합니다. 중간에 실패하면 모두 롤백됩니다. 같은 승인 요청을 다시 보내도 맛집을 추가 생성하지 않습니다.

### 상태 변경 규칙

| 현재 상태/요청 | 결과 |
|---|---|
| pending → approved | 맛집을 생성하고 제보 승인 |
| approved → approved 재요청 | 기존 승인 제보 반환. 중복 맛집 생성 없음 |
| pending → rejected | 상태만 변경 |
| rejected → approved | 409. 다시 검토하려면 먼저 pending으로 변경 |
| approved 제보의 내용·상태 수정 | 409. 생성된 맛집은 맛집 API에서 수정 |
| 내용 수정과 status=approved를 한 요청에 전달 | 400. 내용을 먼저 수정한 뒤 별도 승인 요청 |
| 제보 삭제 | 제보 삭제. 이미 생성된 맛집은 유지하고 submissionId만 null |

pending/rejected 변경도 같은 PUT 경로에 `{ "status": "pending" }` 또는 `{ "status": "rejected" }`를 보냅니다. 요청 도구에서 JSON 본문으로 전달하거나 해당 내용의 JSON 파일을 만들어 `--data-binary`로 보낼 수 있습니다.

### 선택: .http 요청 템플릿 사용

[requests/foodmap.http](requests/foodmap.http)는 .http 실행 확장이 있는 학생을 위한 보조 자료입니다. 확장이 없어도 위 curl 명령으로 필수 실습을 모두 진행할 수 있습니다.

VS Code에서 템플릿을 `requests/foodmap.local.http`로 복사하고 파일 상단의 adminKey를 채웁니다. 맛집/제보 등록 뒤에는 응답 id로 restaurantId/submissionId를 채웁니다. 표시 이름을 그대로 실행하면 400 또는 401이 나옵니다. 재시작 안내가 있는 지점에서는 요청 실행을 멈추고 터미널 A를 재시작합니다. `.local.http` 사본은 Git에서 제외됩니다.

## 14. API 레퍼런스와 입력 규칙

응답은 조회·등록·수정 시 `{ "data": ... }`, 오류 시 `{ "error": { "message": "..." } }` 형식입니다. 삭제 성공은 204이며 본문이 없습니다.

| Method | 경로 | 권한 | 성공 상태 |
|---|---|---|---|
| GET | /health | 공개 | 200 |
| GET | /health/db | 관리자 | 200 |
| GET | /api/restaurants | 공개 | 200 |
| GET | /api/restaurants/popular?limit=5 | 공개 | 200 |
| GET | /api/restaurants/:id | 공개 | 200 |
| POST | /api/restaurants | 관리자 | 201 |
| PUT | /api/restaurants/:id | 관리자 | 200 |
| DELETE | /api/restaurants/:id | 관리자 | 204 |
| POST | /api/submissions | 공개 | 201 |
| GET | /api/submissions?status=pending | 관리자 | 200 |
| GET | /api/submissions/:id | 관리자 | 200 |
| PUT | /api/submissions/:id | 관리자 | 200 |
| DELETE | /api/submissions/:id | 관리자 | 204 |

| 입력 | 규칙 |
|---|---|
| 맛집 name/category/location | 비어 있지 않은 문자열, 필수 |
| 제보 restaurantName/category/location | 비어 있지 않은 문자열, 필수 |
| rating | 0~5 숫자 또는 숫자 문자열. 생략 시 DB 기본값 0 |
| recommendedMenu | 문자열 배열 또는 쉼표로 구분한 문자열. null은 빈 배열 |
| id | 1~2147483647 정수 |
| popular의 limit | 1~100 정수. 생략 시 5 |
| status | pending / approved / rejected |
| submitterEmail | 선택값. 입력할 경우 이메일 형식 |
| PUT | 지정한 수정 가능 필드만 변경. 빈 수정 요청은 400 |

추가 필드 id/likes/submissionId/createdAt 등은 등록·수정 입력으로 사용하지 않습니다. 없는 행은 404, 잘못된 입력은 400, 상태 충돌은 409, 관리자 토큰 누락/불일치는 401, DB 요청 실패는 503입니다.

메뉴 문자열과 배열의 각 항목은 앞뒤 공백과 빈 항목을 제거합니다. 배열에 문자열이 아닌 값이 섞여 있으면 해당 값은 제외합니다. 입력에는 문자열 배열을 사용합니다.

6주차의 /sync-demo와 /reset-demo는 이번 서버에서 제공하지 않습니다. DB 실습 중 전체 데이터를 HTTP로 초기화하는 기능도 제공하지 않습니다.

## 7주차 코드 읽기: 서버에 추가된 작업

앞 단계에서 DB와 서버를 실행했다면, 이제 VS Code에서 **7주차 폴더**의 다음 파일을 차례로 열어 보세요. 코드는 이미 준비되어 있으므로 직접 다시 입력하지 않아도 됩니다.

### 1. 테이블과 데이터의 형태 정하기

[supabase/schema.sql](supabase/schema.sql)에서 `submissions`와 `restaurants` 테이블을 만듭니다. `id`는 PostgreSQL이 자동 생성하고, 각 필수 열에는 `not null`을 적용합니다. `restaurants.submission_id`는 승인된 제보와 맛집을 연결합니다. 직접 등록한 맛집에는 제보가 없을 수 있습니다.

[supabase/seed.sql](supabase/seed.sql)은 테이블이 비어 있을 때 지난주 맛집 3건을 넣습니다. 서버를 실행할 때마다 DB를 초기화하지 않으므로 이후 추가한 데이터가 유지됩니다.

### 2. Express에서 Supabase 클라이언트 만들기

[src/config/supabase.ts](src/config/supabase.ts)의 `getSupabase()`는 7주차 서버 `.env`에서 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`를 읽어 클라이언트를 만듭니다. 6주차의 메모리 배열 대신 이 클라이언트가 Supabase Data API에 요청을 보냅니다.

```ts
client = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
```

같은 파일의 `checkDatabase()`는 두 테이블을 실제로 조회합니다. [server.ts](server.ts)는 이 조회가 성공한 다음 Express를 시작합니다. 따라서 `/health`는 서버 상태, 관리자 요청인 `/health/db`는 DB 조회 상태를 보여줍니다.

### 3. 맛집 서비스의 저장 방법 바꾸기

[src/services/restaurants.service.ts](src/services/restaurants.service.ts)에서 `getAllRestaurants()`를 찾아보세요. 6주차에서는 메모리의 `restaurantCache`를 복사했지만, 7주차에서는 매번 DB의 `restaurants`를 조회합니다.

```ts
const { data, error } = await getSupabase()
  .from('restaurants')
  .select('*')
  .order('id');
if (error) throwDatabaseError(error);
return (data ?? []).map((row) => new Restaurant(row));
```

같은 파일의 `createRestaurant()`은 입력을 검사한 뒤 `insert()`를 호출합니다. `id`를 직접 계산하지 않고, DB가 생성한 행을 받아 반환합니다. 수정과 삭제도 같은 서비스 파일에서 DB에 요청합니다.

### 4. 기존 React 응답 형태 유지하기

[src/models/restaurant.model.ts](src/models/restaurant.model.ts)는 DB의 `price_range`, `recommended_menu`를 기존 화면이 사용하는 `priceRange`, `recommendedMenu`로 바꿉니다. [맛집 라우트](src/routes/restaurants.routes.ts)와 컨트롤러는 지난주와 같은 `/api/restaurants` 경로 및 `{ data: ... }` 응답을 사용합니다.

관리자 등록·수정·삭제 라우트에는 `requireAdmin`을 추가했습니다. Supabase Secret key는 Express에만 두고, 관리자 요청은 별도의 `ADMIN_API_KEY`로 확인합니다.

### 5. 제보 승인을 한 번에 처리하기

[src/services/submissions.service.ts](src/services/submissions.service.ts)는 제보 등록·조회·상태 변경을 DB로 보냅니다. `status: 'approved'` 요청은 SQL의 `approve_submission` 함수를 호출합니다. 이 함수는 맛집을 만든 뒤 제보를 승인하며, 중간에 실패하면 두 작업을 함께 되돌립니다. 같은 제보를 다시 승인해도 맛집을 중복 생성하지 않습니다.

### 6. 기존 React 연결하기

[integration/client/src/services/api.ts](integration/client/src/services/api.ts)는 기존 React 화면이 호출하던 API 함수들을 Express HTTP 요청으로 연결합니다. `SubmissionsPage.tsx`의 승인 버튼은 맛집 생성 요청과 승인 요청을 각각 보내지 않고 승인 요청을 한 번만 보냅니다.

다음 15단계에서는 기존 5주차 React를 읽어 **7주차의 `client/`에 복사**하고 위 연동 파일을 적용합니다. 기존 주차 폴더에 직접 수정할 필요는 없습니다.

## 15. 기존 5~6주차 React 클라이언트를 7주차 서버에 연결

이 단계는 **실제 지난 실습 화면**에서 맛집 조회·제보·관리까지 확인합니다. 5주차 원본 React와 6주차 README의 API 모듈 적용본 모두 사용할 수 있습니다. `pwd-week6` 서버 폴더는 수정할 필요가 없습니다.

### 15-1. 기존 React를 7주차 폴더에 복사하고 연동

기존 5주차 React 폴더는 복사할 때 읽기만 합니다. 기존 6주차 서버 폴더도 수정하지 않습니다. React와 7주차 서버를 각각 실행할 수 있도록 7주차의 `client/`에 별도 사본을 만듭니다.

1. **7주차 서버 폴더의 터미널**에서 다음 명령을 실행합니다. `../pwd-week5`는 7주차 폴더와 5주차 React 폴더가 같은 상위 폴더에 있을 때의 예입니다.

```sh
node scripts/copy-client.mjs "../pwd-week5"
```

5주차 폴더가 다른 위치에 있다면 따옴표 안을 실제 **5주차 React 프로젝트 루트**의 절대 경로로 바꿉니다. 해당 폴더에 React의 package.json과 `src/services/api.ts`가 있어야 합니다. 예를 들어 Windows PowerShell에서는 `node scripts/copy-client.mjs "C:\Users\본인\Projects\pwd-week5"`처럼 입력합니다.

복사기는 기존 소스는 읽기만 하며 `.git`, `node_modules`, `dist`, `coverage`, `.env`로 시작하는 파일은 가져오지 않습니다. 기존 7주차 `client/`가 있으면 덮어쓰지 않고 중단합니다. 이미 이번 실습에서 만든 `client/`라면 복사를 다시 실행하지 말고 다음 설치 단계를 진행합니다. 원본 안에 심볼릭 링크가 있으면 경로를 확인하도록 중단합니다.

2. 같은 **7주차 서버 폴더의 터미널**에서 복사한 `client/`에 연동 파일을 적용합니다.

```sh
node scripts/install-client.mjs "./client"
```

설치기는 사본의 기존 파일을 7주차의 `.week7-backups/`에 백업하고 위치를 출력합니다. 출력된 경로를 기록해 두세요. 사본의 `src/services/api.ts`, `src/pages/AdminPage.tsx`, `src/pages/SubmissionsPage.tsx`, `src/components/SubmitRestaurant.tsx`를 교체하고 `src/components/AdminGate.tsx`를 추가합니다. 같은 파일을 다시 적용하면 변경 없이 종료합니다. 6주차 실습에서 사본에 가져온 `api.local.ts`가 있다면 삭제하지 않습니다.

3. 7주차 폴더 안에 `client/package.json`과 `client/src/components/AdminGate.tsx`가 생겼는지 확인합니다.

7주차 `client/`와 `.week7-backups/`는 제공된 .gitignore에서 제외합니다. 되돌릴 때는 출력된 백업의 각 파일을 `client/`의 같은 상대 경로로 복사합니다. 설치 전에 없었던 `client/src/components/AdminGate.tsx`는 삭제합니다. 설치 전 이미 해당 파일이 있었다면 백업에서 복구합니다. **원본 5·6주차 폴더를 편집할 필요는 없습니다.**

### 15-2. React 환경변수와 실행

VS Code에서 **7주차의 `client/` 폴더**를 별도 창으로 열고, 그 폴더의 package.json 옆 `.env.local`을 만듭니다. 이 파일은 기존 5주차의 환경변수 파일과 별개입니다. 이미 파일이 있다면 다른 설정은 두고 VITE_API_BASE_URL만 추가 또는 수정합니다.

```env
VITE_API_BASE_URL=http://127.0.0.1:3000
```

이 값은 7주차 Express 서버 주소입니다. `/api/restaurants`는 붙이지 않습니다. 이 파일에는 Supabase Secret key나 ADMIN_API_KEY를 넣지 않습니다. [Vite 환경변수](https://vite.dev/guide/env-and-mode)

7주차 `client/` 폴더의 새 터미널에서 다음을 실행합니다. 서버의 터미널 A는 `npm run dev`로 계속 켜 둡니다.

```sh
npm ci --include=dev
npm run build
npm run dev
```

Vite가 출력한 로컬 주소(보통 `http://localhost:5173`)를 엽니다. 기존 Vite 서버가 있었다면 반드시 재시작해 `.env.local`을 반영합니다. 포트가 5174 등으로 다르면 7주차 서버 `.env`의 CORS_ORIGINS에 해당 출처를 추가하고 서버를 재시작합니다. Windows PowerShell에서 npm.ps1 실행이 차단되면 앞에서 설명한 `npm.cmd`를 사용합니다.

### 15-3. 기존 화면에서 동작 확인

1. React의 `List`에서 5단계에서 Supabase에 입력한 맛집을 확인합니다. 12단계에서 지운 실습 맛집은 보이지 않아야 합니다.
2. `Submit New restaurant`에서 새로운 이름·카테고리·위치를 입력하고 제보합니다. 성공 화면이 표시되면 Supabase Table Editor의 submissions에서 `pending` 행을 확인합니다.
3. 브라우저에서 React 주소 뒤에 `/#/submissions`를 붙여 제보 관리 화면을 엽니다. 예: `http://localhost:5173/#/submissions`.
4. 관리자 키 입력 화면에 **7주차 서버 .env의 ADMIN_API_KEY**를 입력하고 `관리 화면 열기`를 누릅니다. Supabase Secret key를 입력하지 않습니다. 대기 목록에서 방금 제보한 식당을 찾아 `승인`합니다.
5. List로 돌아가 같은 식당이 한 건 등록되었는지 확인합니다. 제보 승인은 서버의 PUT 한 번으로 맛집 생성과 상태 변경을 함께 처리합니다.
6. `/#/admin`에서 맛집 등록·수정·삭제를 확인합니다. 같은 탭에서 이미 관리자 키를 입력했다면 관리 화면이 바로 열리고, 입력 화면이 나오면 키를 입력합니다. 테스트용으로 본인이 만든 식당만 삭제합니다. 키는 현재 탭 메모리에만 보관되며 새로고침 또는 `관리자 키 지우기`를 누르면 다시 입력해야 합니다. 잘못된 키는 관리자 요청 시 401로 확인하고 입력 화면으로 돌아갑니다.
7. React와 Express를 중지했다 다시 실행해도 승인된 맛집이 목록에 남는지 확인합니다.

목록·상세·인기 및 제보는 7주차 서버를 사용합니다. 관리자 키 입력은 **개인 컴퓨터의 로컬 수업 실습**용이며 빌드나 VITE_ 환경변수에 키를 저장하지 않습니다. 공개 배포에서는 사용자별 인증·권한과 HTTPS를 별도로 구현해야 합니다. CORS는 인증을 대신하지 않습니다.

기존 5주차의 맛집·제보 LocalStorage는 삭제하지 않지만 Supabase에 자동 이전하지 않습니다. DB에는 5단계의 초기 맛집과 이후 서버로 등록한 데이터가 표시됩니다. 기존 LocalStorage UUID 제보는 서버의 숫자 ID와 다르며 수동 데이터 이전이 필요합니다. 좋아요는 기존처럼 각 브라우저의 LocalStorage에 남습니다.

## 16. 선택 실습: Render 서버에 반영하는 경우

로컬 DB 연결과 영구 저장 확인을 먼저 마칩니다. 아직 7주차 Web Service가 없다면 Render에서 `New → Web Service`로 7주차 GitHub 저장소를 연결합니다. [Render Express 배포 절차](https://render.com/docs/deploy-node-express-app)

1. 수정한 7주차 코드와 package-lock.json을 GitHub에 반영합니다. .env는 올리지 않습니다.
2. Render에서 **7주차 저장소/배포 브랜치**를 사용하는 Web Service를 선택합니다. 6주차 서비스를 보존하려면 별도 서비스를 사용합니다.
3. 빌드 명령은 `npm ci --include=dev && npm run build`, 시작 명령은 `npm start`로 설정합니다. TypeScript 컴파일러는 개발 의존성이므로 빌드할 때 함께 설치해야 합니다. `NODE_ENV=production`에서 단순 npm ci만 사용하면 tsc가 빠질 수 있습니다. [npm의 개발 의존성 설치 옵션](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
4. 왼쪽 `Environment`의 `+ Add Environment Variable`에서 다음 값을 설정합니다.

| Key | Value |
|---|---|
| SUPABASE_URL | 본인 Supabase 프로젝트 기본 URL |
| SUPABASE_SECRET_KEY | 본인 서버용 Secret key |
| ADMIN_API_KEY | 별도로 생성한 관리자 키 |
| NODE_ENV | production |
| HOST | 0.0.0.0 |
| CORS_ORIGINS | 실제 배포한 React의 HTTPS 출처 |

Render가 제공하는 PORT를 서버가 읽습니다. 로컬 .env의 PORT=3000을 그대로 등록할 필요는 없습니다. Render 웹 서비스는 외부 요청 수신을 위해 `0.0.0.0`에 바인딩해야 합니다. [Render 포트 설정](https://render.com/docs/web-services#port-binding)

5. 환경변수 저장 시 `Save, rebuild, and deploy`를 선택합니다. Save only는 다음 배포 전까지 새 값을 적용하지 않습니다.
6. 배포 로그에서 DB 연결 성공과 서버 시작 메시지를 확인합니다.
7. 공개 주소의 /health와 /api/restaurants를 엽니다. /health/db는 로컬과 같이 관리자 헤더를 붙여 확인합니다.
8. 별도로 React까지 배포하려면 7주차 `client/` 사본을 새 프론트엔드 저장소에 올리고, 배포 환경의 VITE_API_BASE_URL을 실제 Render HTTPS 주소로 설정한 뒤 빌드합니다. `client/`는 7주차 서버 저장소에서 Git으로 추적하지 않으므로 서버 저장소만 배포해도 React가 함께 배포되지는 않습니다. React 배포는 선택 사항이며 로컬 확인은 15단계로 완료됩니다.

[현재 Render 환경변수 저장 절차](https://render.com/docs/configure-environment-variables)

15단계의 관리자 키 입력 UI는 로컬 수업용입니다. 공개 배포에서 공유 키를 Vite 환경변수나 소스에 넣지 않습니다. 사용자별 로그인·권한과 HTTPS, 공개 제보 요청의 남용 제한을 별도로 구현합니다.

## 17. 오류 해결

| 증상 | 확인/해결 |
|---|---|
| node/npm 명령을 찾을 수 없음 | Node.js 24.x LTS 설치 후 VS Code와 터미널을 다시 열기 |
| npm ci에서 엔진 버전 오류 | node --version으로 5주차 클라이언트가 요구하는 Node.js 24.x인지 확인 |
| PowerShell에서 npm.ps1 실행 차단 | npm 대신 npm.cmd 사용. 예: npm.cmd run dev |
| package.json을 찾을 수 없음 / ENOENT | README.md와 package.json이 있는 서버 루트를 VS Code에서 열고 새 터미널 생성 |
| tsc/tsx/jest 명령을 찾을 수 없음 | 서버 루트에서 npm ci --include=dev 실행. Render 빌드에도 --include=dev 사용 |
| .env 설정 또는 placeholder 오류 | .env가 루트에 있고 예시 값이 실제 값으로 바뀌었는지 확인 |
| .env를 작성했는데 반영되지 않음 | .env.txt/.env.local이 아닌지, 저장했는지 확인. 터미널 A에서 Ctrl+C 후 재실행 |
| 관리자 헤더를 넣었는데 401 | YOUR_ADMIN_API_KEY를 실제 관리자 키로 교체. Bearer 뒤 공백과 .env의 ADMIN_API_KEY 일치 확인 |
| ADMIN_API_KEY 설정 오류 | npm run key:generate 결과로 32자 이상 설정. Supabase 키 재사용 금지 |
| Invalid API key / 401 | SDK 요청이면 Supabase URL과 Secret key의 프로젝트 일치 확인. Express 관리 API면 Bearer 관리자 토큰 확인 |
| 브라우저 /health/db에서 401 | 정상적인 인증 요구. curl에 Authorization 헤더 추가 |
| permission denied / 42501 | schema.sql의 service_role 테이블·시퀀스·함수 GRANT 실행 여부 확인 |
| 테이블 또는 열을 못 찾음 | 다른 프로젝트에 연결했는지, schema.sql 전체 실행 여부, public 스키마 확인 |
| approve_submission 함수를 못 찾음 | schema.sql을 일부만 실행했는지 확인. 실행 오류와 함수 생성 여부 확인 |
| relation already exists | 전체 설치 성공을 뜻하지 않음. 4단계의 테이블·승인 함수 확인 또는 별도 새 실습 프로젝트 사용 |
| current transaction is aborted | rollback;을 별도 실행하고 첫 오류 원인을 확인. 기존 테이블 충돌이면 같은 SQL을 반복하기 전에 4단계 절차 확인 |
| curl이 examples JSON 파일을 읽지 못함 | 터미널 B도 서버 루트인지 확인. --data-binary의 @examples/... 경로를 유지 |
| id 정수 오류 / 400 | RESTAURANT_ID 또는 SUBMISSION_ID 표시를 등록 응답의 실제 숫자로 교체 |
| Data API 요청 실패 | Integrations → Data API에서 활성화와 public 스키마 확인 |
| 등록은 성공했는데 목록에 없음 | 같은 서버·프로젝트를 조회하는지, 서버 코드가 메모리 배열을 사용하고 있지 않은지 확인 |
| 재시작 확인 때 실습 맛집이 404 | 12단계의 저장 확인 전에 DELETE를 실행하지 않았는지 확인. 새로 등록한 ID로 다시 검증 |
| 승인 요청 409 | pending 제보인지 확인. approved는 재승인만 가능하며 rejected는 pending으로 돌린 뒤 승인 |
| 승인 요청 400 | 승인 본문에는 status만 전달. 다른 내용 수정은 별도 요청 |
| popular limit 오류 | 1~100 정수 사용. 소수·문자열·중복 쿼리 항목 확인 |
| 포트가 이미 사용 중 / EADDRINUSE | 기존 서버를 Ctrl+C로 종료하거나 PORT 변경 후 React 주소도 맞춤 |
| Render에서 포트 감지 실패 | HOST=0.0.0.0 및 제공된 PORT 사용 여부 확인 |
| CORS 오류 | 실제 React 출처의 프로토콜·호스트·포트가 CORS_ORIGINS와 일치하는지 확인 후 서버 재시작 |
| React에서 제보가 DB에 보이지 않음 | 15-1 복사기와 설치기를 순서대로 실행하고 7주차 client에서 Vite를 재시작했는지 확인 |
| VITE_API_BASE_URL 설정 오류 | React 프로젝트 루트의 .env.local에 서버 주소를 넣고 React 개발 서버를 재시작 |
| React 관리자 키 입력 후 다시 입력 화면으로 돌아감 | SUPABASE_SECRET_KEY가 아닌 서버 .env의 ADMIN_API_KEY를 입력했는지 확인 |
| 오래 사용하지 않은 무료 프로젝트가 응답하지 않음 | Supabase에서 프로젝트 일시 중지 상태와 복원 기능 확인 |
| src/app.js 또는 server.js가 실행됨 | 이전 JavaScript 파일이 남은 별도 복사본인지 확인. npm run dev는 server.ts를 실행해야 함 |

## 코드 구조와 6주차에서 달라진 점

```text
server.ts                       환경변수 → 관리자 키 검증 → DB 확인 → listen
src/
  app.ts                        Express 미들웨어·상태 확인·라우터
  config/supabase.ts             서버용 SDK 클라이언트·DB 진단·오류 변환
  routes/                       URL·메서드·관리자 미들웨어
  controllers/                  HTTP 상태와 data 응답
  services/                     입력 검증·Supabase 조회/등록/수정/삭제
  models/                       snake_case DB 행 → camelCase API 응답
  types/                        DB 행·API 데이터·생성 입력 타입
  middleware/                   관리자 인증·404·오류 응답
  utils/                        비동기 처리·입력 검증·HttpError
  data/restaurants.json         지난주 초기 데이터. 런타임 캐시로 사용하지 않음
supabase/
  schema.sql                    테이블·제약조건·RLS·권한·승인 함수
  seed.sql                      비어 있는 restaurants에 초기 3건 입력
scripts/
  check-db.ts                   실제 원격 DB 읽기 진단
  generate-seed.ts               JSON에서 로컬 seed.sql 재생성
  copy-client.mjs                이전 React를 7주차 client/로 복사
  install-client.mjs             복사본 백업 및 7주차 연동 적용
integration/client/             기존 React에 적용할 7주차 연동 파일
client/                         15단계에서 생성하는 React 작업 사본 (Git 제외)
examples/                       curl에 사용할 JSON 요청 본문
requests/foodmap.http            선택 사용 가능한 HTTP 요청 템플릿
tests/                          실제 클라우드 접속 없는 자동 검사
```

| 구분 | 6주차 | 7주차 |
|---|---|---|
| 언어·서버 | TypeScript·Express | 같은 구조 유지 |
| 데이터 저장 | 프로세스 메모리 배열 | Supabase PostgreSQL |
| 초기 데이터 | 파일을 읽어 메모리 초기화 | SQL Editor에서 명시적으로 입력 |
| ID 생성 | 메모리에서 최대 번호 계산 | DB identity |
| 비동기 | 지연 시뮬레이션 | 실제 HTTPS DB 요청 |
| API 응답 | data 및 camelCase 필드 | 형식 유지, 시각·제보 연결 필드 추가 |
| 서버 재시작 | 메모리 변경 소실 | DB 데이터 유지 |
| 관리 요청 | 별도 인증 없음 | Express 관리자 Bearer 토큰 |
| 제보 승인 | 서버 구현 범위 밖 | PostgreSQL 함수로 원자적 처리 |

DB 타입은 schema.sql에 맞춰 작성했습니다. 열을 추가·변경할 때 types/database.types.ts와 모델의 응답 변환도 함께 수정합니다. /api/restaurants의 목록에는 페이지 나누기가 아직 없으며 Supabase Data API의 행 반환 한도가 적용됩니다. 수업의 소규모 데이터용 API입니다.

## 자동 검사와 검증 범위

```sh
npm run typecheck
npm test
npm run build
```

npm test는 Jest의 HTTP·SDK·설정 검사 후 Node 테스트 러너의 SQL 검사를 실행합니다. SQL 검사만 실행하려면 다음 명령을 사용합니다.

```sh
npm run test:sql
```

- HTTP 검사: 조회·CRUD 상태, 관리자 권한, CORS, JSON 오류, 생산 환경 오류 응답.
- SDK 검사: 실제 SDK가 만드는 필터·정렬·등록 본문·RPC 요청을 대체 fetch로 검사.
- SQL 검사: PGlite의 로컬 PostgreSQL 엔진에서 schema/seed, 권한, 제약조건, 승인 롤백·중복 방지, 디스크 재연결 후 데이터 유지 검사.
- 외부 Supabase·Render에 요청하지 않으며 실제 DB 키도 사용하지 않습니다. 임시 SQL DB는 검사 후 삭제합니다.

이 자동 검사는 Supabase의 API 게이트웨이나 학생 계정 설정까지 검증하지 않습니다. 실제 연결은 **npm run db:check → HTTP 요청 → Table Editor 확인 → 서버 재시작** 순서로 직접 확인합니다.

## 완료 체크

- [ ] 개인 Free Organization과 Supabase 프로젝트 생성
- [ ] schema.sql 전체 실행, restaurants/submissions 확인
- [ ] seed.sql 실행 후 맛집 3건 조회
- [ ] 서버 .env에 프로젝트 URL·Secret key·별도 관리자 키 설정
- [ ] npm run db:check 성공
- [ ] typecheck·자동 검사·build 성공
- [ ] 목록 조회, 관리자 맛집 등록·수정·삭제 확인
- [ ] 서버 재시작 후 등록 데이터 유지 확인
- [ ] 제보 등록 → 관리자 승인 → 연결된 맛집 생성 확인
- [ ] 같은 승인 재요청 시 맛집 중복 생성 없음 확인
- [ ] 7주차 client/ 사본에서 목록·제보·관리·승인 확인
- [ ] .env와 로컬 요청 파일이 Git에 포함되지 않았는지 확인
