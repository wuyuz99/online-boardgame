//connect to the socket
let socket = io();
//set global variable
let usrName = "";
let roomNo = "";
let gameType = "";
let newgame = true;
class Popup extends React.Component {
    constructor(props){
        super(props);
        this.state={usrName: "a", roomNo: "b"};

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        console.log(event.target.name + ":" + event.target.value);
        this.setState({[event.target.name]: event.target.value});
    }

    handleSubmit(event) {
        event.preventDefault();
        usrName = this.state.usrName;
        roomNo = this.state.roomNo;
        if(newgame){
            let lab = document.createElement("LABEL");
            let b = document.createElement("B");
            let text = document.createTextNode("New game type");
            b.appendChild(text);
            lab.appendChild(b);
            lab.setAttribute("for", "gameType")
            document.querySelector("#newRoomType").appendChild(lab);

            let mylist = document.createElement("SELECT");
            mylist.setAttribute("name", "gameType");
            mylist.setAttribute("id", "list");
            mylist.setAttribute("value", this.state.gameType)

            let opt = document.createElement("option");
            opt.setAttribute("value", "example");
            text = document.createTextNode("example");
            opt.appendChild(text);
            mylist.appendChild(opt);

            document.querySelector("#newRoomType").appendChild(lab);
            document.querySelector("#newRoomType").appendChild(mylist);
            newgame = false;
        }else{
            document.querySelector('.modal').style.display="none";
            console.log(document.getElementById("newRoomType").childNodes[1]);
        }

    }

    render() {
        return(
            <div className="modal">
                <form className="modal-content" onSubmit={this.handleSubmit}>
                    <div className="container">
                        <label htmlFor="usrName"><b>Name</b></label>
                        <input type="text" placeholder="enter your name" name="usrName" required value={this.state.usrName} onChange={this.handleChange}/>
                        <label htmlFor="roomNo"><b>Room number</b></label>
                        <input type="text" placeholder="enter room number" name="roomNo" required value={this.state.roomNo} onChange={this.handleChange}/>
                        <div id="newRoomType"></div>
                        <button type="submit">Go!</button>
                    </div>
                </form>
            </div>
        );
    }
}


const domContainer = document.querySelector('#root');
ReactDOM.render(<Popup/>, domContainer);
