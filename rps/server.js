let app = require('express')();
let http = require('http').createServer(app);

let io = require('socket.io')(http);

let PORT = 8000

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/webpage/index.html');
});
app.get("/*", (req, res) =>{
    try{
        res.sendFile(__dirname + "/webpage/" + req.params['0'])
    }catch(ENOENT){
        res.status(404).send('Not found');
    }
})

class game{
    constructor(type, maxnum){
        this.type = type;
        this.maxnum = maxnum;
        this.users = [];
        this.userids = [];
        this.selections = [-1, -1];
    }
    join(user, userid){
        if(this.users.length === this.maxnum){
            return -1;
        }
        this.users.push(user);
        this.userids.push(userid);
        return (this.users.length - 1);
    }

    leave(userid){
        let ind = this.users.indexOf(userid);
        this.users.splice(ind, 1);
        this.userids.splice(ind, 1);
    }

    play(userid, selection){
        let ind = this.userids.indexOf(userid);
        if(ind == -1){
            return;
        }
        if(this.selections[ind] == -1){
            this.selections[ind] = selection;
        }
        if(this.selections.indexOf(-1) < 0){
            let s0 = this.selections[0];
            let s1 = this.selections[1];
            this.selections = [-1, -1];
            if(s0 == s1){
                return "draw";
            }
            if((s0 === 0 && s1 === 2) || (s0 === (s1 + 1))){
                return this.userids[0];
            }
            return this.userids[1];
        }
        return;
    }

}
g = new game(0, 2)
io.on('connection', (socket) => {
    console.log(socket.id + ' connected ');

    socket.on("join", (name) => {
        console.log(name + " " + socket.id + " joined the game");
        let myid = g.join(name, socket.id);
        if(myid === -1){
            console.log("room full");
            socket.emit("full");
        }
        if(myid === g.maxnum - 1){
            console.log("players ready");
            for (let id of g.userids){
                for (let target of g.userids){
                    if(id != target){
                        name = g.users[g.userids.indexOf(target)];
                        io.to(id).emit("opponent", name);
                    }
                }
            }
        }
    });

    socket.on("play", (sel)=>{
        ret = g.play(socket.id, sel);
        if(ret){
            for (let id of g.userids){
                let res  = -1;
                if(ret === "draw"){
                    res = 0;
                }
                if(ret === id){
                    res = 1;
                }
                io.to(id).emit("result", res)
            }
        }

    })

    socket.on('disconnect', () => {
        console.log(socket.id + ' disconnected');
        g.leave(socket.id)
    });

});

http.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});
