"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Dialog from "./dialog";
import { demoContent } from "./demo-data";

type Tab = "transcript" | "answer" | "summary";
const tabs: Tab[] = ["transcript", "answer", "summary"];
const labels = {
  transcript: "Transkripsi",
  answer: "Saran Jawaban",
  summary: "Ringkasan",
};

export default function DemoDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState<keyof typeof demoContent>("intro");
  const [tab, setTab] = useState<Tab>("answer");
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabButtons = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const content = demoContent[question];

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    setPlaying(false);
  }
  function selectTab(value: Tab) {
    stop();
    setTab(value);
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, value: Tab) {
    const index = tabs.indexOf(value);
    let next: Tab | undefined;
    if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
    if (event.key === "ArrowLeft")
      next = tabs[(index + tabs.length - 1) % tabs.length];
    if (event.key === "Home") next = tabs[0];
    if (event.key === "End") next = tabs[tabs.length - 1];
    if (next) {
      event.preventDefault();
      selectTab(next);
      tabButtons.current[next]?.focus();
    }
  }
  function replay() {
    stop();
    setTab("transcript");
    setPlaying(true);
    timer.current = setTimeout(
      () => {
        setTab("answer");
        setPlaying(false);
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 200
        : 1600,
    );
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        stop();
        onClose();
      }}
      className="demo-dialog"
      titleId="demo-title"
      closeLabel="Tutup demo"
    >
      <div className="demo-header">
        <span className="eyebrow">COBA INTERVAI</span>
        <h2 id="demo-title">Rasakan copilot interviewmu.</h2>
        <p>
          Pilih pertanyaan dan lihat contoh jawaban yang disesuaikan dengan CV.
        </p>
      </div>
      <div className="demo-body">
        <div className="demo-interviewer">
          <div className="demo-avatar">PA</div>
          <span className="demo-live">
            <i /> SIMULASI INTERVIEW
          </span>
          <h3>Puspo · Software Engineer</h3>
          <p>
            Contoh profil: pengalaman IT perbankan, analisis solusi, dan
            pengembangan aplikasi.
          </p>
          <label htmlFor="demo-question">Pertanyaan interviewer</label>
          <select
            id="demo-question"
            value={question}
            onChange={(event) => {
              stop();
              setQuestion(event.target.value as keyof typeof demoContent);
            }}
          >
            {Object.entries(demoContent).map(([key, item]) => (
              <option key={key} value={key}>
                {item.question}
              </option>
            ))}
          </select>
          <div className="demo-question-text">“{content.question}”</div>
          <button
            type="button"
            className="button button-primary"
            onClick={replay}
            disabled={playing}
          >
            <svg className="icon">
              <use href="#i-play" />
            </svg>{" "}
            {playing ? "Mendengarkan…" : "Putar Simulasi"}
          </button>
        </div>
        <div className="demo-copilot">
          <div className="copilot-title">
            <span>✦ IntervAI</span>
            <span className="live-indicator">
              <i /> Aktif
            </span>
          </div>
          <div className="demo-tabs" role="tablist" aria-label="Panel copilot">
            {tabs.map((value) => (
              <button
                key={value}
                type="button"
                id={`tab-${value}`}
                role="tab"
                ref={(element) => {
                  tabButtons.current[value] = element;
                }}
                aria-selected={tab === value}
                aria-controls="demo-panel"
                tabIndex={tab === value ? 0 : -1}
                className={tab === value ? "active" : ""}
                onClick={() => selectTab(value)}
                onKeyDown={(event) => navigate(event, value)}
              >
                {labels[value]}
              </button>
            ))}
          </div>
          <div
            id="demo-panel"
            className="demo-panel"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`tab-${tab}`}
            aria-live="polite"
          >
            {tab === "transcript" && (
              <>
                <span className="demo-transcript-label">
                  INTERVIEWER · 00:14
                </span>
                <h4>✦ Pertanyaan saat ini</h4>
                <p>{content.transcript}</p>
              </>
            )}
            {tab === "answer" && (
              <>
                <h4>✦ Saran Jawaban AI</h4>
                {content.answer.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </>
            )}
            {tab === "summary" && (
              <>
                <h4>✦ Ringkasan &amp; arahan</h4>
                <ul>
                  {content.summary.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="demo-cv-note">
            <svg className="icon">
              <use href="#i-doc" />
            </svg>
            <span>
              Jawaban personal berdasarkan contoh CV.
              <br />
              <strong>Gunakan pengalamanmu sendiri saat interview.</strong>
            </span>
          </div>
        </div>
      </div>
      <p className="demo-disclaimer">
        Demo ilustratif — tidak merekam audio atau menggunakan layanan AI
        langsung.
      </p>
    </Dialog>
  );
}
