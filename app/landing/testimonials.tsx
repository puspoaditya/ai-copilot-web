"use client";

import { useRef, useState, type CSSProperties } from "react";
import { testimonials } from "./testimonial-data";

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const touch = useRef<number | null>(null);
  const count = testimonials.length;
  function move(direction: number) {
    setIndex((value) => (value + direction + count) % count);
  }
  return (
    <>
      <div
        className="testimonial-shell"
        aria-roledescription="carousel"
        aria-label="Testimoni"
      >
        <button
          type="button"
          className="carousel-arrow previous icon-button"
          aria-label="Testimoni sebelumnya"
          onClick={() => move(-1)}
        >
          <svg className="icon">
            <use href="#i-chevron" />
          </svg>
        </button>
        <div
          className="testimonials-viewport"
          onTouchStart={(event) => {
            touch.current = event.touches[0].clientX;
          }}
          onTouchEnd={(event) => {
            if (
              touch.current === null ||
              !window.matchMedia("(max-width:760px)").matches
            )
              return;
            const delta = event.changedTouches[0].clientX - touch.current;
            if (Math.abs(delta) > 45) move(delta > 0 ? -1 : 1);
            touch.current = null;
          }}
        >
          <div
            className="testimonial-track"
            style={{ "--testimonial-index": index } as CSSProperties}
          >
            {testimonials.map((item, position) => (
              <article
                key={item.name}
                className="testimonial-card"
                style={{ order: (position - index + count) % count }}
              >
                <span className="quote-mark" aria-hidden="true">
                  “
                </span>
                <blockquote>{item.text}</blockquote>
                <div className="testimonial-person">
                  <div
                    className={`testimonial-avatar avatar-${position}`}
                    aria-hidden="true"
                  >
                    {item.avatar}
                  </div>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                  </div>
                  <span className="stars" aria-label="5 dari 5 bintang">
                    ★★★★★
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="carousel-arrow next icon-button"
          aria-label="Testimoni berikutnya"
          onClick={() => move(1)}
        >
          <svg className="icon">
            <use href="#i-chevron" />
          </svg>
        </button>
      </div>
      <div className="carousel-dots" aria-label="Pilih testimoni">
        {testimonials.map((item, position) => (
          <button
            key={item.name}
            type="button"
            aria-label={`Tampilkan ${item.name}`}
            aria-pressed={index === position}
            className={index === position ? "active" : ""}
            onClick={() => setIndex(position)}
          />
        ))}
      </div>
    </>
  );
}
