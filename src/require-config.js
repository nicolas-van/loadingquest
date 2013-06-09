
(function () {

var url = "http://superprogressquest.neoname.eu/";

window.superprogressquest_require = require.config({
    context: "superprogressquest",
    baseUrl: url + "static/js",
    shim: {
        "jquery-ui": {
            deps: ['jquery'],
        },
    },
});

window.superprogressquest_require(["jquery", "jquery-ui"], function($) {
    $.noConflict();

    var script = $('<link rel="stylesheet" type="text/css" href="' + url + 'static/css/main.css"></link>');
    $("head").append(script);
});

})();
