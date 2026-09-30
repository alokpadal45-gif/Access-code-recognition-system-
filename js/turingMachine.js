// turingMachine.js
// Stage 3, and this one's the real final say on whether the code is
// accepted or not. Unlike the FA and PDA stages, this one doesn't trust
// that the earlier stages already checked things - it re-checks the
// whole tape from scratch on its own. That felt like the right way to do
// it since the TM is supposed to be the "most powerful" model out of the
// three and the last word on the decision.
//
// the technique here is the classic one for w#n#w^R type languages:
// the head keeps bouncing back and forth between the leftmost unmarked
// letter of the first block and the rightmost unmarked letter of the
// last block, comparing one pair at a time and marking them off
// (lowercase = already matched) as it goes. Did this on paper with JFLAP
// first before coding it, so the marking idea comes from that.

const TM_BLANK = '_';

class TuringMachine {
  constructor() {
    this.head = 0;
    this.tape = [];
    this.trace = [];
  }

  moveHeadTo(position, note) {
    this.head = position;
    this.trace.push({
      head: this.head,
      tape: this.tape.join(''),
      note,
    });
  }

  write(position, symbol, note) {
    this.tape[position] = symbol;
    this.trace.push({
      head: position,
      tape: this.tape.join(''),
      note,
    });
  }

  run(input) {
    this.tape = input.split('');
    this.head = 0;
    this.trace = [];

    this.trace.push({ head: 0, tape: this.tape.join(''), note: 'initial tape' });

    // first pass: just scan left to right and find where the two #'s are
    let hash1 = -1;
    let hash2 = -1;

    for (let i = 0; i < this.tape.length; i += 1) {
      this.moveHeadTo(i, `scanning for separators, reading '${this.tape[i]}'`);
      if (this.tape[i] === '#') {
        if (hash1 === -1) {
          hash1 = i;
        } else if (hash2 === -1) {
          hash2 = i;
        } else {
          return this.reject('More than two separators found on the tape.');
        }
      }
    }

    if (hash1 === -1 || hash2 === -1) {
      return this.reject('Could not locate two separators on the tape.');
    }

    // now make sure each section only has the symbols it's supposed to.
    // (yes, the FA already checked this if we got this far normally, but
    // this stage is meant to stand on its own)
    for (let i = 0; i < hash1; i += 1) {
      if (this.tape[i] !== 'A' && this.tape[i] !== 'B') {
        return this.reject(`Symbol '${this.tape[i]}' at position ${i} is not a valid letter in the first sequence.`);
      }
    }
    for (let i = hash1 + 1; i < hash2; i += 1) {
      if (this.tape[i] < '0' || this.tape[i] > '9') {
        return this.reject(`Symbol '${this.tape[i]}' at position ${i} is not a valid digit in the numerical section.`);
      }
    }
    for (let i = hash2 + 1; i < this.tape.length; i += 1) {
      if (this.tape[i] !== 'A' && this.tape[i] !== 'B') {
        return this.reject(`Symbol '${this.tape[i]}' at position ${i} is not a valid letter in the final sequence.`);
      }
    }

    const seq1Length = hash1;
    const seq3Length = this.tape.length - (hash2 + 1);

    if (seq1Length === 0 || seq3Length === 0) {
      return this.reject('One of the letter sequences is empty.');
    }

    // can't be a reverse of each other if the lengths don't even match,
    // no point doing the symbol-by-symbol comparison
    if (seq1Length !== seq3Length) {
      return this.reject(`First sequence has length ${seq1Length} but final sequence has length ${seq3Length}; they cannot be reverses of each other.`);
    }

    // this is the actual bouncing part - left pointer creeps in from the
    // start, right pointer creeps in from the end, meet in the middle
    let left = 0;
    let right = this.tape.length - 1;

    while (left < hash1) {
      this.moveHeadTo(left, `move to leftmost unmarked symbol of first sequence`);
      const leftSymbol = this.tape[left];

      this.moveHeadTo(right, `move to rightmost unmarked symbol of final sequence`);
      const rightSymbol = this.tape[right];

      if (leftSymbol.toUpperCase() !== rightSymbol.toUpperCase()) {
        return this.reject(`Position ${left} ('${leftSymbol}') does not match position ${right} ('${rightSymbol}').`);
      }

      // mark both as done by lowercasing them, so the tape view shows
      // exactly which pairs have already been confirmed
      this.write(left, leftSymbol.toLowerCase(), `mark matched pair (${leftSymbol} / ${rightSymbol})`);
      this.write(right, rightSymbol.toLowerCase(), `mark matched pair (${leftSymbol} / ${rightSymbol})`);

      left += 1;
      right -= 1;
    }

    return {
      accepted: true,
      trace: this.trace,
      finalTape: this.tape.join(''),
      failureReason: null,
    };
  }

  reject(reason) {
    return {
      accepted: false,
      trace: this.trace,
      finalTape: this.tape.join(''),
      failureReason: reason,
    };
  }
}
