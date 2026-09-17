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

// nameOverride/qidOverride let renderQuestion double as the renderer for a
// repeater instance's child fields, where the real `name`/`data-qid` need an
// index baked in (see renderRepeater below) instead of the plain field key.
function renderQuestion(q, nameOverride, qidOverride) {
  if (q.type === "section_header") {
    return `
      <div class="df-field df-full df-header-field">
        <h4 class="df-header-label">${esc(q.label)}</h4>
        ${q.help_text ? `<p class="df-help">${esc(q.help_text)}</p>` : ""}
      </div>`;
  }
  if (q.type === "repeater") return "";

  const name = nameOverride || fieldName(q);
  const qid = qidOverride || q.id;
  const required = q.required ? "required" : "";
  const options = Array.isArray(q.options) ? q.options : [];
  let inputHtml = "";

  if (q.type === "multi_line") {
    inputHtml = `<textarea name="${escAttr(name)}" data-qid="${qid}" placeholder="${escAttr(q.placeholder || "")}" ${required}></textarea>`;
  } else if (q.type === "dropdown") {
    const opts = options.map((o) => `<option value="${escAttr(o.value)}">${esc(o.label)}</option>`).join("");
    inputHtml = `<select name="${escAttr(name)}" data-qid="${qid}" ${required}><option value="">Select…</option>${opts}</select>`;
  } else if (q.type === "radio" || q.type === "yesno") {
    const opts = q.type === "yesno" ? [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }] : options;
    inputHtml = `<div class="df-choice-group">${opts.map((o) =>
      `<label class="df-radio"><input type="radio" name="${escAttr(name)}" value="${escAttr(o.value)}" data-qid="${qid}" ${required}> ${esc(o.label)}</label>`
    ).join("")}</div>`;
  } else if (q.type === "multicheck") {
    inputHtml = `<div class="df-choice-group">${options.map((o) =>
      `<label class="df-checkbox"><input type="checkbox" name="${escAttr(name)}[]" value="${escAttr(o.value)}" data-qid="${qid}"> ${esc(o.label)}</label>`
    ).join("")}</div>`;
  } else if (q.type === "checkbox") {
    // Single boolean checkbox — the question's own label doubles as the
    // checkbox text, so we skip the separate <label class="df-label"> below.
    inputHtml = `<label class="df-checkbox"><input type="checkbox" name="${escAttr(name)}" value="true" data-qid="${qid}"> ${esc(q.label)}</label>`;
  } else if (q.type === "range") {
    const opts = options && !Array.isArray(options) ? options : {};
    const min = opts.min ?? 0, max = opts.max ?? 100, step = opts.step ?? 1;
    inputHtml = `<input type="range" name="${escAttr(name)}" data-qid="${qid}" min="${min}" max="${max}" step="${step}">`;
  } else {
    // single_line / email / phone / date / number
    inputHtml = `<input type="${INPUT_TYPE[q.type] || "text"}" name="${escAttr(name)}" data-qid="${qid}" placeholder="${escAttr(q.placeholder || "")}" ${required}>`;
  }

  const widthClass = q.column_width === "1col" ? "df-half" : "df-full";
  const conditional = q.show_if_question_id
    ? `data-show-if-q="${q.show_if_question_id}" data-show-if-v="${escAttr(q.show_if_value || "")}" style="display:none;"`
    : "";
  const showLabel = q.type !== "checkbox";

  return `
    <div class="df-field ${widthClass}" data-question-id="${qid}" ${conditional}>
      ${showLabel ? `<label class="df-label">${esc(q.label)}${q.required ? " *" : ""}</label>` : ""}
      ${inputHtml}
      ${q.help_text && showLabel ? `<div class="df-help">${esc(q.help_text)}</div>` : ""}
    </div>`;
}

// A repeater is a question with type:'repeater'. Its children are other
// questions in the SAME form (any section) with parent_question_id === the
// repeater's id — they are pulled out of normal section rendering and
// rendered only inside the repeater's repeating template. options holds
// { source_question_id, min, max }: when source_question_id is set, the
// instance count tracks that (numeric) question's live value; otherwise the
// user manually adds/removes rows within [min, max].
function renderRepeater(q, children) {
  const opts = q.options && !Array.isArray(q.options) ? q.options : {};
  const min = Number.isFinite(opts.min) ? opts.min : 0;
  const max = Number.isFinite(opts.max) ? opts.max : 10;
  const sourceId = opts.source_question_id || "";

  // __IDX__ is replaced client-side with the instance number when a new
  // repeated row is rendered.
  const templateFields = children
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((child) => renderQuestion(child, `rep_${q.id}__IDX__${fieldName(child)}`, `${child.id}__IDX__`))
    .join("");

  return `
    <div class="df-field df-full df-repeater" data-repeater-id="${q.id}" data-repeater-source="${escAttr(sourceId)}" data-repeater-min="${min}" data-repeater-max="${max}">
      <label class="df-label">${esc(q.label)}${q.required ? " *" : ""}</label>
      ${q.help_text ? `<div class="df-help">${esc(q.help_text)}</div>` : ""}
      <template class="df-repeater-template">${templateFields}</template>
      <div class="df-repeater-items"></div>
      ${!sourceId ? `<button type="button" class="df-repeater-add">+ Add another</button>` : ""}
    </div>`;
}

export function renderDynamicForm(props = {}, form) {
  if (!form) {
    return `<div class="df-missing">This form isn't available right now.</div>`;
  }
  const settings = form.settings || {};
  const sections = (form.form_sections || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
  const allQuestions = sections.flatMap((sec) => sec.form_questions || []);
  const childrenByParent = {};
  for (const q of allQuestions) {
    if (q.parent_question_id) {
      (childrenByParent[q.parent_question_id] ||= []).push(q);
    }
  }
  const sectionsHtml = sections.map((sec) => {
    // Repeater children are rendered only inside their repeater's template,
    // never inline in the section they happen to live in.
    const questions = (sec.form_questions || [])
      .filter((q) => !q.parent_question_id)
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    const fieldsHtml = questions
      .map((q) => (q.type === "repeater" ? renderRepeater(q, childrenByParent[q.id] || []) : renderQuestion(q)))
      .join("");
    return `
      <div class="df-section">
        ${sec.title ? `<h3 class="df-section-title">${esc(sec.title)}</h3>` : ""}
        ${sec.description ? `<p class="df-section-desc">${esc(sec.description)}</p>` : ""}
        <div class="df-grid">${fieldsHtml}</div>
      </div>`;
  }).join("");

  const successMessage = settings.successMessage || "Thanks — we'll be in touch shortly.";
  const submitLabel = settings.submitLabel || "Submit";

  // Wrapped in <section class="block"> like every other block renderer
  // (see blocks-realestate.js / site-styles.js's `.block{ padding:56px;
  // max-width:1440px; margin:0 auto; }`) — without it this block had no
  // side padding or max-width at all, so it ran edge-to-edge on every
  // screen size instead of sitting in the page's normal content column.
  return `
    <section class="block df-block">
      <div class="df-wrap">
        <form id="dform-${form.id}" class="dynamic-form" data-form-key="${escAttr(form.key)}" data-success="${escAttr(successMessage)}" ${settings.redirectUrl ? `data-redirect="${escAttr(settings.redirectUrl)}"` : ""}>
          ${props.heading ? `<h2 class="df-heading">${esc(props.heading)}</h2>` : (form.name ? `<h2 class="df-heading">${esc(form.name)}</h2>` : "")}
          ${sectionsHtml}
          <div class="df-error" style="display:none;"></div>
          <button type="submit" class="df-submit">${esc(submitLabel)}</button>
        </form>
      </div>
    </section>
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

      // --- Repeater groups (e.g. "How Many Employed" -> N repeated
      // {Employer, Job Title, Income} blocks) ---
      var repeaters = form.querySelectorAll('.df-repeater');
      Array.prototype.forEach.call(repeaters, function(rep) {
        var templateEl = rep.querySelector('.df-repeater-template');
        var itemsEl = rep.querySelector('.df-repeater-items');
        var template = templateEl ? templateEl.innerHTML : '';
        var min = parseInt(rep.getAttribute('data-repeater-min'), 10) || 0;
        var max = parseInt(rep.getAttribute('data-repeater-max'), 10) || 10;
        var sourceQid = rep.getAttribute('data-repeater-source');
        var count = 0;

        function renderCount(n) {
          n = Math.max(min, Math.min(max, n || 0));
          while (count < n) {
            var row = document.createElement('div');
            row.className = 'df-repeater-row';
            row.innerHTML = template.split('__IDX__').join(String(count));
            var removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'df-repeater-remove';
            removeBtn.textContent = 'Remove';
            (function(rowEl) {
              removeBtn.addEventListener('click', function() {
                rowEl.remove();
                count--;
                updateConditions();
              });
            })(row);
            if (!sourceQid) row.appendChild(removeBtn);
            itemsEl.appendChild(row);
            count++;
          }
          while (count > n) {
            var last = itemsEl.lastElementChild;
            if (!last) break;
            last.remove();
            count--;
          }
          updateConditions();
        }

        if (sourceQid) {
          var sourceEl = form.querySelector('[data-qid="' + sourceQid + '"]');
          if (sourceEl) {
            var sync = function() {
              var n = parseInt(sourceEl.value, 10);
              renderCount(isNaN(n) ? min : n);
            };
            sourceEl.addEventListener('input', sync);
            sourceEl.addEventListener('change', sync);
            sync();
          } else {
            renderCount(min);
          }
        } else {
          renderCount(min);
          var addBtn = rep.querySelector('.df-repeater-add');
          if (addBtn) addBtn.addEventListener('click', function() { renderCount(count + 1); });
        }
      });

      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var answers = {};
        var seenChecks = {};
        var repeaterAnswers = {};
        Array.prototype.forEach.call(form.elements, function(el) {
          if (!el.name || el.disabled || el.type === 'submit') return;
          if (el.name.indexOf('rep_') === 0) {
            // rep_<repeaterId>__<idx>__<childFieldName>[]
            var parts = el.name.split('__');
            var repKey = parts[0];
            var idx = parts[1];
            var childKey = parts.slice(2).join('__');
            var isMulti = /\\[\\]$/.test(childKey);
            if (isMulti) childKey = childKey.replace(/\\[\\]$/, '');
            if (!repeaterAnswers[repKey]) repeaterAnswers[repKey] = [];
            if (!repeaterAnswers[repKey][idx]) repeaterAnswers[repKey][idx] = {};
            var row = repeaterAnswers[repKey][idx];
            if (el.type === 'checkbox') {
              if (isMulti) {
                if (!row[childKey]) row[childKey] = [];
                if (el.checked) row[childKey].push(el.value);
              } else {
                row[childKey] = el.checked;
              }
            } else if (el.type === 'radio') {
              if (el.checked) row[childKey] = el.value;
            } else {
              row[childKey] = el.value;
            }
            return;
          }
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
        Object.keys(repeaterAnswers).forEach(function(k) {
          answers[k] = repeaterAnswers[k].filter(function(row) { return row; });
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
