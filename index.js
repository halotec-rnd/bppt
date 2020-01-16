// index.js - by Prio Sasoko (Halotec)

// set up ======================================================================
const express    = require('express');
const app        = express();
const ip         = require('ip');
const port       = process.env.PORT || 8080;
const path       = require('path');
const bodyParser = require('body-parser');
const http       = require("http");
const Server     = http.createServer(app);
const ipAddr     = ip.address();
const url        = "http://"+ipAddr+":"+port;
const fwd_url    = "http://bmnplus.halotec-indonesia.com/sigfox/receiver";
const request    = require('request-promise');

// configuration ===============================================================

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// routes ======================================================================

app.post('/sigfox', (req, res) => {
    const payload = req.body;
    console.log("body = ", payload);

    var gpsdata = true;
    var NS = ''; var WE = '';
    var lat = -1; var lon = -1;
    var lathex = Buffer.alloc(4); lathex.fill(0);
    var lonhex = Buffer.alloc(4); lonhex.fill(0);
    var latfloat = 0.0; var lonfloat = 0.0;

    const byteArr = Buffer.from(payload.data, 'hex');
    switch (byteArr[0]) {
        case 0x53 : NS = 'S';
                    lat = parseInt(byteArr[1].toString());
                    for (var i=0; i<3; i++) {lathex[i+1]=byteArr[i+2]};
                    if (byteArr[5]==0x45) {WE='E';} else {WE='W';};
                    lon = parseInt(byteArr[6].toString());
                    for (var i=0; i<3; i++) {lonhex[i+1]=byteArr[i+7]};
                    break;
        case 0x4E : NS = 'N';
                    lat = parseInt(byteArr[1].toString());
                    for (var i=0; i<3; i++) {lathex[i+1]=byteArr[i+2]};
                    if (byteArr[5]==0x45) {WE='E';} else {WE='W';};
                    lon = parseInt(byteArr[6].toString());
                    for (var i=0; i<3; i++) {lonhex[i+1]=byteArr[i+7]};
                    break;
        default   : gpsdata = false; break;
    } ;

    // Convert Hex to float
    latfloat = lat + (lathex.readUInt32BE(0) * 0.0000001); 
    lonfloat = lon + (lonhex.readUInt32BE(0) * 0.0000001);

    if ( NS == "S") { latfloat = -1*latfloat};
    if ( WE == "E") { lonfloat = -1*lonfloat};

    if ( gpsdata ) {
        
        // Prepare to forward
        const options = {
            method: 'POST',
            url: fwd_url,
            body: {
                "deviceid": payload.deviceId, 
                "time": payload.time.toString(),
                "seqNumber": payload.seqNumber.toString(),
                "latitude": latfloat.toString(),
                "longitude": lonfloat.toString()
            },
            json: true
        };

        // Do forward
        request(options)
            .then( (response) => {console.log(response);} )
            .catch( (error) => {console.log(error);} );

    };

    res.status(202).send({status:'Successful',});
});


// launch ======================================================================
Server.listen(port);
console.log('The magic happens on  '+ip.address()+':'+ port);