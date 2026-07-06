import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';

const navItems = [
  { icon: '🏠', label: 'Home' },
  { icon: '⛏️', label: 'Mining' },
  { icon: '⭐', label: 'Missions' },
  { icon: '👥', label: 'Friends' },
  { icon: '🏆', label: 'Ranking' },
  { icon: '👛', label: 'Wallet' },
  { icon: '•••', label: 'More' },
];

function Logo() {
  return (
    <div className="logo" aria-label="SpaceNovaX logo">
      <div className="logo-orbit" />
      <div className="logo-x">X</div>
      <div className="logo-text">SPNX</div>
    </div>
  );
}

function Header() {
  return (
    <header className="header-card">
      <div className="header-row">
        <Logo />
        <div className="brand">
          <h1>SpaceNovaX <span className="version">V2</span></h1>
          <p>Explore. Earn. Beyond.</p>
        </div>
        <button className="genesis-btn">🚀 Genesis Launch</button>
      </div>
    </header>
  );
}

function SpaceCanvas() {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.parentElement;
    if (!canvas || !hero) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars = [];
    let meteors = [];
    let lastMeteor = 0;
    let nextMeteor = 900;

    const resize = () => {
      const rect = hero.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.floor((width * height) / 3600);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.45 + Math.random() * 1.4,
        a: 0.15 + Math.random() * 0.75,
        tw: 0.002 + Math.random() * 0.018,
        color: Math.random() < 0.18 ? 'cyan' : Math.random() < 0.1 ? 'purple' : 'white',
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const spawnMeteor = (now) => {
      const right = Math.random() > 0.25;
      const purple = Math.random() < 0.18;
      const speed = 8 + Math.random() * 6;
      meteors.push({
        x: right ? width + 120 : -120,
        y: 28 + Math.random() * height * 0.5,
        vx: right ? -speed : speed,
        vy: speed * (0.35 + Math.random() * 0.3),
        len: 85 + Math.random() * 90,
        width: 2 + Math.random() * 1.4,
        life: 0,
        maxLife: 70 + Math.random() * 35,
        purple,
      });
      lastMeteor = now;
      nextMeteor = 4000 + Math.random() * 2000;
    };

    const drawStar = (star, now) => {
      const pulse = Math.sin(now * star.tw + star.phase) * 0.5 + 0.5;
      const alpha = star.a * (0.45 + pulse * 0.55);
      const color = star.color === 'cyan' ? '52,239,255' : star.color === 'purple' ? '180,80,255' : '255,255,255';
      ctx.beginPath();
      ctx.fillStyle = `rgba(${color},${alpha})`;
      ctx.shadowColor = `rgba(${color},${alpha})`;
      ctx.shadowBlur = 6;
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawMeteor = (m) => {
      const fade = Math.min(1, m.life / 12) * Math.min(1, (m.maxLife - m.life) / 18);
      const mag = Math.hypot(m.vx, m.vy) || 1;
      const ux = m.vx / mag;
      const uy = m.vy / mag;
      const tailX = m.x - ux * m.len;
      const tailY = m.y - uy * m.len;
      const gradient = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      const main = m.purple ? '180,80,255' : '52,239,255';

      gradient.addColorStop(0, `rgba(${main},0)`);
      gradient.addColorStop(0.55, `rgba(${main},${0.55 * fade})`);
      gradient.addColorStop(1, `rgba(255,255,255,${fade})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = m.width;
      ctx.lineCap = 'round';
      ctx.shadowColor = `rgba(${main},${fade})`;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const loop = (now) => {
      ctx.clearRect(0, 0, width, height);

      const nebula = ctx.createRadialGradient(width * 0.64, height * 0.45, 10, width * 0.64, height * 0.45, width * 0.45);
      nebula.addColorStop(0, 'rgba(126,67,255,.13)');
      nebula.addColorStop(1, 'rgba(126,67,255,0)');
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, width, height);

      stars.forEach((s) => drawStar(s, now));

      if (now - lastMeteor > nextMeteor) spawnMeteor(now);

      meteors.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;
        m.life += 1;
        drawMeteor(m);
      });

      meteors = meteors.filter((m) => m.life < m.maxLife && m.x > -260 && m.x < width + 260 && m.y < height + 180);
      requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    setTimeout(() => spawnMeteor(performance.now()), 900);
    requestAnimationFrame(loop);

    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="space-canvas" aria-hidden="true" />;
}

function ExplorerCard() {
  return (
    <section className="explorer-card glass">
      <div className="core-icon">
        <div className="core-inner" />
      </div>
      <div className="explorer-info">
        <h2>Space Explorer</h2>
        <span>Lv.7 Captain</span>
      </div>
      <div className="experience">
        <div className="experience-head">
          <span>Experience</span>
          <b>850 / 1000 EXP</b>
        </div>
        <div className="exp-track"><i /></div>
      </div>
    </section>
  );
}

function Ship() {
  return (
    <div className="ship-wrap" aria-hidden="true">
      <svg viewBox="0 0 720 420" className="ship-svg">
        <defs>
          <linearGradient id="metal" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#d9f4ff" />
            <stop offset="55%" stopColor="#52678c" />
            <stop offset="100%" stopColor="#070b16" />
          </linearGradient>
          <linearGradient id="wing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#20365e" />
            <stop offset="45%" stopColor="#eaf8ff" />
            <stop offset="100%" stopColor="#2f6fff" />
          </linearGradient>
          <radialGradient id="cockpit" cx="42%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#36dfff" />
            <stop offset="35%" stopColor="#071228" />
            <stop offset="100%" stopColor="#02040b" />
          </radialGradient>
          <radialGradient id="engine" cx="50%" cy="50%" r="62%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="35%" stopColor="#42f9ff" />
            <stop offset="70%" stopColor="#b64cff" />
            <stop offset="100%" stopColor="#040611" />
          </radialGradient>
        </defs>

        <g className="ship-core">
          <path d="M360 28 C450 98 500 195 480 302 C438 356 282 356 240 302 C220 195 270 98 360 28 Z" fill="url(#metal)" stroke="#e9fbff" strokeWidth="3" />
          <path d="M360 86 C398 137 414 205 394 247 C374 265 346 265 326 247 C306 205 322 137 360 86 Z" fill="url(#cockpit)" stroke="#88fbff" strokeWidth="3" />
          <path d="M286 200 L58 292 L296 324 L348 265 Z" fill="url(#wing)" stroke="#89faff" strokeWidth="3" />
          <path d="M434 200 L662 292 L424 324 L372 265 Z" fill="url(#wing)" stroke="#89faff" strokeWidth="3" />
          <path d="M124 284 L288 260" stroke="#44f8ff" strokeWidth="2" opacity=".5" />
          <path d="M596 284 L432 260" stroke="#44f8ff" strokeWidth="2" opacity=".5" />
          <ellipse cx="316" cy="332" rx="36" ry="26" fill="#050813" stroke="#8dfcff" strokeWidth="4" />
          <ellipse cx="404" cy="332" rx="36" ry="26" fill="#050813" stroke="#8dfcff" strokeWidth="4" />
          <circle cx="316" cy="332" r="17" fill="url(#engine)" />
          <circle cx="404" cy="332" r="17" fill="url(#engine)" />
          <text x="464" y="283" fill="#26fff1" stroke="#061126" strokeWidth="1.2" fontSize="24" fontWeight="900" transform="rotate(13 464 283)">SPNX</text>
        </g>
      </svg>
    </div>
  );
}


function AnimatedBalance() {
  const [balance, setBalance] = React.useState(15250.000000);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setBalance((value) => value + 0.000018 + Math.random() * 0.000012);
    }, 1800);

    return () => clearInterval(timer);
  }, []);

  return <>{balance.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}</>;
}

function MiningHero() {
  return (
    <section className="hero-card glass">
      <SpaceCanvas />
      <div className="balance-block">
        <div className="label">TOTAL BALANCE</div>
        <h2><AnimatedBalance /></h2>
        <h3>SPNX Points</h3>
        <span className="usd">≈ $18.43 USD</span>
      </div>
      <div className="phase-pill"><i /> Phase 1</div>
      <div className="planet planet-main" />
      <div className="planet planet-small" />
      <div className="float reward-one">+0.000032 💎</div>
      <div className="float reward-two">+0.000041</div>
      <Ship />
      <div className="today-card">
        <span>⛏️</span>
        <div>
          <small>Today's Mining</small>
          <b>+30.000000<br />SPNX</b>
        </div>
      </div>
      <div className="boost-card">
        <div><small>Mining Speed</small><b>1.25x</b></div>
        <div><small>Miners</small><b>86</b></div>
        <div><small>Power</small><b>2.80x</b></div>
      </div>
    </section>
  );
}

function MiningPanel() {
  return (
    <section className="mining-grid">
      <div className="timer-card glass">
        <h3>MINING READY</h3>
        <strong>24:00:00</strong>
        <span>Time Remaining</span>
      </div>
      <div className="reward-card glass">
        <div className="gem">💎</div>
        <div>
          <span>Daily Reward</span>
          <strong>30.000000</strong>
          <small>SPNX / 24h</small>
        </div>
      </div>
    </section>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map((item, index) => (
        <button key={item.label} className={index === 0 ? 'active' : ''}>
          <span>{item.icon}</span>
          <b>{item.label}</b>
        </button>
      ))}
    </nav>
  );
}

function App() {
  return (
    <div className="app-shell">
      <main className="app">
        <Header />
        <ExplorerCard />
        <MiningHero />
        <MiningPanel />
      </main>
      <BottomNav />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
