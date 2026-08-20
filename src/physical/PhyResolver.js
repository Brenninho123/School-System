const UNITS_MASS = { kg: 1, g: 0.001, t: 1000, tonelada: 1000, toneladas: 1000 };
const UNITS_DISTANCE = { km: 1000, m: 1, cm: 0.01, mm: 0.001 };
const UNITS_TIME = { h: 3600, hora: 3600, horas: 3600, min: 60, minuto: 60, minutos: 60, s: 1, segundo: 1, segundos: 1 };
const UNITS_VELOCITY = { "km/h": 1 / 3.6, "m/s": 1 };
const UNITS_ACCEL = { "m/s²": 1, "m/s2": 1 };
const UNITS_AREA = { "m²": 1, "m2": 1, "cm²": 0.0001, "cm2": 0.0001 };
const UNITS_VOLUME = { "m³": 1, "m3": 1, "cm³": 0.000001, "cm3": 0.000001, l: 0.001, litro: 0.001, litros: 0.001 };
const UNITS_FORCE = { n: 1, newton: 1, newtons: 1 };

class PhyResolver {
  resolve(input) {
    const original = String(input || "").trim();
    if (!original) {
      return this._error(original, "Digite uma questão de física com os valores conhecidos.");
    }

    const normalized = original.replace(/(\d),(\d)/g, "$1.$2");

    try {
      const energiaCinetica = this._matchEnergiaCinetica(normalized);
      if (energiaCinetica) return this._solveEnergiaCinetica(original, energiaCinetica);

      const energiaPotencial = this._matchEnergiaPotencial(normalized);
      if (energiaPotencial) return this._solveEnergiaPotencial(original, energiaPotencial);

      const trabalho = this._matchTrabalho(normalized);
      if (trabalho) return this._solveTrabalho(original, trabalho);

      const pressao = this._matchPressao(normalized);
      if (pressao) return this._solvePressao(original, pressao);

      const densidade = this._matchDensidade(normalized);
      if (densidade) return this._solveDensidade(original, densidade);

      const peso = this._matchPeso(normalized);
      if (peso) return this._solvePeso(original, peso);

      const forca = this._matchForca(normalized);
      if (forca) return this._solveForca(original, forca);

      const mruv = this._matchMRUV(normalized);
      if (mruv) return this._solveMRUV(original, mruv);

      const mru = this._matchMRU(normalized);
      if (mru) return this._solveMRU(original, mru);

      return this._error(
        original,
        "Não identifiquei o tipo de questão. Tente mencionar massa, aceleração, velocidade, tempo, força, energia, densidade, peso, trabalho ou pressão junto com os valores."
      );
    } catch (err) {
      return this._error(original, err.message);
    }
  }

  _error(input, message) {
    return { type: "error", input, result: null, steps: [], message };
  }

  _extractQuantity(text, keywordSource, unitMap, defaultUnit, requireUnit) {
    const unitAlt = Object.keys(unitMap)
      .sort((a, b) => b.length - a.length)
      .join("|");
    const pattern = new RegExp(`(?:${keywordSource})[^\\d-]{0,25}(-?\\d+(?:\\.\\d+)?)\\s*(${unitAlt})?`, "i");
    const match = text.match(pattern);
    if (!match) return null;
    if (requireUnit && !match[2]) return null;
    const raw = parseFloat(match[1]);
    const unit = match[2] ? match[2].toLowerCase() : defaultUnit;
    const multiplier = unitMap[unit] !== undefined ? unitMap[unit] : 1;
    return {
      valueSI: raw * multiplier,
      raw,
      unit: match[2] || defaultUnit,
      index: match.index,
      length: match[0].length
    };
  }

  _extractTime(text) {
    return (
      this._extractQuantity(text, "tempo", UNITS_TIME, "s") ||
      this._extractQuantity(text, "em|durante|por", UNITS_TIME, null, true)
    );
  }

  _strip(text, quantity) {
    if (!quantity) return text;
    return text.slice(0, quantity.index) + " ".repeat(quantity.length) + text.slice(quantity.index + quantity.length);
  }

  _extractGravity(text) {
    const match = text.match(/gravidade\s*(?:de|=)?\s*(-?\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : 10;
  }

  _matchEnergiaCinetica(input) {
    if (!/energia\s+cin[eé]tica/i.test(input)) return null;
    const massa = this._extractQuantity(input, "massa", UNITS_MASS, "kg");
    const velocidade = this._extractQuantity(input, "velocidade", UNITS_VELOCITY, "m/s");
    if (!massa || !velocidade) return null;
    return { massa, velocidade };
  }

  _solveEnergiaCinetica(input, { massa, velocidade }) {
    const result = 0.5 * massa.valueSI * Math.pow(velocidade.valueSI, 2);
    return {
      type: "energia-cinetica",
      input,
      result: `${this._round(result)} J`,
      steps: [
        `Ec = m × v² / 2`,
        `Ec = ${massa.valueSI} × ${velocidade.valueSI}² / 2`,
        `Ec = ${this._round(result)} J`
      ]
    };
  }

  _matchEnergiaPotencial(input) {
    if (!/energia\s+potencial/i.test(input)) return null;
    const massa = this._extractQuantity(input, "massa", UNITS_MASS, "kg");
    const altura = this._extractQuantity(input, "altura", UNITS_DISTANCE, "m");
    if (!massa || !altura) return null;
    const gravidade = this._extractGravity(input);
    return { massa, altura, gravidade };
  }

  _solveEnergiaPotencial(input, { massa, altura, gravidade }) {
    const result = massa.valueSI * gravidade * altura.valueSI;
    return {
      type: "energia-potencial",
      input,
      result: `${this._round(result)} J`,
      steps: [
        `Ep = m × g × h (g = ${gravidade} m/s²)`,
        `Ep = ${massa.valueSI} × ${gravidade} × ${altura.valueSI}`,
        `Ep = ${this._round(result)} J`
      ]
    };
  }

  _matchTrabalho(input) {
    if (!/trabalho/i.test(input)) return null;
    const forca = this._extractQuantity(input, "for[çc]a", UNITS_FORCE, "N");
    const distancia = this._extractQuantity(input, "dist[âa]ncia|deslocamento", UNITS_DISTANCE, "m");
    if (!forca || !distancia) return null;
    return { forca, distancia };
  }

  _solveTrabalho(input, { forca, distancia }) {
    const result = forca.valueSI * distancia.valueSI;
    return {
      type: "trabalho",
      input,
      result: `${this._round(result)} J`,
      steps: [`W = F × d`, `W = ${forca.valueSI} × ${distancia.valueSI}`, `W = ${this._round(result)} J`]
    };
  }

  _matchPressao(input) {
    if (!/press[aã]o/i.test(input)) return null;
    const forca = this._extractQuantity(input, "for[çc]a", UNITS_FORCE, "N");
    const area = this._extractQuantity(input, "[aá]rea", UNITS_AREA, "m²");
    if (!forca || !area) return null;
    return { forca, area };
  }

  _solvePressao(input, { forca, area }) {
    if (area.valueSI === 0) throw new Error("A área não pode ser zero.");
    const result = forca.valueSI / area.valueSI;
    return {
      type: "pressao",
      input,
      result: `${this._round(result)} Pa`,
      steps: [`P = F / A`, `P = ${forca.valueSI} / ${area.valueSI}`, `P = ${this._round(result)} Pa`]
    };
  }

  _matchDensidade(input) {
    if (!/densidade/i.test(input)) return null;
    const massa = this._extractQuantity(input, "massa", UNITS_MASS, "kg");
    const volume = this._extractQuantity(input, "volume", UNITS_VOLUME, "m³");
    if (!massa || !volume) return null;
    return { massa, volume };
  }

  _solveDensidade(input, { massa, volume }) {
    if (volume.valueSI === 0) throw new Error("O volume não pode ser zero.");
    const result = massa.valueSI / volume.valueSI;
    return {
      type: "densidade",
      input,
      result: `${this._round(result)} kg/m³`,
      steps: [
        `d = m / V`,
        `d = ${massa.valueSI} / ${volume.valueSI}`,
        `d = ${this._round(result)} kg/m³`
      ]
    };
  }

  _matchPeso(input) {
    if (!/\bpeso\b/i.test(input)) return null;
    const massa = this._extractQuantity(input, "massa", UNITS_MASS, "kg");
    if (!massa) return null;
    const gravidade = this._extractGravity(input);
    return { massa, gravidade };
  }

  _solvePeso(input, { massa, gravidade }) {
    const result = massa.valueSI * gravidade;
    return {
      type: "peso",
      input,
      result: `${this._round(result)} N`,
      steps: [
        `P = m × g (g = ${gravidade} m/s²)`,
        `P = ${massa.valueSI} × ${gravidade}`,
        `P = ${this._round(result)} N`
      ]
    };
  }

  _matchForca(input) {
    if (!/for[çc]a/i.test(input)) return null;
    const massa = this._extractQuantity(input, "massa", UNITS_MASS, "kg");
    const aceleracao = this._extractQuantity(input, "acelera[çc][aã]o", UNITS_ACCEL, "m/s²");
    if (!massa || !aceleracao) return null;
    return { massa, aceleracao };
  }

  _solveForca(input, { massa, aceleracao }) {
    const result = massa.valueSI * aceleracao.valueSI;
    return {
      type: "forca",
      input,
      result: `${this._round(result)} N`,
      steps: [
        `F = m × a`,
        `F = ${massa.valueSI} × ${aceleracao.valueSI}`,
        `F = ${this._round(result)} N`
      ]
    };
  }

  _detectMRUVTarget(input) {
    if (/qual[\s\S]{0,20}velocidade\s+inicial/i.test(input)) return "v0";
    if (/qual[\s\S]{0,20}velocidade\s+final/i.test(input)) return "v";
    if (/qual[\s\S]{0,15}tempo|quanto\s+tempo/i.test(input)) return "t";
    if (/qual[\s\S]{0,20}(dist[âa]ncia|espa[çc]o)/i.test(input)) return "d";
    if (/qual[\s\S]{0,20}velocidade\b/i.test(input)) return "v";
    return null;
  }

  _matchMRUV(input) {
    const aceleracao = this._extractQuantity(input, "acelera[çc][aã]o", UNITS_ACCEL, "m/s²");
    if (!aceleracao) return null;

    let working = input;
    const v0 = this._extractQuantity(working, "velocidade\\s+inicial|\\bv0\\b|\\bvi\\b", UNITS_VELOCITY, "m/s");
    working = this._strip(working, v0);
    const v = this._extractQuantity(working, "velocidade\\s+final|\\bvf\\b|velocidade", UNITS_VELOCITY, "m/s");
    working = this._strip(working, v);
    const t = this._extractTime(working);
    working = this._strip(working, t);
    const d = this._extractQuantity(working, "dist[âa]ncia|deslocamento|espa[çc]o\\s+percorrido", UNITS_DISTANCE, "m");

    const values = { v0, v, t, d };
    let target = this._detectMRUVTarget(input);
    if (target && values[target]) target = null;
    if (!target) {
      const missing = Object.keys(values).filter(key => !values[key]);
      if (missing.length !== 1) return null;
      target = missing[0];
    }

    if (target === "v0" && v && t) return { aceleracao, v0, v, t, d, missing: target };
    if (target === "t" && v0 && v) return { aceleracao, v0, v, t, d, missing: target };
    if (target === "v" && v0 && t) return { aceleracao, v0, v, t, d, missing: target };
    if (target === "v" && v0 && d) return { aceleracao, v0, v, t, d, missing: target };
    if (target === "d" && v0 && t) return { aceleracao, v0, v, t, d, missing: target };
    if (target === "d" && v0 && v) return { aceleracao, v0, v, t, d, missing: target };

    return null;
  }

  _solveMRUV(input, { aceleracao, v0, v, t, d, missing }) {
    const a = aceleracao.valueSI;
    let result;
    let steps;

    if (missing === "v") {
      if (t) {
        result = v0.valueSI + a * t.valueSI;
        steps = [`v = v0 + a × t`, `v = ${v0.valueSI} + ${a} × ${t.valueSI}`, `v = ${this._round(result)} m/s`];
      } else {
        const inner = Math.pow(v0.valueSI, 2) + 2 * a * d.valueSI;
        if (inner < 0) throw new Error("Não existe velocidade real para esses valores (resultado negativo na raiz).");
        result = Math.sqrt(inner);
        steps = [
          `v² = v0² + 2 × a × d`,
          `v² = ${v0.valueSI}² + 2 × ${a} × ${d.valueSI}`,
          `v = ${this._round(result)} m/s`
        ];
      }
      return { type: "mruv-v", input, result: `${this._round(result)} m/s`, steps };
    }

    if (missing === "v0") {
      result = v.valueSI - a * t.valueSI;
      steps = [`v0 = v - a × t`, `v0 = ${v.valueSI} - ${a} × ${t.valueSI}`, `v0 = ${this._round(result)} m/s`];
      return { type: "mruv-v0", input, result: `${this._round(result)} m/s`, steps };
    }

    if (missing === "t") {
      if (a === 0) throw new Error("A aceleração não pode ser zero para calcular o tempo desta forma.");
      result = (v.valueSI - v0.valueSI) / a;
      steps = [`t = (v - v0) / a`, `t = (${v.valueSI} - ${v0.valueSI}) / ${a}`, `t = ${this._round(result)} s`];
      return { type: "mruv-t", input, result: `${this._round(result)} s`, steps };
    }

    if (t) {
      result = v0.valueSI * t.valueSI + (a * Math.pow(t.valueSI, 2)) / 2;
      steps = [
        `d = v0 × t + a × t² / 2`,
        `d = ${v0.valueSI} × ${t.valueSI} + ${a} × ${t.valueSI}² / 2`,
        `d = ${this._round(result)} m`
      ];
    } else {
      if (a === 0) throw new Error("A aceleração não pode ser zero para calcular a distância desta forma.");
      result = (Math.pow(v.valueSI, 2) - Math.pow(v0.valueSI, 2)) / (2 * a);
      steps = [
        `v² = v0² + 2 × a × d  →  d = (v² - v0²) / (2a)`,
        `d = (${v.valueSI}² - ${v0.valueSI}²) / (2 × ${a})`,
        `d = ${this._round(result)} m`
      ];
    }

    return { type: "mruv-d", input, result: `${this._round(result)} m`, steps };
  }

  _matchMRU(input) {
    if (/acelera[çc][aã]o/i.test(input)) return null;

    let working = input;
    const d = this._extractQuantity(working, "percorre|dist[âa]ncia|espa[çc]o", UNITS_DISTANCE, "m");
    working = this._strip(working, d);
    const t = this._extractTime(working);
    working = this._strip(working, t);
    const v = this._extractQuantity(working, "velocidade", UNITS_VELOCITY, "m/s");

    const values = { v, d, t };
    const missing = Object.keys(values).filter(key => !values[key]);
    if (missing.length !== 1) return null;

    return { v, d, t, missing: missing[0] };
  }

  _solveMRU(input, { v, d, t, missing }) {
    if (missing === "v") {
      if (t.valueSI === 0) throw new Error("O tempo não pode ser zero.");
      const result = d.valueSI / t.valueSI;
      const kmh = result * 3.6;
      return {
        type: "mru-v",
        input,
        result: `${this._round(result)} m/s`,
        steps: [
          `v = d / t`,
          `v = ${d.valueSI} / ${t.valueSI}`,
          `v = ${this._round(result)} m/s (≈ ${this._round(kmh)} km/h)`
        ]
      };
    }

    if (missing === "d") {
      const result = v.valueSI * t.valueSI;
      return {
        type: "mru-d",
        input,
        result: `${this._round(result)} m`,
        steps: [`d = v × t`, `d = ${v.valueSI} × ${t.valueSI}`, `d = ${this._round(result)} m`]
      };
    }

    if (v.valueSI === 0) throw new Error("A velocidade não pode ser zero.");
    const result = d.valueSI / v.valueSI;
    return {
      type: "mru-t",
      input,
      result: `${this._round(result)} s`,
      steps: [`t = d / v`, `t = ${d.valueSI} / ${v.valueSI}`, `t = ${this._round(result)} s`]
    };
  }

  _round(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return value;
    return Math.round(value * 10000) / 10000;
  }
}

if (typeof window !== "undefined") {
  window.PhyResolver = PhyResolver;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = PhyResolver;
}
