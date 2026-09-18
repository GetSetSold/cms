/* dynamic-form.css
 * Drop these rules into site-styles.js (or wherever your global stylesheet
 * is built) — they target the class names dynamic-form.js already renders:
 * .df-wrap > form.dynamic-form > .df-section > .df-grid > .df-field
 */

.df-wrap {
  max-width: 760px;
  margin: 0 auto;
}

.dynamic-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.df-heading {
  font-size: 1.9rem;
  margin: 0 0 4px;
}

/* ---- Sections render as their own card/block ---- */
.df-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 24px 28px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.df-section-title {
  margin: 0 0 4px;
  font-size: 1.15rem;
  font-weight: 700;
}

.df-section-desc {
  margin: 0 0 16px;
  color: #6b7280;
  font-size: 0.95rem;
}

/* This is the rule that was missing: without it every .df-field just
 * stacks full-width because <div style="grid-template-columns:..."> alone
 * does nothing unless the container is actually display:grid. */
.df-grid {
  display: grid;
  gap: 18px 24px;
  align-items: start;
}

/* ---- Each question renders as its own wrapped block inside the grid ---- */
.df-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0; /* let long labels/inputs shrink inside a grid track */
}

.df-label {
  font-weight: 600;
  font-size: 0.92rem;
  color: #374151;
}

.df-help {
  font-size: 0.82rem;
  color: #6b7280;
  margin: 0;
}

.df-field input[type="text"],
.df-field input[type="email"],
.df-field input[type="tel"],
.df-field input[type="date"],
.df-field input[type="number"],
.df-field textarea,
.df-field select {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.df-field textarea {
  min-height: 90px;
  resize: vertical;
}

.df-field input:focus,
.df-field textarea:focus,
.df-field select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.df-field input[type="range"] {
  width: 100%;
}

/* Section header question type — spans the row, reads like a sub-heading */
.df-header-field { gap: 2px; }
.df-header-label { margin: 0; font-size: 1.02rem; font-weight: 700; }

/* ---- Radio / checkbox groups: each option is its own bordered chip,
 * not a bare circle floating next to text ---- */
.df-choice-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.df-radio,
.df-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.df-radio:hover,
.df-checkbox:hover {
  border-color: #c7d2fe;
  background: #f8f9ff;
}

.df-radio input,
.df-checkbox input {
  width: 17px;
  height: 17px;
  accent-color: #6366f1;
  flex-shrink: 0;
}

/* A single standalone boolean checkbox (no separate .df-label above it) */
.df-field > .df-checkbox {
  border: 1px solid #e5e7eb;
}

/* ---- Repeater (subform) blocks ---- */
.df-repeater {
  border: 1px dashed #c7d2fe;
  border-radius: 12px;
  padding: 16px 18px;
  background: #f8f9ff;
}

.df-repeater-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.df-repeater-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 18px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  position: relative;
}

.df-repeater-remove {
  grid-column: 1 / -1;
  justify-self: end;
  border: none;
  background: none;
  color: #dc2626;
  font-size: 0.82rem;
  cursor: pointer;
  padding: 2px 4px;
}

.df-repeater-add {
  margin-top: 12px;
  border: 1px dashed #a5b4fc;
  background: #fff;
  color: #4f46e5;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.88rem;
  cursor: pointer;
}

.df-repeater-add:hover { background: #eef2ff; }

/* ---- Conditional (show_if) fields: fade instead of popping in ---- */
.df-field[data-show-if-q] {
  transition: opacity 0.15s ease;
}

/* ---- Submit / errors ---- */
.df-submit {
  align-self: flex-start;
  background: #111827;
  color: #fff;
  border: none;
  border-radius: 9px;
  padding: 12px 26px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.df-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.df-submit:hover:not(:disabled) { background: #000; }

.df-error {
  color: #dc2626;
  font-size: 0.88rem;
}

.df-success {
  text-align: center;
  font-size: 1.05rem;
  padding: 24px 0;
}

/* ---- Responsive: collapse every grid to 1 column below ~640px ---- */
@media (max-width: 640px) {
  .df-section { padding: 18px 18px; }
  .df-grid { grid-template-columns: 1fr !important; }
  .df-repeater-row { grid-template-columns: 1fr; }
}
