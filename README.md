# pwd-week7 — 6주차 서버의 Supabase DB 연동

`pwd-week7-server`의 완료 코드(커밋 `1a5f9b2`) 24개 파일을 먼저 그대로 복사한 뒤, 맛집 조회·등록의 저장 위치를 Supabase PostgreSQL로 변경했습니다. 이 저장소의 Git 이력은 유지합니다.

## 이번 실습의 범위

| 항목 | 동작 |
| --- | --- |
| 목록·상세·인기 목록 | `restaurants` 테이블 조회 |
| 관리자 생성·기존 제보 승인 후 맛집 생성 | 기존 `POST /api/restaurants`로 DB 등록 |
| API 경로·상태 코드·응답 필드 | 6주차와 동일. `{ data: ... }`와 camelCase 유지 |
| 인기 기준 | 기존 rating 내림차순, 최대 5개 |
| 제보·승인 상태·좋아요 | 현재 `pwd-week7-client`의 LocalStorage 유지 |
| 맛집 수정·삭제 버튼 | 기존처럼 비활성화 |

클라이언트 코드와 `pwd-week7-server` 원본은 변경하지 않습니다. DB에는 기존 Restaurant 필드만 저장합니다.

## 시작 전: Supabase 프로젝트 생성

[Supabase Dashboard](https://supabase.com/dashboard)에서 사용할 Organization을 선택하고 **New project**를 누릅니다. 새 프로젝트 이름은 `pwd-week7`로 입력하고 DB 비밀번호와 지역을 설정한 뒤 생성이 끝날 때까지 기다립니다. 프로젝트 생성은 [공식 시작 안내](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs#create-a-supabase-project)를 참고합니다.

Data API 옵션이 표시되면 활성화합니다. 생성 후 비활성화된 상태라면 **Integrations → Data API**에서 활성화합니다. 이 서버는 PostgreSQL 비밀번호로 직접 접속하지 않고 Supabase Data API와 서버용 Secret key로 연결합니다.

## 1. 설치

프로젝트 루트에서 Node.js 24.x로 실행합니다.

```sh
npm ci --include=dev
```

## 2. Supabase 테이블과 초기 데이터

실습용 Supabase 프로젝트의 **SQL Editor**에서 다음 파일을 순서대로 실행합니다.

1. [supabase/schema.sql](supabase/schema.sql): `restaurants` 테이블과 기존 초기화 데모용 SQL 함수 생성
2. [supabase/seed.sql](supabase/seed.sql): 테이블이 비어 있을 때만 원본 맛집 3건 입력

확인 SQL:

```sql
select id, name, price_range, rating, recommended_menu
from public.restaurants
order by id;
```

초기 데이터는 `1 송림식당`, `2 별미떡볶이`, `3 SOGO`입니다. 다음 등록 ID는 DB가 자동으로 생성합니다. seed.sql을 다시 실행해도 기존 행은 유지됩니다. 서버 시작 때 테이블 생성·시딩·초기화를 자동 실행하지 않습니다.

DB 열은 `price_range`, `recommended_menu`이고 API 응답은 기존 `priceRange`, `recommendedMenu`입니다. 모델이 변환하므로 클라이언트 변경이 필요하지 않습니다.

## 3. 서버 환경변수

[.env.example](.env.example)을 루트의 `.env`로 복사합니다. `.env`가 이미 있으면 덮어쓰지 않고 필요한 값만 설정합니다.

```dotenv
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://본인프로젝트식별자.supabase.co
SUPABASE_SECRET_KEY=sb_secret_본인의서버용키
```

- `SUPABASE_URL`: 프로젝트 상단 **Connect**의 기본 Project URL. `/rest/v1`을 붙이지 않습니다.
- `SUPABASE_SECRET_KEY`: **Settings → API Keys**의 서버용 Secret key. Express에서만 사용합니다. React나 Vercel의 `VITE_*` 변수에 넣지 않습니다. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- `.env`는 Git에서 제외됩니다. `.env.example`에는 예시만 둡니다.

별도의 관리자 토큰이나 CORS 환경변수는 사용하지 않습니다. 기존 `app.use(cors())`와 요청 형식을 유지합니다.

## 4. 연결 확인과 실행

```sh
npm run db:check
npm run dev
```

`db:check`는 DB를 수정하지 않고 restaurants의 연결·열 이름을 확인합니다. 성공 메시지는 `[Supabase] restaurants 테이블 연결 확인 성공`입니다.

검사와 프로덕션 빌드:

```sh
npm run typecheck
npm test
npm run build
npm start
```

개발 서버와 빌드 서버를 같은 포트에서 동시에 실행하지 않습니다. `npm test`는 가짜 DB 응답을 사용하는 기존 서비스·라우트 검사와 로컬 PostgreSQL(PGlite)의 스키마·초기화·영구 저장 검사를 실행합니다. 실제 Supabase 프로젝트에 테스트 데이터를 쓰지 않습니다.

## 5. 기존 API 확인

| 메서드 | 경로 | 결과 |
| --- | --- | --- |
| GET | `/health` | 200 · `{ "status": "ok" }` |
| GET | `/api/restaurants` | DB 목록 · `{ data: Restaurant[] }` |
| GET | `/api/restaurants/:id` | DB 상세 · 없는 ID는 기존처럼 404 |
| GET | `/api/restaurants/popular?limit=2` | 기존 평점순 목록 |
| POST | `/api/restaurants` | 201 · DB에 저장된 맛집 |
| GET | `/api/restaurants/sync-demo` | 6주차 동기 실행 비교용 스냅샷 |
| POST | `/api/restaurants/reset-demo` | DB를 원본 3건으로 초기화하는 기존 데모 |

`sync-demo`는 서버 시작 시 원본 JSON을 읽고, 이후 목록 조회·등록 결과를 반영한 메모리 스냅샷을 동기로 반환합니다. DB 조회를 동기 처리한다고 표시하지 않습니다. 일반 목록·상세·인기 API는 매번 DB에서 읽으며 스냅샷으로 대체하지 않습니다.

**`reset-demo`는 추가한 DB 맛집도 삭제하고 초기 3건으로 복원합니다.** 기존 초기화 API를 유지하기 위한 실습 기능입니다. 데이터 유지 확인 과정에서는 호출하지 않습니다.

등록 예시:

```sh
curl -i -X POST http://localhost:3000/api/restaurants \
  -H 'Content-Type: application/json' \
  -d '{"name":"DB 저장 확인 식당","category":"한식","location":"아주대","recommendedMenu":["김밥","라면"]}'
```

응답 ID로 상세를 조회하고, 서버를 종료·재시작한 뒤 같은 맛집이 유지되는지 확인합니다. Supabase Table Editor의 restaurants에서도 같은 행을 확인합니다. 필수 값 누락의 기존 400 응답과 추천 메뉴 배열 변환도 유지됩니다.

## 6. 기존 Render 서비스에 반영하고 현재 클라이언트 연결

기존 Render 서비스 **ajou-food-map**과 공개 주소 `https://ajou-food-map.onrender.com`을 유지하면서 배포 소스를 `pwd-week7`로 변경합니다. 현재 클라이언트의 `VITE_API_BASE_URL=https://ajou-food-map.onrender.com`도 그대로 사용합니다.

### 6-1. 환경변수를 먼저 저장

[Render Dashboard](https://dashboard.render.com/)에서 기존 **ajou-food-map** 서비스를 열고 **Environment → Environment Variables**에서 다음 값을 설정합니다.

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24.22.1` — 이 저장소의 `.node-version`과 동일 |
| `SUPABASE_URL` | 실제 연결을 검증한 로컬 `.env`와 동일한 프로젝트 기본 URL |
| `SUPABASE_SECRET_KEY` | 로컬 `.env`와 동일한 `sb_secret_` 서버용 Secret key |

`SUPABASE_URL` 뒤에 `/rest/v1`을 붙이지 않습니다. Supabase 키는 이 Express 서버에만 설정합니다. `PORT`는 Render 제공 값을 사용하므로 로컬 `.env`의 `PORT=3000`을 복사하지 않습니다.

이 단계에서는 **Save only**로 저장하고 다음 단계에서 소스를 변경합니다. 소스 변경으로 새 배포가 시작될 때 위 값이 적용됩니다. [Render 환경변수 저장 옵션](https://render.com/docs/configure-environment-variables)

### 6-2. 기존 서비스의 소스 저장소 변경

1. 같은 서비스에서 **Settings → Build → Source → Edit**를 누릅니다.
2. **Update Source** 창에서 GitHub의 **ajou-hyunseok-oh/pwd-week7**을 선택합니다.
3. Runtime, Build Command, Start Command를 아래 표와 맞춘 뒤 변경을 제출합니다. Render가 새 소스로 배포를 자동 시작합니다.

저장소가 표시되지 않으면 연결된 Render GitHub 앱에 `pwd-week7` 저장소 접근이 허용되어 있는지 확인합니다. 비공개 저장소는 연결한 GitHub 계정·앱을 통해 선택합니다. [기존 서비스 소스 변경](https://render.com/changelog/change-your-services-backing-repo-or-image-in-the-render-dashboard), [Git provider 연결](https://render.com/docs/git-provider)

| 항목 | 값 |
| --- | --- |
| Source / Repository | `ajou-hyunseok-oh/pwd-week7` |
| Branch | `main` |
| Runtime | `Node` |
| Root Directory | 비워둠 — 저장소 루트의 package.json 사용 |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Auto-Deploy | `On Commit` |

Settings에서 Branch·Root Directory·Health Check Path도 위 값인지 확인합니다. 테스트가 별도 GitHub CI로 등록되어 있지 않으므로 자동 배포는 `On Commit`을 사용합니다. [Render 배포 설정](https://render.com/docs/deploys), [Node.js 버전 설정](https://render.com/docs/node-version)

소스가 이미 `pwd-week7`로 연결되어 있다면 설정 저장 후 **Deploys → Manual Deploy → Deploy latest commit**으로 최신 main을 배포합니다. 단순 Restart service는 현재 배포된 커밋을 재시작하는 동작입니다.

### 6-3. 배포 후 DB와 클라이언트 확인

배포된 커밋이 이번 main 커밋인지 확인한 뒤 다음 주소를 엽니다.

- `https://ajou-food-map.onrender.com/health`: 서버 상태 200
- `https://ajou-food-map.onrender.com/api/restaurants`: Supabase의 맛집 목록
- `https://ajou-food-map.onrender.com/api/restaurants/4`: DB에 남겨둔 검증용 맛집. 해당 행이 이후 삭제됐다면 현재 DB의 ID 사용
- `https://pwd-week7-client.vercel.app/#/list`: 같은 DB 맛집 목록 표시

`/health`는 서버 상태만 확인합니다. DB 연결은 목록·상세 응답으로 확인합니다. 서버 주소가 유지되므로 Vercel의 환경변수를 바꾸거나 클라이언트를 다시 개발할 필요가 없습니다. 현재 브라우저를 새로고침해 기존 조회 캐시도 갱신합니다.

이미 SQL과 초기 데이터를 적용했다면 배포를 위해 다시 초기화하지 않습니다. 배포·서버 시작은 기존 DB 행을 유지합니다. 특히 `reset-demo`는 영구 저장 검증에 사용하지 않습니다.

로컬 연결은 기존처럼 `pwd-week7-client`의 `VITE_API_BASE_URL=http://localhost:3000`을 사용합니다. 제보·승인 상태·좋아요는 해당 브라우저에 저장되고, 승인 시 기존 생성 API가 Supabase에 맛집을 등록합니다.


## 변경한 위치

- `src/config/supabase.ts`: 서버용 Supabase 클라이언트
- `src/services/restaurants.service.ts`: DB 조회·등록과 기존 데모 연결
- `src/models/restaurant.model.ts`: DB 행 → 기존 응답 변환
- `src/controllers/restaurants.controller.ts`: DB 초기화 완료를 기다린 뒤 응답
- `supabase/schema.sql`, `supabase/seed.sql`: 테이블·초기 맛집 3건
- `scripts/check-db.ts`: 실제 연결 확인

Supabase의 [insert와 반환 행 조회](https://supabase.com/docs/reference/javascript/insert), [단일 행 조회](https://supabase.com/docs/reference/javascript/maybesingle)를 사용합니다.
