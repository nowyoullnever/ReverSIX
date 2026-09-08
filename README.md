# REVERSIX!

친구 두 명이 6자리 방 코드로 플레이하는 10×10 Reversi 변형 게임. Vite + TypeScript, Firebase Realtime Database. React, AI, 공개 방, 계정 가입 화면은 없습니다.

## 실행

Node.js 24 이상을 사용합니다.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

개발 주소: http://127.0.0.1:5173/ReverSIX/

Firebase 설정 없이도 규칙 테스트와 production build가 됩니다. 이때 첫 화면에 설정 대기 안내가 표시되고 온라인 방 버튼은 비활성화됩니다. 가짜 온라인 방이나 로컬 대전 모드는 제공하지 않습니다.

## Firebase 설정

1. Firebase Console에서 프로젝트를 만들고 웹 앱을 등록합니다.
2. Authentication → Sign-in method → **Anonymous**를 활성화합니다. 가입 화면 없이 브라우저별 플레이어 ID를 유지하는 용도입니다.
3. Realtime Database를 생성합니다. Firestore가 아닙니다. 데이터베이스 URL을 확인합니다.
4. `.env.example`을 `.env`로 복사하고 프로젝트 설정 → 내 앱 → 웹 앱 SDK 설정의 값을 넣습니다.

| 변수                                | 웹 앱 설정 값                         |
| ----------------------------------- | ------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | `apiKey`                              |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `authDomain`                          |
| `VITE_FIREBASE_DATABASE_URL`        | Realtime Database URL (`databaseURL`) |
| `VITE_FIREBASE_PROJECT_ID`          | `projectId`                           |
| `VITE_FIREBASE_STORAGE_BUCKET`      | `storageBucket`                       |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId`                   |
| `VITE_FIREBASE_APP_ID`              | `appId`                               |

5. Realtime Database → Rules에 `database.rules.json`의 전체 내용을 적용하고 Publish합니다. 또는 로그인 후 `npx firebase deploy --only database --project 실제프로젝트ID`를 실행합니다. 공개 read/write 테스트 규칙을 사용하지 마세요.
6. Authentication → Settings → Authorized domains에서 `localhost`, `127.0.0.1`, `nowyoullnever.github.io`를 사용 환경에 맞게 등록합니다.
7. 개발 서버를 재시작합니다. 배포 환경은 아래 GitHub 변수도 입력한 후 다시 빌드해야 합니다.

서비스 계정 JSON, Firebase 관리자 비밀키는 필요하지 않습니다. 웹 앱 설정은 브라우저 번들에 포함되는 공개 식별값이며, 접근 제어는 인증과 Database Rules로 처리합니다. `.env`는 Git에서 제외됩니다.

## GitHub Pages

`vite.config.ts`의 base는 `/ReverSIX/`입니다. `.github/workflows/pages.yml`이 main push 시 설치 → 규칙 테스트 → Database 에뮬레이터 테스트 → 빌드 → Pages 배포를 수행합니다. PR에서는 검증만 합니다.

저장소 Settings → Pages → Source를 **GitHub Actions**로 설정합니다. Settings → Secrets and variables → Actions → **Variables**에 `.env.example`의 7개 이름과 같은 Repository variables를 등록합니다. 이 workflow는 `vars`를 읽으므로 Secrets에만 넣으면 적용되지 않습니다. 값을 변경한 뒤 Actions에서 workflow를 다시 실행합니다.

예정 주소: https://nowyoullnever.github.io/ReverSIX/

Firebase 변수가 없어도 배포 자체는 가능합니다. 온라인 기능은 설정 이후 재빌드부터 활성화됩니다.

## 구조

```text
src/game/      순수 TypeScript 엔진: 보드, 8방향 뒤집기, SIX, 턴/CHECK/PASS
src/online/    Firebase 초기화, 방 트랜잭션, 실시간 구독, 접속 상태
src/ui/        로비, 보드, 애니메이션, toast, 튜토리얼, 상태 표시
src/main.ts    화면과 온라인 모듈 연결
tests/         규칙·방 로직 및 Database Rules/동기화 테스트
public/fonts/  사용자 ZIP에서 가져온 MaruBuri Regular OTF와 라이선스
```

엔진의 주요 함수는 `createGame`, `getLegalMoves`, `getFlips`, `applyMove`, `getSixLines`, `getMoveOptions`, `playMove`, `settlePasses`입니다. Firebase나 DOM에 의존하지 않습니다. 보드는 길이 100 배열이며 빈칸은 `''`, 돌은 `black`/`white`입니다. 위치는 `row * 10 + column`입니다.

## 규칙

- 중앙 4돌로 시작하며 BLACK 첫 턴만 1수, 이후 양쪽 2수입니다.
- 매 착수마다 모든 방향을 뒤집고 다음 합법수를 새 보드에서 계산합니다.
- SIX는 가로·세로·대각선의 **최대 연속선이 정확히 6개**일 때만 성립합니다. 1~5개와 7개 이상은 SIX가 아닙니다.
- 둘째 수의 뒤집기를 마친 가상 보드에서, 정확히 6개인 같은 최대 연속선 안에 이번 턴 두 신규 돌이 함께 포함되면 금지합니다. 7개 이상으로 만드는 수는 허용합니다. 해당 칸만 × 표시합니다.
- 단순히 같은 직선에 두는 것은 허용합니다. 5개 연결에는 특수 효과가 없습니다.
- SIX/CHECK는 턴 종료에만 판정합니다. 상대는 다음 한 턴 안에 CHECK를 건 색의 SIX를 전부 제거해야 합니다.
- 방어 실패가 승패 판정에서 우선합니다. 성공하면서 자기 SIX가 있으면 Counter Check입니다.
- 첫 착수가 없으면 자동 PASS. 둘째 합법수가 없거나 모두 특수 금지이면 자동 생략합니다.
- CHECK 중 PASS는 패배합니다. CHECK 승자가 없고 연속 두 PASS이면 돌 개수로 승패/무승부를 판정합니다.

## 화면 및 UNDO

착수는 새 돌을 약 120ms에 표시한 뒤, 뒤집힌 돌을 약 320ms 동안 Y축으로 회전시켜 보여줍니다. 이 시간에는 입력을 잠그며, Firebase로 수신한 상대 착수도 이전/다음 보드를 비교해 같은 방식으로 표시합니다. 새로고침·재접속·UNDO로 복구한 상태는 과거 애니메이션을 재생하지 않습니다. OS의 `prefers-reduced-motion` 설정에서는 즉시 반영합니다.

마지막 착수에는 작은 점을 표시합니다. CHECK/CHECK 방어/Counter Check/PASS, 입장·단절·재연결은 상단의 짧은 toast로 알리고, CHECK가 발생하면 해당 EXACT SIX 연결도 잠시 강조합니다. CHECK 방어 실패로 끝나면 최종 board에서 남은 모든 EXACT SIX를 다시 계산해, 6개 돌의 ring과 SVG 직선으로 로비로 나갈 때까지 표시합니다. 돌 개수 승패와 일반 CHECK 상태에는 이 영구 선을 표시하지 않습니다.

로비의 **HOW TO PLAY**은 FLIP, TWO MOVES, SIX, CHECK, CHECK 방어, NO DOUBLE-SIX을 6단계의 HTML/CSS 미니 보드로 설명합니다. NEXT/BACK, 키보드 ←/→, ESC를 지원합니다.

UNDO는 직전 **한 착수**와 그 착수의 모든 뒤집기를 되돌립니다. 클라이언트는 최대 두 개의 직전 스냅샷만 유지하고, 복구도 Firebase transaction으로 기록하므로 양쪽 화면은 같은 board와 새 revision을 받습니다. 활성화 조건은 playing 상태에서 **현재 턴의 플레이어가 방금 둔 수가 있고, 아직 같은 자신의 턴인 경우**입니다. 따라서 첫째 수 뒤에는 UNDO할 수 있지만, 둘째 수가 서버에서 턴을 넘긴 뒤에는 상대 수를 되돌리지 않도록 UNDO가 비활성화됩니다. 새로고침·재접속 후에는 이력은 복구되지 않습니다.

## 동기화 및 복구

방 생성과 WHITE 선점, 각 착수와 UNDO는 Firebase transaction으로 처리합니다. 방 코드 충돌은 재시도합니다. 착수와 UNDO는 플레이어 UID와 예상 revision을 검사하므로 같은 revision을 사용한 중복 클릭이나 오래된 UNDO는 한 번만 반영되거나 거부됩니다. 첫째 수 상태도 즉시 저장됩니다.

현재 방 코드는 sessionStorage, 익명 사용자 ID는 Firebase Auth에 저장되어 같은 탭 새로고침으로 복구합니다. 저장소를 지우거나 시크릿 창을 닫으면 기존 자리 복구가 불가능할 수 있습니다. 같은 브라우저 프로필의 탭은 같은 사용자이므로 두 플레이어 테스트는 **서로 다른 브라우저 또는 일반 창 + 시크릿 창**을 사용합니다.

접속 정보는 `presence/{code}/{uid}/{connection}`에 보관하고 `onDisconnect`로 제거합니다. 여러 탭 중 하나만 닫아도 다른 연결이 남으면 온라인입니다. 단절 감지는 서버 타임아웃까지 지연될 수 있습니다. 상대 단절 중에는 착수를 막고 재연결하면 이어갑니다. 기권·자동 패배·방 만료·방 삭제는 이번 범위에서 구현하지 않았습니다. BACK TO LOBBY는 해당 탭의 접속을 해제하며 플레이어 자리를 비우지는 않습니다.

Rules는 인증, 방 생성/입장, 플레이어 소유권, 턴, revision 증가, 기본 데이터 형식을 검사합니다. 모든 Reversi 뒤집기와 SIX를 서버에서 재계산하는 경쟁게임용 anti-cheat는 아닙니다. 인증된 사용자는 정확한 코드를 알면 방 단건을 읽을 수 있지만 전체 방 목록 조회는 차단됩니다.

## 테스트

```sh
npm test
# Java 21 이상 필요. 실제 Firebase 프로젝트/설정/로그인 불필요.
npm run test:online
```

에뮬레이터는 `demo-reversix`라는 Firebase 전용 데모 프로젝트 ID를 사용합니다. production 환경 변수에 넣는 값이 아니며 실제 클라우드 프로젝트로 요청하지 않습니다. 첫 실행은 에뮬레이터 다운로드가 필요합니다. Windows에서는 실행 스크립트가 Java 임시 소켓에 짧은 작업 경로를 지정하여 공백/긴 경로로 인한 루프백 연결 오류를 피합니다.

수동 최종 확인: 두 브라우저로 생성/입장 → BLACK 1수 → WHITE 2수 → 동일 보드와 flip 확인 → 첫째 수 UNDO → 양쪽 복구 확인 → 새로고침 복구 → 한쪽 창 종료 시 단절 표시. 실제 Firebase 프로젝트를 연결한 뒤에도 이 절차를 확인하세요.

## 규칙 해석과 주의점

1. '같은 SIX 연결'은 **최대 연속선 전체가 정확히 6개**인 경우만 뜻합니다. 7개 이상 연결을 겹치는 6칸 창으로 나누지 않으며, 7개 이상에는 SIX/CHECK/금수 표시가 없습니다.
2. CHECK 방어는 턴 종료 보드에 남은 **상대 색의 모든 SIX**를 검사합니다. 최초 CHECK의 위치 목록만 추적하지 않습니다.
3. '최대 2수'는 둘째 합법수가 있으면 반드시 두는 것으로 해석했습니다. 임의로 턴을 종료하는 버튼은 없습니다.
4. PASS는 '턴 시작에 한 수도 못 둔 경우'만 연속 PASS에 누적합니다. 둘째 수 생략은 PASS가 아닙니다.
5. 꽉 찬 보드에서도 CHECK 판정이 돌 개수 판정보다 우선합니다.

## 글꼴 및 참고

사용자가 제공한 `maruburi.zip` 안의 `MaruBuriOTF.zip`에서 `MaruBuri-Regular.otf`를 추출해 전체 기본 글꼴로 적용했습니다. 원본 ZIP에는 별도 라이선스 파일이 없어 네이버 공식 라이선스 안내를 함께 보존했습니다.

- [Firebase 트랜잭션](https://firebase.google.com/docs/database/web/read-and-write)
- [Firebase 접속 상태](https://firebase.google.com/docs/database/web/offline-capabilities)
- [Vite GitHub Pages 배포](https://vite.dev/guide/static-deploy)
- [네이버 글꼴 라이선스](https://help.naver.com/service/30016/contents/18088?osType=PC)
