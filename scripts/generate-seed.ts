import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface SeedRestaurant {
  name: string; category: string; location: string; priceRange: string;
  rating: number; description: string; recommendedMenu: string[]; likes: number; image: string;
}

export function generateSeedSql(): string {
  const source = path.join(__dirname, '..', 'src', 'data', 'restaurants.json');
  const restaurants: SeedRestaurant[] = JSON.parse(readFileSync(source, 'utf8'));
  // 원본 JSON의 id를 가져오지 않고 PostgreSQL identity가 번호를 생성하게 합니다.
  const rows = restaurants.map((item) => ({
    name: item.name, category: item.category, location: item.location,
    price_range: item.priceRange, rating: item.rating, description: item.description,
    recommended_menu: item.recommendedMenu, likes: item.likes, image: item.image,
  }));
  const json = JSON.stringify(rows, null, 2).replace(/'/g, "''");
  return `-- npm run seed:generate로 생성합니다. schema.sql 실행 후 SQL Editor에서 실행하세요.
-- restaurants에 데이터가 이미 있으면 건너뜁니다. 기존 행을 삭제/수정하지 않습니다.
begin;
lock table public.restaurants in share row exclusive mode;
insert into public.restaurants
  (name, category, location, price_range, rating, description, recommended_menu, likes, image)
select name, category, location, price_range, rating, description, recommended_menu, likes, image
from jsonb_to_recordset('${json}'::jsonb) as seed(
  name text, category text, location text, price_range text, rating double precision,
  description text, recommended_menu text[], likes integer, image text
)
where not exists (select 1 from public.restaurants);
commit;
`;
}

if (require.main === module) {
  const destination = path.join(__dirname, '..', 'supabase', 'seed.sql');
  writeFileSync(destination, generateSeedSql());
  console.log('supabase/seed.sql 생성 완료: SQL Editor에서 실행하세요.');
}
