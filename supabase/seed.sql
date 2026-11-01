-- npm run seed:generate로 생성합니다. schema.sql 실행 후 SQL Editor에서 실행하세요.
-- restaurants에 데이터가 이미 있으면 건너뜁니다. 기존 행을 삭제/수정하지 않습니다.
begin;
lock table public.restaurants in share row exclusive mode;
insert into public.restaurants
  (name, category, location, price_range, rating, description, recommended_menu, likes, image)
select name, category, location, price_range, rating, description, recommended_menu, likes, image
from jsonb_to_recordset('[
  {
    "name": "송림식당",
    "category": "한식",
    "location": "경기 수원시 영통구 월드컵로193번길 21 원천동",
    "price_range": "7,000-13,000원",
    "rating": 4.99,
    "description": "최고의 한식 맛집입니다.",
    "recommended_menu": [
      "순두부",
      "김치찌개",
      "소불고기",
      "제육볶음"
    ],
    "likes": 0,
    "image": "https://mblogthumb-phinf.pstatic.net/MjAyMjA2MTJfODEg/MDAxNjU0OTYzNTM3MjE1.1BfmrmOsz_B6DBHAnhQSs6qfNIDnssofR-DrzMfigIIg.JHHDheG6ifJjtfKUqLss_mLXWFE9fNJ5BmepNUVXSOog.PNG.cary63/image.png?type=w966"
  },
  {
    "name": "별미떡볶이",
    "category": "분식",
    "location": "경기 수원시 영통구 아주로 42 아카데미빌딩",
    "price_range": "7,000-10,000원",
    "rating": 4.92,
    "description": "바삭한 튀김과 함께하는 행복한 한입",
    "recommended_menu": [
      "떡볶이",
      "튀김",
      "순대",
      "어묵"
    ],
    "likes": 0,
    "image": "https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTA4MTJfMjcg%2FMDAxNzU0OTQ5ODk1Mjg0.GR6i3mNpJJXyqQrozGEJ65InCDBGlEmxc0aCeVHncJgg.sduDPX67J8hhoGxq4vLohpS4dXk1w-706dQLPfVs1iwg.JPEG%2Foutput%25A3%25DF1564208956.jpg"
  },
  {
    "name": "SOGO",
    "category": "일식",
    "location": "경기 수원시 영통구 월드컵로193번길 7",
    "price_range": "10,000-16,000원",
    "rating": 4.89,
    "description": "일식 맛집, 구 허수아비,",
    "recommended_menu": [
      "냉모밀",
      "김치돈까스나베",
      "코돈부르"
    ],
    "likes": 0,
    "image": "https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20190707_63%2F1562462598960nPDMy_JPEG%2FW7iKQEhTMzCF3flC1t0pzgzF.jpeg.jpg"
  }
]'::jsonb) as seed(
  name text, category text, location text, price_range text, rating double precision,
  description text, recommended_menu text[], likes integer, image text
)
where not exists (select 1 from public.restaurants);
commit;
