var jam = {
    "packages": [
        {
            "name": "less",
            "location": "static/js/less",
            "main": "./lib/index.js"
        },
        {
            "name": "jquery",
            "location": "static/js/jquery",
            "main": "jquery.js"
        }
    ],
    "version": "0.2.3",
    "shim": {}
};

if (typeof require !== "undefined" && require.config) {
    require.config({packages: jam.packages, shim: jam.shim});
}
else {
    var require = {packages: jam.packages, shim: jam.shim};
}

if (typeof exports !== "undefined" && typeof module !== "undefined") {
    module.exports = jam;
}