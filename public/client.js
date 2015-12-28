function bookEquipment(i) {
    console.log("Wants to book equipment number: " + i);


    var json = {
        url: '/getBookingTable/' + i,
        dataType: 'json',
        type: "GET",
        success: function(data) {
            console.log("all good");
        },
        error: displayError
    };
    $.ajax(json);
};


//Displaying Errors: This function is called when there is an error returned from the server
var displayError = function(request, status, err) {
    console.log("ERROR: " + status + " " + err);
};
