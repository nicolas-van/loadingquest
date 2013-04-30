Super Progress Quest
====================

A fork of Progress Quest by Eric Fredricksen. This javascript version is 100% without controls, which is a major improvement.

See the result [here](http://superprogressquest.neoname.eu)

You can use it on your own web page using the following code:

    <script src="http://superprogressquest.neoname.eu/require.js"></script>
    <script src="http://superprogressquest.neoname.eu/require-config.js"></script>
    <script>
        superprogressquest_require(["superprogressquest"], function(spq) {
            spq.launch();
        });
    </script>

If you want to stop the animation (although I don't understand why you would want to
do such a thing), you can use the following code:

    superprogressquest_require(["superprogressquest"], function(spq) {
        spq.stop();
    });

