import React from "react";
import { FiLoader } from "react-icons/fi";

export function Spinner({ label = "Loading...", compact = false }) {
  return (
    <div className={`spinner${compact ? " spinner--compact" : ""}`}>
      <FiLoader className="spinner__icon" />
      {!compact ? <span>{label}</span> : null}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}) {
  return (
    <div className={`section-header ${className}`.trim()}>
      <div>
        {eyebrow ? <div className="section-kicker">{eyebrow}</div> : null}
        <h1 className="section-title">{title}</h1>
        {description ? <p className="section-copy">{description}</p> : null}
      </div>
      {actions ? <div className="section-header__actions">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, tone = "neutral" }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className={`stat-card__value stat-card__value--${tone}`}>{value}</span>
    </div>
  );
}

export function Surface({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={`surface ${className}`.trim()}>
      {(eyebrow || title || description || actions) && (
        <div className="surface__header">
          <div>
            {eyebrow ? <div className="surface__eyebrow">{eyebrow}</div> : null}
            {title ? <h2 className="surface__title">{title}</h2> : null}
            {description ? (
              <p className="surface__description">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="surface__actions">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`field ${className}`.trim()}>
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function Modal({ open, title, description, children, actions, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {actions ? <div className="modal__actions">{actions}</div> : null}
      </div>
    </div>
  );
}
