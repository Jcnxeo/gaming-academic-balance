const files = {
  gaming: "Gaming_Academic_Performance.csv",
  academic: "StudentPerformanceFactors.csv"
};

const state = {
  gaming: [],
  academic: [],
  genreStats: [],
  topGaming: null,
  topAcademic: null,
  latest: null,
  stage: 0,
  chartMetric: "gaming"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return headers.reduce((row, key, index) => {
      row[key] = values[index];
      return row;
    }, {});
  });
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function avg(rows, field) {
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => sum + num(row[field]), 0) / rows.length;
}

function fmt(value, digits = 1) {
  return Number(value).toFixed(digits);
}

function getInput() {
  return {
    gamingHours: num($("#gamingHours").value),
    gamingGenre: $("#gamingGenre").value,
    studyHours: num($("#studyHours").value),
    sleepHours: num($("#sleepHours").value),
    attendance: num($("#attendance").value)
  };
}

function distanceGaming(row, input) {
  const genrePenalty = row.gaming_genre === input.gamingGenre ? 0 : 0.8;
  return (
    Math.abs(num(row.gaming_hours) - input.gamingHours) / 8 +
    Math.abs(num(row.study_hours) - input.studyHours) / 10 +
    Math.abs(num(row.sleep_hours) - input.sleepHours) / 9 +
    Math.abs(num(row.attendance) - input.attendance) / 40 +
    genrePenalty
  );
}

function distanceAcademic(row, input) {
  return (
    Math.abs(num(row.Hours_Studied) - input.studyHours) / 44 +
    Math.abs(num(row.Sleep_Hours) - input.sleepHours) / 10 +
    Math.abs(num(row.Attendance) - input.attendance) / 40
  );
}

function nearest(rows, scoreFn, count = 260) {
  return rows
    .map((row) => ({ row, score: scoreFn(row) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((entry) => entry.row);
}

function buildGenreStats() {
  const groups = groupBy(state.gaming, "gaming_genre");
  state.genreStats = Object.keys(groups).map((genre) => {
    const rows = groups[genre];
    return {
      genre,
      count: rows.length,
      gaming: avg(rows, "gaming_hours"),
      stressHighRate: rows.filter((row) => row.stress_level === "High").length / rows.length,
      addiction: avg(rows, "addiction_score"),
      grades: avg(rows, "grades")
    };
  });

  $("#genreCards").innerHTML = state.genreStats.map((item) => `
    <article class="genre-card">
      <span>${item.count.toLocaleString()}명</span>
      <h3>${item.genre}</h3>
      <div class="mini-stats">
        <div><small>평균 게임시간</small><strong>${fmt(item.gaming)}h</strong></div>
        <div><small>High 스트레스 비율</small><strong>${fmt(item.stressHighRate * 100)}%</strong></div>
        <div><small>평균 중독점수</small><strong>${fmt(item.addiction)}</strong></div>
        <div><small>평균 성적</small><strong>${fmt(item.grades)}</strong></div>
      </div>
    </article>
  `).join("");
  renderGenreChart();
}

function renderGenreChart() {
  const config = {
    gaming: { label: "평균 게임시간", suffix: "h", field: "gaming", digits: 1 },
    stress: { label: "High 스트레스 비율", suffix: "%", field: "stressHighRate", digits: 1, percent: true },
    addiction: { label: "평균 중독점수", suffix: "", field: "addiction", digits: 1 },
    grades: { label: "평균 성적", suffix: "점", field: "grades", digits: 1 }
  }[state.chartMetric];

  const values = state.genreStats.map((item) => {
    const raw = item[config.field];
    return config.percent ? raw * 100 : raw;
  });
  const max = Math.max(...values, 1);

  $("#genreChart").innerHTML = state.genreStats.map((item) => {
    const raw = item[config.field];
    const value = config.percent ? raw * 100 : raw;
    const width = Math.max(4, (value / max) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label">${item.genre}</div>
        <div class="bar-track" title="${config.label}">
          <div class="bar-fill" style="width: ${width}%"></div>
        </div>
        <div class="bar-value">${fmt(value, config.digits)}${config.suffix}</div>
      </div>
    `;
  }).join("");
}

function buildTopPatterns() {
  state.topGaming = topRows(state.gaming, "grades", 0.2);
  state.topAcademic = topRows(state.academic, "Exam_Score", 0.2);

  $("#topPatterns").innerHTML = `
    <article class="pattern-card">
      <span>게임 습관 자료 상위 20%</span>
      <h3>균형형 고성과</h3>
      <small>게임 ${fmt(avg(state.topGaming, "gaming_hours"))}h, 공부 ${fmt(avg(state.topGaming, "study_hours"))}h, 수면 ${fmt(avg(state.topGaming, "sleep_hours"))}h, 출석 ${fmt(avg(state.topGaming, "attendance"))}%</small>
    </article>
    <article class="pattern-card">
      <span>학업 생활 자료 상위 20%</span>
      <h3>출석과 공부시간 우위</h3>
      <small>공부 ${fmt(avg(state.topAcademic, "Hours_Studied"))}h, 수면 ${fmt(avg(state.topAcademic, "Sleep_Hours"))}h, 출석 ${fmt(avg(state.topAcademic, "Attendance"))}%</small>
    </article>
    <article class="pattern-card">
      <span>공통 기준선</span>
      <h3>비교 기준</h3>
      <small>두 데이터 모두 상위권은 높은 출석률과 충분한 공부시간 쪽으로 모입니다. 게임시간은 낮을수록 안정적입니다.</small>
    </article>
  `;
}

function topRows(rows, field, ratio) {
  return [...rows]
    .sort((a, b) => num(b[field]) - num(a[field]))
    .slice(0, Math.max(1, Math.floor(rows.length * ratio)));
}

function groupBy(rows, field) {
  return rows.reduce((groups, row) => {
    const key = row[field] || "Unknown";
    groups[key] = groups[key] || [];
    groups[key].push(row);
    return groups;
  }, {});
}

function profileFor(input, gamingSimilar) {
  const expected = avg(gamingSimilar, "grades");
  if (input.gamingHours >= 6 && input.studyHours < 5) {
    return ["게임 과몰입 위험형", "게임시간은 높고 공부시간은 낮은 패턴입니다."];
  }
  if (input.attendance < 75) {
    return ["출석 취약형", "성적 하락 조건 중 출석률 부족이 가장 크게 보입니다."];
  }
  if (input.sleepHours < 6) {
    return ["수면 부족형", "수면시간이 데이터 평균보다 낮아 컨디션 리스크가 있습니다."];
  }
  if (input.studyHours >= 7 && input.gamingHours <= 3 && input.attendance >= 85) {
    return ["상위권 근접형", "상위권 학생들의 공통 패턴과 꽤 가깝습니다."];
  }
  if (expected >= 75) {
    return ["안정 균형형", "게임과 학습 시간이 비교적 균형 잡힌 패턴입니다."];
  }
  return ["중간 관리형", "한두 가지 습관 조정으로 개선 여지가 있는 패턴입니다."];
}

function academicType(input, academicSimilar) {
  const expected = avg(academicSimilar, "Exam_Score");
  if (input.attendance < 75) {
    return {
      name: "출석 취약형",
      level: "위험",
      reason: "출석률이 낮으면 공부시간이 어느 정도 확보되어도 성적 안정성이 떨어지는 패턴으로 분류됩니다."
    };
  }
  if (input.studyHours < 4.5) {
    return {
      name: "학습시간 부족형",
      level: "위험",
      reason: "공부시간이 학업 생활 자료의 평균보다 낮고, 상위권 패턴과도 거리가 있습니다."
    };
  }
  if (input.sleepHours < 6) {
    return {
      name: "컨디션 불안정형",
      level: "보통",
      reason: "공부시간이나 출석률이 나쁘지 않아도 수면 부족 때문에 집중력 유지가 흔들릴 수 있습니다."
    };
  }
  if (input.studyHours >= 7 && input.attendance >= 88) {
    return {
      name: "상위권 근접 학습형",
      level: "양호",
      reason: "공부시간과 출석률이 상위권 학생들의 공통 패턴에 가깝습니다."
    };
  }
  if (expected >= 70) {
    return {
      name: "균형 학습형",
      level: "양호",
      reason: "비슷한 생활패턴 그룹의 평균 성적이 비교적 안정적인 구간에 있습니다."
    };
  }
  return {
    name: "중간 관리 학습형",
    level: "보통",
    reason: "큰 위험 신호는 아니지만 공부시간, 수면, 출석률 중 하나 이상을 조정하면 개선 가능성이 있습니다."
  };
}

function gamingType(input, gamingSimilar) {
  const addiction = avg(gamingSimilar, "addiction_score");
  const highStressRate = gamingSimilar.filter((row) => row.stress_level === "High").length / gamingSimilar.length;
  if (input.gamingHours >= 6.5 && addiction >= 12) {
    return {
      name: "게임 과몰입형",
      level: "위험",
      reason: "게임시간과 유사 그룹의 중독점수가 모두 높은 편이라 학습 루틴을 밀어낼 가능성이 큽니다."
    };
  }
  if (input.gamingHours >= 5.5 && input.studyHours < 5) {
    return {
      name: "학습 침식형",
      level: "위험",
      reason: "게임시간이 공부시간보다 생활 리듬에서 더 큰 비중을 차지하는 패턴입니다."
    };
  }
  if (highStressRate >= 0.18 || input.sleepHours < 6) {
    return {
      name: "스트레스 민감형",
      level: "보통",
      reason: "게임 자체보다 수면 부족이나 스트레스 조건이 함께 나타날 때 성적 변동성이 커질 수 있습니다."
    };
  }
  if (input.gamingHours <= 3.5 && input.studyHours >= 6) {
    return {
      name: "조절형 게이머",
      level: "양호",
      reason: "게임을 하더라도 공부시간을 크게 해치지 않는 쪽에 가까운 패턴입니다."
    };
  }
  return {
    name: "일반 게이머형",
    level: "보통",
    reason: "게임시간은 평균권이지만 공부시간이나 출석률에 따라 결과가 크게 달라질 수 있습니다."
  };
}

function riskItems(input, gamingSimilar, academicSimilar) {
  const topGame = state.topGaming;
  const topAcad = state.topAcademic;
  return [
    {
      name: "게임시간",
      status: input.gamingHours > avg(topGame, "gaming_hours") + 1.2 ? "위험" : input.gamingHours > avg(state.gaming, "gaming_hours") ? "보통" : "양호",
      text: `입력 ${fmt(input.gamingHours)}h · 상위권 평균 ${fmt(avg(topGame, "gaming_hours"))}h`
    },
    {
      name: "공부시간",
      status: input.studyHours < avg(topAcad, "Hours_Studied") - 1.5 ? "위험" : input.studyHours < avg(state.academic, "Hours_Studied") ? "보통" : "양호",
      text: `입력 ${fmt(input.studyHours)}h · 일반 상위권 평균 ${fmt(avg(topAcad, "Hours_Studied"))}h`
    },
    {
      name: "수면시간",
      status: input.sleepHours < 6 ? "위험" : input.sleepHours < avg(topAcad, "Sleep_Hours") - 0.5 ? "보통" : "양호",
      text: `입력 ${fmt(input.sleepHours)}h · 상위권 평균 ${fmt(avg(topAcad, "Sleep_Hours"))}h`
    },
    {
      name: "출석률",
      status: input.attendance < 75 ? "위험" : input.attendance < avg(topAcad, "Attendance") - 5 ? "보통" : "양호",
      text: `입력 ${fmt(input.attendance)}% · 일반 상위권 평균 ${fmt(avg(topAcad, "Attendance"))}%`
    },
    {
      name: "유사그룹",
      status: avg(gamingSimilar, "grades") < 60 || avg(academicSimilar, "Exam_Score") < 63 ? "위험" : avg(gamingSimilar, "grades") < 72 ? "보통" : "양호",
      text: `게임 유사그룹 ${fmt(avg(gamingSimilar, "grades"))}점 · 일반 유사그룹 ${fmt(avg(academicSimilar, "Exam_Score"))}점`
    }
  ];
}

function renderRisk(items) {
  const riskScore = items.reduce((score, item) => score + (item.status === "위험" ? 2 : item.status === "보통" ? 1 : 0), 0);
  const level = riskScore >= 5 ? "위험" : riskScore >= 2 ? "보통" : "양호";
  const className = level === "위험" ? "bad" : level === "보통" ? "mid" : "good";

  $("#riskBanner").className = `risk-banner ${className}`;
  $("#riskBanner").innerHTML = `<strong>${level}</strong><span>${riskScore}점 위험 점수입니다. 낮을수록 상위권 패턴과 가깝습니다.</span>`;
  $("#riskList").innerHTML = items.map((item) => `
    <article class="risk-item ${statusClass(item.status)}">
      <strong>${item.name}</strong>
      <span>${item.text}</span>
      <em class="tag">${item.status}</em>
    </article>
  `).join("");
}

function statusClass(status) {
  if (status === "위험") return "bad";
  if (status === "양호") return "good";
  return "mid";
}

function makeSolutions(input, risk) {
  const solutions = [];
  if (risk.find((item) => item.name === "게임시간").status !== "양호") {
    solutions.push(`게임시간을 먼저 ${fmt(Math.max(0, input.gamingHours - 1))}시간 수준까지 낮춰보세요. 데이터상 상위권 게임 이용자는 평균 ${fmt(avg(state.topGaming, "gaming_hours"))}시간대에 가깝습니다.`);
  }
  if (risk.find((item) => item.name === "공부시간").status !== "양호") {
    solutions.push(`공부시간은 최소 ${fmt(Math.max(input.studyHours + 1, avg(state.academic, "Hours_Studied")))}시간을 목표로 잡는 편이 좋습니다. 특히 출석률이 낮지 않다면 공부시간 보강 효과가 더 선명합니다.`);
  }
  if (risk.find((item) => item.name === "수면시간").status !== "양호") {
    solutions.push(`수면시간은 6.5~7.5시간 구간을 우선 목표로 두세요. 너무 낮은 수면은 성적보다 먼저 컨디션과 집중력 리스크로 나타납니다.`);
  }
  if (risk.find((item) => item.name === "출석률").status !== "양호") {
    solutions.push(`출석률은 ${fmt(Math.max(input.attendance + 5, 85))}% 이상을 단기 목표로 두세요. 두 데이터셋 모두 상위권 패턴에서 출석률이 높게 나타납니다.`);
  }
  if (!solutions.length) {
    solutions.push("현재 입력값은 상위권 패턴과 꽤 가깝습니다. 게임시간을 유지하되 시험 전에는 공부시간과 수면시간을 먼저 흔들리지 않게 관리하는 전략이 좋습니다.");
  }
  return solutions;
}

function makeAnalysis(input, gamingSimilar, academicSimilar, risks, profileName, profileDesc) {
  const academic = academicType(input, academicSimilar);
  const gaming = gamingType(input, gamingSimilar);
  const solutions = makeSolutions(input, risks);
  const severe = academic.level === "위험" || gaming.level === "위험";
  const tone = severe
    ? "현재 패턴은 성적이 떨어질 위험을 먼저 관리해야 하는 쪽에 가깝습니다."
    : "현재 패턴은 크게 무너진 상태라기보다, 몇 가지 습관을 조정하면 더 안정적인 성과로 옮겨갈 수 있는 쪽입니다.";

  $("#analysisComment").innerHTML = `
    <p><strong>종합 유형은 ${profileName}</strong>입니다. ${profileDesc} 관련 학생 생활습관 자료와 비교하면, 현재 입력값은 학업 리듬이 안정적인 편인지 아니면 게임시간, 수면, 출석 중 특정 항목이 성적을 흔들 가능성이 있는지 살펴보기에 적합한 패턴입니다.</p>
    <p>학업 유형은 <strong>${academic.name}(${academic.level})</strong>입니다. ${academic.reason} 게임 유형은 <strong>${gaming.name}(${gaming.level})</strong>입니다. ${gaming.reason} ${tone}</p>
    <p>특히 입력값을 보면 게임 ${fmt(input.gamingHours)}시간, 공부 ${fmt(input.studyHours)}시간, 수면 ${fmt(input.sleepHours)}시간, 출석률 ${fmt(input.attendance)}%입니다. 이 조합에서 가장 중요한 것은 단순히 게임을 완전히 끊는 것이 아니라, 게임이 공부시간과 수면시간을 밀어내는지를 확인하는 것입니다. 성적이 좋은 그룹은 대체로 출석률이 높고, 공부시간이 안정적이며, 수면시간이 지나치게 낮지 않은 쪽으로 모입니다.</p>
    <ul>
      ${solutions.map((text) => `<li>${text}</li>`).join("")}
    </ul>
  `;

  $("#promptText").textContent =
`나는 ${academic.name} 학업 유형이고, ${gaming.name} 게임 유형이야.
내 하루 수면시간은 ${fmt(input.sleepHours)}시간, 게임시간은 ${fmt(input.gamingHours)}시간, 공부시간은 ${fmt(input.studyHours)}시간, 출석률은 ${fmt(input.attendance)}%야.
자주 하는 게임 장르는 ${input.gamingGenre}야.
내가 앞으로 학업 성취도를 높이고 싶다면 게임시간, 공부시간, 수면시간, 출석률을 어떤 순서로 조정해야 할지 구체적인 2주 실천 계획으로 제안해줘.`;
}

function analyze() {
  if (!state.gaming.length || !state.academic.length || !state.topGaming || !state.topAcademic) {
    return;
  }

  const input = getInput();
  const gamingSimilar = nearest(state.gaming, (row) => distanceGaming(row, input));
  const academicSimilar = nearest(state.academic, (row) => distanceAcademic(row, input));
  const [name, desc] = profileFor(input, gamingSimilar);
  const risks = riskItems(input, gamingSimilar, academicSimilar);

  state.latest = { input, gamingSimilar, academicSimilar, risks };
  $("#profileName").textContent = name;
  $("#profileDesc").textContent = desc;
  renderRisk(risks);
  makeAnalysis(input, gamingSimilar, academicSimilar, risks, name, desc);
}

function renderStage() {
  $$(".stage").forEach((item, index) => item.classList.toggle("is-active", index === state.stage));
  $$(".dot").forEach((item, index) => item.classList.toggle("is-active", index <= state.stage));
  $("#prevBtn").disabled = state.stage === 0;
  $("#nextBtn").textContent = state.stage === 3 ? "처음으로" : "다음";
}

function goNext() {
  analyze();
  if (state.stage === 3) {
    state.stage = 0;
  } else {
    state.stage += 1;
  }
  renderStage();
}

function goPrev() {
  state.stage = Math.max(0, state.stage - 1);
  renderStage();
}

async function load() {
  const [gamingText, academicText] = await Promise.all([
    fetch(files.gaming).then((res) => res.text()),
    fetch(files.academic).then((res) => res.text())
  ]);
  state.gaming = parseCsv(gamingText);
  state.academic = parseCsv(academicText);
  buildGenreStats();
  buildTopPatterns();
  analyze();
  renderStage();
}

$("#habitForm").addEventListener("submit", (event) => {
  event.preventDefault();
  analyze();
});

["gamingHours", "gamingGenre", "studyHours", "sleepHours", "attendance"].forEach((id) => {
  $(`#${id}`).addEventListener("input", analyze);
});

$("#nextBtn").addEventListener("click", goNext);
$("#prevBtn").addEventListener("click", goPrev);

$$(".chart-tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.chartMetric = button.dataset.chart;
    $$(".chart-tab").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    renderGenreChart();
  });
});

load().catch((error) => {
  console.error(error);
  $("#profileName").textContent = "데이터 로딩 실패";
  $("#profileDesc").textContent = "CSV를 불러오지 못했습니다. 로컬 서버로 열어주세요.";
});
