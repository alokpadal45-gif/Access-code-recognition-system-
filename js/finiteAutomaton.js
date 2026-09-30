// finiteAutomaton.js
// This is stage 1 of the system. All it does is check that the code
// "looks right" - letters, then #, then numbers, then #, then letters again.
// It does NOT check if the last part is actually the reverse of the first
// part, that's the pushdown automaton's job. A plain FA can't do that
// because it has no memory to remember what the letters were.
//
// letters+  #  digits+  #  letters+
//
// only A and B are allowed as letters, based on the language we defined:
// L = { w#n#w^R }

const FA_STATES = {
  Q0_START_SEQ1: 'q0',   // waiting for the very first letter
  Q1_IN_SEQ1: 'q1',      // reading letters, first block
  Q2_START_DIGITS: 'q2', // just saw the first #, need a digit next
  Q3_IN_DIGITS: 'q3',    // reading the number section
  Q4_START_SEQ2: 'q4',   // just saw the second #, need a letter next
  Q5_IN_SEQ2: 'q5',      // reading letters, second block
  ACCEPT: 'q_accept',
  REJECT: 'q_reject',
};

class FiniteAutomaton {
  constructor() {
    this.startState = FA_STATES.Q0_START_SEQ1;
    this.acceptStates = new Set([FA_STATES.ACCEPT]);
  }

  static isLetter(symbol) {
    return symbol === 'A' || symbol === 'B';
  }

  static isDigit(symbol) {
    return symbol >= '0' && symbol <= '9';
  }

  // given the state we're in and the symbol we just read, figure out
  // where we go next. if there's no valid move, we return null and that
  // means reject.
  transition(state, symbol) {
    const { isLetter, isDigit } = FiniteAutomaton;

    switch (state) {
      case FA_STATES.Q0_START_SEQ1:
        // first symbol has to be a letter, can't start with # or a digit
        return isLetter(symbol) ? FA_STATES.Q1_IN_SEQ1 : null;

      case FA_STATES.Q1_IN_SEQ1:
        // keep eating letters until we hit the first separator
        if (isLetter(symbol)) return FA_STATES.Q1_IN_SEQ1;
        if (symbol === '#') return FA_STATES.Q2_START_DIGITS;
        return null;

      case FA_STATES.Q2_START_DIGITS:
        // right after the first #, we need at least one digit
        return isDigit(symbol) ? FA_STATES.Q3_IN_DIGITS : null;

      case FA_STATES.Q3_IN_DIGITS:
        // stay here through the whole number, then move on at the 2nd #
        if (isDigit(symbol)) return FA_STATES.Q3_IN_DIGITS;
        if (symbol === '#') return FA_STATES.Q4_START_SEQ2;
        return null;

      case FA_STATES.Q4_START_SEQ2:
        // same idea as q0 but for the last letter block
        return isLetter(symbol) ? FA_STATES.Q5_IN_SEQ2 : null;

      case FA_STATES.Q5_IN_SEQ2:
        return isLetter(symbol) ? FA_STATES.Q5_IN_SEQ2 : null;

      default:
        return null;
    }
  }

  // runs the whole string through the machine one character at a time.
  // returns whether it was accepted, plus a trace we can show on screen
  // so you can actually see each step it took.
  run(input) {
    const trace = [];
    let state = this.startState;

    for (let i = 0; i < input.length; i += 1) {
      const symbol = input[i];
      const next = this.transition(state, symbol);

      trace.push({
        step: i + 1,
        fromState: state,
        symbol,
        toState: next ?? FA_STATES.REJECT,
      });

      if (next === null) {
        return {
          accepted: false,
          trace,
          failureReason: `No transition defined from state ${state} on symbol '${symbol}' (position ${i + 1}).`,
        };
      }

      state = next;
    }

    // even if we made it through every character, we still need to have
    // ended somewhere that actually counts as "done" (q5), otherwise the
    // input just cut off early, like "AB#123#" with nothing after
    const finishedInAcceptState =
      state === FA_STATES.Q5_IN_SEQ2 && this.acceptStates.has(FA_STATES.ACCEPT);

    if (!finishedInAcceptState) {
      return {
        accepted: false,
        trace,
        failureReason: `Input ended in non-accepting state ${state}; the required sections are incomplete.`,
      };
    }

    trace.push({
      step: input.length + 1,
      fromState: state,
      symbol: '(end of input)',
      toState: FA_STATES.ACCEPT,
    });

    return { accepted: true, trace, failureReason: null };
  }
}
