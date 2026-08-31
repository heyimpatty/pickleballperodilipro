const KEY = "pickleball_open_play_unlimited_v3";

let state = {
  players: [],
  round: 0,
  matches: [],
  selected: null,
  spun: false,
  rotationSeed: []
};

let wheelAngle = 0;

const colors = [
  "#55eaff",
  "#ffe000",
  "#ff8b16",
  "#2d78b1",
  "#54f28c",
  "#ff5570",
  "#b86cff",
  "#00c2ff"
];


const $ = id => document.getElementById(id);


/* ================= START ================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    load();

    bind();

    render();

    drawWheel();

  }
);


/* ================= STORAGE ================= */

function load() {

  try {

    const saved =
      localStorage.getItem(KEY);

    if (saved) {

      const parsed =
        JSON.parse(saved);

      state = {
        ...state,
        ...parsed
      };

    }

  } catch (error) {

    console.log(
      "Could not load saved session.",
      error
    );

  }

}


function save() {

  localStorage.setItem(
    KEY,
    JSON.stringify(state)
  );

}


/* ================= EVENTS ================= */

function bind() {

  document
    .querySelectorAll(".tab")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => openTab(
          button.dataset.tab
        )
      );

    });


  document
    .querySelectorAll("[data-go]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            document.getElementById(
              button.dataset.go
            );

          if (target) {

            target.scrollIntoView({
              behavior: "smooth"
            });

          }

        }
      );

    });


  $("addPlayerBtn")
    .addEventListener(
      "click",
      addPlayerFromInput
    );


  $("newPlayer")
    .addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {

          addPlayerFromInput();

        }

      }
    );


  $("startBtn")
    .addEventListener(
      "click",
      startSession
    );


  $("sampleBtn")
    .addEventListener(
      "click",
      sample
    );


  $("clearPlayersBtn")
    .addEventListener(
      "click",
      clearPlayers
    );


  $("spinBtn")
    .addEventListener(
      "click",
      spin
    );


  $("toMatchBtn")
    .addEventListener(
      "click",
      () => openTab("match")
    );


  $("prevRound")
    .addEventListener(
      "click",
      () => changeRound(-1)
    );


  $("nextRound")
    .addEventListener(
      "click",
      () => changeRound(1)
    );


  $("clearHistoryBtn")
    .addEventListener(
      "click",
      clearHistory
    );

}


/* ================= TABS ================= */

function openTab(tab) {

  document
    .querySelectorAll(".tab")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.tab === tab
      );

    });


  document
    .querySelectorAll(".tab-panel")
    .forEach(panel => {

      panel.classList.toggle(
        "active",
        panel.id === "tab-" + tab
      );

    });


  if (tab === "draw") {

    drawWheel();

  }


  if (tab === "match") {

    renderMatch();

  }


  if (tab === "standings") {

    renderStandings();

  }


  if (tab === "history") {

    renderHistory();

  }

}


/* ================= PLAYERS ================= */

function addPlayerFromInput() {

  const input =
    $("newPlayer");

  const name =
    input.value.trim();

  if (!name) {

    toast(
      "Please enter a player name."
    );

    return;

  }


  if (
    state.players.some(
      player =>
        player.toLowerCase() ===
        name.toLowerCase()
    )
  ) {

    toast(
      "That player is already added."
    );

    return;

  }


  state.players.push(name);

  input.value = "";

  save();

  render();

  input.focus();

  toast(
    `${name} added to the roster.`
  );

}


function removePlayer(index) {

  if (
    index < 0 ||
    index >= state.players.length
  ) {

    return;

  }


  const name =
    state.players[index];


  if (
    state.matches.length > 0
  ) {

    toast(
      "You cannot remove players after matches have been recorded."
    );

    return;

  }


  state.players.splice(
    index,
    1
  );

  save();

  render();

  toast(
    `${name} removed.`
  );

}


function clearPlayers() {

  if (
    !state.players.length
  ) {

    toast(
      "There are no players to clear."
    );

    return;

  }


  if (
    state.matches.length
  ) {

    toast(
      "Start a new session before clearing players."
    );

    return;

  }


  if (
    !confirm(
      "Clear all players?"
    )
  ) {

    return;

  }


  state.players = [];

  state.rotationSeed = [];

  state.selected = null;

  state.spun = false;

  save();

  render();

  toast(
    "Player roster cleared."
  );

}


/* ================= SAMPLE ================= */

function sample() {

  const samplePlayers = [
    "Patrick",
    "Mark",
    "John",
    "Michael",
    "James",
    "Peter",
    "Chris",
    "Ryan",
    "Alex",
    "David",
    "Kevin",
    "Daniel"
  ];


  if (
    state.matches.length
  ) {

    toast(
      "Start a new session before loading sample players."
    );

    return;

  }


  state.players =
    samplePlayers;

  save();

  render();

  toast(
    "12 sample players loaded."
  );

}


/* ================= SESSION ================= */

function startSession() {

  const p =
    state.players
      .map(
        player =>
          player.trim()
      )
      .filter(Boolean);


  if (p.length < 4) {

    toast(
      "You need at least 4 players to start."
    );

    return;

  }


  const unique =
    new Set(
      p.map(
        player =>
          player.toLowerCase()
      )
    );


  if (
    unique.size !== p.length
  ) {

    toast(
      "Player names must be unique."
    );

    return;

  }


  state = {

    players: p,

    round: 0,

    matches: [],

    selected: null,

    spun: false,

    rotationSeed: shuffle(
      [...p]
    )

  };


  save();

  render();

  openTab("draw");

  toast(
    `${p.length} players ready.`
  );

}


/* ================= COURTS ================= */

function getCourtCount() {

  return Math.floor(
    state.players.length / 4
  );

}


function getWaitingCount() {

  return (
    state.players.length %
    4
  );

}


/* ================= ROTATION ================= */

/*
  The rotation works by moving the
  player list one position every round.

  Example:

  Round 1:
  A B C D
  E F G H

  Round 2:
  B C D E
  F G H A

  Round 3:
  C D E F
  G H A B

  This gives players different
  court groups over time.
*/

function getRotationPlayers() {

  if (
    !state.rotationSeed.length
  ) {

    state.rotationSeed =
      shuffle(
        [...state.players]
      );

  }


  const players =
    state.rotationSeed;


  const shift =
    state.round %
    players.length;


  return [
    ...players.slice(shift),
    ...players.slice(0, shift)
  ];

}


/* ================= MATCH DATA ================= */

function getRoundMatches() {

  const players =
    getRotationPlayers();


  const courtCount =
    getCourtCount();


  const courts = [];

  const used = [];


  for (
    let court = 0;
    court < courtCount;
    court++
  ) {

    const start =
      court * 4;


    const group =
      players.slice(
        start,
        start + 4
      );


    if (
      group.length < 4
    ) {

      continue;

    }


    const teamA = [
      group[0],
      group[1]
    ];


    const teamB = [
      group[2],
      group[3]
    ];


    courts.push({

      court: court + 1,

      teamA,

      teamB

    });


    used.push(
      ...group
    );

  }


  const waiting =
    players.filter(
      player =>
        !used.includes(player)
    );


  return {
    courts,
    waiting
  };

}


/* ================= DRAW WHEEL ================= */

function drawWheel() {

  const canvas =
    $("wheel");

  if (!canvas) {

    return;

  }


  const ctx =
    canvas.getContext("2d");


  const w =
    canvas.width;


  const h =
    canvas.height;


  const r =
    Math.min(w,h) / 2 - 12;


  const cx =
    w / 2;


  const cy =
    h / 2;


  ctx.clearRect(
    0,
    0,
    w,
    h
  );


  const players =
    state.players;


  if (
    players.length < 4
  ) {

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      r,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "#0b293b";

    ctx.fill();

    ctx.strokeStyle =
      "#29485a";

    ctx.lineWidth = 4;

    ctx.stroke();


    ctx.fillStyle =
      "#91a8b8";

    ctx.font =
      "bold 15px Arial";

    ctx.textAlign =
      "center";

    ctx.fillText(
      "ADD 4+ PLAYERS",
      cx,
      cy
    );

    return;

  }


  const slice =
    Math.PI * 2 /
    players.length;


  ctx.save();

  ctx.translate(
    cx,
    cy
  );

  ctx.rotate(
    wheelAngle
  );


  players.forEach(
    (name, i) => {

      const a =
        i * slice;


      ctx.beginPath();

      ctx.moveTo(
        0,
        0
      );

      ctx.arc(
        0,
        0,
        r,
        a,
        a + slice
      );

      ctx.closePath();


      ctx.fillStyle =
        colors[
          i % colors.length
        ];

      ctx.fill();


      ctx.strokeStyle =
        "#061827";

      ctx.lineWidth = 3;

      ctx.stroke();


      /*
        Only show text for
        reasonable wheel sizes.
      */

      ctx.save();

      ctx.rotate(
        a + slice / 2
      );

      ctx.translate(
        r * .63,
        0
      );

      ctx.rotate(
        Math.PI / 2
      );


      ctx.fillStyle =
        "#041a27";


      let fontSize = 16;

      if (
        players.length > 16
      ) {

        fontSize = 11;

      } else if (
        players.length > 12
      ) {

        fontSize = 13;

      }


      ctx.font =
        `900 ${fontSize}px Arial`;


      ctx.textAlign =
        "center";


      ctx.textBaseline =
        "middle";


      const max =
        players.length > 16
          ? 9
          : 14;


      const label =
        name.length > max
          ? name.slice(0,max) + "…"
          : name;


      ctx.fillText(
        label,
        0,
        0
      );


      ctx.restore();

    }
  );


  ctx.restore();


  /* CENTER */

  ctx.beginPath();

  ctx.arc(
    cx,
    cy,
    54,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "#071f31";

  ctx.fill();

  ctx.strokeStyle =
    "#ffe000";

  ctx.lineWidth = 3;

  ctx.stroke();


  ctx.fillStyle =
    "#ffe000";

  ctx.font =
    "900 13px Arial";

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";

  ctx.fillText(
    "DRAW",
    cx,
    cy
  );

}


/* ================= SPIN ================= */

function spin() {

  if (
    state.players.length < 4
  ) {

    toast(
      "You need at least 4 players."
    );

    return;

  }


  const btn =
    $("spinBtn");


  btn.disabled = true;


  const selected =
    Math.floor(
      Math.random() *
      state.players.length
    );


  const slice =
    Math.PI * 2 /
    state.players.length;


  const desired =
    -Math.PI / 2 -
    (
      selected * slice +
      slice / 2
    );


  const final =
    desired +
    (
      5 +
      Math.floor(
        Math.random() * 3
      )
    ) *
    Math.PI * 2;


  const start =
    wheelAngle;


  const t0 =
    performance.now();


  const duration =
    3400;


  function frame(now) {

    const t =
      Math.min(
        (now - t0) /
        duration,
        1
      );


    const e =
      1 -
      Math.pow(
        1 - t,
        3
      );


    wheelAngle =
      start +
      (final - start) *
      e;


    drawWheel();


    if (
      t < 1
    ) {

      requestAnimationFrame(
        frame
      );

    } else {

      state.selected =
        selected;

      state.spun =
        true;


      /*
        Put selected player
        at beginning of rotation.
      */

      const selectedName =
        state.players[
          selected
        ];


      state.rotationSeed = [
        selectedName,

        ...shuffle(
          state.players.filter(
            player =>
              player !==
              selectedName
          )
        )
      ];


      save();


      btn.disabled = false;


      $("drawResult").innerHTML = `
        <div>
          <strong>
            ${esc(selectedName)}
          </strong>

          <br>

          <small>
            Selected by the draw wheel
          </small>
        </div>
      `;


      toast(
        `${selectedName} was selected.`
      );

    }

  }


  requestAnimationFrame(
    frame
  );

}


/* ================= MATCH ================= */

function changeRound(dir) {

  if (
    state.players.length < 4
  ) {

    toast(
      "Start a session first."
    );

    return;

  }


  const newRound =
    state.round + dir;


  if (
    newRound < 0
  ) {

    return;

  }


  state.round =
    newRound;


  save();

  renderMatch();

  $("recordMessage")
    .textContent = "";

}


/* ================= RENDER MATCH ================= */

function renderMatch() {

  if (
    state.players.length < 4
  ) {

    return;

  }


  const data =
    getRoundMatches();


  $("roundNumber")
    .textContent =
    state.round + 1;


  const container =
    $("courtsContainer");


  container.innerHTML = "";


  const grid =
    document.createElement(
      "div"
    );


  grid.className =
    "courts-grid";


  data.courts.forEach(
    court => {

      const courtDiv =
        document.createElement(
          "div"
        );


      courtDiv.className =
        "court";


      courtDiv.innerHTML = `

        <div class="court-title">
          COURT ${court.court}
        </div>

        <div class="court-half">

          <span class="team-label">
            TEAM A
          </span>

          <div class="court-player">
            ${esc(court.teamA[0])}
          </div>

          <div class="court-player">
            ${esc(court.teamA[1])}
          </div>

        </div>


        <div class="court-net">
          <span>NET</span>
        </div>


        <div class="court-half">

          <span class="team-label">
            TEAM B
          </span>

          <div class="court-player">
            ${esc(court.teamB[0])}
          </div>

          <div class="court-player">
            ${esc(court.teamB[1])}
          </div>

        </div>

      `;


      grid.appendChild(
        courtDiv
      );

    }
  );


  container.appendChild(
    grid
  );


  renderWaiting(
    data.waiting
  );


  renderScoreboards(
    data.courts
  );

}


/* ================= WAITING ================= */

function renderWaiting(
  waiting
) {

  const container =
    $("waitingContainer");


  if (
    !waiting.length
  ) {

    container.innerHTML = "";

    return;

  }


  container.innerHTML = `

    <div class="waiting-title">
      WAITING / NEXT ROTATION
    </div>

    <div class="waiting-list">

      ${waiting.map(
        player => `
          <span class="waiting-player">
            ${esc(player)}
          </span>
        `
      ).join("")}

    </div>

  `;

}


/* ================= SCOREBOARDS ================= */

function renderScoreboards(
  courts
) {

  const container =
    $("scoreboardContainer");


  container.innerHTML = "";


  courts.forEach(
    court => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "score-card";


      const match =
        findMatch(
          state.round + 1,
          court.court
        );


      const scoreA =
        match
          ? match.scoreA
          : 0;


      const scoreB =
        match
          ? match.scoreB
          : 0;


      const recorded =
        !!match;


      card.innerHTML = `

        <div class="score-card-title">
          COURT ${court.court} • SCORE
        </div>


        <div class="scoreboard">

          <div class="score-side">

            <span>
              TEAM A
            </span>

            <input
              type="number"
              min="0"
              max="99"
              value="${scoreA}"
              id="scoreA_${court.court}"
              ${recorded ? "disabled" : ""}
            >

            <div class="score-team-names">
              ${esc(court.teamA.join(" + "))}
            </div>

          </div>


          <div class="versus">
            VS
          </div>


          <div class="score-side">

            <span>
              TEAM B
            </span>

            <input
              type="number"
              min="0"
              max="99"
              value="${scoreB}"
              id="scoreB_${court.court}"
              ${recorded ? "disabled" : ""}
            >

            <div class="score-team-names">
              ${esc(court.teamB.join(" + "))}
            </div>

          </div>

        </div>


        <div class="score-actions">

          ${
            recorded

            ? `
              <button
                class="btn ghost"
                disabled
              >
                ✓ RECORDED
              </button>
            `

            : `
              <button
                class="btn primary"
                onclick="recordCourtMatch(${court.court})"
              >
                ✓ RECORD COURT ${court.court}
              </button>
            `
          }

        </div>

      `;


      container.appendChild(
        card
      );

    }
  );

}


/* ================= FIND MATCH ================= */

function findMatch(
  round,
  court
) {

  return state.matches.find(
    match =>
      match.round === round &&
      match.court === court
  );

}


/* ================= RECORD MATCH ================= */

function recordCourtMatch(
  courtNumber
) {

  const data =
    getRoundMatches();


  const court =
    data.courts.find(
      c =>
        c.court ===
        courtNumber
    );


  if (!court) {

    toast(
      "Court not found."
    );

    return;

  }


  const scoreA =
    Number(
      $(
        `scoreA_${courtNumber}`
      ).value
    );


  const scoreB =
    Number(
      $(
        `scoreB_${courtNumber}`
      ).value
    );


  if (
    !Number.isInteger(scoreA) ||
    !Number.isInteger(scoreB) ||
    scoreA < 0 ||
    scoreB < 0
  ) {

    toast(
      "Enter valid scores."
    );

    return;

  }


  if (
    scoreA === scoreB
  ) {

    toast(
      "A completed match cannot be tied."
    );

    return;

  }


  const round =
    state.round + 1;


  if (
    findMatch(
      round,
      courtNumber
    )
  ) {

    toast(
      "This court has already been recorded."
    );

    return;

  }


  state.matches.push({

    id: Date.now(),

    round,

    court: courtNumber,

    teamA: [
      ...court.teamA
    ],

    teamB: [
      ...court.teamB
    ],

    scoreA,

    scoreB

  });


  save();

  render();

  $("recordMessage")
    .textContent =
    `Court ${courtNumber}, Round ${round} recorded successfully.`;


  toast(
    `Court ${courtNumber} recorded.`
  );


  /*
    Automatically move to next round
    only when ALL courts have scores.
  */

  const totalCourts =
    getCourtCount();


  const recordedCourts =
    state.matches.filter(
      match =>
        match.round === round
    ).length;


  if (
    recordedCourts ===
    totalCourts
  ) {

    setTimeout(
      () => {

        state.round++;

        save();

        render();

        $("recordMessage")
          .textContent =
          `Round ${round} complete. Round ${state.round + 1} is ready.`;

      },
      700
    );

  }

}


/* ================= STANDINGS ================= */

function stats() {

  const s = {};


  state.players.forEach(
    player => {

      s[player] = {

        name: player,

        w: 0,

        l: 0,

        pf: 0,

        pa: 0

      };

    }
  );


  state.matches.forEach(
    match => {

      const teamAWon =
        match.scoreA >
        match.scoreB;


      match.teamA.forEach(
        player => {

          if (!s[player]) {

            return;

          }


          s[player].pf +=
            match.scoreA;

          s[player].pa +=
            match.scoreB;


          if (teamAWon) {

            s[player].w++;

          } else {

            s[player].l++;

          }

        }
      );


      match.teamB.forEach(
        player => {

          if (!s[player]) {

            return;

          }


          s[player].pf +=
            match.scoreB;

          s[player].pa +=
            match.scoreA;


          if (teamAWon) {

            s[player].l++;

          } else {

            s[player].w++;

          }

        }
      );

    }
  );


  return Object
    .values(s)
    .sort(
      (a,b) =>
        b.w - a.w ||
        (b.pf - b.pa) -
        (a.pf - a.pa)
    );

}


/* ================= RENDER STANDINGS ================= */

function renderStandings() {

  const arr =
    stats();


  const body =
    $("standingsBody");


  if (!body) {

    return;

  }


  body.innerHTML = "";


  arr.forEach(
    (player,index) => {

      const games =
        player.w +
        player.l;


      const diff =
        player.pf -
        player.pa;


      const rate =
        games
          ? (
              player.w /
              games *
              100
            ).toFixed(0)
          : 0;


      const tr =
        document.createElement(
          "tr"
        );


      tr.innerHTML = `

        <td>
          ${index + 1}
        </td>

        <td>
          <b>
            ${esc(player.name)}
          </b>
        </td>

        <td>
          ${player.w}
        </td>

        <td>
          ${player.l}
        </td>

        <td>
          ${player.pf}
        </td>

        <td>
          ${player.pa}
        </td>

        <td
          class="${
            diff >= 0
              ? "positive"
              : "negative"
          }"
        >
          ${
            diff > 0
              ? "+"
              : ""
          }${diff}
        </td>

        <td>
          ${rate}%
        </td>

      `;


      body.appendChild(
        tr
      );

    }
  );


  $("statMatches")
    .textContent =
    state.matches.length;


  $("statRounds")
    .textContent =
    Math.max(
      1,
      state.round + 1
    );


  $("statLeader")
    .textContent =
    state.matches.length &&
    arr.length
      ? arr[0].name
      : "—";

}


/* ================= HISTORY ================= */

function renderHistory() {

  const box =
    $("historyList");


  box.innerHTML = "";


  if (
    !state.matches.length
  ) {

    box.innerHTML = `

      <div class="empty">

        <strong>
          No matches recorded yet.
        </strong>

        Record a score and it
        will appear here.

      </div>

    `;

    return;

  }


  [
    ...state.matches
  ]
    .reverse()
    .forEach(
      match => {

        const div =
          document.createElement(
            "div"
          );


        div.className =
          "history-item";


        div.innerHTML = `

          <div class="history-round">

            ROUND ${match.round}
            <br>
            COURT ${match.court}

          </div>


          <div class="history-team">

            <b>
              ${esc(
                match.teamA.join(
                  " + "
                )
              )}
            </b>

            <small>
              TEAM A
            </small>

          </div>


          <div class="history-score">

            ${match.scoreA}
            -
            ${match.scoreB}

          </div>


          <div class="history-team">

            <b>
              ${esc(
                match.teamB.join(
                  " + "
                )
              )}
            </b>

            <small>
              TEAM B
            </small>

          </div>

        `;


        box.appendChild(
          div
        );

      }
    );

}


/* ================= RENDER ================= */

function render() {

  renderPlayers();

  renderRosterStats();

  drawWheel();

  renderMatch();

  renderStandings();

  renderHistory();


  if (
    state.spun &&
    state.selected !== null &&
    state.players[
      state.selected
    ]
  ) {

    $("drawResult").innerHTML = `

      <div>

        <strong>
          ${esc(
            state.players[
              state.selected
            ]
          )}
        </strong>

        <br>

        <small>
          Selected by the draw wheel
        </small>

      </div>

    `;

  }

}


/* ================= PLAYER UI ================= */

function renderPlayers() {

  const list =
    $("playerList");


  list.innerHTML = "";


  state.players.forEach(
    (player,index) => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "player-card";


      card.innerHTML = `

        <span class="player-number">
          ${String(
            index + 1
          ).padStart(2,"0")}
        </span>

        <span class="player-name">
          ${esc(player)}
        </span>

        <button
          class="remove-player"
          title="Remove player"
          onclick="removePlayer(${index})"
        >
          ×
        </button>

      `;


      list.appendChild(
        card
      );

    }
  );

}


/* ================= ROSTER STATS ================= */

function renderRosterStats() {

  const players =
    state.players.length;


  const courts =
    Math.floor(
      players / 4
    );


  const waiting =
    players % 4;


  $("playerCount")
    .textContent =
    players;


  $("courtCount")
    .textContent =
    courts;


  $("waitingCount")
    .textContent =
    waiting;

}


/* ================= CLEAR HISTORY ================= */

function clearHistory() {

  if (
    !state.matches.length
  ) {

    toast(
      "There is no history to clear."
    );

    return;

  }


  if (
    confirm(
      "Clear all recorded matches?"
    )
  ) {

    state.matches = [];

    state.round = 0;

    save();

    render();

    toast(
      "Match history cleared."
    );

  }

}


/* ================= SHUFFLE ================= */

function shuffle(array) {

  for (
    let i = array.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );


    [
      array[i],
      array[j]
    ] = [
      array[j],
      array[i]
    ];

  }


  return array;

}


/* ================= ESCAPE HTML ================= */

function esc(value) {

  return String(value)
    .replace(
      /[&<>"']/g,
      character => ({

        "&": "&amp;",

        "<": "&lt;",

        ">": "&gt;",

        '"': "&quot;",

        "'": "&#039;"

      }[character])
    );

}


/* ================= TOAST ================= */

function toast(message) {

  const t =
    $("toast");


  t.textContent =
    message;


  t.classList.add(
    "show"
  );


  clearTimeout(
    window.__toast
  );


  window.__toast =
    setTimeout(
      () =>
        t.classList.remove(
          "show"
        ),
      2600
    );

}
