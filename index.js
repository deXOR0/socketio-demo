const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const nanoId = require("nano-id");
const exec = require("child_process").exec;
const port = process.env.PORT || 3000;
const views = __dirname + "/views";

app.get("/", (req, res) => {
    res.sendFile(views + "/index.html");
});

app.get("/test", (req, res) => {
    res.sendFile(views + "/test.html");
});

app.get("/invite", (req, res) => {
    res.sendFile(views + "/invite.html");
});

io.on("connection", (socket) => {
    console.log("Client connected!");
    socket.broadcast.emit("user joined", `${socket.id} has joined the chat!`);
    socket.on("chat message", (msg) => {
        io.emit("chat message", msg);
    });
});

const joinRoom = (io, socket, inviteCode) => {
    socket.join(inviteCode);
    socket.emit("room joined", inviteCode);
    io.to(inviteCode).emit(
        "alert",
        "A new user joined your room",
        socket.id + " joined the room"
    );
};

const runCode = async (coding, input) => {
    return new Promise(function (resolve, reject) {
        let inputArray = input.split("\n");
        if (inputArray.length === 1 && inputArray[0] === "") {
            reject(
                "The number of input given is less than what the code requires"
            );
        }
        coding = `import sys;inputs = sys.argv[1:]\n${coding}`;
        for (let i = 0; i < inputArray.length; i++) {
            coding = coding.replace("input()", `inputs[${i}]`);
        }
        if (coding.includes("input()")) {
            reject(
                "The number of input given is less than what the code requires"
            );
        }
        const inputArgs = inputArray.join(" ");
        exec(`python -c '${coding}' ${inputArgs}`, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve(stdout);
            }
        });
    });
};

const invite = io.of("/invite");

invite.on("connection", (socket) => {
    console.log("Connected to /invite");

    socket.on("create", () => {
        const inviteCode = nanoId(5).toLowerCase();
        console.log(inviteCode);
        joinRoom(invite, socket, inviteCode);
    });

    socket.on("join", (inviteCode) => {
        console.log("Joining " + inviteCode);
        joinRoom(invite, socket, inviteCode);
    });

    socket.on("run code", async (room, coding, input) => {
        socket
            .to(room)
            .emit(
                "alert",
                "Your opponent ran their code",
                socket.id + " ran their code!"
            );
        const output = await runCode(coding, input).catch((err) => {
            return String(err);
        });
        socket.emit("output", output);
    });

    socket.on("submit code", async (room, coding, input) => {
        socket
            .to(room)
            .emit(
                "alert",
                "Your opponent submitted their code",
                socket.id + " has submitted their code!"
            );
        const output = await runCode(coding, input).catch((err) => {
            console.log(err);
            return String(err);
        });
        socket.emit("output", output);
    });
});

const test = io.of("/test");

test.on("connection", (socket) => {
    console.log("Test client connected!");
});

http.listen(port, () => {
    console.log(`Socket.IO server running at http://localhost:${port}/`);
});
