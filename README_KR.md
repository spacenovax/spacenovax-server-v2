# SpaceNovaX Server + Admin Dashboard v2

## 포함 기능
- 서버 API
- 관리자 웹 대시보드
- 사용자 목록
- 총 SNP 포인트
- 지갑 등록 수
- 미션 완료 수
- 사용자 차단/해제
- CSV 다운로드
- 채굴 24시간 제한
- 추천인 코드
- Solana 지갑 저장

## 설치

Node.js 설치 후 CMD에서:

```cmd
npm install
```

## 실행

```cmd
npm start
```

성공 메시지:

```text
SpaceNovaX Server + Dashboard v2 running on port 3000
```

브라우저에서 접속:

```text
http://localhost:3000
```

기본 관리자 키:

```text
spacenovax-admin
```

## 중요
실제 운영 전에는 ADMIN_KEY를 반드시 바꾸세요.

Windows CMD 예시:

```cmd
set ADMIN_KEY=내가정한강력한키
npm start
```

## API
- POST /api/register
- POST /api/mine
- POST /api/mission/complete
- POST /api/wallet
- GET /api/rank
- GET /api/admin/stats
- GET /api/admin/users
- POST /api/admin/block
- GET /api/admin/export
