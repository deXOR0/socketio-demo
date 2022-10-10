const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const nanoId = require("nano-id");
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
    io.to(inviteCode).emit("alert", socket.id + " joined the room");
};

const invite = io.of("/invite");

invite.on("connection", (socket) => {
    socket.on("create", () => {
        const inviteCode = nanoId(5).toLowerCase();
        console.log(inviteCode);
        joinRoom(invite, socket, inviteCode);
    });

    socket.on("join", (inviteCode) => {
        console.log("Joining " + inviteCode);
        joinRoom(invite, socket, inviteCode);
    });

    socket.on("run code", (room) => {
        socket.to(room).emit("alert", socket.id + " ran their code!");
    });

    socket.on("submit code", (room) => {
        socket.to(room).emit("alert", socket.id + " has submitted their code!");
    });
});

const test = io.of("/test");

test.on("connection", (socket) => {
    console.log("Test client connected!");
});

http.listen(port, () => {
    console.log(`Socket.IO server running at http://localhost:${port}/`);
});
