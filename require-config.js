
(function () {

var url = "http://loadingquest.neoname.eu/";

window.loadingquest_require = require.config({
    context: "loadingquest",
    baseUrl: url + "static/js",
    shim: {
        "jquery-ui": {
            deps: ['jquery'],
        },
    },
});

window.loadingquest_require(["jquery", "jquery-ui"], function($) {
    $.noConflict();

    var script = $('<link rel="stylesheet" type="text/css" href="' + url + 'static/css/main.css"></link>');
    $("head").append(script);
});

})();
