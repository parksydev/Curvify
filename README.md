# Curvify

직교·극좌표 그래프 워크스페이스. 손그림 곡선을 수식으로 근사하고, LaTeX로 함수·점을 정의합니다.

## 스택

- **Next.js 15** (App Router)
- **TypeScript**
- **Supabase** — Auth, profiles, cloud projects (PostgreSQL)
- **Zustand** — 앱 상태
- **KaTeX** — 수식 렌더링
- **Canvas 2D** — 그래프
- **Vitest** — 수학 엔진 테스트

## 아키텍처 (Phase 0–3)

| 레이어 | 경로 | 역할 |
|--------|------|------|
| **Engine** | `src/engine/` | QR fit, 후처리, PCHIP, Worker |
| **Lib** | `src/lib/` | UI 어댑터, `fit-async`, 렌더링 |
| **Worker** | `src/engine/worker/` | 백그라운드 fitting |
| **Tests** | `tests/` | 27 tests |

파이프라인 상세: [`docs/algorithms/pipeline.md`](docs/algorithms/pipeline.md)

## 테스트

```bash
npm test
```

## Supabase 설정 (필수)

1. [Supabase](https://supabase.com/dashboard)에서 프로젝트 생성
2. `.env.local.example`을 복사해 `.env.local` 작성:

```bash
cp .env.local.example .env.local
```

3. Dashboard → **SQL Editor**에서 `supabase/migrations/001_initial.sql` 실행
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
5. 로컬 개발 시 이메일 확인을 끄려면: **Authentication → Providers → Email → Confirm email** 비활성화

## 시작

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

1. 랜딩 → **Get started** 로 회원가입
2. 로그인 후 `/app` 워크스페이스 진입
3. **Ctrl+S** 또는 자동 저장(30초)으로 Supabase에 프로젝트 동기화
4. **내 프로젝트**에서 클라우드 프로젝트 전환·생성

## 라우트

| 경로 | 설명 |
|------|------|
| `/` | 소개 랜딩 |
| `/login`, `/signup` | Supabase 이메일 인증 |
| `/pricing` | 요금제 |
| `/app` | 그래프 워크스페이스 (로그인 필요) |
| `/app/account` | 계정 설정 |

## Phase 1 기능

| 기능 | 설명 |
|------|------|
| **프로젝트 클라우드 저장** | Ctrl+S → Supabase, 자동 저장, **내 프로젝트** 목록 |
| **프로젝트 로컬 불러오기** | Ctrl+O — JSON 파일 |
| **근사 곡선 오버레이** | 보기 → 근사 곡선 표시 — 스케치 위에 fitted `f(x)` |
| **좌표 HUD** | 캔버스 좌하단 `(x, y)`, 선택 함수의 `f(x)` |
| **매개변수 슬라이더** | 입력 함수 선택 시 분석 패널에서 `a`, `b` 등 조절 |
| **미분·적분 시각화** | 보기 → 도함수 / 적분 영역 |
| **데이터 회귀** | 파일 → 데이터 가져오기 — CSV `(x,y)` 붙여넣기 |
| **내보내기** | PNG, SVG (래스터 임베드) |

## 레거시

이전 vanilla JS 버전은 `legacy/` 폴더에 보관되어 있습니다.

## 빌드

```bash
npm run build
npm start
```
