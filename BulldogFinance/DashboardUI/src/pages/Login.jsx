import React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../services/authConfig";
import {
  FiTrendingUp,
  FiPieChart,
  FiShield,
  FiArrowRight,
  FiMail,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import BulldogLogo from "../assets/BulldogFinance.png";
import BulldogTechLogo from "../assets/BulldogTechSolutions.png";

export default function LoginPage() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  return (
    <div className="login-root">
      {/* Left: brand / marketing side */}
      <section className="login-hero">
        <div className="login-hero__top">
          <div className="logo-mark">
            <img
              src={BulldogLogo}
              alt="Bulldog Finance Logo"
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
              }}
            />
          </div>
          <div>
            <div className="logo-text">Bulldog Finance</div>
            <div className="logo-sub">Smart wealth. Bold moves.</div>
          </div>
        </div>

        <div className="login-hero__content">
          <h1 className="hero-title">
            Aggregate your assets.
            <br />
            Let AI watch the market for you.
          </h1>
          <p className="hero-subtitle">
            Connect your bank, brokerage, and cash accounts, track stock
            performance, and use AI to turn market noise into clear investment
            signals.
          </p>

          <div className="hero-stats">
            <div className="hero-stat-card">
              <div className="hero-stat-card__icon-wrap">
                <FiTrendingUp />
              </div>
              <div className="hero-stat-card__value">+14.3%</div>
              <div className="hero-stat-card__label">
                12-month backtest scenario
              </div>
            </div>

            <div className="hero-stat-card">
              <div className="hero-stat-card__icon-wrap">
                <FiPieChart />
              </div>
              <div className="hero-stat-card__value">28</div>
              <div className="hero-stat-card__label">
                Connected asset accounts
              </div>
            </div>

            <div className="hero-stat-card">
              <div className="hero-stat-card__icon-wrap">
                <FiShield />
              </div>
              <div className="hero-stat-card__value">Bank-grade</div>
              <div className="hero-stat-card__label">
                Microsoft Entra secure sign-in
              </div>
            </div>
          </div>

          <div className="hero-chart">
            <div className="hero-chart__header">
              <span>Portfolio projection (sample)</span>
              <span className="hero-pill">AI-driven</span>
            </div>
            <div className="hero-chart__lines">
              <div className="hero-chart__line hero-chart__line--primary" />
              <div className="hero-chart__line hero-chart__line--secondary" />
            </div>
            <div className="hero-chart__axis">
              <span>Today</span>
              <span>6M</span>
              <span>12M</span>
            </div>
          </div>
        </div>

        <div className="login-hero__footer">
          Identity and encryption are provided by Microsoft Azure. Bulldog
          Finance never stores your password.
        </div>
      </section>

      {/* Right: login card */}
      <section className="login-panel">
        <div className="login-panel__card">
          <div className="login-panel__header">
            <h2>Welcome back</h2>
            <p>
              Sign in with Google or email and start tracking your portfolio in
              one place.
            </p>
          </div>

          <div className="login-actions">
            <button
              type="button"
              className="login-btn login-btn--google"
              onClick={handleLogin}
            >
              <span className="login-btn__icon">
                <FcGoogle size={20} />
              </span>
              <span>Sign in with Google</span>
            </button>

            <button
              type="button"
              className="login-btn login-btn--outline"
              onClick={handleLogin}
            >
              <span className="login-btn__icon">
                <FiMail size={18} />
              </span>
              <span>Sign up / sign in with email</span>
            </button>
          </div>

          <div className="login-divider">
            <span className="login-divider__line" />
            <span className="login-divider__text">or</span>
            <span className="login-divider__line" />
          </div>

          <ul className="login-benefits">
            <li>
              <FiArrowRight className="login-benefits__icon" />
              <span>View bank, cash and investment accounts in one dashboard.</span>
            </li>
            <li>
              <FiArrowRight className="login-benefits__icon" />
              <span>Monitor live quotes and detailed metrics for your watchlist.</span>
            </li>
            <li>
              <FiArrowRight className="login-benefits__icon" />
              <span>
                Get AI-generated suggestions weighted by news, sentiment and
                volatility.
              </span>
            </li>
          </ul>

          <p className="login-disclaimer">
            By continuing, you agree to Bulldog Finance&apos;s
            <a href="#" onClick={(e) => e.preventDefault()}>
              Terms of Use
            </a>
            and
            <a href="#" onClick={(e) => e.preventDefault()}>
              Privacy Policy
            </a>
            .
          </p>

          <div className="login-tech-credit">
            <span>Built by</span>
            <img
              src={BulldogTechLogo}
              alt="Bulldog Tech Solutions"
              className="login-tech-logo"
            />
            <span>Bulldog Tech Solutions</span>
          </div>
          
        </div>

        <div className="login-panel__footer">
          © {new Date().getFullYear()} Bulldog Tech Solutions · All rights
          reserved.
        </div>
      </section>
    </div>
  );
}
