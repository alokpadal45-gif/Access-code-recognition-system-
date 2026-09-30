// main.js
// This is just the glue code - it grabs whatever the user types, runs it
// through the three machines in order (FA -> PDA -> TM), and dumps each
// one's trace onto the page so you can actually see what happened at
// every step instead of just getting a yes/no at the end.
//
// the moment any stage rejects, we stop right there and don't bother
// running the later stages - no point pushing onto a stack for something
// that already failed the basic shape check.

const PRESET_CASES = [
  { code: 'AB#123#BA', label: 'AB#123#BA', expected: 'valid' },
  { code: 'AAB#99#BAA', label: 'AAB#99#BAA', expected: 'valid' },
  { code: 'B#5#B', label: 'B#5#B', expected: 'valid' },
  { code: 'AB#123#AB', label: 'AB#123#AB', expected: 'invalid' },
  { code: 'AB#ABC#BA', label: 'AB#ABC#BA', expected: 'invalid' },
  { code: 'AB123BA', label: 'AB123BA', expected: 'invalid' },
];

const els = {
  form: document.getElementById('code-form'),
  input: document.getElementById('code-input'),
  presets: document.getElementById('presets'),
  verdict: document.getElementById('verdict'),
  stageFA: document.getElementById('stage-fa'),
  stagePDA: document.getElementById('stage-pda'),
  stageTM: document.getElementById('stage-tm'),
  systemStatus: document.getElementById('system-status'),
};

// the little pill in the header used to just say "System ready" and never
// change no matter what you did, which isn't really telling you anything.
// now it actually reflects the last code that was run through the pipeline.
function updateSystemStatus(status, text) {
  els.systemStatus.classList.remove('is-idle', 'is-accept', 'is-reject');
  els.systemStatus.classList.add(`is-${status}`);
  els.systemStatus.querySelector('.status-text').textContent = text;
}

// builds the little test-case buttons from the same list used in the
// write-up, so clicking one just fills the input and runs it right away
function renderPresets() {
  PRESET_CASES.forEach(({ code, label }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset';
    button.textContent = label;
    button.addEventListener('click', () => {
      els.input.value = code;
      runPipeline(code);
    });
    els.presets.appendChild(button);
  });
}

function setStageStatus(stageEl, status) {
  stageEl.classList.remove('is-pass', 'is-fail', 'is-pending', 'is-skipped');
  stageEl.classList.add(`is-${status}`);
  stageEl.querySelector('.stage-status').textContent = {
    pending: 'Waiting',
    pass: 'Passed',
    fail: 'Failed',
    skipped: 'Skipped',
  }[status];

  // pending/skipped stages don't get a fresh render call, so without this
  // they'd just keep showing whatever trace was left over from the last
  // code that was checked
  if (status === 'pending' || status === 'skipped') {
    stageEl.querySelector('.stage-body').innerHTML = '';
  }
}

function renderFATrace(result) {
  const body = els.stageFA.querySelector('.stage-body');
  body.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'trace-table';
  table.innerHTML = `
    <thead>
      <tr><th>#</th><th>state</th><th>symbol</th><th>next state</th></tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  result.trace.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.step}</td><td>${row.fromState}</td><td>${row.symbol}</td><td>${row.toState}</td>`;
    tbody.appendChild(tr);
  });

  body.appendChild(table);

  if (!result.accepted) {
    const reason = document.createElement('p');
    reason.className = 'reason';
    reason.textContent = result.failureReason;
    body.appendChild(reason);
  }
}

function renderPDATrace(result) {
  const body = els.stagePDA.querySelector('.stage-body');
  body.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'trace-table';
  table.innerHTML = `
    <thead>
      <tr><th>#</th><th>symbol</th><th>action</th><th>stack (top → bottom)</th></tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  result.trace.forEach((row) => {
    const tr = document.createElement('tr');
    // reversing just for display, top of stack should read first left to right
    const stackDisplay = row.stack.length ? [...row.stack].reverse().join(' ') : '(empty)';
    tr.innerHTML = `<td>${row.step}</td><td>${row.symbol}</td><td>${row.action}</td><td class="stack-cell">${stackDisplay}</td>`;
    tbody.appendChild(tr);
  });

  body.appendChild(table);

  if (!result.accepted) {
    const reason = document.createElement('p');
    reason.className = 'reason';
    reason.textContent = result.failureReason;
    body.appendChild(reason);
  }
}

// turns one tape snapshot into little boxes, highlighting wherever the
// head currently is so you can watch it bounce back and forth
function renderTapeString(tapeString, head) {
  return tapeString
    .split('')
    .map((symbol, index) => {
      const cls = index === head ? 'tape-cell tape-cell--head' : 'tape-cell';
      return `<span class="${cls}">${symbol}</span>`;
    })
    .join('');
}

function renderTMTrace(result) {
  const body = els.stageTM.querySelector('.stage-body');
  body.innerHTML = '';

  const scroller = document.createElement('div');
  scroller.className = 'tape-trace';

  result.trace.forEach((row) => {
    const line = document.createElement('div');
    line.className = 'tape-row';
    line.innerHTML = `
      <div class="tape">${renderTapeString(row.tape, row.head)}</div>
      <div class="tape-note">${row.note}</div>
    `;
    scroller.appendChild(line);
  });

  body.appendChild(scroller);

  if (!result.accepted) {
    const reason = document.createElement('p');
    reason.className = 'reason';
    reason.textContent = result.failureReason;
    body.appendChild(reason);
  }
}

function renderVerdict(status, message) {
  els.verdict.classList.remove('is-accept', 'is-reject', 'is-idle');
  els.verdict.classList.add(status === 'accept' ? 'is-accept' : status === 'reject' ? 'is-reject' : 'is-idle');
  els.verdict.querySelector('.verdict-message').textContent = message;

  if (status === 'accept') {
    updateSystemStatus('accept', 'Last code checked: accepted');
  } else if (status === 'reject') {
    updateSystemStatus('reject', 'Last code checked: rejected');
  } else {
    updateSystemStatus('idle', 'No code checked yet');
  }
}

// the actual pipeline. runs FA first, and only moves on to PDA/TM if the
// previous stage actually passed - matches how the three stages were
// meant to build on each other in the write-up.
function runPipeline(rawInput) {
  const input = rawInput.trim();

  if (input.length === 0) {
    renderVerdict('idle', 'Enter an access code above to begin validation.');
    return;
  }

  setStageStatus(els.stageFA, 'pending');
  setStageStatus(els.stagePDA, 'pending');
  setStageStatus(els.stageTM, 'pending');

  const fa = new FiniteAutomaton();
  const faResult = fa.run(input);
  renderFATrace(faResult);
  setStageStatus(els.stageFA, faResult.accepted ? 'pass' : 'fail');

  if (!faResult.accepted) {
    setStageStatus(els.stagePDA, 'skipped');
    setStageStatus(els.stageTM, 'skipped');
    renderVerdict('reject', `Access code rejected at Stage 1 (Finite Automaton). ${faResult.failureReason}`);
    return;
  }

  const pda = new PushdownAutomaton();
  const pdaResult = pda.run(input);
  renderPDATrace(pdaResult);
  setStageStatus(els.stagePDA, pdaResult.accepted ? 'pass' : 'fail');

  if (!pdaResult.accepted) {
    setStageStatus(els.stageTM, 'skipped');
    renderVerdict('reject', `Access code rejected at Stage 2 (Pushdown Automaton). ${pdaResult.failureReason}`);
    return;
  }

  const tm = new TuringMachine();
  const tmResult = tm.run(input);
  renderTMTrace(tmResult);
  setStageStatus(els.stageTM, tmResult.accepted ? 'pass' : 'fail');

  if (!tmResult.accepted) {
    renderVerdict('reject', `Access code rejected at Stage 3 (Turing Machine). ${tmResult.failureReason}`);
    return;
  }

  renderVerdict('accept', `Access code accepted — "${input}" is a member of L = { w#n#wᴿ }.`);
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  runPipeline(els.input.value);
});

renderPresets();