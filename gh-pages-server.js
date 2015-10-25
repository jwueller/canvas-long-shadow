var express = require('express');
var app = express();

app.use(express.static('dist/gh-pages/'));

var server = app.listen(3001, function () {
    console.log('visit http://localhost:' + server.address().port + '/');
});
