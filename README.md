# LottoStat

동행복권 로또 6/45의 회차별 당첨번호와 번호별 통계를 시각화하는 Next.js 앱입니다.

## 포함 기능
- 1회부터 최신 회차까지 회차 순 로또번호 조회
- 번호별 막대그래프와 다양한 정렬 기준
- 최근 추세, 미출현 연속, 최대 연속 출현, 간격 변동성 등 확장 통계
- 1등 당첨금, 당첨자수, 자동·수동·반자동 당첨 분포 통계
- 조건 기반 추천 번호 생성기
- 로컬 저장 기반 모의 구매와 다음 회차 자동 채점
- GitHub Actions 기반 주간 자동 데이터 갱신

## 로컬 실행
```bash
npm install
npm run update:data
npm run dev
```

## 데이터 업데이트
```bash
npm run update:data
```

수집 우선순위는 다음과 같습니다.
1. 동행복권 공식 JSON 엔드포인트
2. 공개 백업 데이터셋

## 배포
- Vercel 배포를 전제로 구성했습니다.
- `.github/workflows/update-lotto-data.yml`은 매주 토요일 09:00 KST에 맞춰 데이터를 갱신합니다.

## 문서
- PRD: [`docs/PRD.md`](/Volumes/LIMNHARD/Coding/lottostat/docs/PRD.md)
