'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  MathParticles,
  ModelFamilyViz,
  PreprocessViz,
  QRViz,
  RSquaredGauge,
  useChapterProgress,
} from '@/components/marketing/TechMathViz';

function useReveal<T extends HTMLElement>(threshold = 0.05) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold, rootMargin: '8% 0px 0px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`tech-reveal ${visible ? 'tech-reveal--in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function MathBlock({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="tech-math-block">
      {label && <span className="tech-math-block-label">{label}</span>}
      <div className="tech-math-block-body">{children}</div>
    </div>
  );
}

function PinnedChapter({
  id,
  eyebrow,
  title,
  children,
  visual,
  height = '165vh',
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  visual: React.ReactNode | ((progress: number) => React.ReactNode);
  height?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useChapterProgress(sectionRef);

  return (
    <section id={id} className="tech-chapter" ref={sectionRef} style={{ minHeight: height }}>
      <div className="tech-chapter-sticky">
        <div className="tech-container tech-chapter-grid">
          <div className="tech-chapter-copy">
            <span className="tech-chapter-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden />
            <p className="tech-eyebrow tech-eyebrow--light">{eyebrow}</p>
            <h2 className="tech-chapter-title">{title}</h2>
            <div className="tech-chapter-body" style={{ opacity: 0.45 + progress * 0.55 }}>
              {children}
            </div>
          </div>
          <div className="tech-chapter-visual" style={{ transform: `scale(${0.9 + progress * 0.1})` }}>
            {typeof visual === 'function' ? visual(progress) : visual}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function TechShowcase() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const preprocessRef = useRef<HTMLElement>(null);
  const preprocessProg = useChapterProgress(preprocessRef);
  const [modelIdx, setModelIdx] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      setScrollProgress(doc.scrollTop / (doc.scrollHeight - doc.clientHeight));
      if (heroRef.current) {
        heroRef.current.style.setProperty('--hero-y', String(Math.min(window.scrollY / 500, 1)));
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setModelIdx((i) => (i + 1) % 6), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="tech-page">
      <div className="tech-progress" style={{ transform: `scaleX(${scrollProgress})` }} aria-hidden />

      {/* ═══ HERO ═══ */}
      <section className="tech-hero" ref={heroRef}>
        <MathParticles />
        <div className="tech-hero-mesh" aria-hidden />
        <div className="tech-hero-glow-ring" aria-hidden />

        <div className="tech-hero-content">
          <p className="tech-hero-eyebrow tech-hero-in">Numerical Engine · 기술 소개 자료</p>
          <h1 className="tech-hero-title tech-hero-in" style={{ animationDelay: '0.08s' }}>
            손끝의 곡선이
            <br />
            <span className="tech-hero-gradient">방정식이 되는 수학.</span>
          </h1>
          <p className="tech-hero-lead tech-hero-in" style={{ animationDelay: '0.16s' }}>
            Curvify 엔진은 스케치 데이터를 함수로 변환하기 위해
            <strong> 전처리 → 선형대수 → 모델 선택 → 진단</strong> 파이프라인을 브라우저 환경에서 실시간으로 실행합니다.
          </p>
          <div className="tech-hero-formula tech-hero-in" style={{ animationDelay: '0.28s' }}>
            <MathBlock label="핵심 문제">
              <p>노이즈가 포함된 스케치 데이터(점열) <em>P̃ = {'{(x̃ᵢ, ỹᵢ)}'}</em>을 입력받아,</p>
              <p>연속 함수 <em>f : ℝ → ℝ</em> (또는 <em>r : [0,2π) → ℝ⁺</em>)를 추정합니다.</p>
            </MathBlock>
          </div>
        </div>
        <div className="tech-hero-scroll-hint tech-hero-in" style={{ animationDelay: '0.5s' }}>
          <span>스크롤하여 수학 엔진 살펴보기</span>
          <div className="tech-scroll-chevron" />
        </div>
      </section>

      {/* ═══ PIPELINE OVERVIEW ═══ */}
      <section className="tech-pipeline-banner">
        <div className="tech-container">
          <Reveal>
            <h2 className="tech-banner-title">5단계 수치 해석 파이프라인</h2>
            <p className="tech-banner-sub">모든 단계는 서버 연산 없이 <code>src/engine/</code> 내의 순수 TypeScript로 구현되었습니다.</p>
          </Reveal>
          <div className="tech-pipeline-flow-diagram">
            {[
              { n: '①', t: 'Monotonic Projection', d: 'X-구간 중앙값 투영' },
              { n: '②', t: 'Savitzky–Golay', d: 'SG(5,2) 평활화(Smoothing)' },
              { n: '③', t: 'Adaptive Resample', d: '곡률 기반 적응형 리샘플링' },
              { n: '④', t: 'Householder QR', d: '최소제곱법 계수 산출' },
              { n: '⑤', t: 'R² · AIC · RMSE', d: '모델 선택 및 성능 진단' },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="tech-flow-node">
                  <span className="tech-flow-num">{s.n}</span>
                  <strong>{s.t}</strong>
                  <small>{s.d}</small>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 1: PREPROCESSING ═══ */}
      <section className="tech-chapter tech-chapter--preprocess" ref={preprocessRef} style={{ minHeight: '165vh' }}>
        <div className="tech-chapter-sticky">
          <div className="tech-container tech-chapter-grid">
            <div className="tech-chapter-copy">
              <span className="tech-chapter-progress" style={{ transform: `scaleX(${preprocessProg})` }} aria-hidden />
              <p className="tech-eyebrow tech-eyebrow--light">Chapter 1 · Signal Recovery</p>
              <h2 className="tech-chapter-title">스케치 전처리<br />3단계 정제 과정</h2>

              <div className="tech-chapter-body">
                <MathBlock label="1. Monotonic X-Projection">
                  <p>
                    스케치 데이터는 수학적 함수(<em>y = f(x)</em>)가 아닌 임의의 다각선(Polyline)입니다. X축을 <em>B</em>개의 구간(Bin)으로 나누고,
                    각 구간 내 <em>y</em>값의 <strong>중앙값</strong>을 추출하여 단일 값 함수로 투영합니다.
                  </p>
                  <code>binCount = min(500, max(16, ⌊4√n⌋))</code>
                </MathBlock>

                <MathBlock label="2. Savitzky–Golay Filter">
                  <p>
                    윈도우 크기 5의 2차 다항식 국소 회귀 커널 <em>[-3, 12, 17, 12, -3] / 35</em>를 사용하여,
                    데이터의 피크(Peak) 형태를 보존하면서 고주파 노이즈(떨림)를 효과적으로 제거합니다.
                  </p>
                </MathBlock>

                <MathBlock label="3. Curvature-Adaptive Resampling">
                  <p>
                    기본 샘플링 간격은 <em>Δx = 0.05</em>입니다. 인접 선분 간의 각도 변화가 <em>π/8</em>을 초과할 경우,
                    <em>Δx/2</em> 간격으로 조밀하게 리샘플링하여 급격한 곡률 변화를 보존합니다.
                  </p>
                </MathBlock>
              </div>
            </div>
            <div className="tech-chapter-visual">
              <PreprocessViz progress={Math.min(1, preprocessProg * 1.25)} />
              <div className="tech-viz-legend">
                <span className="raw">● 원본 스케치</span>
                <span className="fit">— 정제된 곡선</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 2: QR ═══ */}
      <PinnedChapter
        id="qr"
        eyebrow="Chapter 2 · Linear Algebra"
        title="Householder QR 분해를 통한\n최소제곱법 연산"
        height="155vh"
        visual={(p) => <QRViz active={p > 0.05} />}
      >
        <MathBlock label="문제 정식화">
          <p>기저 함수 <em>φⱼ(x)</em>의 선형 결합:</p>
          <p className="tech-formula-lg">y ≈ β₀φ₀(x) + β₁φ₁(x) + … + βₙφₙ(x)</p>
          <p>설계 행렬 <em>A ∈ ℝᵐˣⁿ</em>와 관측 벡터 <em>b ∈ ℝᵐ</em>에 대하여,</p>
          <p className="tech-formula-lg">min<sub>β</sub> ‖Aβ − b‖₂</p>
        </MathBlock>
        <MathBlock label="Householder QR 분해">
          <p>
            <em>A = QR</em> (Q: 직교 행렬, R: 상삼각 행렬). 후방 대입법(Back-substitution)을 사용하여 <em>Rβ = Qᵀb</em>를 풉니다.
            피벗 임계값 <em>10⁻¹²</em>를 기준으로 랭크 결손(Rank deficiency)을 감지하며,
            <em>cond(R) ≈ |R₀₀|/|Rₙₙ|</em>를 계산하여 수치적 불안정성을 경고합니다.
          </p>
        </MathBlock>
        <MathBlock label="다항식 수치 안정화">
          <p>
            독립 변수 <em>x</em>를 <em>t = (x − shift)/scale</em>을 통해 <strong>[-1, 1]</strong> 구간으로 정규화(Mapping)합니다.
            이후 <em>tⁱ</em> 기저에서 QR 분해를 수행하고, 이항 정리를 적용하여 원래의 표준 거듭제곱 기저 계수로 환원합니다.
          </p>
        </MathBlock>
      </PinnedChapter>

      {/* ═══ CHAPTER 3: MODELS ═══ */}
      <section className="tech-chapter tech-chapter--models" style={{ minHeight: '150vh' }}>
        <div className="tech-chapter-sticky">
          <div className="tech-container">
            <p className="tech-eyebrow tech-eyebrow--light">Chapter 3 · Model Zoo</p>
            <h2 className="tech-chapter-title tech-chapter-title--center">
              6가지 함수군.<br />선형 및 비선형 모델 통합 프레임워크.
            </h2>
            <ModelFamilyViz highlight={modelIdx} />
            <div className="tech-model-detail-grid">
              <Reveal>
                <MathBlock label="비선형 모델의 선형화">
                  <ul className="tech-math-list">
                    <li><strong>지수</strong> <em>y = ae^(bx)</em> → <em>ln y = ln a + bx</em></li>
                    <li><strong>거듭제곱</strong> <em>y = ax^b</em> → <em>ln y = ln a + b·ln x</em></li>
                    <li><strong>로그</strong> <em>y = a + b·ln x</em> → 직접 선형 결합</li>
                  </ul>
                </MathBlock>
              </Reveal>
              <Reveal delay={100}>
                <MathBlock label="푸리에 기저 (4차 고조파)">
                  <p className="tech-formula-sm">
                    y = a₀ + Σ<sub>k=1..4</sub> [aₖ sin(kx) + bₖ cos(kx)]
                  </p>
                  <p>주기성을 띠거나 진동하는 스케치 데이터에 적합합니다. 고조파의 수는 표본 수 <em>n</em>에 따라 최대 <em>⌊(n−1)/2⌋</em>개로 제한됩니다.</p>
                </MathBlock>
              </Reveal>
              <Reveal delay={200}>
                <MathBlock label="PCHIP (Fritsch–Carlson)">
                  <p>
                    구간별 3차 에르밋(Hermite) 보간법. 기울기 <em>mᵢ</em>는 단조성 보존 조건
                    (<em> δᵢ₋₁ · δᵢ ≤ 0 → mᵢ = 0</em>)과 가중 조화 평균을 통해 결정됩니다.
                    데이터의 원래 <strong>형태를 엄격하게 보존</strong>해야 할 때 다항식 회귀 대신 사용됩니다.
                  </p>
                </MathBlock>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHAPTER 4: MODEL SELECTION ═══ */}
      <PinnedChapter
        id="selection"
        eyebrow="Chapter 4 · Model Selection"
        title="R² 및 AIC 기반\n최적 모델 선택"
        height="145vh"
        visual={(p) => <RSquaredGauge value={0.78 + p * 0.21} />}
      >
        <MathBlock label="결정 계수 (R²)">
          <p className="tech-formula-lg">R² = 1 − SS_res / SS_tot</p>
          <p>
            <em>SS_res = Σ(yᵢ − ŷᵢ)²</em>, <em>SS_tot = Σ(yᵢ − ȳ)²</em>.
            <strong>자동(Auto) 모드</strong>에서는 선형, 다항, 삼각, 지수, 거듭제곱, 로그 모델을
            모두 평가한 후, R² 값이 가장 높은 모델을 최종적으로 채택합니다.
          </p>
        </MathBlock>
        <MathBlock label="최적 다항식 차수 선택 — AIC">
          <p className="tech-formula-lg">AIC = n·ln(RSS/n) + 2k</p>
          <p>
            차수 <em>d = 1…6</em> 범위에서 AIC 값이 가장 작은 차수를 선택합니다.
            조건수 <em>cond(R) &gt; 10⁸</em>일 경우 해당 차수를 기각하여 룬게 현상(Runge's phenomenon)을 방지합니다.
          </p>
        </MathBlock>
        <MathBlock label="오차 및 잔차 진단">
          <p>
            <strong>RMSE</strong> = √(SS_res/n), <strong>max|eᵢ|</strong>는 최대 잔차를 의미합니다.
            UI 화면에 결정 계수(R²), 피팅 방식, 그리고 조건수를 함께 시각화하여 제공합니다.
          </p>
        </MathBlock>
      </PinnedChapter>

      {/* ═══ CHAPTER 5: CALCULUS ═══ */}
      <section className="tech-chapter tech-chapter--calc">
        <div className="tech-container tech-calc-layout">
          <Reveal>
            <p className="tech-eyebrow tech-eyebrow--light">Chapter 5 · Analysis Overlays</p>
            <h2 className="tech-chapter-title">미적분 시각화 오버레이</h2>
          </Reveal>
          <div className="tech-calc-grid">
            <Reveal>
              <MathBlock label="수치 미분 (중앙 차분법)">
                <p className="tech-formula-lg">f′(x) ≈ [f(x+h) − f(x−h)] / 2h</p>
                <p>스텝 사이즈 <em>h = 10⁻⁵</em>. 추정된 함수 <em>f(x)</em>를 바탕으로 접선 필드(Tangent field)를 실시간으로 렌더링합니다.</p>
              </MathBlock>
            </Reveal>
            <Reveal delay={100}>
              <MathBlock label="정적분 (심프슨 공식)">
                <p className="tech-formula-lg">∫ₐᵇ f(x)dx ≈ (h/3)[f(a) + 4Σf(x₂ᵢ₋₁) + 2Σf(x₂ᵢ) + f(b)]</p>
                <p><em>n = 200</em> 구간으로 분할. 사다리꼴 적분을 활용해 적분 영역을 캔버스 상에 시각적으로 채워 넣습니다.</p>
              </MathBlock>
            </Reveal>
            <Reveal delay={200}>
              <MathBlock label="극좌표계 파이프라인">
                <p>
                  극좌표 스케치 <em>(θ, r)</em>에 대해서도 동일한 전처리 과정을 거쳐 <em>r = g(θ)</em>를 추정합니다.
                  <em>θ</em>-구간 단조 투영 → SG 평활화 → QR 피팅 순으로 진행되며,
                  최종적으로 직교좌표계 <em>(x,y)</em>로 변환하여 동일한 캔버스에 렌더링합니다.
                </p>
              </MathBlock>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ EQUATION SUMMARY ═══ */}
      <section className="tech-section tech-section--light">
        <div className="tech-container">
          <Reveal>
            <p className="tech-eyebrow">Reference</p>
            <h2 className="tech-section-title">수식 및 알고리즘 레퍼런스</h2>
          </Reveal>
          <div className="tech-ref-grid">
            {[
              { cat: '전처리', items: ['projectMonotonicX — X-구간 중앙값 투영', 'savitzkyGolay — SG(5) 커널 평활화', 'samplePolylineAdaptive — π/8 곡률 임계치 리샘플링'] },
              { cat: '선형대수', items: ['leastSquares — Householder QR 분해', 'abscissaScale — [-1,1] 스케일 정규화', 'scaledPolyToPowerBasis — 이항 정리를 통한 기저 환원'] },
              { cat: '모델', items: ['fitPolynomial — AIC 기반 최적 차수 선택', 'fourier — 삼각 함수(sin/cos) 기저', 'buildPchip — Fritsch-Carlson 단조성 보존', 'exponential/power — 로그 변환을 통한 선형화'] },
              { cat: '진단', items: ['rSquared — 결정 계수 (1−SS_res/SS_tot)', 'computeFitDiagnostics — RMSE 및 최대 잔차 계산', 'conditionWarning — 조건수 기반 수치 불안정 경고'] },
              { cat: '분석', items: ['numericDerivative — 중앙 차분법 미분', 'simpsonIntegral — 심프슨 1/3 공식 적분', 'sampleDefiniteIntegral — 사다리꼴 넓이 기반 적분 영역'] },
              { cat: '실행', items: ['fit.worker.ts — Web Worker 연산 오프로딩', 'FitPayload — 데이터 직렬화 및 통신', 'pipelineCartesianSketch / pipelinePolarSketch — 좌표계별 파이프라인'] },
            ].map((g, i) => (
              <Reveal key={g.cat} delay={i * 60}>
                <div className="tech-ref-card">
                  <h3>{g.cat}</h3>
                  <ul>{g.items.map((it) => <li key={it}>{it}</li>)}</ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="tech-cta">
        <Reveal>
          <p className="tech-cta-eyebrow">Live Demo</p>
          <h2>이제 수식을 직접 스케치해 보세요.</h2>
          <p>스케치부터 전처리, QR 분해, 그리고 R² 평가까지. 이 모든 수치 해석 과정이 200ms 이내에 즉각적으로 처리됩니다.</p>
          <div className="tech-cta-actions">
            <Link href="/app" className="mkt-btn mkt-btn-primary mkt-btn-lg">워크스페이스 열기 →</Link>
            <Link href="/signup" className="tech-cta-ghost">계정 만들기</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}