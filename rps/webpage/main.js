$(document).ready(function(){
    let socket = io();

    let uname = "";
    let sel = -1

    $("#aftername").css("display", "none");
    $("#play").css("display", "none");
    $(".retry").css("display", "none");

    $("#setname").on("click", function(){
        uname = $("#usrname").val();
        if(uname.length > 0){
            $("#getname").css("display", "none");
            $("#displayname").html("Hi, " + uname)
            $("#aftername").css("display", "block");
            socket.emit("join", uname);
        }
    })

    $("#Rock").on("click", function(){
        sel = 0;
        $("#choose").html("Rock")
    })
    $("#Paper").on("click", function(){
        sel = 1;
        $("#choose").html("Paper")
    })
    $("#Scissors").on("click", function(){
        sel = 2;
        $("#choose").html("Scissors")
    })
    $("#Confirm").on("click", function(){
        if(sel == -1){
            console.log("not selected");
            sel = Math.floor(Math.random() * Math.floor(3));
        }
        $(".selecb").css("display", "none");
        socket.emit("play", sel);
    })
    $("#aftername > input").on("click", function(){
        $(".retry").css("display", "none");
        $("#opponent").css("display", 'block');        
        socket.emit("join", "uname");
    })


    socket.on("full",()=>{
        $("#opponent").css("display", 'none');
        $(".retry").css("display", 'block');
    })

    socket.on("opponent", (opponent)=>{
        $("#opponent").html("Your opponent is " + opponent);
        $("#play").css("display", "block");
    })

    socket.on("result", (res)=>{
        console.log(res);
        if(res == 0){
            alert("draw");
        }
        if(res < 0){
            alert("lose");
        }
        if(res > 0){
            alert("win");
        }
        $(".selecb").css("display", "inline");
        $("#choose").html("choose")

    })
});
