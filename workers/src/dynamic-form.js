// dynamic-form.js — renders a form built in the admin's Forms tab (see
// 0008_lead_forms.sql for the forms/form_sections/form_questions schema).
// Registered as the "dynamic_form" block in blocks.js. `form` here is
// whatever getForm(env, key) in index.js fetched: a forms row with
// form_sections(*) nested, each with form_questions(*) nested.

import { tokens } from "./tokens.js";

function esc(s = "") {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escAttr(s = "") {
  return esc(s).replaceAll('"', "&quot;");
}

const INPUT_TYPE = {
  single_line: "text",
  email: "email",
  phone: "tel",
  date: "date",
  number: "number",
};

// name attribute: field_key when set (so a submission maps straight onto
// contacts.name/email/phone), otherwise a stable q_<id> so custom/free-form
// questions still land in leads.payload under something identifiable.
function fieldName(q) {
  return q.field_key ? q.field_key : `q_${q.id}`;
}

function renderQuestion(q) {
  if (q.type === "section_header") {
    return `
      <div class="df-field df-full df-header-field">
        <h4 class="df-header-label">${esc(q.label)}</h4>
        ${q.help_text ? `<p class="df-help">${esc(q.help_text)}</p>` : ""}
      </div>`;
  }

  const name = fieldName(q);
  const required = q.required ? "required" : "";
  const options = Array.isArray(q.options) ? q.options : [];
  let inputHtml = "";

  if (q.type === "multi_line") {
    inputHtml = `<textarea name="${escAttr(name)}" data-qid="${q.id}" placeholder="${escAttr(q.placeholder || "")}" ${required}></textarea>`;
  } else if (q.type === "dropdown") {
    const opts = options.map((o) => `<option value="${escAttr(o.value)}">${esc(o.label)}</option>`).join("");
    inputHtml = `<select name="${escAttr(name)}" data-qid="${q.id}" ${required}><option value="">Select…</option>${opts}</select>`;
  } else if (q.type === "radio" || q.type === "yesno") {
    const opts = q.type === "yesno" ? [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }] : options;
    inputHtml = `<div class="df-choice-group">${opts.map((o) =>
      `<label class="df-radio"><input type="radio" name="${escAttr(name)}" value="${escAttr(o.value)}" data-qid="${q.id}" ${required}> ${esc(o.label)}</label>`
    ).join("")}</div>`;
  } else if (q.type === "multicheck") {
    inputHtml = `<div class="df-choice-group">${options.map((o) =>
      `<label class="df-checkbox"><input type="checkbox" name="${escAttr(name)}[]" value="${escAttr(o.value)}" data-qid="${q.id}"> ${esc(o.label)}</label>`
    ).join("")}</div>`;
  } else if (q.type === "checkbox") {
    // Single boolean checkbox — the question's own label doubles as the
    // checkbox text, so we skip the separate <label class="df-label"> below.
    inputHtml = `<label class="df-checkbox"><input type="checkbox" name="${escAttr(name)}" value="true" data-qid="${q.id}"> ${esc(q.label)}</label>`;
  } else if (q.type === "range") {
    const opts = options && !Array.isArray(options) ? options : {};
    const min = opts.min ?? 0, max = opts.max ?? 100, step = opts.step ?? 1;
    inputHtml = `<input type="range" name="${escAttr(name)}" data-qid="${q.id}" min="${min}" max="${max}" step="${step}">`;
  } else {
    // single_line / email / phone / date / number
    inputHtml = `<input type="${INPUT_TYPE[q.type] || "text"}" name="${escAttr(name)}" data-qid="${q.id}" placeholder="${escAttr(q.placeholder || "")}" ${required}>`;
  }

  const widthClass = q.column_width === "1col" ? "df-half" : "df-full";
  const conditional = q.show_if_question_id
    ? `data-show-if-q="${q.show_if_question_id}" data-show-if-v="${escAttr(q.show_if_value || "")}" style="display:none;"`
    : "";
  const showLabel = q.type !== "checkbox";

  return `
    <div class="df-field ${widthClass}" data-question-id="${q.id}" ${conditional}>
      ${showLabel ? `<label class="df-label">${esc(q.label)}${q.required ? " *" : ""}</label>` : ""}
      ${inputHtml}
      ${q.help_text && showLabel ? `<div class="df-help">${esc(q.help_text)}</div>` : ""}
    </div>`;
}

export function renderDynamicForm(props = {}, form) {
  if (!form) {
    return `<div class="df-missing">This form isn't available right now.</div>`;
  }
  const settings = form.settings || {};
  const sections = (form.form_sections || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
  const sectionsHtml = sections.map((sec) => {
    const questions = (sec.form_questions || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
    return `
      <div class="df-section">
        ${sec.title ? `<h3 class="df-section-title">${esc(sec.title)}</h3>` : ""}
        ${sec.description ? `<p class="df-section-desc">${esc(sec.description)}</p>` : ""}
        <div class="df-grid">${questions.map(renderQuestion).join("")}</div>
      </div>`;
  }).join("");

  const successMessage = settings.successMessage || "Thanks — we'll be in touch shortly.";
  const submitLabel = settings.submitLabel || "Submit";

  return `
    <div class="df-wrap">
      <form id="dform-${form.id}" class="dynamic-form" data-form-key="${escAttr(form.key)}" data-success="${escAttr(successMessage)}" ${settings.redirectUrl ? `data-redirect="${escAttr(settings.redirectUrl)}"` : ""}>
        ${props.heading ? `<h2 class="df-heading">${esc(props.heading)}</h2>` : (form.name ? `<h2 class="df-heading">${esc(form.name)}</h2>` : "")}
        ${sectionsHtml}
        <div class="df-error" style="display:none;"></div>
        <button type="submit" class="df-submit">${esc(submitLabel)}</button>
      </form>
    </div>
    <script>
    (function() {
      var form = document.getElementById('dform-${form.id}');
      if (!form) return;

      function triggerValue(qid) {
        var checked = form.querySelector('[data-qid="' + qid + '"]:checked');
        if (checked) return checked.value;
        var el = form.querySelector('[data-qid="' + qid + '"]');
        return el ? el.value : null;
      }

      function updateConditions() {
        var fields = form.querySelectorAll('[data-show-if-q]');
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          var qid = field.getAttribute('data-show-if-q');
          var want = field.getAttribute('data-show-if-v');
          var show = !qid || triggerValue(qid) === want;
          field.style.display = show ? '' : 'none';
          var controls = field.querySelectorAll('input,select,textarea');
          for (var j = 0; j < controls.length; j++) controls[j].disabled = !show;
        }
      }
      form.addEventListener('change', updateConditions);
      updateConditions();

      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var answers = {};
        var seenChecks = {};
        Array.prototype.forEach.call(form.elements, function(el) {
          if (!el.name || el.disabled || el.type === 'submit') return;
          if (el.type === 'checkbox') {
            var key = el.name.replace(/\\[\\]$/, '');
            if (!seenChecks[key]) seenChecks[key] = [];
            if (el.checked) seenChecks[key].push(el.value);
            answers[key] = seenChecks[key];
          } else if (el.type === 'radio') {
            if (el.checked) answers[el.name] = el.value;
          } else {
            answers[el.name] = el.value;
          }
        });

        var errorEl = form.querySelector('.df-error');
        var submitBtn = form.querySelector('.df-submit');
        if (submitBtn) submitBtn.disabled = true;
        if (errorEl) errorEl.style.display = 'none';

        fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form_key: form.getAttribute('data-form-key'),
            answers: answers,
            source_page: location.pathname,
          }),
        }).then(function(r) {
          if (!r.ok) throw new Error('Submit failed');
          var redirect = form.getAttribute('data-redirect');
          if (redirect) { location.href = redirect; return; }
          form.innerHTML = '<p class="df-success">' + form.getAttribute('data-success') + '</p>';
        }).catch(function() {
          if (submitBtn) submitBtn.disabled = false;
          if (errorEl) { errorEl.textContent = 'Something went wrong — please try again.'; errorEl.style.display = 'block'; }
        });
      });
    })();
    </script>`;
}
