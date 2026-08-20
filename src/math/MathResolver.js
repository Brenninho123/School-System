class MathResolver {
  resolve(input) {
    const raw = String(input || "").trim();
    if (!raw) {
      return this._error(raw, "Digite uma expressão, equação ou pergunta de matemática.");
    }

    try {
      const percentage = this._matchPercentage(raw);
      if (percentage) return this._solvePercentage(raw, percentage);

      const average = this._matchAverage(raw);
      if (average) return this._solveAverage(raw, average);

      if (this._looksLikeEquation(raw)) return this._solveLinearEquation(raw);

      return this._solveExpression(raw);
    } catch (err) {
      return this._error(raw, err.message);
    }
  }

  _error(input, message) {
    return { type: "error", input, result: null, steps: [], message };
  }

  _matchPercentage(input) {
    const match = input.match(/(-?\d+(?:[.,]\d+)?)\s*%\s*(?:de|of)?\s*(-?\d+(?:[.,]\d+)?)/i);
    if (!match) return null;
    return {
      percent: parseFloat(match[1].replace(",", ".")),
      base: parseFloat(match[2].replace(",", "."))
    };
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
    const match = input.match(/m[eé]dia\s+(?:de|entre)?\s*([\d.,\s]+(?:e\s*\d+(?:[.,]\d+)?)?)/i);
    if (!match) return null;
    const numbers = match[1]
      .replace(/\be\b/gi, ",")
      .split(/[,\s]+/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => parseFloat(part.replace(",", ".")))
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

  _looksLikeEquation(input) {
    return input.includes("=") && /[a-zA-Z]/.test(input);
  }

  _solveLinearEquation(input) {
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
          input,
          result: "infinitas soluções",
          steps: [`Os dois lados da equação são sempre iguais, qualquer valor de ${variable} funciona.`]
        };
      }
      return {
        type: "equation",
        input,
        result: "sem solução",
        steps: [`A equação não tem solução: ${coefficient}${variable} = ${constant} é impossível.`]
      };
    }

    const result = constant / coefficient;
    return {
      type: "equation",
      input,
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

    for (const term of terms) {
      const match = term.match(new RegExp(`^([+-]?)(\\d*\\.?\\d*)(${variable})?$`, "i"));
      if (!match) throw new Error(`Não entendi o termo "${term}" da equação.`);
      const sign = match[1] === "-" ? -1 : 1;
      const digits = match[2];
      const hasVariable = Boolean(match[3]);
      const magnitude = digits === "" ? 1 : parseFloat(digits);
      if (hasVariable) {
        coefficient += sign * magnitude;
      } else {
        constant += sign * magnitude;
      }
    }

    return { coefficient, constant };
  }

  _solveExpression(input) {
    const tokens = this._tokenize(input);
    const rpn = this._toRPN(tokens);
    const result = this._evalRPN(rpn);
    return {
      type: "expression",
      input,
      result,
      steps: [
        `Expressão interpretada: ${tokens.join(" ")}`,
        `Resultado: ${this._round(result)}`
      ]
    };
  }

  _tokenize(input) {
    const cleaned = input.replace(/\s+/g, "");
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
      if (!Number.isNaN(parseFloat(token)) && /^[\d.]+$/.test(token)) {
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
