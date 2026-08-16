import type { CSSProperties, ReactNode } from "react";

/**
 * Minimal monochrome syntax highlighter. No lexer dependencies: tokens are
 * mapped to a strict zinc-scale hierarchy (see the `--code-*` variables in
 * globals.css) so structure reads at a glance — comments are dimmest,
 * keywords brightest. Inline styles are used (not Tailwind classes) so the
 * palette always resolves regardless of Tailwind's candidate detection.
 */
const TOKEN: Record<string, CSSProperties> = {
  comment: { color: "var(--code-comment)" },
  number: { color: "var(--code-number)" },
  tag: { color: "var(--code-tag)" },
  property: { color: "var(--code-property)" },
  identifier: { color: "var(--code-identifier)" },
  component: { color: "var(--code-component)" },
  string: { color: "var(--code-string)" },
  keyword: { color: "var(--code-keyword)", fontWeight: 600 },
};

const KEYWORDS = new Set([
  "export",
  "default",
  "function",
  "const",
  "let",
  "var",
  "return",
  "import",
  "from",
  "async",
  "await",
  "if",
  "else",
  "for",
  "while",
  "class",
  "interface",
  "type",
  "extends",
  "implements",
  "new",
  "this",
  "true",
  "false",
  "null",
  "undefined",
  "void",
  "throw",
  "try",
  "catch",
  "finally",
  "switch",
  "case",
  "break",
  "continue",
  "typeof",
  "instanceof",
  "in",
  "of",
  "import type",
  "import {",
]);

export function highlight(code: string, lang = "tsx"): ReactNode {
  if (lang === "bash" || lang === "terminal") {
    return highlightBash(code);
  }
  if (lang === "tree") {
    return highlightTree(code);
  }
  return highlightCode(code);
}

function highlightBash(code: string): ReactNode {
  return code.split("\n").map((line, i) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("$")) {
      const indent = line.slice(0, line.length - trimmed.length);
      const rest = trimmed.slice(1);
      return (
        <span key={i} className="block">
          {indent}
          <span style={TOKEN.keyword}>$</span>
          {rest}
        </span>
      );
    }
    if (trimmed === "" || trimmed.startsWith("//")) {
      return (
        <span key={i} className="block" style={TOKEN.comment}>
          {line}
        </span>
      );
    }
    if (trimmed.startsWith("  ")) {
      return (
        <span key={i} className="block" style={TOKEN.comment}>
          {line}
        </span>
      );
    }
    return (
      <span key={i} className="block">
        {line}
      </span>
    );
  });
}

function highlightTree(code: string): ReactNode {
  return code.split("\n").map((line, i) => {
    const s = line.trimStart();
    if (s.endsWith("/")) {
      return (
        <span key={i} className="block" style={TOKEN.identifier}>
          {line}
        </span>
      );
    }
    const commentIdx = s.indexOf("//");
    if (commentIdx !== -1) {
      const before = s.slice(0, commentIdx);
      const after = s.slice(commentIdx);
      return (
        <span key={i} className="block">
          {before}
          <span style={TOKEN.comment}>{after}</span>
        </span>
      );
    }
    return (
      <span key={i} className="block">
        {line}
      </span>
    );
  });
}

function highlightCode(code: string): ReactNode {
  const lines = code.split("\n");
  const result: ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    result.push(
      <span key={i} className="block">
        {tokenizeLine(line)}
      </span>,
    );
  }

  return result;
}

function tokenizeLine(line: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < line.length) {
    if (line[i] === " " || line[i] === "\t") {
      const start = i;
      while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
      tokens.push(line.slice(start, i));
      continue;
    }

    if (line[i] === "/" && line[i + 1] === "/") {
      tokens.push(
        <span key={key++} style={TOKEN.comment}>
          {line.slice(i)}
        </span>,
      );
      break;
    }

    if (line[i] === '"') {
      let str = '"';
      i++;
      while (i < line.length) {
        if (line[i] === "\\") {
          str += line[i];
          i++;
          if (i < line.length) {
            str += line[i];
            i++;
          }
          continue;
        }
        if (line[i] === '"') {
          str += '"';
          i++;
          break;
        }
        str += line[i];
        i++;
      }
      tokens.push(
        <span key={key++} style={TOKEN.string}>
          {str}
        </span>,
      );
      continue;
    }

    if (line[i] === "'") {
      let str = "'";
      i++;
      while (i < line.length) {
        if (line[i] === "\\") {
          str += line[i];
          i++;
          if (i < line.length) {
            str += line[i];
            i++;
          }
          continue;
        }
        if (line[i] === "'") {
          str += "'";
          i++;
          break;
        }
        str += line[i];
        i++;
      }
      tokens.push(
        <span key={key++} style={TOKEN.string}>
          {str}
        </span>,
      );
      continue;
    }

    if (line[i] === "`") {
      let str = "`";
      i++;
      while (i < line.length) {
        if (line[i] === "\\") {
          str += line[i];
          i++;
          if (i < line.length) {
            str += line[i];
            i++;
          }
          continue;
        }
        if (line[i] === "`") {
          str += "`";
          i++;
          break;
        }
        if (line[i] === "$" && line[i + 1] === "{") {
          str += "${";
          i += 2;
          continue;
        }
        str += line[i];
        i++;
      }
      tokens.push(
        <span key={key++} style={TOKEN.string}>
          {str}
        </span>,
      );
      continue;
    }

    if (
      i < line.length &&
      /[0-9]/.test(line[i]!) &&
      (i === 0 || /[\s([,=*/%+\-!<>|&^~?:;]/.test(line[i - 1]!))
    ) {
      let num = "";
      while (i < line.length && /[0-9.]/.test(line[i]!)) {
        num += line[i]!;
        i++;
      }
      tokens.push(
        <span key={key++} style={TOKEN.number}>
          {num}
        </span>,
      );
      continue;
    }

    if (i < line.length && line[i]! === "<") {
      let tag = "<";
      i++;
      if (i < line.length && line[i]! === "/") {
        tag += "/";
        i++;
      }
      const nameStart = i;
      while (i < line.length && /[a-zA-Z0-9]/.test(line[i]!)) {
        i++;
      }
      const name = line.slice(nameStart, i);
      if (name) {
        tag += name;
        tokens.push(
          <span key={key++} style={TOKEN.tag}>
            {tag}
          </span>,
        );
      } else {
        tokens.push(
          <span key={key++} style={TOKEN.tag}>
            {tag}
          </span>,
        );
      }
      continue;
    }

    if (i < line.length && line[i]! === "/" && i + 1 < line.length && line[i + 1]! === ">") {
      tokens.push(
        <span key={key++} style={TOKEN.tag}>
          {"/> "}
        </span>,
      );
      i += 1;
      continue;
    }

    if (i < line.length && /[a-zA-Z_$]/.test(line[i]!)) {
      let word = "";
      while (i < line.length && /[a-zA-Z0-9_$]/.test(line[i]!)) {
        word += line[i]!;
        i++;
      }

      const restTrimmed = line.slice(i).trimStart();
      if (
        restTrimmed.startsWith("=") &&
        !restTrimmed.startsWith("===") &&
        !restTrimmed.startsWith("=>")
      ) {
        tokens.push(
          <span key={key++} style={TOKEN.property}>
            {word}
          </span>,
        );
        const afterWord = line.slice(i);
        const eqIdx = afterWord.indexOf("=");
        if (eqIdx > 0) {
          tokens.push(<span key={key++}>{afterWord.slice(0, eqIdx)}</span>);
          i += eqIdx;
        }
        continue;
      }

      if (KEYWORDS.has(word)) {
        tokens.push(
          <span key={key++} style={TOKEN.keyword}>
            {word}
          </span>,
        );
      } else if (word.length > 0 && word[0]! >= "A" && word[0]! <= "Z") {
        tokens.push(
          <span key={key++} style={TOKEN.component}>
            {word}
          </span>,
        );
      } else {
        tokens.push(<span key={key++}>{word}</span>);
      }
      continue;
    }

    tokens.push(<span key={key++}>{line[i]}</span>);
    i++;
  }

  return tokens;
}
