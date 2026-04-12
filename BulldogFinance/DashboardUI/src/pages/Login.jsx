import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import {
  ArrowRight,
  CheckCircle,
  Dotpoints01,
  Mail01,
  PlayCircle,
} from "@untitledui/icons";
import BulldogLogo from "../assets/BulldogFinance.png";
import LoginSample1 from "../assets/LoginSample_1.png";
import LoginSample2 from "../assets/LoginSample_2.png";
import LoginSample3 from "../assets/LoginSample_3.png";
import LoginSample4 from "../assets/LoginSample_4.png";
import Button from "@/components/ui/Button.jsx";
import { loginRequest } from "../services/authConfig";

const carouselSlides = [
  {
    image: LoginSample1,
    eyebrow: "Portfolio overview",
    title: "Keep every account, holding, and report in one calm workspace.",
    quote:
      "The daily snapshot feels polished and easy to scan. It gives our team a much clearer picture of performance.",
    author: "Jordan Lee",
    role: "Finance lead, Bulldog Capital",
  },
  {
    image: LoginSample2,
    eyebrow: "Transaction intelligence",
    title: "Review activity with a layout that stays readable even when data gets dense.",
    quote:
      "We moved from spreadsheets to a dashboard our operators can actually use without training.",
    author: "Sasha Patel",
    role: "Operations manager, Northwind",
  },
  {
    image: LoginSample3,
    eyebrow: "Reports",
    title: "Turn weekly financial reporting into a single repeatable flow.",
    quote:
      "The reporting surface is clean enough for exec reviews and fast enough for day-to-day work.",
    author: "Taylor Brooks",
    role: "Controller, Lakefront Group",
  },
  {
    image: LoginSample4,
    eyebrow: "Assistant",
    title: "Ask portfolio questions and surface context without digging through menus.",
    quote:
      "The assistant helps our team answer stakeholder questions with less context switching.",
    author: "Morgan Kim",
    role: "Analyst, Apex Ridge",
  },
];

export default function LoginPage() {
  const { instance } = useMsal();
  const [activeSlide, setActiveSlide] = useState(0);
  const activeSlideData = carouselSlides[activeSlide];

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % carouselSlides.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[var(--text-main)]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <section className="relative flex min-h-screen flex-col bg-white px-6 py-6 sm:px-10 lg:px-12 lg:py-8">
          <div className="flex items-center gap-3">
            <img
              src={BulldogLogo}
              alt="Bulldog Finance Logo"
              className="h-10 w-10 rounded-[12px] object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--text-main)]">Bulldog Finance</p>
              <p className="text-sm text-[var(--text-soft)]">Wealth operations platform</p>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-[360px]">
              <div className="space-y-3">
                <h1 className="text-[36px] font-semibold tracking-[-0.04em] text-[var(--text-main)]">
                  Log in to your account
                </h1>
                <p className="text-base leading-6 text-[var(--text-soft)]">
                  Welcome back. Access your Bulldog Finance workspace with your
                  Microsoft identity.
                </p>
              </div>

              <form
                className="mt-8 space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleLogin();
                }}
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-[var(--text-main)]"
                  >
                    Work email
                  </label>
                  <div className="flex h-12 items-center gap-3 rounded-[12px] border border-[var(--card-border)] bg-white px-4 shadow-[var(--shadow-xs)]">
                    <Mail01 className="h-5 w-5 text-[var(--text-disabled)]" />
                    <input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      className="w-full border-0 bg-transparent p-0 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-disabled)]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="min-h-12 w-full justify-between rounded-[12px] px-4 shadow-[var(--shadow-sm)]"
                >
                  <span>Continue with Microsoft</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-12 w-full rounded-[12px] border-[#d0d5dd] bg-white text-[var(--text-main)] shadow-none hover:bg-[var(--color-gray-50)]"
                  onClick={handleLogin}
                >
                  Use secure redirect sign-in
                </Button>
              </form>

              <div className="mt-8 rounded-[16px] bg-[var(--color-gray-25)] p-4 ring-1 ring-inset ring-[var(--card-border)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--accent)]">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--text-main)]">
                      Single sign-on only
                    </p>
                    <p className="text-sm leading-6 text-[var(--text-soft)]">
                      Passwords, MFA, and account recovery are managed by your
                      Microsoft identity provider.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-8 text-sm text-[var(--text-soft)]">
                Need access?{" "}
                <a
                  href="mailto:support@bulldogtechsolutions.com"
                  className="font-semibold text-[var(--text-main)]"
                >
                  Contact your administrator
                </a>
              </p>
            </div>
          </div>

          <p className="text-sm text-[var(--text-soft)]">
            © 2026 Bulldog Tech Solutions
          </p>
        </section>

        <section className="relative hidden overflow-hidden bg-[#f8fafc] lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(209,224,255,0.8),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(209,250,223,0.7),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2f6_100%)]" />
          <div className="absolute inset-y-0 left-0 w-24 bg-[linear-gradient(90deg,rgba(255,255,255,0.9),rgba(255,255,255,0))]" />

          <div className="relative flex w-full flex-col justify-center px-8 py-8 xl:px-10">
            <div className="relative mx-auto flex h-full max-h-[920px] w-full max-w-[880px] flex-col overflow-hidden rounded-[32px] shadow-[0_40px_100px_rgba(16,24,40,0.16)]">
              <div
                className="flex h-full transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {carouselSlides.map((slide, index) => (
                  <div key={index} className="relative min-w-full">
                    <img
                      src={slide.image}
                      alt={`Bulldog Finance sample ${index + 1}`}
                      className="h-full min-h-[720px] w-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,24,40,0.02)_0%,rgba(16,24,40,0.12)_36%,rgba(16,24,40,0.78)_100%)]" />
                  </div>
                ))}
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-8 xl:p-10">
                <div className="max-w-[540px] text-white">
                  <p className="text-sm font-semibold tracking-[0.01em] text-white/80">
                    {activeSlideData.eyebrow}
                  </p>
                  <h2 className="mt-3 text-[32px] font-semibold leading-[1.15] tracking-[-0.04em]">
                    {activeSlideData.title}
                  </h2>
                  <p className="mt-5 max-w-[500px] text-lg leading-8 text-white/80">
                    {activeSlideData.quote}
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/14 backdrop-blur-sm">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{activeSlideData.author}</p>
                      <p className="text-sm text-white/70">{activeSlideData.role}</p>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-auto mt-8 flex items-center gap-3">
                  <Dotpoints01 className="h-4 w-4 text-white/55" />
                  {carouselSlides.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Go to slide ${index + 1}`}
                      onClick={() => setActiveSlide(index)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        index === activeSlide
                          ? "w-10 bg-white"
                          : "w-2.5 bg-white/40 hover:bg-white/65"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
