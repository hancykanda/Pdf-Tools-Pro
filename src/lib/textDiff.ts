/**
 * Small, dependency-free text diff used by the "Compare PDF" tool.
 *
 * The `diff` npm package is not part of this project's dependency set, so the
 * classic LCS algorithm is implemented here: line-level diff for the
 * side-by-side viewer plus a word-level diff to highlight what changed inside
 * a modified line.
 */

export type DiffType = 'unchanged' | 'added' | 'removed' | 'changed';

export interface DiffSegment {
  text: string;
  changed: boolean;
}

export interface DiffRow {
  type: DiffType;
  /** 1-based line number in the original document (null when added). */
  leftNumber: number | null;
  /** 1-based line number in the modified document (null when removed). */
  rightNumber: number | null;
  left: string | null;
  right: string | null;
  /** Word-level highlighting, only present on `changed` rows. */
  leftSegments?: DiffSegment[];
  rightSegments?: DiffSegment[];
}

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  /** 0..1 — share of lines that are identical. */
  similarity: number;
}

export interface DiffResult {
  rows: DiffRow[];
  summary: DiffSummary;
  /** Flat representation kept for backwards compatibility with older clients. */
  flat: Array<{ type: 'added' | 'removed' | 'unchanged'; text: string }>;
}

/** Product of the two sequence lengths above which the O(n*m) LCS is skipped. */
const LCS_CELL_BUDGET = 4_000_000;
/** Minimum word similarity for a removed/added pair to be reported as "changed". */
const CHANGED_PAIR_THRESHOLD = 0.34;

type Op = { type: 'equal' | 'delete' | 'insert'; leftIndex: number; rightIndex: number };

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

/** Splits extracted PDF text into comparable, non-empty lines. */
export function toLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

/** Longest-common-subsequence backtrace over two token arrays. */
function lcsOps(a: string[], b: string[]): Op[] {
  const ops: Op[] = [];

  // Trim the common head/tail so the DP table stays small.
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;

  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++;
  }

  for (let i = 0; i < head; i++) ops.push({ type: 'equal', leftIndex: i, rightIndex: i });

  const midA = a.slice(head, a.length - tail);
  const midB = b.slice(head, b.length - tail);
  const n = midA.length;
  const m = midB.length;

  if (n === 0 || m === 0 || n * m > LCS_CELL_BUDGET) {
    // Degenerate (or too large) — emit deletions followed by insertions.
    for (let i = 0; i < n; i++) {
      ops.push({ type: 'delete', leftIndex: head + i, rightIndex: -1 });
    }
    for (let j = 0; j < m; j++) {
      ops.push({ type: 'insert', leftIndex: -1, rightIndex: head + j });
    }
  } else {
    const width = m + 1;
    const table = new Uint32Array((n + 1) * width);

    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        table[i * width + j] =
          midA[i] === midB[j]
            ? table[(i + 1) * width + (j + 1)] + 1
            : Math.max(table[(i + 1) * width + j], table[i * width + (j + 1)]);
      }
    }

    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        ops.push({ type: 'equal', leftIndex: head + i, rightIndex: head + j });
        i++;
        j++;
      } else if (table[(i + 1) * width + j] >= table[i * width + (j + 1)]) {
        ops.push({ type: 'delete', leftIndex: head + i, rightIndex: -1 });
        i++;
      } else {
        ops.push({ type: 'insert', leftIndex: -1, rightIndex: head + j });
        j++;
      }
    }
    while (i < n) {
      ops.push({ type: 'delete', leftIndex: head + i, rightIndex: -1 });
      i++;
    }
    while (j < m) {
      ops.push({ type: 'insert', leftIndex: -1, rightIndex: head + j });
      j++;
    }
  }

  for (let k = 0; k < tail; k++) {
    ops.push({
      type: 'equal',
      leftIndex: a.length - tail + k,
      rightIndex: b.length - tail + k,
    });
  }

  return ops;
}

function splitWords(line: string): string[] {
  return line.split(/(\s+)/).filter((token) => token.length > 0);
}

/** Word-level diff of two lines, used to highlight the edited words. */
export function diffWords(left: string, right: string): {
  leftSegments: DiffSegment[];
  rightSegments: DiffSegment[];
  similarity: number;
} {
  const a = splitWords(left);
  const b = splitWords(right);
  const ops = lcsOps(a, b);

  const leftSegments: DiffSegment[] = [];
  const rightSegments: DiffSegment[] = [];
  let common = 0;

  const push = (target: DiffSegment[], text: string, changed: boolean) => {
    const last = target[target.length - 1];
    if (last && last.changed === changed) last.text += text;
    else target.push({ text, changed });
  };

  for (const op of ops) {
    if (op.type === 'equal') {
      push(leftSegments, a[op.leftIndex], false);
      push(rightSegments, b[op.rightIndex], false);
      if (a[op.leftIndex].trim().length > 0) common += a[op.leftIndex].length;
    } else if (op.type === 'delete') {
      push(leftSegments, a[op.leftIndex], true);
    } else {
      push(rightSegments, b[op.rightIndex], true);
    }
  }

  const total = Math.max(left.length, right.length, 1);
  return { leftSegments, rightSegments, similarity: common / total };
}

/**
 * Diffs two blocks of text line by line. Adjacent remove/insert runs whose
 * lines are similar enough are merged into `changed` rows so the side-by-side
 * viewer can align them.
 */
export function diffText(originalText: string, modifiedText: string): DiffResult {
  const leftLines = toLines(originalText);
  const rightLines = toLines(modifiedText);

  const ops = lcsOps(leftLines.map(normalizeLine), rightLines.map(normalizeLine));

  const rows: DiffRow[] = [];
  const flat: DiffResult['flat'] = [];
  const summary: DiffSummary = { added: 0, removed: 0, changed: 0, unchanged: 0, similarity: 0 };

  let index = 0;
  while (index < ops.length) {
    const op = ops[index];

    if (op.type === 'equal') {
      rows.push({
        type: 'unchanged',
        leftNumber: op.leftIndex + 1,
        rightNumber: op.rightIndex + 1,
        left: leftLines[op.leftIndex],
        right: rightLines[op.rightIndex],
      });
      flat.push({ type: 'unchanged', text: leftLines[op.leftIndex] });
      summary.unchanged += 1;
      index += 1;
      continue;
    }

    // Collect the whole delete/insert block so removals can be paired with
    // insertions (a "changed" line) instead of showing two unrelated rows.
    const deletions: number[] = [];
    const insertions: number[] = [];
    while (index < ops.length && ops[index].type !== 'equal') {
      if (ops[index].type === 'delete') deletions.push(ops[index].leftIndex);
      else insertions.push(ops[index].rightIndex);
      index += 1;
    }

    const pairs = Math.min(deletions.length, insertions.length);
    let paired = 0;

    for (let k = 0; k < pairs; k++) {
      const left = leftLines[deletions[k]];
      const right = rightLines[insertions[k]];
      const { leftSegments, rightSegments, similarity } = diffWords(left, right);

      if (similarity >= CHANGED_PAIR_THRESHOLD) {
        rows.push({
          type: 'changed',
          leftNumber: deletions[k] + 1,
          rightNumber: insertions[k] + 1,
          left,
          right,
          leftSegments,
          rightSegments,
        });
        flat.push({ type: 'removed', text: left });
        flat.push({ type: 'added', text: right });
        summary.changed += 1;
        paired += 1;
      } else {
        break;
      }
    }

    for (let k = paired; k < deletions.length; k++) {
      rows.push({
        type: 'removed',
        leftNumber: deletions[k] + 1,
        rightNumber: null,
        left: leftLines[deletions[k]],
        right: null,
      });
      flat.push({ type: 'removed', text: leftLines[deletions[k]] });
      summary.removed += 1;
    }

    for (let k = paired; k < insertions.length; k++) {
      rows.push({
        type: 'added',
        leftNumber: null,
        rightNumber: insertions[k] + 1,
        left: null,
        right: rightLines[insertions[k]],
      });
      flat.push({ type: 'added', text: rightLines[insertions[k]] });
      summary.added += 1;
    }
  }

  const totalLines = summary.unchanged + summary.added + summary.removed + summary.changed;
  summary.similarity = totalLines === 0 ? 1 : summary.unchanged / totalLines;

  return { rows, summary, flat };
}
