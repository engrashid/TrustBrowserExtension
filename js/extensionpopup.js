var controller = new SettingsController();

// Onload
$(function () {
    controller.loadSettings(function (items) {
        BindSettings(items);
    });
});


$("#savebtn").click(function () {
    controller.loadSettings(function (items) {
        items["password"] = $("#inputPassword").val();
        items["seed"] = $("#inputSeed").val();
        items["rememberme"] = $("#rememberMe").prop('checked');
        items["infoserver"] = $("#trustserver").val();
        
        items["trustrender"] = $("input[name='trustrenderradio']:checked").val();
        items["trustrendercolor"] = "#EEFFDD";
        items["trustrendericon"] = "check16.png";

        items["resultrender"] = $("input[name='resultrenderradio']:checked").val();
        items["resultrendercolor"] = "lightpink";
        items["resultrendericon"] = "close16.png";
        items["resultrenderhide"] = $("#distrusthide").prop('checked');


        items["twittertrust"] = $("input[name='twittertrustradio']:checked").val();
        items["twitterdistrust"] = $("input[name='twitterdistrustradio']:checked").val();

        
        controller.saveSettings(items);
        controller.buildKey(items);
        BindSettings(items);
    });
});

function BindSettings(items) {
    $("#inputPassword").val(items.password);
    $("#inputSeed").val(items.seed);
    $("#trustserver").val(items.infoserver);
    $("#rememberMe").prop('checked', items["rememberme"] == true);

    $("[name='trustrenderradio']").val([items.trustrender]);
    $("[name='resultrenderradio']").val([items.resultrender]);

    $("#distrusthide").prop('checked', items["resultrenderhide"] == true);
  
    items.twittertrust = items.twittertrust || "noaction";
    items.twitterdistrust = items.twitterdistrust || "hidecontent";
    
    $("[name='twittertrustradio']").val([items.twittertrust ]);
    $("[name='twitterdistrustradio']").val([items.twitterdistrust]);


    var address = items.address;
    $("#address").text(address);

    var data = new Identicon(address, {margin:0.1, size:64, format: 'svg'}).toString()
    $("#identicon").attr("src", "data:image/svg+xml;base64,"+data);
}
