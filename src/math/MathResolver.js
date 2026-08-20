const NOTABLE_ANGLES = {
  0: { sin: 0, cos: 1, tan: 0 },
  30: { sin: 0.5, cos: 0.8660254038, tan: 0.5773502692 },
  45: { sin: 0.7071067812, cos: 0.7071067812, tan: 1 },
  60: { sin: 0.8660254038, cos: 0.5, tan: 1.7320508076 },
  90: { sin: 1, cos: 0, tan: null },
  120: { sin: 0.8660254038, cos: -0.5, tan: -1.7320508076 },
  135: { sin: 0.7071067812, cos: -0.7071067812, tan: -1 },
  150: { sin: 0.5, cos: -0.8660254038, tan: -0.5773502692 },
  180: { sin: 0, cos: -1, tan: 0 },
  270: { sin: -1, cos: 0, tan: null },
  360: { sin: 0, cos: 1, tan: 0 }
};

class MathResolver {
  resolve(input) {
    const original = String(input || "").trim();
    if (!original) {
      return this._error(original, "Digite uma expressão, equação, inequação ou pergunta de matemática.");
    }

    let normalized = this._normalizeDecimals(original);
    normalized = this._normalizeSuperscripts(normalized);
    normalized = this._convertTimesX(normalized);

    try {
      const percentageChange = this._matchPercentageChange(normalized);
      if (percentageChange) return this._solvePercentageChange(original, percentageChange);

      const percentage = this._matchPercentage(normalized);
      if (percentage) return this._solvePercentage(original, percentage);

      const average = this._matchAverage(normalized);
      if (average) return this._solveAverage(original, average);

      const mdcMmc = this._matchMdcMmc(normalized);
      if (mdcMmc) return this._solveMdcMmc(original, mdcMmc);

      const combinatorics = this._matchCombinatorics(normalized);
      if (combinatorics) return this._solveCombinatorics(original, combinatorics);

      const trig = this._matchTrig(normalized);
      if (trig) return this._solveTrig(original, trig);

      const log = this._matchLog(normalized);
      if (log) return this._solveLog(original, log);

      const rangeSum = this._matchRangeSum(normalized);
      if (rangeSum) return this._solveRangeSum(original, rangeSum);

      const rangeCount = this._matchRangeCount(normalized);
      if (rangeCount) return this._solveRangeCount(original, rangeCount);

      const system = this._matchSystem(normalized);
      if (system) return this._solveSystem(original, system);

      if (this._looksLikeInequality(normalized)) return this._solveLinearInequality(original, normalized);

      if (this._looksLikeQuadratic(normalized)) return this._solveQuadraticEquation(original, normalized);

      if (this._looksLikeEquation(normalized)) return this._solveLinearEquation(original, normalized);

      const translated = this._translateWordsToSymbols(normalized);
      return this._solveExpression(original, translated);
    } catch (err) {
      return this._error(original, err.message);
    }
  }

  _error(input, message) {
    return { type: "error", input, result: null, steps: [], message };
  }

  _normalizeDecimals(input) {
    return input.replace(/(?<!\()(\d),(\d)/g, "$1.$2");
  }

  _normalizeSuperscripts(input) {
    return input.replace(/²/g, "^2").replace(/³/g, "^3");
  }

  _convertTimesX(input) {
    let text = input;
    let previous;
    do {
      previous = text;
      text = text.replace(/([\d.]+)\s*[xX]\s*(?=[\d.])/g, "$1*");
    } while (text !== previous);
    return text;
  }

  _matchPercentageChange(input) {
    const match = input.match(
      /(aument\w*|diminu\w*|reduz\w*)\s+(-?\d+(?:\.\d+)?)\s+em\s+(-?\d+(?:\.\d+)?)\s*%/i
    );
    if (!match) return null;
    return {
      isIncrease: /^aument/i.test(match[1]),
      value: parseFloat(match[2]),
      percent: parseFloat(match[3])
    };
  }

  _solvePercentageChange(input, { isIncrease, value, percent }) {
    const factor = isIncrease ? 1 + percent / 100 : 1 - percent / 100;
    const result = this._round(value * factor);
    const verb = isIncrease ? "Aumentar" : "Diminuir";
    const sign = isIncrease ? "+" : "-";
    return {
      type: "percentage-change",
      input,
      result,
      steps: [
        `${verb} ${value} em ${percent}% equivale a multiplicar por (1 ${sign} ${percent}/100) = ${this._round(factor)}`,
        `${value} × ${this._round(factor)} = ${this._round(result)}`
      ]
    };
  }

  _matchPercentage(input) {
    const match = input.match(/(-?\d+(?:\.\d+)?)\s*%\s*(?:de|of)?\s*(-?\d+(?:\.\d+)?)/i);
    if (!match) return null;
    return { percent: parseFloat(match[1]), base: parseFloat(match[2]) };
  }

  _solvePercentage(input, { percent, base }) {
    const fraction = percent / 100;
    const result = this._round(fraction * base);
    return {
      type: "percentage",
      input,
      result,
      steps: [
        `${percent}% equivale a ${percent} / 100 = ${this._round(fraction)}`,
        `${this._round(fraction)} × ${base} = ${this._round(result)}`
      ]
    };
  }

  _matchAverage(input) {
    const match = input.match(/m[eé]dia\s+(?:de|entre)?\s*([\d.\s,]+(?:e\s*\d+(?:\.\d+)?)?)/i);
    if (!match) return null;
    const numbers = match[1]
      .replace(/\be\b/gi, ",")
      .split(/[,\s]+/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => parseFloat(part))
      .filter(value => !Number.isNaN(value));
    if (numbers.length < 2) return null;
    return numbers;
  }

  _solveAverage(input, numbers) {
    const sum = numbers.reduce((total, value) => total + value, 0);
    const result = this._round(sum / numbers.length);
    return {
      type: "average",
      input,
      result,
      steps: [
        `Soma: ${numbers.join(" + ")} = ${this._round(sum)}`,
        `Quantidade de valores: ${numbers.length}`,
        `Média: ${this._round(sum)} / ${numbers.length} = ${this._round(result)}`
      ]
    };
  }

  _matchMdcMmc(input) {
    const match = input.match(/\b(mdc|mmc)\b\s*(?:de|entre)?\s*([\d.,\s e]+)/i);
    if (!match) return null;
    const numbers = match[2]
      .replace(/\be\b/gi, ",")
      .split(/[,\s]+/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => parseInt(part, 10))
      .filter(value => !Number.isNaN(value) && value !== 0);
    if (numbers.length < 2) return null;
    return { kind: match[1].toLowerCase(), numbers };
  }

  _gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
      const remainder = x % y;
      x = y;
      y = remainder;
    }
    return x;
  }

  _solveMdcMmc(input, { kind, numbers }) {
    const isMdc = kind === "mdc";
    const label = isMdc ? "MDC" : "MMC";
    const steps = [];
    let accumulator = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
      const b = numbers[i];
      const gcd = this._gcd(accumulator, b);
      if (isMdc) {
        steps.push(`MDC(${accumulator}, ${b}) = ${gcd}`);
        accumulator = gcd;
      } else {
        const lcm = Math.abs(accumulator * b) / gcd;
        steps.push(`MMC(${accumulator}, ${b}) = (${accumulator} × ${b}) / MDC(${accumulator}, ${b}) = ${lcm}`);
        accumulator = lcm;
      }
    }

    return {
      type: isMdc ? "mdc" : "mmc",
      input,
      result: accumulator,
      steps: [`${label} de ${numbers.join(", ")}:`, ...steps]
    };
  }

  _factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error("O fatorial só existe para inteiros não negativos.");
    if (n > 170) throw new Error("Número grande demais para calcular o fatorial.");
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  _matchCombinatorics(input) {
    const combMatch = input.match(/combina[çc][aã]o\s+de\s*(-?\d+)[,\s]+(?:e\s*)?(-?\d+)|\bC\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/i);
    if (combMatch) {
      const n = parseInt(combMatch[1] || combMatch[3], 10);
      const r = parseInt(combMatch[2] || combMatch[4], 10);
      return { kind: "combinacao", n, r };
    }

    const arrMatch = input.match(/arranjo\s+de\s*(-?\d+)[,\s]+(?:e\s*)?(-?\d+)|\bA\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/i);
    if (arrMatch) {
      const n = parseInt(arrMatch[1] || arrMatch[3], 10);
      const r = parseInt(arrMatch[2] || arrMatch[4], 10);
      return { kind: "arranjo", n, r };
    }

    const permMatch = input.match(/permuta[çc][aã]o\s+de\s*(-?\d+)|\bP\s*\(\s*(-?\d+)\s*\)/i);
    if (permMatch) {
      const n = parseInt(permMatch[1] || permMatch[2], 10);
      return { kind: "permutacao", n };
    }

    const factMatch = input.match(/fatorial\s+de\s*(-?\d+)/i);
    if (factMatch) {
      return { kind: "fatorial", n: parseInt(factMatch[1], 10) };
    }

    return null;
  }

  _solveCombinatorics(input, data) {
    if (data.kind === "fatorial") {
      const result = this._factorial(data.n);
      return {
        type: "fatorial",
        input,
        result,
        steps: [`${data.n}! = ${data.n} × (${data.n}-1) × ... × 1`, `${data.n}! = ${result}`]
      };
    }

    if (data.kind === "permutacao") {
      const result = this._factorial(data.n);
      return {
        type: "permutacao",
        input,
        result,
        steps: [`P(${data.n}) = ${data.n}!`, `P(${data.n}) = ${result}`]
      };
    }

    const { n, r } = data;
    if (r > n || r < 0 || n < 0) throw new Error("Os valores precisam satisfazer 0 ≤ r ≤ n.");

    if (data.kind === "arranjo") {
      const result = this._factorial(n) / this._factorial(n - r);
      return {
        type: "arranjo",
        input,
        result,
        steps: [`A(${n},${r}) = ${n}! / (${n}-${r})!`, `A(${n},${r}) = ${result}`]
      };
    }

    const result = this._factorial(n) / (this._factorial(r) * this._factorial(n - r));
    return {
      type: "combinacao",
      input,
      result,
      steps: [`C(${n},${r}) = ${n}! / (${r}! × (${n}-${r})!)`, `C(${n},${r}) = ${result}`]
    };
  }

  _matchTrig(input) {
    const match = input.match(/\b(seno|cosseno|tangente|sen|cos|tan)\b[^\d-]{0,10}(-?\d+(?:\.\d+)?)\s*(?:graus|°)?/i);
    if (!match) return null;
    const fnNames = { seno: "sin", sen: "sin", cosseno: "cos", cos: "cos", tangente: "tan", tan: "tan" };
    const fn = fnNames[match[1].toLowerCase()];
    const angle = parseFloat(match[2]);
    return { fn, angle };
  }

  _solveTrig(input, { fn, angle }) {
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const label = { sin: "seno", cos: "cosseno", tan: "tangente" }[fn];
    const notable = NOTABLE_ANGLES[normalizedAngle];

    if (notable) {
      const value = notable[fn];
      if (value === null) {
        return {
          type: "trigonometria",
          input,
          result: "indefinida",
          steps: [`${label}(${angle}°) não é definida, pois o cosseno é zero nesse ângulo.`]
        };
      }
      return {
        type: "trigonometria",
        input,
        result: this._round(value),
        steps: [`${angle}° é um ângulo notável.`, `${label}(${angle}°) = ${this._round(value)}`]
      };
    }

    const radians = (normalizedAngle * Math.PI) / 180;
    const raw = fn === "sin" ? Math.sin(radians) : fn === "cos" ? Math.cos(radians) : Math.tan(radians);
    return {
      type: "trigonometria",
      input,
      result: this._round(raw),
      steps: [`${label}(${angle}°) convertido para radianos: ${this._round(radians)}`, `${label}(${angle}°) = ${this._round(raw)}`]
    };
  }

  _matchLog(input) {
    const naturalMatch = input.match(/\bln\s*(?:de)?\s*\(?(-?\d+(?:\.\d+)?)\)?/i);
    if (naturalMatch) {
      return { value: parseFloat(naturalMatch[1]), base: Math.E, isNatural: true };
    }
    const match = input.match(/log(?:aritmo)?\s*(?:de)?\s*\(?(-?\d+(?:\.\d+)?)\)?\s*(?:na\s+base\s*(-?\d+(?:\.\d+)?))?/i);
    if (!match) return null;
    return { value: parseFloat(match[1]), base: match[2] ? parseFloat(match[2]) : 10, isNatural: false };
  }

  _solveLog(input, { value, base, isNatural }) {
    if (value <= 0) throw new Error("O logaritmo só existe para números positivos.");
    if (base <= 0 || base === 1) throw new Error("A base do logaritmo precisa ser positiva e diferente de 1.");
    const result = Math.log(value) / Math.log(base);
    const label = isNatural ? `ln(${value})` : `log${base === 10 ? "" : base}(${value})`;
    return {
      type: "logaritmo",
      input,
      result: this._round(result),
      steps: [`${label} = log(${value}) / log(${base})`, `${label} = ${this._round(result)}`]
    };
  }

  _matchRangeSum(input) {
    const match = input.match(
      /soma\s+(?:d(?:e|os|as))?\s*n[uú]meros?\s+(?:de|entre)\s*(-?\d+)\s*(?:a|e|at[eé])\s*(-?\d+)/i
    );
    if (!match) return null;
    return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
  }

  _solveRangeSum(input, { start, end }) {
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    const count = high - low + 1;
    const result = ((low + high) * count) / 2;
    return {
      type: "range-sum",
      input,
      result,
      steps: [
        `Intervalo de ${low} até ${high}, com ${count} números.`,
        `Soma = (primeiro + último) × quantidade / 2 = (${low} + ${high}) × ${count} / 2`,
        `Soma = ${this._round(result)}`
      ]
    };
  }

  _matchRangeCount(input) {
    const match = input.match(
      /quant[oa]s?\s+n[uú]meros?\s+(pares|[ií]mpares)\s+(?:h[aá]|existem|tem)?\s*(?:entre|de)\s*(-?\d+)\s*(?:a|e|at[eé])\s*(-?\d+)/i
    );
    if (!match) return null;
    return { parity: match[1].toLowerCase(), start: parseInt(match[2], 10), end: parseInt(match[3], 10) };
  }

  _solveRangeCount(input, { parity, start, end }) {
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    const wantsEven = parity.startsWith("par");
    const values = [];
    for (let value = low; value <= high; value++) {
      const isEven = value % 2 === 0;
      if (isEven === wantsEven) values.push(value);
    }
    return {
      type: "range-count",
      input,
      result: values.length,
      steps: [
        `Números ${parity} entre ${low} e ${high}: ${values.join(", ") || "nenhum"}.`,
        `Quantidade: ${values.length}`
      ]
    };
  }

  _matchSystem(input) {
    const parts = input
      .split(/,|;|\s+e\s+(?=[a-zA-Z0-9-])/i)
      .map(part => part.trim())
      .filter(Boolean);
    if (parts.length !== 2) return null;
    if (!parts.every(part => part.includes("=") && /[a-zA-Z]/.test(part))) return null;

    const letters = Array.from(new Set((parts.join(" ").match(/[a-zA-Z]/g) || []).map(letter => letter.toLowerCase())));
    if (letters.length !== 2) return null;

    return { equations: parts, varA: letters[0], varB: letters[1] };
  }

  _parseLinearTwoVarSide(side, varA, varB) {
    const normalized = side.replace(/\s+/g, "").replace(/-/g, "+-");
    const terms = normalized.split("+").filter(Boolean);
    let coeffA = 0;
    let coeffB = 0;
    let constant = 0;

    const termPattern = new RegExp(`^([+-]?)(\\d*\\.?\\d*)(?:\\*)?(${varA}|${varB})?(?:\\/(\\d+(?:\\.\\d+)?))?$`, "i");

    for (const term of terms) {
      const match = term.match(termPattern);
      if (!match) throw new Error(`Não entendi o termo "${term}" do sistema.`);
      const sign = match[1] === "-" ? -1 : 1;
      const digits = match[2];
      const varPart = match[3] ? match[3].toLowerCase() : null;
      const divisor = match[4] ? parseFloat(match[4]) : 1;
      if (divisor === 0) throw new Error("Divisão por zero em um dos termos.");
      const magnitude = (digits === "" ? 1 : parseFloat(digits)) / divisor;
      if (varPart === varA) coeffA += sign * magnitude;
      else if (varPart === varB) coeffB += sign * magnitude;
      else constant += sign * magnitude;
    }

    return { coeffA, coeffB, constant };
  }

  _parseSystemEquation(equation, varA, varB) {
    const [leftRaw, rightRaw] = equation.split("=");
    if (rightRaw === undefined) throw new Error("Cada equação do sistema precisa ter um sinal de igual.");
    const left = this._parseLinearTwoVarSide(leftRaw, varA, varB);
    const right = this._parseLinearTwoVarSide(rightRaw, varA, varB);
    return {
      a: left.coeffA - right.coeffA,
      b: left.coeffB - right.coeffB,
      c: right.constant - left.constant
    };
  }

  _solveSystem(input, { equations, varA, varB }) {
    const eq1 = this._parseSystemEquation(equations[0], varA, varB);
    const eq2 = this._parseSystemEquation(equations[1], varA, varB);

    const determinant = eq1.a * eq2.b - eq2.a * eq1.b;

    if (determinant === 0) {
      return {
        type: "system",
        input,
        result: "sem solução única (sistema indeterminado ou impossível)",
        steps: [
          `${this._round(eq1.a)}${varA} + ${this._round(eq1.b)}${varB} = ${this._round(eq1.c)}`,
          `${this._round(eq2.a)}${varA} + ${this._round(eq2.b)}${varB} = ${this._round(eq2.c)}`,
          `O determinante é zero, então as retas são paralelas ou coincidentes.`
        ]
      };
    }

    const valueA = (eq1.c * eq2.b - eq2.c * eq1.b) / determinant;
    const valueB = (eq1.a * eq2.c - eq2.a * eq1.c) / determinant;

    return {
      type: "system",
      input,
      result: `${varA} = ${this._round(valueA)}, ${varB} = ${this._round(valueB)}`,
      steps: [
        `${this._round(eq1.a)}${varA} + ${this._round(eq1.b)}${varB} = ${this._round(eq1.c)}`,
        `${this._round(eq2.a)}${varA} + ${this._round(eq2.b)}${varB} = ${this._round(eq2.c)}`,
        `Resolvendo por regra de Cramer: ${varA} = ${this._round(valueA)}, ${varB} = ${this._round(valueB)}`
      ]
    };
  }

  _looksLikeInequality(input) {
    return /[<>]/.test(input) && /[a-zA-Z]/.test(input);
  }

  _looksLikeQuadratic(input) {
    return input.includes("=") && /[a-zA-Z]\s*\^\s*2/.test(input);
  }

  _looksLikeEquation(input) {
    return input.includes("=") && /[a-zA-Z]/.test(input);
  }

  _solveLinearInequality(originalInput, input) {
    const operatorMatch = input.match(/<=|>=|<|>/);
    if (!operatorMatch) throw new Error("Não encontrei o sinal de desigualdade.");
    const operator = operatorMatch[0];

    const variableMatch = input.match(/[a-zA-Z]/);
    if (!variableMatch) throw new Error("Não encontrei a incógnita da inequação.");
    const variable = variableMatch[0];

    const [leftRaw, rightRaw] = input.split(operator);
    if (rightRaw === undefined) throw new Error("A inequação precisa ter dois lados.");

    const left = this._parseLinearSide(leftRaw, variable);
    const right = this._parseLinearSide(rightRaw, variable);

    let coefficient = left.coefficient - right.coefficient;
    let constant = right.constant - left.constant;
    let finalOperator = operator;
    const wasNegative = coefficient < 0;

    if (coefficient === 0) {
      const holds =
        (operator === "<" && 0 < constant) ||
        (operator === "<=" && 0 <= constant) ||
        (operator === ">" && 0 > constant) ||
        (operator === ">=" && 0 >= constant);
      return {
        type: "inequality",
        input: originalInput,
        result: holds ? `verdadeira para qualquer ${variable}` : "sem solução",
        steps: [`Os termos com ${variable} se cancelam, restando 0 ${operator} ${this._round(constant)}.`]
      };
    }

    if (wasNegative) {
      coefficient = -coefficient;
      constant = -constant;
      finalOperator = { "<": ">", "<=": ">=", ">": "<", ">=": "<=" }[operator];
    }

    const boundary = constant / coefficient;
    return {
      type: "inequality",
      input: originalInput,
      result: `${variable} ${finalOperator} ${this._round(boundary)}`,
      steps: [
        `Isolando os termos com ${variable}: ${this._round(left.coefficient - right.coefficient)}${variable} ${operator} ${this._round(right.constant - left.constant)}`,
        wasNegative
          ? `Dividindo os dois lados por um número negativo, o sinal da desigualdade se inverte.`
          : `Dividindo os dois lados por ${this._round(coefficient)}.`,
        `Resultado: ${variable} ${finalOperator} ${this._round(boundary)}`
      ]
    };
  }

  _solveQuadraticEquation(originalInput, input) {
    const variableMatch = input.match(/([a-zA-Z])\s*\^\s*2/);
    if (!variableMatch) throw new Error("Não encontrei a incógnita quadrática.");
    const variable = variableMatch[1];

    const [leftRaw, rightRaw] = input.split("=");
    if (rightRaw === undefined) throw new Error("A equação precisa ter um sinal de igual.");

    const left = this._parseQuadraticSide(leftRaw, variable);
    const right = this._parseQuadraticSide(rightRaw, variable);

    const a = left.a - right.a;
    const b = left.b - right.b;
    const c = left.c - right.c;

    if (a === 0) {
      if (b === 0) {
        return c === 0
          ? {
              type: "equation",
              input: originalInput,
              result: "infinitas soluções",
              steps: [`Os dois lados da equação são sempre iguais, qualquer valor de ${variable} funciona.`]
            }
          : {
              type: "equation",
              input: originalInput,
              result: "sem solução",
              steps: [`A equação não tem solução: ${this._round(c)} = 0 é impossível.`]
            };
      }
      const linearResult = this._round(-c / b);
      return {
        type: "equation",
        input: originalInput,
        result: linearResult,
        steps: [
          `O termo ${variable}² desaparece, sobrando uma equação linear: ${this._round(b)}${variable} + ${this._round(c)} = 0`,
          `${variable} = ${this._round(-c)} / ${this._round(b)} = ${this._round(linearResult)}`
        ]
      };
    }

    const delta = b * b - 4 * a * c;
    const standardForm = `${this._round(a)}${variable}² ${b >= 0 ? "+" : "-"} ${this._round(Math.abs(b))}${variable} ${c >= 0 ? "+" : "-"} ${this._round(Math.abs(c))} = 0`;

    if (delta < 0) {
      return {
        type: "quadratic-equation",
        input: originalInput,
        result: "sem solução real",
        steps: [
          `Forma padrão: ${standardForm}`,
          `Δ = b² - 4ac = (${this._round(b)})² - 4×(${this._round(a)})×(${this._round(c)}) = ${this._round(delta)}`,
          `Como Δ é negativo, não existe raiz real.`
        ]
      };
    }

    const sqrtDelta = Math.sqrt(delta);

    if (delta === 0) {
      const root = -b / (2 * a);
      return {
        type: "quadratic-equation",
        input: originalInput,
        result: `${variable} = ${this._round(root)}`,
        steps: [
          `Forma padrão: ${standardForm}`,
          `Δ = b² - 4ac = (${this._round(b)})² - 4×(${this._round(a)})×(${this._round(c)}) = ${this._round(delta)}`,
          `Δ = 0, então há uma única raiz: ${variable} = -b / (2a) = ${this._round(-b)} / ${this._round(2 * a)} = ${this._round(root)}`
        ]
      };
    }

    const root1 = (-b + sqrtDelta) / (2 * a);
    const root2 = (-b - sqrtDelta) / (2 * a);
    return {
      type: "quadratic-equation",
      input: originalInput,
      result: `${variable} = ${this._round(root1)} ou ${variable} = ${this._round(root2)}`,
      steps: [
        `Forma padrão: ${standardForm}`,
        `Δ = b² - 4ac = (${this._round(b)})² - 4×(${this._round(a)})×(${this._round(c)}) = ${this._round(delta)}`,
        `${variable} = (-b ± √Δ) / (2a) = (${this._round(-b)} ± ${this._round(sqrtDelta)}) / ${this._round(2 * a)}`,
        `${variable} = ${this._round(root1)} ou ${variable} = ${this._round(root2)}`
      ]
    };
  }

  _parseQuadraticSide(side, variable) {
    const normalized = side.replace(/\s+/g, "").replace(/-/g, "+-");
    const terms = normalized.split("+").filter(Boolean);
    let a = 0;
    let b = 0;
    let c = 0;

    const termPattern = new RegExp(
      `^([+-]?)(\\d*\\.?\\d*)(?:\\*)?(${variable}\\^2|${variable})?(?:\\/(\\d+(?:\\.\\d+)?))?$`,
      "i"
    );

    for (const term of terms) {
      const match = term.match(termPattern);
      if (!match) throw new Error(`Não entendi o termo "${term}".`);
      const sign = match[1] === "-" ? -1 : 1;
      const digits = match[2];
      const varPart = match[3] ? match[3].toLowerCase() : null;
      const divisor = match[4] ? parseFloat(match[4]) : 1;
      if (divisor === 0) throw new Error("Divisão por zero em um dos termos.");
      const magnitude = (digits === "" ? 1 : parseFloat(digits)) / divisor;
      if (varPart === `${variable.toLowerCase()}^2`) {
        a += sign * magnitude;
      } else if (varPart === variable.toLowerCase()) {
        b += sign * magnitude;
      } else {
        c += sign * magnitude;
      }
    }

    return { a, b, c };
  }

  _solveLinearEquation(originalInput, input) {
    const variableMatch = input.match(/[a-zA-Z]/);
    if (!variableMatch) throw new Error("Não encontrei a incógnita da equação.");
    const variable = variableMatch[0];

    const [leftRaw, rightRaw] = input.split("=");
    if (rightRaw === undefined) throw new Error("A equação precisa ter um sinal de igual.");

    const left = this._parseLinearSide(leftRaw, variable);
    const right = this._parseLinearSide(rightRaw, variable);

    const coefficient = left.coefficient - right.coefficient;
    const constant = right.constant - left.constant;

    if (coefficient === 0) {
      if (constant === 0) {
        return {
          type: "equation",
          input: originalInput,
          result: "infinitas soluções",
          steps: [`Os dois lados da equação são sempre iguais, qualquer valor de ${variable} funciona.`]
        };
      }
      return {
        type: "equation",
        input: originalInput,
        result: "sem solução",
        steps: [`A equação não tem solução: ${this._round(coefficient)}${variable} = ${this._round(constant)} é impossível.`]
      };
    }

    const result = this._round(constant / coefficient);
    return {
      type: "equation",
      input: originalInput,
      result,
      steps: [
        `Isolando os termos com ${variable} de um lado: ${this._round(coefficient)}${variable} = ${this._round(constant)}`,
        `${variable} = ${this._round(constant)} / ${this._round(coefficient)} = ${this._round(result)}`
      ]
    };
  }

  _parseLinearSide(side, variable) {
    const normalized = side.replace(/\s+/g, "").replace(/-/g, "+-");
    const terms = normalized.split("+").filter(Boolean);
    let coefficient = 0;
    let constant = 0;

    const termPattern = new RegExp(
      `^([+-]?)(\\d*\\.?\\d*)(?:\\*)?(${variable})?(?:\\/(\\d+(?:\\.\\d+)?))?$`,
      "i"
    );

    for (const term of terms) {
      const match = term.match(termPattern);
      if (!match) throw new Error(`Não entendi o termo "${term}".`);
      const sign = match[1] === "-" ? -1 : 1;
      const digits = match[2];
      const hasVariable = Boolean(match[3]);
      const divisor = match[4] ? parseFloat(match[4]) : 1;
      if (divisor === 0) throw new Error("Divisão por zero em um dos termos.");
      const magnitude = (digits === "" ? 1 : parseFloat(digits)) / divisor;
      if (hasVariable) {
        coefficient += sign * magnitude;
      } else {
        constant += sign * magnitude;
      }
    }

    return { coefficient, constant };
  }

  _translateWordsToSymbols(input) {
    let text = input;
    text = text.replace(/raiz\s+(?:quadrada\s+)?de\s*\(?(-?\d+(?:\.\d+)?)\)?/gi, "sqrt($1)");
    text = text.replace(/√\s*(-?\d+(?:\.\d+)?)/g, "sqrt($1)");
    text = text.replace(/√/g, "sqrt");
    text = text.replace(/dobro\s+de\s*(-?\d+(?:\.\d+)?)/gi, "($1*2)");
    text = text.replace(/triplo\s+de\s*(-?\d+(?:\.\d+)?)/gi, "($1*3)");
    text = text.replace(/metade\s+de\s*(-?\d+(?:\.\d+)?)/gi, "($1/2)");
    text = text.replace(/(-?\d+(?:\.\d+)?)\s*ao\s+quadrado/gi, "($1^2)");
    text = text.replace(/(-?\d+(?:\.\d+)?)\s*ao\s+cubo/gi, "($1^3)");
    text = text.replace(/fatorial\s+de\s*(-?\d+(?:\.\d+)?)/gi, "($1!)");
    text = text.replace(/quanto\s+(?:é|e|vale|d[aá])/gi, " ");
    text = text.replace(/resultado\s+de/gi, " ");
    text = text.replace(/calcul[ea]r?/gi, " ");
    text = text.replace(/\?/g, " ");
    text = text.replace(/dividido\s*(?:por)?/gi, "/");
    text = text.replace(/multiplicado\s*por/gi, "*");
    text = text.replace(/\bvezes\b/gi, "*");
    text = text.replace(/\bmais\b/gi, "+");
    text = text.replace(/\bmenos\b/gi, "-");
    text = text.replace(/elevado\s*a/gi, "^");
    text = text.replace(/×/g, "*");
    text = text.replace(/÷/g, "/");

    const tokens = text.split(/\s+/).filter(Boolean);
    const kept = tokens.filter(token => /^[-+*/^().\d!]+$/.test(token) || /^sqrt\(/i.test(token));
    return kept.join(" ").trim() || text.trim();
  }

  _solveExpression(originalInput, input) {
    const tokens = this._tokenize(input);
    const rpn = this._toRPN(tokens);
    const result = this._round(this._evalRPN(rpn));
    return {
      type: "expression",
      input: originalInput,
      result,
      steps: [
        `Expressão interpretada: ${tokens.join(" ")}`,
        `Resultado: ${this._round(result)}`
      ]
    };
  }

  _tokenize(input) {
    const cleaned = input.replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/");
    if (!cleaned) throw new Error("Não sobrou nenhuma expressão válida para calcular.");
    const tokens = [];
    let i = 0;
    while (i < cleaned.length) {
      const char = cleaned[i];
      if (/\d|\./.test(char)) {
        let number = char;
        i++;
        while (i < cleaned.length && /[\d.]/.test(cleaned[i])) {
          number += cleaned[i];
          i++;
        }
        tokens.push(number);
        continue;
      }
      if (/[a-zA-Z]/.test(char)) {
        let word = char;
        i++;
        while (i < cleaned.length && /[a-zA-Z]/.test(cleaned[i])) {
          word += cleaned[i];
          i++;
        }
        if (word.toLowerCase() === "sqrt") {
          tokens.push("sqrt");
        } else {
          throw new Error(`Função não reconhecida: "${word}"`);
        }
        continue;
      }
      if ("+-*/^()!".includes(char)) {
        const isUnaryMinus =
          char === "-" &&
          (tokens.length === 0 || ["+", "-", "*", "/", "^", "(", "sqrt"].includes(tokens[tokens.length - 1]));
        if (isUnaryMinus) {
          tokens.push("0");
          tokens.push("-");
        } else {
          tokens.push(char);
        }
        i++;
        continue;
      }
      throw new Error(`Caractere não reconhecido: "${char}"`);
    }
    return tokens;
  }

  _toRPN(tokens) {
    const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };
    const rightAssociative = { "^": true };
    const output = [];
    const operators = [];

    for (const token of tokens) {
      if (/^[\d.]+$/.test(token)) {
        output.push(token);
      } else if (token === "!") {
        output.push(token);
      } else if (token === "sqrt") {
        operators.push(token);
      } else if (token in precedence) {
        while (
          operators.length &&
          operators[operators.length - 1] in precedence &&
          (precedence[operators[operators.length - 1]] > precedence[token] ||
            (precedence[operators[operators.length - 1]] === precedence[token] && !rightAssociative[token]))
        ) {
          output.push(operators.pop());
        }
        operators.push(token);
      } else if (token === "(") {
        operators.push(token);
      } else if (token === ")") {
        while (operators.length && operators[operators.length - 1] !== "(") {
          output.push(operators.pop());
        }
        if (!operators.length) throw new Error("Parênteses desbalanceados.");
        operators.pop();
        if (operators.length && operators[operators.length - 1] === "sqrt") {
          output.push(operators.pop());
        }
      } else {
        throw new Error(`Token inválido: "${token}"`);
      }
    }

    while (operators.length) {
      const op = operators.pop();
      if (op === "(" || op === ")") throw new Error("Parênteses desbalanceados.");
      output.push(op);
    }

    return output;
  }

  _evalRPN(rpn) {
    const stack = [];
    for (const token of rpn) {
      if (/^[\d.]+$/.test(token)) {
        stack.push(parseFloat(token));
        continue;
      }
      if (token === "sqrt") {
        const a = stack.pop();
        if (a === undefined) throw new Error("Expressão incompleta.");
        if (a < 0) throw new Error("Raiz de número negativo não é real.");
        stack.push(Math.sqrt(a));
        continue;
      }
      if (token === "!") {
        const a = stack.pop();
        if (a === undefined) throw new Error("Expressão incompleta.");
        stack.push(this._factorial(a));
        continue;
      }
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error("Expressão incompleta.");
      switch (token) {
        case "+": stack.push(a + b); break;
        case "-": stack.push(a - b); break;
        case "*": stack.push(a * b); break;
        case "/":
          if (b === 0) throw new Error("Divisão por zero.");
          stack.push(a / b);
          break;
        case "^": stack.push(Math.pow(a, b)); break;
        default: throw new Error(`Operador desconhecido: "${token}"`);
      }
    }
    if (stack.length !== 1) throw new Error("Expressão inválida.");
    return stack[0];
  }

  _round(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return value;
    return Math.round(value * 10000) / 10000;
  }
}

if (typeof window !== "undefined") {
  window.MathResolver = MathResolver;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = MathResolver;
}
