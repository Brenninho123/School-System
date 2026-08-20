class MathResolver {
  resolve(input) {
    const original = String(input || "").trim();
    if (!original) {
      return this._error(original, "Digite uma expressão, equação, inequação ou pergunta de matemática.");
    }

    const normalized = this._normalizeDecimals(original);

    try {
      const percentage = this._matchPercentage(normalized);
      if (percentage) return this._solvePercentage(original, percentage);

      const average = this._matchAverage(normalized);
      if (average) return this._solveAverage(original, average);

      const rangeSum = this._matchRangeSum(normalized);
      if (rangeSum) return this._solveRangeSum(original, rangeSum);

      const rangeCount = this._matchRangeCount(normalized);
      if (rangeCount) return this._solveRangeCount(original, rangeCount);

      if (this._looksLikeInequality(normalized)) return this._solveLinearInequality(original, normalized);

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
    return input.replace(/(\d),(\d)/g, "$1.$2");
  }

  _matchPercentage(input) {
    const match = input.match(/(-?\d+(?:\.\d+)?)\s*%\s*(?:de|of)?\s*(-?\d+(?:\.\d+)?)/i);
    if (!match) return null;
    return { percent: parseFloat(match[1]), base: parseFloat(match[2]) };
  }

  _solvePercentage(input, { percent, base }) {
    const fraction = percent / 100;
    const result = fraction * base;
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
    const result = sum / numbers.length;
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

  _looksLikeInequality(input) {
    return /[<>]/.test(input) && /[a-zA-Z]/.test(input);
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

    const result = constant / coefficient;
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
    const kept = tokens.filter(token => /^[-+*/^().\d]+$/.test(token));
    return kept.join(" ").trim() || text.trim();
  }

  _solveExpression(originalInput, input) {
    const tokens = this._tokenize(input);
    const rpn = this._toRPN(tokens);
    const result = this._evalRPN(rpn);
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
      if ("+-*/^()".includes(char)) {
        const isUnaryMinus =
          char === "-" &&
          (tokens.length === 0 || ["+", "-", "*", "/", "^", "("].includes(tokens[tokens.length - 1]));
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
