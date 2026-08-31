const KEY = "pickleball_open_play_v2";

let state = {
    players: ["", "", "", ""],
    round: 0,
    matches: [],
    selected: null,
    spun: false
};

let wheelAngle = 0;

const $ = (id) => document.getElementById(id);

const wheelColors = [
    "#55eaff",
    "#ffe000",
    "#ff8b16",
    "#2d78b1"
];


// ==========================================
// START
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    loadData();
    bindEvents();
    drawWheel();
    render();
});


// ==========================================
// LOCAL STORAGE
// ==========================================

function loadData() {

    try {

        const saved = localStorage.getItem(KEY);

        if (saved) {
            state = {
                ...state,
                ...JSON.parse(saved)
            };
        }

    } catch (error) {
        console.log("Unable to load saved data.");
    }

    state.players.forEach((player, index) => {

        const input = $(`player${index + 1}`);

        if (input) {
            input.value = player;
        }

    });
}


function saveData() {

    localStorage.setItem(
        KEY,
        JSON.stringify(state)
    );

}


// ==========================================
// EVENT LISTENERS
// ==========================================

function bindEvents() {

    // Tabs
    document.querySelectorAll(".tab").forEach(button => {

        button.addEventListener("click", () => {

            openTab(button.dataset.tab);

        });

    });


    // Hero button
    document.querySelectorAll("[data-go]").forEach(button => {

        button.addEventListener("click", () => {

            const destination = document.getElementById(
                button.dataset.go
            );

            if (destination) {

                destination.scrollIntoView({
                    behavior: "smooth"
                });

            }

        });

    });


    // Start session
    $("startBtn").addEventListener(
        "click",
        startSession
    );


    // Sample players
    $("sampleBtn").addEventListener(
        "click",
        loadSamplePlayers
    );


    // Wheel
    $("spinBtn").addEventListener(
        "click",
        spinWheel
    );


    // Go to match
    $("toMatchBtn").addEventListener(
        "click",
        () => openTab("match")
    );


    // Previous round
    $("prevRound").addEventListener(
        "click",
        () => changeRound(-1)
    );


    // Next round
    $("nextRound").addEventListener(
        "click",
        () => changeRound(1)
    );


    // Record match
    $("recordBtn").addEventListener(
        "click",
        recordMatch
    );


    // Clear score
    $("clearScoreBtn").addEventListener(
        "click",
        clearScore
    );


    // Clear history
    $("clearHistoryBtn").addEventListener(
        "click",
        clearHistory
    );


    // Save player names whenever they change
    for (let i = 1; i <= 4; i++) {

        const input = $(`player${i}`);

        input.addEventListener("input", () => {

            state.players = getPlayers();

            saveData();

            drawWheel();

        });

    }

}


// ==========================================
// TABS
// ==========================================

function openTab(tabName) {

    document.querySelectorAll(".tab").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.tab === tabName
        );

    });


    document.querySelectorAll(".tab-panel").forEach(panel => {

        panel.classList.toggle(
            "active",
            panel.id === `tab-${tabName}`
        );

    });


    if (tabName === "draw") {
        drawWheel();
    }


    if (tabName === "match") {
        renderMatch();
    }


    if (tabName === "standings") {
        renderStandings();
    }


    if (tabName === "history") {
        renderHistory();
    }

}


// ==========================================
// GET PLAYERS
// ==========================================

function getPlayers() {

    return [
        $("player1").value.trim(),
        $("player2").value.trim(),
        $("player3").value.trim(),
        $("player4").value.trim()
    ];

}


// ==========================================
// START SESSION
// ==========================================

function startSession() {

    const players = getPlayers();


    // Check empty names
    if (players.some(player => player === "")) {

        toast(
            "Please enter all four player names."
        );

        return;
    }


    // Check duplicate names
    const uniqueNames = new Set(
        players.map(player =>
            player.toLowerCase()
        )
    );


    if (uniqueNames.size !== 4) {

        toast(
            "Player names must be unique."
        );

        return;
    }


    state = {

        players: players,

        round: 0,

        matches: [],

        selected: null,

        spun: false

    };


    saveData();

    render();

    openTab("draw");

    toast(
        "Open Play session started."
    );

}


// ==========================================
// SAMPLE PLAYERS
// ==========================================

function loadSamplePlayers() {

    const samplePlayers = [
        "Patrick",
        "Mark",
        "John",
        "Michael"
    ];


    samplePlayers.forEach((name, index) => {

        $(`player${index + 1}`).value = name;

    });


    state.players = getPlayers();

    saveData();

    drawWheel();

    toast(
        "Sample players loaded."
    );

}


// ==========================================
// ROTATION SYSTEM
// ==========================================

function getRotations() {

    const players = state.players;


    if (
        players.length !== 4 ||
        players.some(player => player === "")
    ) {

        return null;

    }


    return [

        // Round 1
        [
            [players[0], players[1]],
            [players[2], players[3]]
        ],

        // Round 2
        [
            [players[0], players[2]],
            [players[1], players[3]]
        ],

        // Round 3
        [
            [players[0], players[3]],
            [players[1], players[2]]
        ]

    ];

}


// ==========================================
// CURRENT TEAMS
// ==========================================

function getCurrentTeams() {

    const rotations = getRotations();


    if (!rotations) {
        return null;
    }


    /*
        If the wheel has already selected
        someone for the first round, use
        that player as the first player.
    */

    if (
        state.round === 0 &&
        state.spun &&
        state.selected !== null
    ) {

        const players = state.players;

        const selected = state.selected;


        if (selected === 0) {

            return [
                [players[0], players[1]],
                [players[2], players[3]]
            ];

        }


        if (selected === 1) {

            return [
                [players[1], players[0]],
                [players[2], players[3]]
            ];

        }


        if (selected === 2) {

            return [
                [players[2], players[0]],
                [players[1], players[3]]
            ];

        }


        if (selected === 3) {

            return [
                [players[3], players[0]],
                [players[1], players[2]]
            ];

        }

    }


    return rotations[state.round % 3];

}


// ==========================================
// DRAW WHEEL
// ==========================================

function drawWheel() {

    const canvas = $("wheel");

    if (!canvas) {
        return;
    }


    const ctx = canvas.getContext("2d");

    const width = canvas.width;

    const height = canvas.height;

    const radius =
        Math.min(width, height) / 2 - 12;

    const centerX = width / 2;

    const centerY = height / 2;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    // No players yet
    if (
        state.players.some(
            player => player === ""
        )
    ) {

        ctx.beginPath();

        ctx.arc(
            centerX,
            centerY,
            radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "#0b293b";

        ctx.fill();

        ctx.strokeStyle = "#29485a";

        ctx.lineWidth = 4;

        ctx.stroke();


        ctx.fillStyle = "#91a8b8";

        ctx.font = "bold 15px Arial";

        ctx.textAlign = "center";

        ctx.fillText(
            "ENTER 4 PLAYERS",
            centerX,
            centerY
        );

        return;

    }


    const slice =
        Math.PI * 2 / 4;


    // Rotate wheel
    ctx.save();

    ctx.translate(
        centerX,
        centerY
    );

    ctx.rotate(wheelAngle);


    state.players.forEach(
        (player, index) => {

            const startAngle =
                index * slice;


            const endAngle =
                startAngle + slice;


            // Slice
            ctx.beginPath();

            ctx.moveTo(0, 0);

            ctx.arc(
                0,
                0,
                radius,
                startAngle,
                endAngle
            );

            ctx.closePath();


            ctx.fillStyle =
                wheelColors[index];

            ctx.fill();


            ctx.strokeStyle =
                "#061827";

            ctx.lineWidth = 4;

            ctx.stroke();


            // Player name
            ctx.save();

            ctx.rotate(
                startAngle + slice / 2
            );

            ctx.translate(
                radius * 0.62,
                0
            );

            ctx.rotate(
                Math.PI / 2
            );


            ctx.fillStyle =
                "#041a27";

            ctx.font =
                "900 16px Arial";

            ctx.textAlign =
                "center";

            ctx.textBaseline =
                "middle";


            const displayName =
                player.length > 15
                    ? player.substring(0, 15) + "..."
                    : player;


            ctx.fillText(
                displayName,
                0,
                0
            );


            ctx.restore();

        }
    );


    ctx.restore();


    // Center circle
    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY,
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


    // DRAW text
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
        centerX,
        centerY
    );

}


// ==========================================
// SPIN WHEEL
// ==========================================

function spinWheel() {

    if (
        state.players.length !== 4 ||
        state.players.some(
            player => player === ""
        )
    ) {

        toast(
            "Start a session first."
        );

        return;

    }


    const button = $("spinBtn");

    button.disabled = true;


    // Random player
    const selected =
        Math.floor(Math.random() * 4);


    const slice =
        Math.PI * 2 / 4;


    /*
        Position selected player
        under the top pointer.
    */

    const desiredAngle =
        -Math.PI / 2 -
        (
            selected * slice +
            slice / 2
        );


    const finalAngle =
        desiredAngle +
        (
            5 +
            Math.floor(Math.random() * 3)
        ) * Math.PI * 2;


    const startAngle =
        wheelAngle;


    const startTime =
        performance.now();


    const duration =
        3400;


    function animate(currentTime) {

        const progress =
            Math.min(
                (currentTime - startTime) /
                duration,
                1
            );


        // Ease out
        const easing =
            1 -
            Math.pow(
                1 - progress,
                3
            );


        wheelAngle =
            startAngle +
            (
                finalAngle -
                startAngle
            ) * easing;


        drawWheel();


        if (progress < 1) {

            requestAnimationFrame(
                animate
            );

        } else {

            state.selected =
                selected;

            state.spun = true;

            saveData();


            button.disabled = false;


            $("drawResult").innerHTML = `

                <div>

                    <strong>
                        ${escapeHTML(
                            state.players[selected]
                        )}
                    </strong>

                    <br>

                    <small>
                        Selected by the draw wheel
                    </small>

                </div>

            `;


            toast(
                `${state.players[selected]} was selected.`
            );

        }

    }


    requestAnimationFrame(
        animate
    );

}


// ==========================================
// CHANGE ROUND
// ==========================================

function changeRound(direction) {

    if (
        !state.players.length ||
        state.players.some(
            player => player === ""
        )
    ) {

        toast(
            "Start a session first."
        );

        return;

    }


    state.round =
        Math.max(
            0,
            state.round + direction
        );


    saveData();

    renderMatch();


    $("recordMessage").textContent = "";

}


// ==========================================
// RENDER MATCH
// ==========================================

function renderMatch() {

    const teams =
        getCurrentTeams();


    if (!teams) {
        return;
    }


    $("roundNumber").textContent =
        state.round + 1;


    $("teamA1").textContent =
        teams[0][0];


    $("teamA2").textContent =
        teams[0][1];


    $("teamB1").textContent =
        teams[1][0];


    $("teamB2").textContent =
        teams[1][1];

}


// ==========================================
// RECORD MATCH
// ==========================================

function recordMatch() {

    const teams =
        getCurrentTeams();


    if (!teams) {

        toast(
            "Start a session first."
        );

        return;

    }


    const scoreA =
        Number($("scoreA").value);


    const scoreB =
        Number($("scoreB").value);


    // Validate scores
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


    // Pickleball match cannot be tied
    if (scoreA === scoreB) {

        toast(
            "A completed match cannot be tied."
        );

        return;

    }


    const round =
        state.round + 1;


    // Prevent duplicate recording
    if (
        state.matches.some(
            match => match.round === round
        )
    ) {

        toast(
            "This round is already recorded."
        );

        return;

    }


    const match = {

        id: Date.now(),

        round: round,

        teamA: [
            ...teams[0]
        ],

        teamB: [
            ...teams[1]
        ],

        scoreA: scoreA,

        scoreB: scoreB

    };


    state.matches.push(match);


    saveData();

    render();


    $("recordMessage").textContent =
        `Round ${round} recorded successfully.`;


    // Reset score
    $("scoreA").value = 0;

    $("scoreB").value = 0;


    /*
        Automatically move
        to the next rotation.
    */

    setTimeout(() => {

        state.round++;

        saveData();

        render();

    }, 600);

}


// ==========================================
// CLEAR SCORE
// ==========================================

function clearScore() {

    $("scoreA").value = 0;

    $("scoreB").value = 0;

    $("recordMessage").textContent = "";

}


// ==========================================
// CALCULATE PLAYER STATS
// ==========================================

function calculateStats() {

    const stats = {};


    // Create player records
    state.players.forEach(player => {

        stats[player] = {

            name: player,

            wins: 0,

            losses: 0,

            pointsFor: 0,

            pointsAgainst: 0

        };

    });


    // Process matches
    state.matches.forEach(match => {

        const teamAWon =
            match.scoreA > match.scoreB;


        // Team A
        match.teamA.forEach(player => {

            stats[player].pointsFor +=
                match.scoreA;

            stats[player].pointsAgainst +=
                match.scoreB;


            if (teamAWon) {

                stats[player].wins++;

            } else {

                stats[player].losses++;

            }

        });


        // Team B
        match.teamB.forEach(player => {

            stats[player].pointsFor +=
                match.scoreB;

            stats[player].pointsAgainst +=
                match.scoreA;


            if (teamAWon) {

                stats[player].losses++;

            } else {

                stats[player].wins++;

            }

        });

    });


    return Object.values(stats).sort(
        (a, b) => {

            // Wins first
            if (b.wins !== a.wins) {

                return b.wins - a.wins;

            }


            // Then point difference
            const diffA =
                a.pointsFor -
                a.pointsAgainst;

            const diffB =
                b.pointsFor -
                b.pointsAgainst;


            return diffB - diffA;

        }
    );

}


// ==========================================
// RENDER STANDINGS
// ==========================================

function renderStandings() {

    const standings =
        calculateStats();


    const body =
        $("standingsBody");


    body.innerHTML = "";


    standings.forEach(
        (player, index) => {

            const games =
                player.wins +
                player.losses;


            const difference =
                player.pointsFor -
                player.pointsAgainst;


            const winPercentage =
                games > 0
                    ? (
                        player.wins /
                        games *
                        100
                    ).toFixed(0)
                    : 0;


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    <b>
                        ${escapeHTML(
                            player.name
                        )}
                    </b>
                </td>

                <td>
                    ${player.wins}
                </td>

                <td>
                    ${player.losses}
                </td>

                <td>
                    ${player.pointsFor}
                </td>

                <td>
                    ${player.pointsAgainst}
                </td>

                <td class="${
                    difference >= 0
                        ? "positive"
                        : "negative"
                }">

                    ${
                        difference > 0
                            ? "+"
                            : ""
                    }

                    ${difference}

                </td>

                <td>
                    ${winPercentage}%
                </td>

            `;


            body.appendChild(row);

        }
    );


    // Mini statistics
    $("statMatches").textContent =
        state.matches.length;


    $("statRounds").textContent =
        Math.max(
            1,
            state.round + 1
        );


    $("statLeader").textContent =
        state.matches.length &&
        standings.length
            ? standings[0].name
            : "—";

}


// ==========================================
// RENDER HISTORY
// ==========================================

function renderHistory() {

    const container =
        $("historyList");


    container.innerHTML = "";


    if (state.matches.length === 0) {

        container.innerHTML = `

            <div class="empty">

                <strong>
                    No matches recorded yet.
                </strong>

                Record a score and it will
                appear here.

            </div>

        `;

        return;

    }


    // Newest match first
    const matches =
        [...state.matches].reverse();


    matches.forEach(match => {

        const item =
            document.createElement("div");


        item.className =
            "history-item";


        item.innerHTML = `

            <div class="history-round">

                ROUND ${match.round}

            </div>


            <div class="history-team">

                <b>
                    ${escapeHTML(
                        match.teamA.join(" + ")
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
                    ${escapeHTML(
                        match.teamB.join(" + ")
                    )}
                </b>

                <small>
                    TEAM B
                </small>

            </div>

        `;


        container.appendChild(item);

    });

}


// ==========================================
// RENDER EVERYTHING
// ==========================================

function render() {

    if (state.players.length === 4) {

        state.players.forEach(
            (player, index) => {

                const input =
                    $(`player${index + 1}`);


                if (input) {

                    input.value =
                        player;

                }

            }
        );

    }


    drawWheel();

    renderMatch();

    renderStandings();

    renderHistory();


    // Restore wheel result
    if (
        state.spun &&
        state.selected !== null
    ) {

        $("drawResult").innerHTML = `

            <div>

                <strong>
                    ${escapeHTML(
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


// ==========================================
// CLEAR MATCH HISTORY
// ==========================================

function clearHistory() {

    if (
        state.matches.length === 0
    ) {

        toast(
            "There is no history to clear."
        );

        return;

    }


    const confirmed =
        confirm(
            "Clear all recorded matches?"
        );


    if (!confirmed) {
        return;
    }


    state.matches = [];

    state.round = 0;

    saveData();

    render();


    toast(
        "Match history cleared."
    );

}


// ==========================================
// TOAST MESSAGE
// ==========================================

function toast(message) {

    const element =
        $("toast");


    element.textContent =
        message;


    element.classList.add(
        "show"
    );


    clearTimeout(
        window.__toast
    );


    window.__toast =
        setTimeout(() => {

            element.classList.remove(
                "show"
            );

        }, 2600);

}


// ==========================================
// SECURITY / HTML ESCAPING
// ==========================================

function escapeHTML(value) {

    return String(value).replace(
        /[&<>"']/g,
        character => {

            const characters = {

                "&": "&amp;",

                "<": "&lt;",

                ">": "&gt;",

                '"': "&quot;",

                "'": "&#039;"

            };


            return characters[
                character
            ];

        }
    );

}
