// pushdownAutomaton.js
// Stage 2. By the time we get here the FA has already said the shape of
// the code is fine, so we're not re-checking that. This stage only cares
// about one thing: is the last letter block actually the reverse of the
// first one.
//
// how it works: every letter in the first block gets pushed onto a stack.
// once we hit the second #, we start reading the last block and for each
// letter we pop the stack and compare. if they all match up AND the stack
// ends up empty exactly when the input ends, it's accepted. this is why a
// plain FA can't do this part - it has no stack, no memory of what came
// before.

const PDA_STATES = {
  P0_PUSH_SEQ1: 'p0',
  P1_SKIP_DIGITS: 'p1',
  P2_POP_SEQ2: 'p2',
};

class PushdownAutomaton {
  run(input) {
    const stack = [];
    const trace = [];
    let state = PDA_STATES.P0_PUSH_SEQ1;

    for (let i = 0; i < input.length; i += 1) {
      const symbol = input[i];

      if (state === PDA_STATES.P0_PUSH_SEQ1) {
        if (symbol === '#') {
          state = PDA_STATES.P1_SKIP_DIGITS;
          trace.push({ step: i + 1, action: 'read separator', symbol, stack: [...stack], state });
          continue;
        }
        // this is a letter from the first sequence, so onto the stack it goes
        stack.push(symbol);
        trace.push({ step: i + 1, action: 'push', symbol, stack: [...stack], state });
        continue;
      }

      if (state === PDA_STATES.P1_SKIP_DIGITS) {
        // the number section doesn't matter for this stage, we just pass through it
        if (symbol === '#') {
          state = PDA_STATES.P2_POP_SEQ2;
          trace.push({ step: i + 1, action: 'read separator', symbol, stack: [...stack], state });
          continue;
        }
        trace.push({ step: i + 1, action: 'ignore (digit section)', symbol, stack: [...stack], state });
        continue;
      }

      if (state === PDA_STATES.P2_POP_SEQ2) {
        const top = stack.pop();

        if (top === undefined) {
          // ran out of stack before running out of input - means the final
          // sequence is longer than the first one, can't be a valid reverse
          trace.push({ step: i + 1, action: 'pop on empty stack', symbol, stack: [], state });
          return {
            accepted: false,
            trace,
            failureReason: `Stack was empty when reading '${symbol}' at position ${i + 1}; the final sequence is longer than the first.`,
          };
        }

        if (top !== symbol) {
          trace.push({ step: i + 1, action: `pop and compare ('${top}' vs '${symbol}')`, symbol, stack: [...stack], state });
          return {
            accepted: false,
            trace,
            failureReason: `Symbol '${symbol}' at position ${i + 1} does not match stack top '${top}'; the final sequence is not the reverse of the first.`,
          };
        }

        trace.push({ step: i + 1, action: `pop and compare ('${top}' vs '${symbol}') — match`, symbol, stack: [...stack], state });
      }
    }

    // if there's still stuff left in the stack, the final sequence was
    // too short to have matched everything from the first sequence
    if (stack.length > 0) {
      return {
        accepted: false,
        trace,
        failureReason: `Stack still contains ${stack.length} symbol(s) after reading the input; the final sequence is shorter than the first.`,
      };
    }

    return { accepted: true, trace, failureReason: null };
  }
}
