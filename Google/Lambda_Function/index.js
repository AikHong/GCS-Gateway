'use strict';
var AWS = require('aws-sdk');
AWS.config.region = 'ap-southeast-1';
var iot;
var endpointAddress;
var iotdata = new AWS.IotData({endpoint: 'a1b0zdpxwpwpyy-ats.iot.ap-southeast-1.amazonaws.com'});
var current_state;

console.log('Loading function');

function generateMessageID() {
    return '38A28869-DD5E-48CE-BBE5-A4DB78CECB28'; // Dummy
}

function getDevicesFromPartnerCloud(response, callback) {
    //user auth token should also be passed here.
    var numDevices;
    // Create the Iot object
    //iot = new AWS.Iot({ 'region': process.env.region, apiVersion: '2015-05-28' });

    var params = {
        maxResults: 100,
        thingTypeName: process.env.thingTypeName
    };

    iot.listThings(params, function (err, data) {
        if (err) {                              // an error occurred
            console.log(err, err.stack);
            //log('ERROR', err.stack);
            callback(new Error(err));
        }
        else {// successful response
            numDevices = data.things.length;
            //console.log(data);
            console.log(`found ${numDevices} devices`);
            var i;
            var deviceData = {};
            for (i = 0; i < numDevices; i++) {
                //deep clean before re-fill
                Object.keys(deviceData).forEach(function (key) { delete deviceData[key]; });

                if (!data.things[i].attributes.IDName) continue;
                deviceData.id = data.things[i].attributes.IDName;

                //TODO: These traits are hardcoded for now
                deviceData.type = "action.devices.types.LIGHT";
                deviceData.traits = [];
                deviceData.traits[0] = "action.devices.traits.OnOff";

                if (!data.things[i].thingName) continue;
                deviceData.name = {};
                deviceData.name.defaultNames = [];
                deviceData.name.defaultNames[0] = data.things[i].thingName;

                if (!data.things[i].attributes.FriendlyName) continue;
                deviceData.name.name = data.things[i].attributes.FriendlyName;

                //TODO: hardcoded state reporting property
                deviceData.willReportState = false;

                //add controlTopic to CustomData
                deviceData.customData = {}
                deviceData.customData.controlTopic = data.things[i].attributes.controlTopic;

                //deepCopy
                //console.log(`pushing ${JSON.stringify(deviceData)}`);
                response.payload.devices.push(JSON.parse(JSON.stringify(deviceData)));
            }
            console.log(`Discovery Response: ${JSON.stringify(response)}`);
            callback(null, response);
        }
    });
}

function checkstate(callback)
{
  // send GET to device and check for the STATUS

  var message = {"EVENT":"ZW_SWITCH_BINARY_GET", "NODE_ID":12, "ENDPOINT_ID":0} 
  var messageData = JSON.stringify(message);
  var controlTopic = "awsiot_to_localgateway"
  console.info(messageData, controlTopic)
  var params = {
    topic: controlTopic, // aikhong
    payload: messageData,
    qos: 0
  };
  //aik hong - code here to publish data to AWS IOT
  return iotdata.publish(params, function(err, data) {
    if(err){
      console.log(err);
      callback(new Error(err));
    }
    else{
      console.log("I did it correctly.");
      callback();
    //context.succeed();
    }
  });
}

function handleQuery(callback)
{

  var response= {
    requestId: generateMessageID(),
    payload: {
      devices: {
        123: {
          on: current_state,
          online: true
        },
        456: {
          on: true,
          online: true,
          brightness: 80,
          color: {
            name: "cerulean",
            spectrumRGB: 31655
          }
        }
      }
    }
  }
  console.log(`Query Response: ${JSON.stringify(response)}`);
  callback(null, response);
}

function handleSync(callback) {
    //log('DEBUG', `Sync Request: ${JSON.stringify(request)}`);

    //Get User information using Oauth2 Token

    //Auth token is part of Authorization header sent to the API. To get it here,
    //    create an input mapping with passthrough in the API console

    var response = {
        requestId: generateMessageID(),
        payload: {
            agentUserId: "1836.15267389",
              devices: [{
                id: "123",
                type: "action.devices.types.OUTLET",
                traits: [
                  "action.devices.traits.OnOff"
                ],
                name: {
                  defaultNames: ["My Z-Wave Smart Plug"],
                  name: "Z-Wave Smart Plug",
                  nicknames: ["wall plug"]
                },
                willReportState: false,
                roomHint: "cubical",
                deviceInfo: {
                  manufacturer: "GCS",
                  model: "hs1234",
                  hwVersion: "3.2",
                  swVersion: "11.4"
                },
                otherDeviceIds: [{
                  deviceId: "local-device-id"
                }],
                customData: {
                  fooValue: 74,
                  barValue: true,
                  bazValue: "foo"
                }
              }, {
                id: "456",
                type: "action.devices.types.LIGHT",
                traits: [
                  "action.devices.traits.OnOff",
                  "action.devices.traits.Brightness",
                  "action.devices.traits.ColorTemperature",
                  "action.devices.traits.ColorSpectrum"
                ],
                name: {
                  defaultNames: ["RGB Light Bulb"],
                  name: "lamp1",
                  nicknames: ["reading lamp"]
                },
                willReportState: false,
                roomHint: "Entryway",
                attributes: {
                  temperatureMinK: 2000,
                  temperatureMaxK: 6500
                },
                deviceInfo: {
                  manufacturer: "lights out inc.",
                  model: "hg11",
                  hwVersion: "1.2",
                  swVersion: "5.4"
                },
                customData: {
                  fooValue: 12,
                  barValue: false,
                  bazValue: "bar"
                }
              }]
        }
    }
    console.log(`Discovery Response: ${JSON.stringify(response)}`);
    callback(null, response);
    //getDevicesFromPartnerCloud(response, callback);   //aikhong - temp disable first
}

function AWSDeviceMessaging(controlTopic, message, callback) {
    if (message.STATUS == "ON")
    {
      message = {"EVENT":"ZW_SWITCH_BINARY_SET", "NODE_ID":12, "ENDPOINT_ID":0,"SWITCH":"ON"}
    }
    else {
      message = {"EVENT":"ZW_SWITCH_BINARY_SET", "NODE_ID":12, "ENDPOINT_ID":0,"SWITCH":"OFF"}
    }
    var messageData = JSON.stringify(message);
    console.info(messageData, controlTopic)
    var params = {
      topic: controlTopic, // aikhong
      payload: messageData,
      qos: 0
    };
    //aik hong - code here to publish data to AWS IOT
    return iotdata.publish(params, function(err, data) {
    if(err){
      console.log(err);
      callback(new Error(err));
    }
    else{
      console.log("Success, I guess.");
      callback();
    //context.succeed();
    }
  });
}

//hardcoded response
function execCompleted(deviceIds, requestOnState, callback) {
    var response = {
        requestId: generateMessageID(), //TODO: should request ID match original incoming request ID?
        payload: {
            commands: [{
                ids: ["123"],
                status: "SUCCESS",
                states: {
                    on: requestOnState,
                    online: true
                }
            }]
        }
    }
    console.info("Execution Completed")
    //response = JSON.stringify(response);
    callback(null, response);
}

function turnOnOff(deviceIds, controlTopic, operationString, callback) {
    // Create the Iot object
    //iot = new AWS.Iot({ 'region': process.env.region, apiVersion: '2015-05-28' });

    AWSDeviceMessaging(controlTopic, { STATUS: operationString }, function (err, response) {
        if (err) {
            console.log("ERROR>> AWSDeviceMessaging Returned Error")
        }
        if ("ON" == operationString) {
            execCompleted(deviceIds, true, callback);
            console.info("Done ON")
            current_state = true;
        }
        else if ("OFF" == operationString) {
            execCompleted(deviceIds, false, callback);
            console.info("Done OFF")
            current_state = false;
        }
    });
}

function handleExec(commands, callback) {

    //TODO: bad coding. But for now, this is the only suported action
    if (commands[0].execution[0].command == "action.devices.commands.OnOff") {
        var devices = [];
        var controltopics = [];
        for (var i = 0; i < commands[0].devices.length; i++) {
            devices.push(JSON.parse(JSON.stringify(commands[0].devices[i].id)));
            console.log(commands[0].devices[i].id)
        }
        controltopics = "awsiot_to_localgateway"
        //console.info(controltopics);

        if (true == commands[0].execution[0].params.on) {
            turnOnOff(devices, controltopics, "ON", callback);
        }
        else if (false == commands[0].execution[0].params.on) {
            turnOnOff(devices, controltopics, "OFF", callback);
        }
    }
    //aikhong
    else
    {
        console.info("Command Not supported");
    }

}


exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    var incoming = JSON.stringify(event);
    //var jsonObj = JSON.parse(test);

    var search = incoming.search("State");  // to determine whether info is from Google Home or AWS IOT

    if (search != -1)
    {
      var jsonObj = JSON.parse(incoming);
      //current_state = event.State;
      if(event.State == "On" )
      {
        current_state = true;
      }
      else
      {
        current_state = false;
      }
      console.log("Current state", current_state)

    }
    else
    {
      var jsonObj = JSON.parse(incoming);
      //console.log(jsonObj);
      var intent = event.inputs[0].intent;

      if (intent == "action.devices.SYNC") {
          console.log("Received SYNC intent");
          handleSync(callback);
      }
      else if (intent == "action.devices.QUERY") {
        // current will reflect the state that is sent out by Google
          console.log("Received QUERY intent");
          checkstate(callback);
          handleQuery(callback);
      }
      else if (intent == "action.devices.EXECUTE") {
          console.log("Received EXEC intent");
          handleExec(event.inputs[0].payload.commands, callback);
      }
    }
};
