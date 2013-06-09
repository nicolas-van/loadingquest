<%!
    title = "Loading Quest"
    description = "Loading Quest - Waiting should be fun"
%>

<%inherit file="/common/base.mako"/>

<%block name="head">
    <script>
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

      ga('create', 'UA-33415030-5', 'neoname.eu');
      ga('send', 'pageview');

    </script>
</%block>

<%block name="beforeContent">
    <a href="https://github.com/nicolas-van/loadingquest"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://s3.amazonaws.com/github/ribbons/forkme_right_gray_6d6d6d.png" alt="Fork me on GitHub"></a>
</%block>