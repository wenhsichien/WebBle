'use strict';

const bleNusServiceUUID  = '0000ffe0-0000-1000-8000-00805f9b34fb';
const bleNusCharRXUUID   = '0000ffe1-0000-1000-8000-00805f9b34fb';
const bleNusCharTXUUID   = '0000ffe1-0000-1000-8000-00805f9b34fb';
const MTU = 20;

var bleDevice;
var bleServer;
var nusService;
var rxCharacteristic;
var txCharacteristic;
var CheckSum;
var rxMcuStr;



var connected = false;
var fTxEchoToggle = false;

function TxEchoToggle() {
	if ( fTxEchoToggle ) {
		fTxEchoToggle = false;
        document.getElementById("clientDisplayButton").innerHTML = "开启输入显示 Echo On";	
		window.term_.io.println('\r\n' + 'Echo Off');
	} else {
		fTxEchoToggle = true;
        document.getElementById("clientDisplayButton").innerHTML = "关闭输入显示 Echo Off";
		window.term_.io.println('\r\n' + 'Echo On');		
	}	
	document.getElementById('terminal').focus();
}


function ClrDisplay() {
	
	window.term_.clearHome();
	document.getElementById('terminal').focus();
	initContent(window.term_.io);
	
	
	//updateThingView();
}

function connectionToggle() {
    if (connected) {
        disconnect();
    } else {
        connect();
    }
    document.getElementById('terminal').focus();
}

// Sets button to either Connect or Disconnect
function setConnButtonState(enabled) {
    if (enabled) {
        document.getElementById("clientConnectButton").innerHTML = "断开 Disconnect";
    } else {
        document.getElementById("clientConnectButton").innerHTML = "连接 Connect";
    }
}

function connect() {
    if (!navigator.bluetooth) {
        console.log('WebBluetooth API is not available.\r\n' +
                    'Please make sure the Web Bluetooth flag is enabled.');
        window.term_.io.println('WebBluetooth API is not available on your browser.\r\n' +
                    'Please make sure the Web Bluetooth flag is enabled.');
        return;
    }
    console.log('Requesting Bluetooth Device...');
    navigator.bluetooth.requestDevice({
        //filters: [{services: []}]
        optionalServices: [bleNusServiceUUID],
        acceptAllDevices: true
    })
    .then(device => {
        bleDevice = device; 
        console.log('Found ' + device.name);
        console.log('Connecting to GATT Server...');
        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        return device.gatt.connect();
    })
    .then(server => {
        console.log('Locate NUS service');
        return server.getPrimaryService(bleNusServiceUUID);
    }).then(service => {
        nusService = service;
        console.log('Found NUS service: ' + service.uuid);
    })
    .then(() => {
        console.log('Locate RX characteristic');
        return nusService.getCharacteristic(bleNusCharRXUUID);
    })
    .then(characteristic => {
        rxCharacteristic = characteristic;
        console.log('Found RX characteristic');
    })
    .then(() => {
        console.log('Locate TX characteristic');
        return nusService.getCharacteristic(bleNusCharTXUUID);
    })
    .then(characteristic => {
        txCharacteristic = characteristic;
        console.log('Found TX characteristic');
    })
    .then(() => {
        console.log('Enable notifications');
        return txCharacteristic.startNotifications();
    })
    .then(() => {
        console.log('Notifications started');
        txCharacteristic.addEventListener('characteristicvaluechanged',
                                          handleNotifications);
        connected = true;
        //window.term_.io.println('\r\n' + bleDevice.name + ' Connected.');
        window.term_.io.println('\r\n' + bleDevice.name + ' 已连上.');
        //nusSendString('\r');
        setConnButtonState(true);
    })
    .catch(error => {
        console.log('' + error);
        window.term_.io.println('' + error);
        if(bleDevice && bleDevice.gatt.connected)
        {
            bleDevice.gatt.disconnect();
        }
    });
}

function disconnect() {
    if (!bleDevice) {
        console.log('No Bluetooth Device connected...');
        return;
    }
    console.log('Disconnecting from Bluetooth Device...');
    if (bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
        connected = false;
        setConnButtonState(false);
        console.log('Bluetooth Device connected: ' + bleDevice.gatt.connected);
    } else {
        console.log('> Bluetooth Device is already disconnected');
    }
}

function onDisconnected() {
    connected = false;
    //window.term_.io.println('\r\n' + bleDevice.name + ' Disconnected.');
	window.term_.io.println('\r\n' + bleDevice.name + ' 已断开.');
    setConnButtonState(false);
}

function handleNotifications(event) {
    console.log('notification');
    let value = event.target.value;
    // Convert raw data bytes to character values and use these to 
    // construct a string.
    let str = "";
    for (let i = 0; i < value.byteLength; i++) {
        str += String.fromCharCode(value.getUint8(i));
    }
	

	window.term_.io.print(str);

	rxMcuStr = str;		// store it for upload_file.js

	if ( fUploadThingViewToggle )
		updateThingView(str);
}




function nusSendString(s) {
    if(bleDevice && bleDevice.gatt.connected) {
        console.log("send: " + s);
        let val_arr = new Uint8Array(s.length)
        for (let i = 0; i < s.length; i++) {
            let val = s[i].charCodeAt(0);
            val_arr[i] = val;
        }
        sendNextChunk(val_arr);
		if ( fTxEchoToggle == true ) {
			if (s =='\r')
				s +='\n';
			window.term_.io.print(s);
		}
    } else {
        window.term_.io.println('Not connected to a device yet.');
    }
}

function sendNextChunk(a) {
    let chunk = a.slice(0, MTU);
    rxCharacteristic.writeValue(chunk)
      .then(function() {
          if (a.length > MTU) {
              sendNextChunk(a.slice(MTU));
          }
      });
}



function initContent(io) {
    io.println("\r\n\
欢迎来到 普立晶  BLE 串口终端机 V0.2.5 (06/23/2020)\r\n\
Copyright (C) 2019  \r\n\
\r\n\
这是采用 Chrome 70+ 浏览器的  Web BLE 操作界面, Baud rate = 9600\r\n\
\r\n\
*********************************************************\r\n\
*********************************************************\r\n\
");
}

function setupHterm() {
    const term = new hterm.Terminal();

    term.onTerminalReady = function() {
        const io = this.io.push();
        io.onVTKeystroke = (string) => {
            nusSendString(string);
        };
        io.sendString = nusSendString;
        initContent(io);
        this.setCursorVisible(true);
        this.keyboard.characterEncoding = 'raw';
    };
    term.decorate(document.querySelector('#terminal'));
    term.installKeyboard();

    term.contextMenu.setItems([
        ['Terminal Reset', () => {term.reset(); initContent(window.term_.io);}],
        ['Terminal Clear', () => {term.clearHome();}],
        [hterm.ContextMenu.SEPARATOR],
        ['GitHub', function() {
            lib.f.openWindow('https://github.com/makerdiary/web-device-cli', '_blank');
        }],
    ]);

    // Useful for console debugging.
    window.term_ = term;
}

window.onload = function() {
    lib.init(setupHterm);
};